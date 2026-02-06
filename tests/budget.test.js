const request = require('supertest');
const app = require('../server/index');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('../server/utils/jwt');

const prisma = new PrismaClient();

describe('Budget Management', () => {
  let adminToken, helperToken, masterToken;
  let adminUser, helperUser, masterUser;
  let testBudget;

  beforeAll(async () => {
    // Create test users
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    masterUser = await prisma.user.create({
      data: {
        email: 'master@budget.test',
        password: hashedPassword,
        firstName: 'Master',
        lastName: 'User',
        role: 'MASTER'
      }
    });

    adminUser = await prisma.user.create({
      data: {
        email: 'admin@budget.test',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN',
        masterAccountId: masterUser.id
      }
    });

    helperUser = await prisma.user.create({
      data: {
        email: 'helper@budget.test',
        password: hashedPassword,
        firstName: 'Helper',
        lastName: 'User',
        role: 'HELPER',
        masterAccountId: masterUser.id
      }
    });

    // Generate tokens
    masterToken = jwt.generateToken({ id: masterUser.id, email: masterUser.email, role: masterUser.role });
    adminToken = jwt.generateToken({ id: adminUser.id, email: adminUser.email, role: adminUser.role });
    helperToken = jwt.generateToken({ id: helperUser.id, email: helperUser.email, role: helperUser.role });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.budget.deleteMany({
      where: { createdBy: { in: [masterUser.id, adminUser.id] } }
    });
    await prisma.user.deleteMany({
      where: { id: { in: [masterUser.id, adminUser.id, helperUser.id] } }
    });
    await prisma.$disconnect();
  });

  describe('POST /budgets', () => {
    it('should create budget with admin role', async () => {
      const budgetData = {
        name: 'Weekly Groceries',
        description: 'Budget for weekly grocery shopping',
        amount: '150.00',
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-01-07T23:59:59.999Z',
        isRecurring: true,
        recurrence: 'WEEKLY'
      };

      const response = await request(app)
        .post('/budgets')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(budgetData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(budgetData.name);
      expect(response.body.data.amount).toBe(budgetData.amount);
      expect(response.body.data.createdBy).toBe(adminUser.id);

      testBudget = response.body.data;
    });

    it('should fail with helper role', async () => {
      const budgetData = {
        name: 'Helper Budget',
        amount: '100.00',
        startDate: '2024-01-01T00:00:00.000Z'
      };

      const response = await request(app)
        .post('/budgets')
        .set('Authorization', `Bearer ${helperToken}`)
        .send(budgetData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Insufficient permissions');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/budgets')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should validate amount format', async () => {
      const budgetData = {
        name: 'Invalid Budget',
        amount: 'invalid',
        startDate: '2024-01-01T00:00:00.000Z'
      };

      const response = await request(app)
        .post('/budgets')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(budgetData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /budgets', () => {
    it('should list budgets for admin', async () => {
      const response = await request(app)
        .get('/budgets')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('Weekly Groceries');
    });

    it('should list budgets for helper', async () => {
      const response = await request(app)
        .get('/budgets')
        .set('Authorization', `Bearer ${helperToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/budgets?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(10);
    });
  });

  describe('GET /budgets/:id', () => {
    it('should get single budget', async () => {
      const response = await request(app)
        .get(`/budgets/${testBudget.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testBudget.id);
      expect(response.body.data.name).toBe(testBudget.name);
    });

    it('should return 404 for non-existent budget', async () => {
      const response = await request(app)
        .get('/budgets/non-existent-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /budgets/:id', () => {
    it('should update budget with admin role', async () => {
      const updateData = {
        name: 'Updated Weekly Groceries',
        amount: '200.00'
      };

      const response = await request(app)
        .put(`/budgets/${testBudget.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.amount).toBe(updateData.amount);
    });

    it('should fail with helper role', async () => {
      const response = await request(app)
        .put(`/budgets/${testBudget.id}`)
        .set('Authorization', `Bearer ${helperToken}`)
        .send({ name: 'Hacked Budget' })
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /budgets/:id', () => {
    it('should delete budget with admin role', async () => {
      const response = await request(app)
        .delete(`/budgets/${testBudget.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted');
    });

    it('should fail with helper role', async () => {
      // Create a new budget for deletion test
      const newBudget = await request(app)
        .post('/budgets')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Budget',
          amount: '100.00',
          startDate: '2024-01-01T00:00:00.000Z'
        });

      const response = await request(app)
        .delete(`/budgets/${newBudget.data.id}`)
        .set('Authorization', `Bearer ${helperToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /budgets/:id/spending', () => {
    let budgetWithSpending;

    beforeAll(async () => {
      // Create budget for spending test
      const budgetResponse = await request(app)
        .post('/budgets')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Budget with Spending',
          amount: '500.00',
          startDate: '2024-01-01T00:00:00.000Z',
          endDate: '2024-01-31T23:59:59.999Z'
        });

      budgetWithSpending = budgetResponse.data;

      // Create receipt with spending
      await request(app)
        .post('/receipts/manual')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          storeName: 'Test Store',
          totalAmount: '150.50',
          purchaseDate: '2024-01-15T10:00:00.000Z',
          budgetId: budgetWithSpending.id,
          items: [
            {
              name: 'Test Item',
              quantity: 1,
              unitPrice: '150.50',
              totalPrice: '150.50',
              categoryId: (await prisma.category.findFirst()).id
            }
          ]
        });
    });

    it('should get spending against budget', async () => {
      const response = await request(app)
        .get(`/budgets/${budgetWithSpending.id}/spending`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.budgetId).toBe(budgetWithSpending.id);
      expect(response.body.data.totalSpent).toBe('150.50');
      expect(response.body.data.remainingAmount).toBe('349.50');
      expect(response.body.data.percentageUsed).toBe('30.10');
    });

    afterAll(async () => {
      // Clean up
      await prisma.receipt.deleteMany({
        where: { budgetId: budgetWithSpending.id }
      });
      await prisma.budget.delete({
        where: { id: budgetWithSpending.id }
      });
    });
  });

  describe('Budget Templates', () => {
    describe('GET /budgets/templates', () => {
      it('should list budget templates', async () => {
        const response = await request(app)
          .get('/budgets/templates')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(Array.isArray(response.body.data)).toBe(true);
      });
    });

    describe('POST /budgets/template', () => {
      it('should create budget from template', async () => {
        const templateData = {
          templateName: 'weekly_groceries',
          name: 'My Weekly Groceries',
          amount: '200.00',
          startDate: '2024-01-01T00:00:00.000Z'
        };

        const response = await request(app)
          .post('/budgets/template')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(templateData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.name).toBe(templateData.name);
        expect(response.body.data.isRecurring).toBe(true);
        expect(response.body.data.recurrence).toBe('WEEKLY');
      });
    });
  });
});