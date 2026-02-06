// Mock database for budget workflow tests
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

describe('Budget Management - Complete Workflow', () => {
  let adminToken, helperToken, masterToken;
  let adminUser, helperUser, masterUser;
  let weeklyBudget, monthlyBudget, assignedBudget;

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

  describe('Complete Budget Management Workflow', () => {
    it('should demonstrate core budget functionality', async () => {
      // Step 1: Create weekly recurring budget
      const weeklyBudgetData = {
        name: 'Weekly Groceries',
        description: 'Budget for weekly grocery shopping',
        amount: '200.00',
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-01-07T23:59:59.999Z',
        isRecurring: true,
        recurrence: 'WEEKLY'
      };

      prisma.budget.create.mockResolvedValue({
        id: 'weekly-budget-id',
        ...weeklyBudgetData,
        amount: 200.00,
        createdBy: adminUser.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        startDate: new Date(weeklyBudgetData.startDate),
        endDate: new Date(weeklyBudgetData.endDate),
        creator: { id: adminUser.id, firstName: 'Admin', lastName: 'User', email: 'admin@test.com' }
      });

      const weeklyResponse = await request(app)
        .post('/budgets')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(weeklyBudgetData)
        .expect(201);

      expect(weeklyResponse.body.success).toBe(true);
      expect(weeklyResponse.body.data.isRecurring).toBe(true);
      expect(weeklyResponse.body.data.recurrence).toBe('WEEKLY');
      weeklyBudget = weeklyResponse.body.data;

      // Step 2: Create monthly budget from template
      prisma.budget.create.mockResolvedValue({
        id: 'monthly-budget-id',
        name: 'Monthly Utilities',
        description: 'Budget for monthly utility bills',
        amount: 300.00,
        startDate: new Date('2024-01-01T00:00:00.000Z'),
        endDate: new Date('2024-01-31T23:59:59.999Z'),
        isRecurring: true,
        recurrence: 'MONTHLY',
        createdBy: adminUser.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        creator: { id: adminUser.id, firstName: 'Admin', lastName: 'User', email: 'admin@test.com' }
      });

      const templateResponse = await request(app)
        .post('/budgets/template')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          templateName: 'monthly_utilities',
          name: 'Monthly Utilities',
          amount: '300.00',
          startDate: '2024-01-01T00:00:00.000Z'
        })
        .expect(201);

      expect(templateResponse.body.success).toBe(true);
      expect(templateResponse.body.data.name).toBe('Monthly Utilities');
      monthlyBudget = templateResponse.body.data;

      // Step 3: Assign budget to helper
      prisma.budget.findUnique.mockResolvedValue({ 
        id: weeklyBudget.id, 
        createdBy: adminUser.id,
        amount: 200,
        startDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      });
      prisma.user.findUnique.mockResolvedValue({ id: helperUser.id });
      prisma.budgetAssignment.upsert.mockResolvedValue({
        id: 'assignment-id',
        budgetId: weeklyBudget.id,
        userId: helperUser.id,
        assignedBy: adminUser.id,
        createdAt: new Date()
      });

      const assignResponse = await request(app)
        .post(`/budgets/${weeklyBudget.id}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: helperUser.id })
        .expect(201);

      expect(assignResponse.body.success).toBe(true);
      expect(assignResponse.body.data.userId).toBe(helperUser.id);
      assignedBudget = assignResponse.body.data;

      // Step 4: Track spending against budget
      prisma.budget.findUnique.mockResolvedValue({ 
        id: weeklyBudget.id, 
        name: 'Weekly Groceries',
        amount: 200.00,
        startDate: new Date(),
        endDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      prisma.receipt.aggregate.mockResolvedValue({
        _sum: { totalAmount: 150.50 },
        _count: { id: 3 }
      });

      const spendingResponse = await request(app)
        .get(`/budgets/${weeklyBudget.id}/spending`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(spendingResponse.body.success).toBe(true);
      expect(spendingResponse.body.data.totalSpent).toBe('150.50');
      expect(spendingResponse.body.data.remainingAmount).toBe('49.50');
      expect(spendingResponse.body.data.percentageUsed).toBe('75.25');
      expect(spendingResponse.body.data.receiptCount).toBe(3);
      expect(spendingResponse.body.data.isOverBudget).toBe(false);

      // Step 5: Test role-based permissions (helper should not be able to create budgets)
      const helperCreateResponse = await request(app)
        .post('/budgets')
        .set('Authorization', `Bearer ${helperToken}`)
        .send({
          name: 'Helper Budget',
          amount: '100.00',
          startDate: '2024-01-01T00:00:00.000Z'
        })
        .expect(403);

      expect(helperCreateResponse.body.success).toBe(false);
    });

    it('should handle budget rollover for recurring budgets', async () => {
      // Test budget rollover functionality
      const recurringBudget = {
        id: 'recurring-budget-id',
        name: 'Weekly Transport',
        amount: 50.00,
        startDate: new Date('2024-01-01T00:00:00.000Z'),
        endDate: new Date('2024-01-07T23:59:59.999Z'),
        isRecurring: true,
        recurrence: 'WEEKLY',
        createdBy: adminUser.id,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      prisma.budget.findUnique.mockResolvedValue(recurringBudget);
      prisma.receipt.aggregate.mockResolvedValue({
        _sum: { totalAmount: 30.00 },
        _count: { id: 2 }
      });

      // Mock the new budget creation for rollover
      prisma.budget.create.mockResolvedValue({
        ...recurringBudget,
        id: 'new-rollover-budget-id',
        amount: 70.00, // 50 + 20 remaining
        startDate: new Date('2024-01-08T00:00:00.000Z'),
        endDate: new Date('2024-01-15T23:59:59.999Z')
      });

      const rolloverResponse = await request(app)
        .post(`/budgets/${recurringBudget.id}/rollover`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ rolloverPolicy: 'carry_forward' })
        .expect(200);

      expect(rolloverResponse.body.success).toBe(true);
      expect(rolloverResponse.body.message).toContain('rollover handled');
    });

    it('should validate decimal precision for financial calculations', async () => {
      // Test decimal precision handling - amount should be validated to 2 decimal places
      const preciseBudget = {
        name: 'Precise Budget',
        amount: '123.45', // Valid 2 decimal places
        startDate: '2024-01-01T00:00:00.000Z'
      };

      prisma.budget.create.mockResolvedValue({
        id: 'precise-budget-id',
        name: preciseBudget.name,
        amount: 123.45,
        startDate: new Date(preciseBudget.startDate),
        createdBy: adminUser.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        creator: { id: adminUser.id, firstName: 'Admin', lastName: 'User', email: 'admin@test.com' }
      });

      const preciseResponse = await request(app)
        .post('/budgets')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(preciseBudget)
        .expect(201);

      expect(preciseResponse.body.success).toBe(true);
      expect(preciseResponse.body.data.amount).toBe('123.45');
    });

    it('should handle timezone-aware budget periods', async () => {
      // Test timezone handling
      const timezoneBudget = {
        name: 'Timezone Budget',
        amount: '100.00',
        startDate: '2024-01-01T00:00:00.000Z', // UTC
        endDate: '2024-01-31T23:59:59.999Z'   // UTC
      };

      prisma.budget.create.mockResolvedValue({
        id: 'timezone-budget-id',
        name: timezoneBudget.name,
        amount: 100.00,
        startDate: new Date(timezoneBudget.startDate),
        endDate: new Date(timezoneBudget.endDate),
        createdBy: adminUser.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        creator: { id: adminUser.id, firstName: 'Admin', lastName: 'User', email: 'admin@test.com' }
      });

      const timezoneResponse = await request(app)
        .post('/budgets')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(timezoneBudget)
        .expect(201);

      expect(timezoneResponse.body.success).toBe(true);
      expect(timezoneResponse.body.data.startDate).toBe('2024-01-01T00:00:00.000Z');
      expect(timezoneResponse.body.data.endDate).toBe('2024-01-31T23:59:59.999Z');
    });
  });
});