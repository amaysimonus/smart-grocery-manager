const path = require('path');
const imageService = require('../services/imageService');
const ocrService = require('../services/ocrService');
const { prisma } = require('../config/database');
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const https = require('https');
const http = require('http');
const { URL } = require('url');

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      // Store error on request for later handling
      req.fileUploadError = new Error('Invalid file type. Only JPEG and PNG images are allowed.');
      return cb(null, false);
    }
  }
});

// Multer error handling middleware
const handleMulterErrors = (error, req, res, next) => {
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      error: 'File size too large. Maximum size is 10MB'
    });
  }
  
  if (error.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({
      success: false,
      error: 'Too many files uploaded'
    });
  }
  
  next(error);
};

const receiptController = {
  // Upload receipt image and start OCR processing
  async uploadReceipt(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      // Check for multer errors
      if (req.fileUploadError) {
        return res.status(400).json({
          success: false,
          error: req.fileUploadError.message
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No file uploaded'
        });
      }

      const userId = req.user.id;
      const imageBuffer = req.file.buffer;
      const filename = req.file.originalname;

      // Process image upload
      const uploadResult = await imageService.processImageUpload(imageBuffer, {
        userId,
        filename,
        generateThumbnail: true,
        enhanceForOCR: true
      });

      // Create receipt record
      const receipt = await prisma.receipt.create({
        data: {
          userId,
          imageUrl: uploadResult.original.url,
          thumbnailUrl: uploadResult.thumbnail?.url,
          status: 'PENDING',
          totalAmount: 0, // Will be updated after OCR
          purchaseDate: new Date()
        }
      });

      // Start OCR processing asynchronously
      setImmediate(async () => {
        try {
          await processReceiptOCR(receipt.id, uploadResult.enhanced?.url || uploadResult.original.url);
        } catch (error) {
          console.error('OCR processing failed:', error);
          await prisma.receipt.update({
            where: { id: receipt.id },
            data: { status: 'FAILED' }
          });
        }
      });

      res.status(202).json({
        success: true,
        message: 'Receipt upload started. OCR processing in progress.',
        receiptId: receipt.id,
        status: receipt.status
      });
    } catch (error) {
      console.error('Upload receipt error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to upload receipt'
      });
    }
  },

  // Process OCR for existing receipt
  async processReceiptOCR(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { receiptId } = req.body;
      const userId = req.user.id;

      // Get receipt
      const receipt = await prisma.receipt.findFirst({
        where: {
          id: receiptId,
          userId
        }
      });

      if (!receipt) {
        return res.status(404).json({
          success: false,
          error: 'Receipt not found'
        });
      }

      // Update status to processing
      await prisma.receipt.update({
        where: { id: receiptId },
        data: { status: 'PROCESSING' }
      });

      // Start OCR processing
      setImmediate(async () => {
        try {
          await processReceiptOCR(receiptId, receipt.imageUrl);
        } catch (error) {
          console.error('OCR processing failed:', error);
          await prisma.receipt.update({
            where: { id: receiptId },
            data: { status: 'FAILED' }
          });
        }
      });

      res.json({
        success: true,
        message: 'OCR processing started',
        receiptId,
        status: 'PROCESSING'
      });
    } catch (error) {
      console.error('Process receipt OCR error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process OCR'
      });
    }
  },

  // List receipts with pagination
  async listReceipts(req, res) {
    try {
      const userId = req.user.id;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      const [receipts, total] = await Promise.all([
        prisma.receipt.findMany({
          where: { userId },
          include: {
            items: {
              include: {
                categoryRelation: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.receipt.count({
          where: { userId }
        })
      ]);

      res.json({
        success: true,
        receipts,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('List receipts error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list receipts'
      });
    }
  },

  // Get single receipt details
  async getReceipt(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const receipt = await prisma.receipt.findFirst({
        where: {
          id,
          userId
        },
        include: {
          items: {
            include: {
              categoryRelation: true
            }
          }
        }
      });

      if (!receipt) {
        return res.status(404).json({
          success: false,
          error: 'Receipt not found'
        });
      }

      res.json({
        success: true,
        receipt
      });
    } catch (error) {
      console.error('Get receipt error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get receipt'
      });
    }
  },

  // Update receipt with manual corrections
  async updateReceipt(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { id } = req.params;
      const userId = req.user.id;
      const updateData = req.body;

      // Verify receipt exists and belongs to user
      const existingReceipt = await prisma.receipt.findFirst({
        where: {
          id,
          userId
        }
      });

      if (!existingReceipt) {
        return res.status(404).json({
          success: false,
          error: 'Receipt not found'
        });
      }

      // Parse numeric fields
      const parsedData = {
        ...updateData,
        totalAmount: updateData.totalAmount ? parseFloat(updateData.totalAmount) : undefined,
        purchaseDate: updateData.purchaseDate ? new Date(updateData.purchaseDate) : undefined
      };

      // Remove invalid fields
      delete parsedData.id;
      delete parsedData.userId;
      delete parsedData.createdAt;
      delete parsedData.updatedAt;

      const updatedReceipt = await prisma.receipt.update({
        where: { id },
        data: parsedData,
        include: {
          items: {
            include: {
              categoryRelation: true
            }
          }
        }
      });

      res.json({
        success: true,
        message: 'Receipt updated successfully',
        receipt: updatedReceipt
      });
    } catch (error) {
      console.error('Update receipt error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update receipt'
      });
    }
  },

  // Delete receipt
  async deleteReceipt(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Verify receipt exists and belongs to user
      const existingReceipt = await prisma.receipt.findFirst({
        where: {
          id,
          userId
        }
      });

      if (!existingReceipt) {
        return res.status(404).json({
          success: false,
          error: 'Receipt not found'
        });
      }

      // Delete receipt (cascade will delete items)
      await prisma.receipt.delete({
        where: { id }
      });

      res.json({
        success: true,
        message: 'Receipt deleted successfully'
      });
    } catch (error) {
      console.error('Delete receipt error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete receipt'
      });
    }
  }
};

