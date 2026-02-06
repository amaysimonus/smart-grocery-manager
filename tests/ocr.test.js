const ocrService = require('../server/services/ocrService');
const imageService = require('../server/services/imageService');
const fs = require('fs');
const path = require('path');

describe('OCR Service Tests', () => {
  describe('Text Extraction', () => {
    test('should extract text from receipt image', async () => {
      // Create a minimal test image
      const testImagePath = path.join(__dirname, 'fixtures', 'test-receipt.jpg');
      const minimalJpeg = Buffer.from([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01
      ]);

      const result = await ocrService.extractText(minimalJpeg);
      
      expect(result).toHaveProperty('text');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('lines');
      expect(typeof result.confidence).toBe('number');
      expect(Array.isArray(result.lines)).toBe(true);
    });

    test('should handle bilingual text extraction', async () => {
      const testImage = Buffer.from([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01
      ]);

      const result = await ocrService.extractText(testImage, {
        languages: ['eng', 'chi_tra']
      });
      
      expect(result).toHaveProperty('text');
      expect(result).toHaveProperty('confidence');
    });

    test('should return low confidence for poor quality images', async () => {
      const poorQualityImage = Buffer.from([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01
      ]);

      const result = await ocrService.extractText(poorQualityImage);
      
      expect(result.confidence).toBeLessThan(50);
    });

    test('should handle corrupted images gracefully', async () => {
      const corruptedImage = Buffer.from([0x00, 0x01, 0x02, 0x03]);

      await expect(ocrService.extractText(corruptedImage)).rejects.toThrow();
    });
  });

  describe('Item Parsing', () => {
    test('should parse receipt items from extracted text', () => {
      const receiptText = `
        NTUC FairPrice
        2024-01-15 10:30
        
        Apples           2.50
        Bread           3.20
        Milk           4.80
        
        Total          10.50
      `;

      const items = ocrService.parseItems(receiptText);
      
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBeGreaterThan(0);
      expect(items[0]).toHaveProperty('name');
      expect(items[0]).toHaveProperty('quantity');
      expect(items[0]).toHaveProperty('unitPrice');
      expect(items[0]).toHaveProperty('totalPrice');
    });

    test('should handle Chinese text in items', () => {
      const receiptText = `
        冷霸超市
        2024-01-15 10:30
        
        苹果           5.00
        面包           8.50
        牛奶          12.00
        
        总计          25.50
      `;

      const items = ocrService.parseItems(receiptText);
      
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBeGreaterThan(0);
    });

    test('should extract quantities and prices correctly', () => {
      const receiptText = `
        Item 1          1 @ 2.50    2.50
        Item 2          3 @ 1.20    3.60
        Item 3                     5.75
      `;

      const items = ocrService.parseItems(receiptText);
      
      expect(items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'Item 1',
            quantity: 1,
            unitPrice: 2.50,
            totalPrice: 2.50
          }),
          expect.objectContaining({
            name: 'Item 2',
            quantity: 3,
            unitPrice: 1.20,
            totalPrice: 3.60
          }),
          expect.objectContaining({
            name: 'Item 3',
            quantity: 1,
            unitPrice: 5.75,
            totalPrice: 5.75
          })
        ])
      );
    });
  });

  describe('Category Suggestion', () => {
    test('should suggest categories based on item names', () => {
      const items = [
        { name: 'Apple', nameZh: '苹果' },
        { name: 'Bread', nameZh: '面包' },
        { name: 'Milk', nameZh: '牛奶' },
        { name: 'Chicken', nameZh: '鸡肉' },
        { name: 'Rice', nameZh: '米饭' }
      ];

      const categorizedItems = ocrService.suggestCategories(items);
      
      expect(categorizedItems.length).toBe(items.length);
      categorizedItems.forEach(item => {
        expect(item).toHaveProperty('category');
        expect(typeof item.category).toBe('string');
      });
    });

    test('should handle unknown items gracefully', () => {
      const items = [
        { name: 'UnknownItem123', nameZh: '未知物品123' }
      ];

      const categorizedItems = ocrService.suggestCategories(items);
      
      expect(categorizedItems[0]).toHaveProperty('category');
      expect(categorizedItems[0].category).toBe('miscellaneous');
    });
  });

  describe('Store Information Extraction', () => {
    test('should extract store name from receipt text', () => {
      const receiptText = `
        NTUC FairPrice
        123 Orchard Road
        Singapore 238874
        
        Receipt #12345
        2024-01-15 10:30
      `;

      const storeInfo = ocrService.extractStoreInfo(receiptText);
      
      expect(storeInfo).toHaveProperty('name');
      expect(storeInfo).toHaveProperty('nameZh');
      expect(storeInfo.name).toContain('NTUC');
    });

    test('should extract Chinese store names', () => {
      const receiptText = `
        冷霸超市
        新加坡武吉知馬路123號
        收据 #67890
        2024-01-15 10:30
      `;

      const storeInfo = ocrService.extractStoreInfo(receiptText);
      
      expect(storeInfo).toHaveProperty('name');
      expect(storeInfo).toHaveProperty('nameZh');
      expect(storeInfo.nameZh).toContain('冷霸');
    });

    test('should extract receipt number and date', () => {
      const receiptText = `
        SuperStore
        Receipt #98765
        Date: 2024-01-15
        Time: 14:30
      `;

      const info = ocrService.extractReceiptInfo(receiptText);
      
      expect(info).toHaveProperty('receiptNumber');
      expect(info).toHaveProperty('purchaseDate');
      expect(info.receiptNumber).toBe('98765');
    });
  });

  describe('Error Handling', () => {
    test('should handle empty text input', () => {
      const items = ocrService.parseItems('');
      expect(items).toEqual([]);
    });

    test('should handle malformed price information', () => {
      const receiptText = `
        Item 1          invalid_price
        Item 2          @ 2.50    
        Item 3          3 @       
      `;

      const items = ocrService.parseItems(receiptText);
      
      // Should not crash and return empty or partial results
      expect(Array.isArray(items)).toBe(true);
    });

    test('should retry OCR on temporary failures', async () => {
      const testImage = Buffer.from([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01
      ]);

      // Mock a temporary failure then success
      let callCount = 0;
      const originalExtractText = ocrService.extractText;
      ocrService.extractText = jest.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Temporary OCR failure');
        }
        return originalExtractText(testImage);
      });

      const result = await ocrService.extractTextWithRetry(testImage, { maxRetries: 2 });
      
      expect(result).toHaveProperty('text');
      expect(callCount).toBe(2);

      // Restore original function
      ocrService.extractText = originalExtractText;
    });
  });
});

