// Mock database for receipt tests
jest.mock('../server/config/database', () => ({
  prisma: {
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    receipt: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      deleteMany: jest.fn(),
    },
    receiptItem: {
      createMany: jest.fn(),
    },
    category: {
      findFirst: jest.fn(),
    },
    budget: {
      create: jest.fn(),
    },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  },
  testConnection: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock services to avoid dependencies
jest.mock('../server/services/imageService', () => ({
  processImageUpload: jest.fn().mockResolvedValue({
    original: { url: 'http://example.com/original.jpg', key: 'original.jpg' },
    thumbnail: { url: 'http://example.com/thumb.jpg', key: 'thumb.jpg' },
    enhanced: { url: 'http://example.com/enhanced.jpg', key: 'enhanced.jpg' },
    metadata: { width: 800, height: 600 }
  }),
  validateImage: jest.fn().mockResolvedValue({ isValid: true, metadata: {} }),
  uploadToStorage: jest.fn().mockResolvedValue({ url: 'test-url', key: 'test-key' })
}));

jest.mock('../server/services/ocrService', () => ({
  processReceipt: jest.fn().mockResolvedValue({
    ocrText: 'Test receipt text',
    ocrConfidence: 85,
    storeInfo: { name: 'Test Store', nameZh: '测试商店' },
    receiptInfo: { receiptNumber: '12345', purchaseDate: new Date() },
    items: [
      {
        name: 'Test Item',
        quantity: 1,
        unitPrice: 10.00,
        totalPrice: 10.00,
        category: 'groceries'
      }
    ],
    calculatedTotal: 10.00,
    itemCount: 1
  })
}));

jest.mock('../server/middleware/auth', () => ({
  auth: (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }
    req.user = { id: 'test-user-id' };
    next();
  }
}));

// Mock OAuth controller to prevent route loading issues
jest.mock('../server/controllers/oauthController', () => ({
  googleCallback: (req, res) => res.json({ success: true }),
  appleCallback: (req, res) => res.json({ success: true }),
  oauthFailure: (req, res) => res.json({ success: false }),
  linkOAuthProvider: (req, res) => res.json({ success: true }),
  unlinkOAuthProvider: (req, res) => res.json({ success: true }),
  getLinkedProviders: (req, res) => res.json({ providers: [] })
}));

// Mock passport config
jest.mock('../server/config/passport', () => ({
  generateState: () => 'test-state',
  validateState: (req, res, next) => next()
}));

const request = require('supertest');
const path = require('path');
const fs = require('fs');
const app = require('./receipt-test-app');
const { PrismaClient } = require('@prisma/client');

const { prisma } = require('../server/config/database');

describe('Receipt OCR Tests', () => {
  let authToken;
  let testUserId;

  beforeAll(async () => {
    // Mock successful user creation and login
    testUserId = 'test-user-id';
    authToken = 'test-jwt-token';
    
    prisma.user.create.mockResolvedValue({
      id: testUserId,
      email: 'receipt.test@example.com',
      firstName: 'Receipt',
      lastName: 'Test'
    });
  });

  afterAll(async () => {
    // Clean up mocks
    jest.clearAllMocks();
  });

  describe('Image Upload Tests', () => {
    test('should reject non-image files', async () => {
      const response = await request(app)
        .post('/receipts/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('receipt', Buffer.from('fake pdf content'), 'test.pdf')
        .expect(400);

      expect(response.body.error).toContain('Invalid file type');
    });

    test('should reject oversized files', async () => {
      // Create a large buffer (11MB)
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024, 'a');
      
      const response = await request(app)
        .post('/receipts/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('receipt', largeBuffer, 'large.jpg')
        .expect(400);

      expect(response.body.error).toContain('File size too large');
    });

    test('should accept valid image files', async () => {
      // Mock receipt creation
      prisma.receipt.create.mockResolvedValue({
        id: 'test-receipt-id',
        userId: testUserId,
        status: 'PENDING',
        totalAmount: 0,
        purchaseDate: new Date()
      });

      // Create a minimal JPEG buffer for testing
      const minimalJpeg = Buffer.from([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01
      ]);

      const response = await request(app)
        .post('/receipts/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('receipt', minimalJpeg, 'receipt.jpg')
        .expect(202);

      expect(response.body.message).toContain('Receipt upload started');
      expect(response.body.receiptId).toBeDefined();
    });
  });

  describe('OCR Processing Tests', () => {
    let receiptId;

    beforeAll(async () => {
      // Create a test receipt for OCR tests
      receiptId = 'test-receipt-id';
      
      prisma.receipt.create.mockResolvedValue({
        id: receiptId,
        userId: testUserId,
        totalAmount: 25.50,
        purchaseDate: new Date(),
        status: 'PENDING'
      });

      prisma.receipt.findFirst.mockResolvedValue({
        id: receiptId,
        userId: testUserId,
        totalAmount: 25.50,
        purchaseDate: new Date(),
        status: 'PENDING'
      });
    });

    test('should process OCR for existing receipt', async () => {
      prisma.receipt.update.mockResolvedValue({
        id: receiptId,
        status: 'PROCESSING'
      });

      const response = await request(app)
        .post('/receipts/process')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ receiptId })
        .expect(200);

      expect(response.body.message).toContain('OCR processing');
      expect(response.body.status).toBeDefined();
    });

    test('should handle missing receipt', async () => {
      prisma.receipt.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .post('/receipts/process')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ receiptId: 'invalid-id' })
        .expect(404);

      expect(response.body.error).toContain('Receipt not found');
    });
  });

  describe('Receipt Management Tests', () => {
    let testReceipt;

    beforeAll(async () => {
      testReceipt = {
        id: 'test-receipt-id',
        userId: testUserId,
        storeName: 'Test Store',
        totalAmount: 50.25,
        purchaseDate: new Date('2024-01-15'),
        status: 'COMPLETED'
      };

      prisma.receipt.create.mockResolvedValue(testReceipt);
      prisma.receipt.findFirst.mockResolvedValue(testReceipt);
    });

    test('should list receipts with pagination', async () => {
      prisma.receipt.findMany.mockResolvedValue([testReceipt]);
      prisma.receipt.count.mockResolvedValue(1);

      const response = await request(app)
        .get('/receipts')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.receipts).toBeDefined();
      expect(response.body.pagination).toBeDefined();
      expect(Array.isArray(response.body.receipts)).toBe(true);
    });

    test('should get single receipt details', async () => {
      prisma.receipt.findFirst.mockResolvedValue(testReceipt);

      const response = await request(app)
        .get(`/receipts/${testReceipt.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.receipt).toBeDefined();
      expect(response.body.receipt.id).toBe(testReceipt.id);
      expect(response.body.receipt.storeName).toBe('Test Store');
    });

    test('should update receipt with manual corrections', async () => {
      const updateData = {
        storeName: 'Corrected Store',
        totalAmount: 45.75,
        purchaseDate: '2024-01-16T10:30:00Z'
      };

      prisma.receipt.update.mockResolvedValue({
        ...testReceipt,
        ...updateData,
        totalAmount: parseFloat(updateData.totalAmount),
        purchaseDate: new Date(updateData.purchaseDate)
      });

      const response = await request(app)
        .put(`/receipts/${testReceipt.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.receipt.storeName).toBe(updateData.storeName);
      expect(response.body.receipt.totalAmount).toBe(updateData.totalAmount);
    });

    test('should delete receipt', async () => {
      const deleteReceipt = {
        id: 'delete-test-id',
        userId: testUserId,
        totalAmount: 10.00,
        purchaseDate: new Date(),
        status: 'COMPLETED'
      };

      prisma.receipt.findFirst.mockResolvedValue(deleteReceipt);
      prisma.receipt.delete.mockResolvedValue(deleteReceipt);

      await request(app)
        .delete(`/receipts/${deleteReceipt.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });
  });

  describe('Error Handling Tests', () => {
    test('should require authentication for all endpoints', async () => {
      await request(app)
        .get('/receipts')
        .expect(401);

      await request(app)
        .post('/receipts/upload')
        .expect(401);

      await request(app)
        .post('/receipts/process')
        .expect(401);
    });

    test('should handle invalid receipt IDs', async () => {
      prisma.receipt.findFirst.mockResolvedValue(null);

      await request(app)
        .get('/receipts/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      await request(app)
        .put('/receipts/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ storeName: 'Test' })
        .expect(404);

      await request(app)
        .delete('/receipts/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    test('should validate required fields on update', async () => {
      const testReceipt = {
        id: 'validation-test-id',
        userId: testUserId,
        totalAmount: 15.00,
        purchaseDate: new Date(),
        status: 'COMPLETED'
      };

      prisma.receipt.findFirst.mockResolvedValue(testReceipt);

      const response = await request(app)
        .put(`/receipts/${testReceipt.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ totalAmount: 'invalid_amount' })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });
});