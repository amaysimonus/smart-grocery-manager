const request = require('supertest');
const app = require('./manual-entry-test-app');

// Mock database for manual entry tests
jest.mock('../server/config/database', () => {
  const mockPrisma = {
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    budget: {
      create: jest.fn(),
      delete: jest.fn(),
    },
    category: {
      create: jest.fn(),
      findFirst: jest.fn(),
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
      findMany: jest.fn(),
      delete: jest.fn(),
    },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  };

  return { prisma: mockPrisma };
});

// Mock JWT utils
jest.mock('../server/utils/jwt', () => ({
  generateToken: (payload) => 'test-jwt-token',
  verifyToken: (token) => ({ id: 'test-user-id', email: 'test@example.com', role: 'HELPER' })
}));

// Mock auth middleware
jest.mock('../server/middleware/auth', () => {
  const auth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Access token required'
      });
    }
    req.user = { id: 'test-user-id', role: 'HELPER' };
    next();
  };

  const roleMiddleware = (allowedRoles) => (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Access denied. User not authenticated.'
      });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Insufficient permissions.'
      });
    }
    next();
  };

  return { auth, authMiddleware: auth, roleMiddleware };
});

describe('Manual Entry System', () => {
  let authToken, testUser, testBudget, testCategory;

  beforeAll(() => {
    authToken = 'test-jwt-token';
    testUser = { id: 'test-user-id', email: 'manual.test@example.com' };
    testBudget = { id: 'test-budget-id', name: 'Test Budget' };
    testCategory = { id: 'test-category-id', name: 'Vegetables' };
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/manual-receipts', () => {
    it('should create a manual receipt with basic data', async () => {
      const receiptData = {
        storeName: 'Wet Market',
        storeNameZh: '濕市場',
        purchaseDate: '2024-02-06T10:00:00Z',
        budgetId: testBudget.id,
        currency: 'SGD'
      };

      const mockReceipt = {
        id: 'test-receipt-id',
        storeName: receiptData.storeName,
        storeNameZh: receiptData.storeNameZh,
        totalAmount: '0',
        status: 'MANUAL',
        userId: testUser.id,
        purchaseDate: new Date(receiptData.purchaseDate)
      };

      const { prisma } = require('../server/config/database');
      prisma.receipt.create.mockResolvedValue(mockReceipt);

      const response = await request(app)
        .post('/api/manual-receipts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(receiptData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.receipt.storeName).toBe(receiptData.storeName);
      expect(response.body.receipt.storeNameZh).toBe(receiptData.storeNameZh);
      expect(response.body.receipt.totalAmount).toBe('0');
      expect(response.body.receipt.status).toBe('MANUAL');
      expect(response.body.receipt.userId).toBe(testUser.id);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/manual-receipts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Validation failed');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/manual-receipts')
        .send({
          storeName: 'Test Store',
          purchaseDate: '2024-02-06T10:00:00Z'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/manual-receipts/:id/items', () => {
    it('should add items to manual receipt', async () => {
      const receiptId = 'test-receipt-id';
      const itemsData = [
        {
          name: 'Tomatoes',
          nameZh: '番茄',
          quantity: 2,
          unitPrice: 3.50,
          categoryId: testCategory.id,
          category: 'Vegetables'
        }
      ];

      const mockReceipt = {
        id: receiptId,
        userId: testUser.id,
        storeName: 'Test Market',
        totalAmount: '10.00'
      };

      const mockItems = [{
        id: 'test-item-id',
        receiptId,
        name: 'Tomatoes',
        nameZh: '番茄',
        quantity: 2,
        unitPrice: 3.50,
        totalPrice: 7.00,
        category: 'Vegetables'
      }];

      const { prisma } = require('../server/config/database');
      prisma.receipt.findFirst.mockResolvedValue(mockReceipt);
      prisma.category.findFirst.mockResolvedValue({ id: testCategory.id, name: 'Vegetables' });
      prisma.receiptItem.createMany.mockResolvedValue({ count: 1 });
      prisma.receiptItem.findMany.mockResolvedValue(mockItems);
      prisma.receipt.update.mockResolvedValue(mockReceipt);

      const response = await request(app)
        .post(`/api/manual-receipts/${receiptId}/items`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ items: itemsData })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.items).toHaveLength(1);
      expect(parseFloat(response.body.receipt.totalAmount)).toBe(7.00);
    });

    it('should validate item data', async () => {
      const response = await request(app)
        .post('/api/manual-receipts/test-id/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ items: [{ name: '', quantity: 1, unitPrice: 1 }] })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Validation failed');
    });

    it('should verify receipt ownership', async () => {
      const { prisma } = require('../server/config/database');
      prisma.receipt.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/manual-receipts/other-id/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ items: [{ name: 'Test Item', quantity: 1, unitPrice: 1 }] })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Receipt not found');
    });
  });

  describe('GET /api/manual-receipts', () => {
    it('should list manual receipts with pagination', async () => {
      const mockReceipts = [
        {
          id: 'receipt-1',
          storeName: 'Market 1',
          totalAmount: '25.50',
          status: 'MANUAL',
          userId: testUser.id
        },
        {
          id: 'receipt-2',
          storeName: 'Market 2',
          totalAmount: '15.75',
          status: 'MANUAL',
          userId: testUser.id
        }
      ];

      const { prisma } = require('../server/config/database');
      prisma.receipt.findMany.mockResolvedValue(mockReceipts);
      prisma.receipt.count.mockResolvedValue(2);

      const response = await request(app)
        .get('/api/manual-receipts')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.receipts).toHaveLength(2);
      expect(response.body.pagination.total).toBe(2);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(10);
    });

    it('should filter by status MANUAL', async () => {
      const mockReceipts = [
        {
          id: 'receipt-1',
          storeName: 'Market 1',
          totalAmount: '25.50',
          status: 'MANUAL',
          userId: testUser.id
        }
      ];

      const { prisma } = require('../server/config/database');
      prisma.receipt.findMany.mockResolvedValue(mockReceipts);
      prisma.receipt.count.mockResolvedValue(1);

      const response = await request(app)
        .get('/api/manual-receipts')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.receipts).toHaveLength(1);
      expect(response.body.receipts.every(r => r.status === 'MANUAL')).toBe(true);
    });
  });

  describe('PUT /api/manual-receipts/:id', () => {
    it('should update manual receipt', async () => {
      const receiptId = 'test-receipt-id';
      const updateData = {
        storeName: 'Updated Store',
        storeNameZh: '更新商店',
        purchaseDate: '2024-02-07T15:00:00Z'
      };

      const mockReceipt = {
        id: receiptId,
        userId: testUser.id,
        storeName: updateData.storeName,
        storeNameZh: updateData.storeNameZh,
        purchaseDate: new Date(updateData.purchaseDate)
      };

      const { prisma } = require('../server/config/database');
      prisma.receipt.findFirst.mockResolvedValue({ id: receiptId, userId: testUser.id });
      prisma.receipt.update.mockResolvedValue(mockReceipt);

      const response = await request(app)
        .put(`/api/manual-receipts/${receiptId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.receipt.storeName).toBe(updateData.storeName);
      expect(response.body.receipt.storeNameZh).toBe(updateData.storeNameZh);
    });

    it('should not allow updating userId', async () => {
      const receiptId = 'test-receipt-id';
      
      const { prisma } = require('../server/config/database');
      prisma.receipt.findFirst.mockResolvedValue({ id: receiptId, userId: testUser.id });
      prisma.receipt.update.mockResolvedValue({ id: receiptId, userId: testUser.id });

      const response = await request(app)
        .put(`/api/manual-receipts/${receiptId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ userId: 'different-id' })
        .expect(200);

      expect(response.body.receipt.userId).toBe(testUser.id);
    });
  });

  describe('DELETE /api/manual-receipts/:id', () => {
    it('should delete manual receipt', async () => {
      const receiptId = 'test-receipt-id';

      const { prisma } = require('../server/config/database');
      prisma.receipt.findFirst.mockResolvedValue({ id: receiptId, userId: testUser.id });
      prisma.receipt.delete.mockResolvedValue({ id: receiptId });

      const response = await request(app)
        .delete(`/api/manual-receipts/${receiptId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted successfully');
    });

    it('should verify receipt ownership before deletion', async () => {
      const { prisma } = require('../server/config/database');
      prisma.receipt.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .delete('/api/manual-receipts/other-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Business Rules & Validation', () => {
    it('should validate positive quantities and prices', async () => {
      const receiptId = 'test-receipt-id';
      
      const { prisma } = require('../server/config/database');
      prisma.receipt.findFirst.mockResolvedValue({ id: receiptId, userId: testUser.id });

      const response = await request(app)
        .post(`/api/manual-receipts/${receiptId}/items`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          items: [{
            name: 'Invalid Item',
            quantity: -1,
            unitPrice: -5.00,
            categoryId: testCategory.id
          }]
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should prevent duplicate manual receipts', async () => {
      const receiptData = {
        storeName: 'Same Store',
        purchaseDate: '2024-02-06T10:00:00Z',
        totalAmount: 25.00
      };

      const { prisma } = require('../server/config/database');
      prisma.receipt.findFirst.mockResolvedValue({ id: 'existing-receipt' });

      const response = await request(app)
        .post('/api/manual-receipts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(receiptData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Duplicate receipt');
    });
  });
});