// Helper function to process OCR
async function processReceiptOCR(receiptId, imageUrl) {
  try {
    // Update status to IN_PROGRESS
    await prisma.receipt.update({
      where: { id: receiptId },
      data: { status: 'IN_PROGRESS' }
    });

    // Download image from URL or use enhanced version if available
    let imageBuffer;
    try {
      // For MinIO URLs, generate presigned URL and fetch
      const url = imageUrl.startsWith('http') ? imageUrl : 
        await imageService.getPresignedUrl(imageUrl);
      
      imageBuffer = await downloadImage(url);
    } catch (error) {
      console.error('Failed to download image for OCR:', error);
      throw new Error('Could not retrieve receipt image for processing');
    }

    // Process OCR
    const ocrResult = await ocrService.processReceipt(imageBuffer);

    // Update receipt with OCR results
    await prisma.receipt.update({
      where: { id: receiptId },
      data: {
        storeName: ocrResult.storeInfo?.name,
        storeNameZh: ocrResult.storeInfo?.nameZh,
        totalAmount: ocrResult.calculatedTotal || 0,
        ocrConfidence: ocrResult.ocrConfidence,
        receiptNumber: ocrResult.receiptInfo?.receiptNumber,
        purchaseDate: ocrResult.receiptInfo?.purchaseDate || new Date(),
        status: 'COMPLETED'
      }
    });

    // Create receipt items
    if (ocrResult.items && ocrResult.items.length > 0) {
      // Get or create categories
      const categoryMap = {};
      for (const item of ocrResult.items) {
        if (item.category && !categoryMap[item.category]) {
          const category = await prisma.category.findFirst({
            where: { name: item.category }
          });
          
          if (category) {
            categoryMap[item.category] = category.id;
          }
        }
      }

      // Create items
      const itemData = ocrResult.items.map(item => ({
        receiptId,
        categoryId: categoryMap[item.category] || null,
        name: item.name,
        nameZh: item.nameZh || null,
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice || 0,
        totalPrice: item.totalPrice || 0,
        category: item.category || null,
        ocrConfidence: item.categoryConfidence || null
      }));

      await prisma.receiptItem.createMany({
        data: itemData
      });
    }
  } catch (error) {
    console.error('OCR processing error:', error);
    await prisma.receipt.update({
      where: { id: receiptId },
      data: { status: 'FAILED' }
    });
    throw error;
  }
}

// Helper function to download image from URL
function downloadImage(url) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === 'https:' ? https : http;
    
    const request = client.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
        return;
      }

      const chunks = [];
      response.on('data', (chunk) => {
        chunks.push(chunk);
      });

      response.on('end', () => {
        const imageBuffer = Buffer.concat(chunks);
        resolve(imageBuffer);
      });
    });

    request.on('error', (error) => {
      reject(error);
    });

    request.setTimeout(30000, () => {
      request.abort();
      reject(new Error('Image download timeout'));
    });
  });
}

// Validation middleware
const validateReceiptUpload = [
  body('budgetId').optional().isString().withMessage('Budget ID must be a string')
];

const validateReceiptProcess = [
  body('receiptId').isString().notEmpty().withMessage('Receipt ID is required')
];

const validateReceiptUpdate = [
  body('storeName').optional().isString().withMessage('Store name must be a string'),
  body('totalAmount').optional().isFloat({ min: 0 }).withMessage('Total amount must be a positive number'),
  body('purchaseDate').optional().isISO8601().withMessage('Purchase date must be a valid date')
];

module.exports = {
  upload,
  receiptController,
  validateReceiptUpload,
  validateReceiptProcess,
  validateReceiptUpdate,
  handleMulterErrors
};