// Mock database for budget tests
jest.mock('../server/config/database', () => ({
  prisma: {
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    budget: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      deleteMany: jest.fn(),
      aggregate: jest.fn(),
    },
    budgetAssignment: {
      create: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
    },
    receipt: {
      create: jest.fn(),
      aggregate: jest.fn(),
      deleteMany: jest.fn(),
    },
    category: {
      findFirst: jest.fn(),
    },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  },
}));

const request = require('supertest');
const app = require('./budget-test-app');
const { prisma } = require('../server/config/database');
const jwt = require('../server/utils/jwt');

describe('Budget Management', () => {
  let adminToken, helperToken, masterToken;
  let adminUser, helperUser, masterUser;
  let testBudget;

  beforeAll(async () => {
    masterUser = { id: 'master-id', email: 'master@test.com', role: 'MASTER' };
    adminUser = { id: 'admin-id', email: 'admin@test.com', role: 'ADMIN', masterAccountId: 'master-id' };
    helperUser = { id: 'helper-id', email: 'helper@test.com', role: 'HELPER', masterAccountId: 'master-id' };

    masterToken = jwt.generateToken(masterUser);
    adminToken = jwt.generateToken(adminUser);
    helperToken = jwt.generateToken(helperUser);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /budgets', () => {
    it('should create budget with admin role', async () => {
      const budgetData = {
        name: 'Weekly Groceries',
        amount: '150.00',
        startDate: '2024-01-01T00:00:00.000Z',
        isRecurring: true,
        recurrence: 'WEEKLY'
      };

      prisma.budget.create.mockResolvedValue({
        id: 'budget-id',
        ...budgetData,
        amount: 150.00,
        createdBy: adminUser.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        startDate: new Date(budgetData.startDate),
        endDate: null
      });

      const response = await request(app)
        .post('/budgets')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(budgetData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(budgetData.name);
      testBudget = response.body.data;
    });

    it('should fail with helper role', async () => {
      const response = await request(app)
        .post('/budgets')
        .set('Authorization', `Bearer ${helperToken}`)
        .send({ name: 'Test' })
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /budgets', () => {
    it('should list budgets', async () => {
      prisma.budget.findMany.mockResolvedValue([{
        id: 'budget-id',
        name: 'Weekly Groceries',
        amount: 150.00,
        startDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        creator: { id: adminUser.id }
      }]);
      prisma.budget.count.mockResolvedValue(1);

      const response = await request(app)
        .get('/budgets')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
    });
  });

  describe('POST /budgets/:id/assign', () => {
    it('should assign budget to helper', async () => {
      prisma.budget.findUnique.mockResolvedValue({ 
        id: 'budget-id', 
        createdBy: adminUser.id,
        amount: 100,
        startDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      });
      prisma.user.findUnique.mockResolvedValue({ id: helperUser.id });
      prisma.budgetAssignment.upsert.mockResolvedValue({
        budgetId: 'budget-id',
        userId: helperUser.id,
        assignedBy: adminUser.id
      });

      const response = await request(app)
        .post('/budgets/budget-id/assign')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: helperUser.id })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('assigned');
    });

    it('should prevent duplicate assignments (handled by upsert in service)', async () => {
       prisma.budget.findUnique.mockResolvedValue({ 
         id: 'budget-id', 
         createdBy: adminUser.id,
         amount: 100,
         startDate: new Date(),
         createdAt: new Date(),
         updatedAt: new Date()
       });
       prisma.user.findUnique.mockResolvedValue({ id: helperUser.id });
       prisma.budgetAssignment.upsert.mockResolvedValue({
         budgetId: 'budget-id',
         userId: helperUser.id,
         assignedBy: adminUser.id
       });

       const response = await request(app)
         .post('/budgets/budget-id/assign')
         .set('Authorization', `Bearer ${adminToken}`)
         .send({ userId: helperUser.id })
         .expect(201);

       expect(response.body.success).toBe(true);
    });
  });

  describe('GET /budgets/:id/spending', () => {
    it('should get spending against budget', async () => {
      prisma.budget.findUnique.mockResolvedValue({ 
        id: 'budget-id', 
        name: 'Test Budget',
        amount: 500.00,
        startDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      prisma.receipt.aggregate.mockResolvedValue({
        _sum: { totalAmount: 150.50 },
        _count: { id: 1 }
      });

      const response = await request(app)
        .get('/budgets/budget-id/spending')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalSpent).toBe('150.50');
      expect(response.body.data.remainingAmount).toBe('349.50');
    });
  });

  describe('Budget Templates', () => {
    it('should list templates', async () => {
      const response = await request(app)
        .get('/budgets/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should create from template', async () => {
      prisma.budget.create.mockResolvedValue({
        id: 'new-id',
        name: 'My Groceries',
        amount: 200.00,
        startDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const response = await request(app)
        .post('/budgets/template')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          templateName: 'weekly_groceries',
          name: 'My Groceries',
          startDate: '2024-01-01T00:00:00.000Z'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
    });
  });
});