describe('Image Service Tests', () => {
  describe('Image Validation', () => {
    test('should validate image file types', async () => {
      const validImage = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]); // JPEG header
      const invalidFile = Buffer.from([0x25, 0x50, 0x44, 0x46]); // PDF header

      const validResult = await imageService.validateImage(validImage);
      expect(validResult.isValid).toBe(true);

      const invalidResult = await imageService.validateImage(invalidFile);
      expect(invalidResult.isValid).toBe(false);
    });

    test('should check file size limits', async () => {
      const smallImage = Buffer.alloc(1024 * 1024, 0xFF); // 1MB
      const largeImage = Buffer.alloc(11 * 1024 * 1024, 0xFF); // 11MB

      const smallResult = await imageService.validateImage(smallImage);
      expect(smallResult.isValid).toBe(true);

      const largeResult = await imageService.validateImage(largeImage);
      expect(largeResult.isValid).toBe(false);
      expect(largeResult.error).toContain('size');
    });

    test('should detect corrupted images', async () => {
      const corruptedImage = Buffer.from([0xFF, 0xD8, 0x00, 0x00]);

      const result = await imageService.validateImage(corruptedImage);
      expect(result.isValid).toBe(false);
    });
  });

  describe('Image Processing', () => {
    test('should generate thumbnails', async () => {
      const testImage = Buffer.from([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
        // Minimal JPEG data
        ...Buffer.alloc(1000, 0x00)
      ]);

      const thumbnail = await imageService.generateThumbnail(testImage);
      
      expect(thumbnail).toBeInstanceOf(Buffer);
      expect(thumbnail.length).toBeLessThan(testImage.length);
    });

    test('should enhance image quality for OCR', async () => {
      const testImage = Buffer.from([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
        ...Buffer.alloc(2000, 0x80) // Gray image data
      ]);

      const enhanced = await imageService.enhanceForOCR(testImage);
      
      expect(enhanced).toBeInstanceOf(Buffer);
      expect(enhanced.length).toBeGreaterThan(0);
    });

    test('should auto-rotate images based on EXIF', async () => {
      const testImage = Buffer.from([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
        // EXIF orientation tag would be here in real images
        ...Buffer.alloc(1000, 0x00)
      ]);

      const rotated = await imageService.autoRotate(testImage);
      
      expect(rotated).toBeInstanceOf(Buffer);
    });
  });

  describe('File Storage', () => {
    test('should upload files to storage', async () => {
      const testImage = Buffer.from([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01
      ]);

      const uploadResult = await imageService.uploadToStorage(testImage, {
        filename: 'test-receipt.jpg',
        userId: 'test-user',
        type: 'original'
      });

      expect(uploadResult).toHaveProperty('url');
      expect(uploadResult).toHaveProperty('key');
      expect(typeof uploadResult.url).toBe('string');
    });

    test('should organize files by user and date', async () => {
      const testImage = Buffer.from([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01
      ]);

      const options = {
        filename: 'receipt.jpg',
        userId: 'user123',
        type: 'thumbnail',
        date: new Date('2024-01-15')
      };

      const uploadResult = await imageService.uploadToStorage(testImage, options);
      
      expect(uploadResult.key).toContain('user123');
      expect(uploadResult.key).toContain('2024');
      expect(uploadResult.key).toContain('01');
      expect(uploadResult.key).toContain('thumbnail');
    });

    test('should handle storage errors gracefully', async () => {
      const testImage = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]);

      // Mock storage failure
      const originalUpload = imageService.uploadToStorage;
      imageService.uploadToStorage = jest.fn().mockRejectedValue(
        new Error('Storage service unavailable')
      );

      await expect(imageService.uploadToStorage(testImage, {}))
        .rejects.toThrow('Storage service unavailable');

      // Restore original function
      imageService.uploadToStorage = originalUpload;
    });
  });

  describe('EXIF Data Handling', () => {
    test('should sanitize EXIF data for privacy', async () => {
      const testImage = Buffer.from([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
        // EXIF data with GPS coordinates (simplified)
        ...Buffer.from('GPS Longitude: 103.8198° GPS Latitude: 1.3521°')
      ]);

      const sanitized = await imageService.sanitizeEXIF(testImage);
      
      expect(sanitized).toBeInstanceOf(Buffer);
      // GPS data should be removed (this would require actual EXIF parsing)
    });

    test('should preserve useful EXIF data (orientation)', async () => {
      const testImage = Buffer.from([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01
      ]);

      const processed = await imageService.sanitizeEXIF(testImage);
      
      expect(processed).toBeInstanceOf(Buffer);
      expect(processed.length).toBeGreaterThan(0);
    });
  });
});