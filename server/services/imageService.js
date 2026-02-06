const sharp = require('sharp');
const crypto = require('crypto');
const path = require('path');
const Minio = require('minio');
const winston = require('winston');

class ImageService {
  constructor() {
    this.minioClient = new Minio.Client({
      endPoint: process.env.MINIO_ENDPOINT || 'localhost',
      port: parseInt(process.env.MINIO_PORT) || 9000,
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY,
      secretKey: process.env.MINIO_SECRET_KEY
    });
    
    this.bucketName = process.env.MINIO_BUCKET_NAME || 'receipts';
    this.maxFileSize = 10 * 1024 * 1024; // 10MB
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({ filename: 'logs/image-service.log' }),
        new winston.transports.Console()
      ]
    });
  }

  async validateImage(buffer) {
    try {
      // Check file size
      if (buffer.length > this.maxFileSize) {
        return {
          isValid: false,
          error: `File size too large. Maximum size is ${this.maxFileSize / 1024 / 1024}MB`
        };
      }

      // Check if it's a valid image format
      const metadata = await sharp(buffer).metadata();
      const validFormats = ['jpeg', 'jpg', 'png', 'webp'];
      
      if (!validFormats.includes(metadata.format.toLowerCase())) {
        return {
          isValid: false,
          error: `Invalid file format. Supported formats: ${validFormats.join(', ')}`
        };
      }

      // Basic image corruption check
      if (metadata.width === 0 || metadata.height === 0) {
        return {
          isValid: false,
          error: 'Invalid image dimensions'
        };
      }

      return { isValid: true, metadata };
    } catch (error) {
      this.logger.error('Image validation failed:', error);
      return {
        isValid: false,
        error: 'Invalid or corrupted image file'
      };
    }
  }

  async generateThumbnail(buffer, options = {}) {
    const {
      width = 300,
      height = 300,
      quality = 80
    } = options;

    try {
      const thumbnail = await sharp(buffer)
        .resize(width, height, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality })
        .toBuffer();

      return thumbnail;
    } catch (error) {
      this.logger.error('Thumbnail generation failed:', error);
      throw new Error('Failed to generate thumbnail');
    }
  }

  async enhanceForOCR(buffer) {
    try {
      const enhanced = await sharp(buffer)
        .rotate() // Auto-rotate based on EXIF
        .sharpen({
          sigma: 1,
          flat: 1,
          jagged: 2
        })
        .normalize() // Improve contrast
        .greyscale() // Convert to grayscale for better OCR
        .jpeg({ quality: 95 })
        .toBuffer();

      return enhanced;
    } catch (error) {
      this.logger.error('Image enhancement failed:', error);
      throw new Error('Failed to enhance image for OCR');
    }
  }

  async autoRotate(buffer) {
    try {
      const rotated = await sharp(buffer)
        .rotate() // Sharp auto-rotates based on EXIF orientation
        .toBuffer();

      return rotated;
    } catch (error) {
      this.logger.error('Auto-rotation failed:', error);
      // Return original buffer if rotation fails
      return buffer;
    }
  }

  async sanitizeEXIF(buffer) {
    try {
      // Process image to remove sensitive EXIF data while preserving orientation
      const sanitized = await sharp(buffer)
        .rotate() // Preserve orientation but strip other EXIF data
        .withMetadata({
          exif: Buffer.alloc(0) // Remove all EXIF data
        })
        .toBuffer();

      return sanitized;
    } catch (error) {
      this.logger.error('EXIF sanitization failed:', error);
      throw new Error('Failed to sanitize image metadata');
    }
  }

  generateStorageKey(options) {
    const {
      userId,
      type = 'original', // 'original', 'thumbnail', 'enhanced'
      filename,
      date = new Date()
    } = options;

    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
    const fileExt = path.extname(filename).toLowerCase();
    const randomId = crypto.randomBytes(8).toString('hex');
    
    return `${userId}/${dateStr}/${type}/${randomId}${fileExt}`;
  }

  async uploadToStorage(buffer, options) {
    try {
      // Ensure bucket exists
      const bucketExists = await this.minioClient.bucketExists(this.bucketName);
      if (!bucketExists) {
        await this.minioClient.makeBucket(this.bucketName, 'us-east-1');
      }

      const key = this.generateStorageKey(options);
      
      await this.minioClient.putObject(
        this.bucketName,
        key,
        buffer,
        buffer.length,
        {
          'Content-Type': 'image/jpeg',
          'X-Amz-Meta-User-Id': options.userId,
          'X-Amz-Meta-Upload-Type': options.type || 'original'
        }
      );

      // Generate public URL (adjust based on your MinIO configuration)
      const url = `${process.env.MINIO_PUBLIC_URL || 'http://localhost:9000'}/${this.bucketName}/${key}`;

      return {
        key,
        url,
        size: buffer.length
      };
    } catch (error) {
      this.logger.error('Storage upload failed:', error);
      throw new Error('Failed to upload image to storage');
    }
  }

  async processImageUpload(buffer, options = {}) {
    const {
      userId,
      filename,
      generateThumbnail: shouldGenerateThumbnail = true,
      enhanceForOCR: shouldEnhanceForOCR = true
    } = options;

    try {
      // Validate image
      const validation = await this.validateImage(buffer);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      // Sanitize EXIF data
      const sanitizedBuffer = await this.sanitizeEXIF(buffer);

      // Upload original image
      const originalUpload = await this.uploadToStorage(sanitizedBuffer, {
        userId,
        filename,
        type: 'original'
      });

      let thumbnailUpload = null;
      let enhancedUpload = null;

      // Generate and upload thumbnail
      if (shouldGenerateThumbnail) {
        const thumbnailBuffer = await this.generateThumbnail(sanitizedBuffer);
        thumbnailUpload = await this.uploadToStorage(thumbnailBuffer, {
          userId,
          filename: `thumb_${filename}`,
          type: 'thumbnail'
        });
      }

      // Enhance image for OCR and upload
      if (shouldEnhanceForOCR) {
        const enhancedBuffer = await this.enhanceForOCR(sanitizedBuffer);
        enhancedUpload = await this.uploadToStorage(enhancedBuffer, {
          userId,
          filename: `enhanced_${filename}`,
          type: 'enhanced'
        });
      }

      return {
        original: originalUpload,
        thumbnail: thumbnailUpload,
        enhanced: enhancedUpload,
        metadata: validation.metadata
      };
    } catch (error) {
      this.logger.error('Image processing failed:', error);
      throw error;
    }
  }

  async deleteFromStorage(key) {
    try {
      await this.minioClient.removeObject(this.bucketName, key);
      return true;
    } catch (error) {
      this.logger.error('Storage deletion failed:', error);
      return false;
    }
  }

  async getPresignedUrl(key, expiresIn = 3600) {
    try {
      const url = await this.minioClient.presignedGetObject(
        this.bucketName,
        key,
        expiresIn
      );
      return url;
    } catch (error) {
      this.logger.error('Failed to generate presigned URL:', error);
      throw new Error('Failed to generate download URL');
    }
  }
}

module.exports = new ImageService();