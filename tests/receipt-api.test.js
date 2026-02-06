// Mock services and database BEFORE importing
jest.mock('../server/services/imageService', () => ({
  processImageUpload: jest.fn(),
  validateImage: jest.fn(),
  uploadToStorage: jest.fn(),
  generateThumbnail: jest.fn(),
  enhanceForOCR: jest.fn()
}));

jest.mock('../server/services/ocrService', () => ({
  processReceipt: jest.fn(),
  extractText: jest.fn(),
  parseItems: jest.fn(),
  suggestCategories: jest.fn(),
  extractStoreInfo: jest.fn(),
  extractReceiptInfo: jest.fn()
}));

jest.mock('../server/config/database', () => ({
  prisma: {
    receipt: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn()
    },
    receiptItem: {
      createMany: jest.fn()
    },
    category: {
      findFirst: jest.fn()
    },
    user: {
      findUnique: jest.fn()
    }
  }
}));

const request = require('supertest');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const imageService = require('../server/services/imageService');
const ocrService = require('../server/services/ocrService');
const { prisma } = require('../server/config/database');

// Mock auth middleware BEFORE importing routes
jest.mock('../server/middleware/auth', () => ({
  authMiddleware: (req, res, next) => {
    req.user = { id: 'test-user-id' };
    next();
  }
}));

// Create test app
const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Import routes after mocking
app.use('/receipts', require('../server/routes/receipt'));

describe('Receipt API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /receipts/upload', () => {
    test('should handle receipt upload successfully', async () => {
      // Mock image service
      imageService.processImageUpload.mockResolvedValue({
        original: { url: 'http://example.com/original.jpg', key: 'original.jpg' },
        thumbnail: { url: 'http://example.com/thumb.jpg', key: 'thumb.jpg' },
        enhanced: { url: 'http://example.com/enhanced.jpg', key: 'enhanced.jpg' },
        metadata: { width: 800, height: 600 }
      });

      // Mock database operations
      prisma.receipt.create.mockResolvedValue({
        id: 'test-receipt-id',
        userId: 'test-user-id',
        status: 'PENDING',
        totalAmount: 0,
        purchaseDate: new Date()
      });

      // Create a minimal JPEG buffer
      const minimalJpeg = Buffer.from([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01
      ]);

      const response = await request(app)
        .post('/receipts/upload')
        .set('Authorization', 'Bearer test-token')
        .attach('receipt', minimalJpeg, 'receipt.jpg')
        .expect(202);

      expect(response.body.message).toContain('Receipt upload started');
      expect(response.body.receiptId).toBeDefined();
      expect(imageService.processImageUpload).toHaveBeenCalledTimes(1);
    });
  });

  describe('POST /receipts/process', () => {
    test('should start OCR processing for existing receipt', async () => {
      // Mock receipt lookup
      prisma.receipt.findFirst.mockResolvedValue({
        id: 'test-receipt-id',
        userId: 'test-user-id',
        imageUrl: 'http://example.com/receipt.jpg'
      });

      // Mock update
      prisma.receipt.update.mockResolvedValue({
        id: 'test-receipt-id',
        status: 'PROCESSING'
      });

      const response = await request(app)
        .post('/receipts/process')
        .set('Authorization', 'Bearer test-token')
        .send({ receiptId: 'test-receipt-id' })
        .expect(200);

      expect(response.body.message).toContain('OCR processing started');
      expect(prisma.receipt.update).toHaveBeenCalledWith({
        where: { id: 'test-receipt-id' },
        data: { status: 'PROCESSING' }
      });
    });

    test('should handle missing receipt', async () => {
      prisma.receipt.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .post('/receipts/process')
        .set('Authorization', 'Bearer test-token')
        .send({ receiptId: 'invalid-id' })
        .expect(404);

      expect(response.body.error).toContain('Receipt not found');
    });
  });

  describe('GET /receipts', () => {
    test('should list receipts with pagination', async () => {
      const mockReceipts = [
        {
          id: 'receipt-1',
          userId: 'test-user-id',
          storeName: 'Test Store',
          totalAmount: 25.50,
          status: 'COMPLETED',
          items: []
        }
      ];

      prisma.receipt.findMany.mockResolvedValue(mockReceipts);
      prisma.receipt.count.mockResolvedValue(1);

      const response = await request(app)
        .get('/receipts')
        .set('Authorization', 'Bearer test-token')
        .expect(200);

      expect(response.body.receipts).toBeDefined();
      expect(response.body.pagination).toBeDefined();
      expect(Array.isArray(response.body.receipts)).toBe(true);
      expect(response.body.receipts.length).toBe(1);
    });
  });

  describe('GET /receipts/:id', () => {
    test('should get single receipt details', async () => {
      const mockReceipt = {
        id: 'test-receipt-id',
        userId: 'test-user-id',
        storeName: 'Test Store',
        totalAmount: 50.25,
        status: 'COMPLETED',
        items: []
      };

      prisma.receipt.findFirst.mockResolvedValue(mockReceipt);

      const response = await request(app)
        .get('/receipts/test-receipt-id')
        .set('Authorization', 'Bearer test-token')
        .expect(200);

      expect(response.body.receipt).toBeDefined();
      expect(response.body.receipt.id).toBe('test-receipt-id');
      expect(response.body.receipt.storeName).toBe('Test Store');
    });

    test('should handle missing receipt', async () => {
      prisma.receipt.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .get('/receipts/invalid-id')
        .set('Authorization', 'Bearer test-token')
        .expect(404);

      expect(response.body.error).toContain('Receipt not found');
    });
  });

  describe('PUT /receipts/:id', () => {
    test('should update receipt with manual corrections', async () => {
      const existingReceipt = {
        id: 'test-receipt-id',
        userId: 'test-user-id',
        totalAmount: 50.25,
        status: 'COMPLETED'
      };

      const updatedReceipt = {
        ...existingReceipt,
        storeName: 'Corrected Store',
        totalAmount: 45.75,
        purchaseDate: new Date('2024-01-16')
      };

      prisma.receipt.findFirst.mockResolvedValue(existingReceipt);
      prisma.receipt.update.mockResolvedValue(updatedReceipt);

      const updateData = {
        storeName: 'Corrected Store',
        totalAmount: 45.75,
        purchaseDate: '2024-01-16T10:30:00Z'
      };

      const response = await request(app)
        .put('/receipts/test-receipt-id')
        .set('Authorization', 'Bearer test-token')
        .send(updateData)
        .expect(200);

      expect(response.body.receipt.storeName).toBe(updateData.storeName);
      expect(response.body.receipt.totalAmount).toBe(updateData.totalAmount);
    });
  });

  describe('DELETE /receipts/:id', () => {
    test('should delete receipt', async () => {
      const existingReceipt = {
        id: 'test-receipt-id',
        userId: 'test-user-id',
        totalAmount: 10.00,
        status: 'COMPLETED'
      };

      prisma.receipt.findFirst.mockResolvedValue(existingReceipt);
      prisma.receipt.delete.mockResolvedValue(existingReceipt);

      const response = await request(app)
        .delete('/receipts/test-receipt-id')
        .set('Authorization', 'Bearer test-token')
        .expect(200);

      expect(response.body.message).toContain('deleted successfully');
    });
  });
});

console.log('✅ Receipt API endpoints test completed successfully');