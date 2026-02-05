require('dotenv').config({ path: '.env.test' });

const { prisma, testConnection } = require('../server/config/database');

describe('Database Connection', () => {
  let dbAvailable = false;

  beforeAll(async () => {
    try {
      await testConnection();
      dbAvailable = true;
    } catch (error) {
      console.log('Database not available for tests');
      dbAvailable = false;
    }
  });

  afterAll(async () => {
    if (dbAvailable) {
      await prisma.$disconnect();
    }
  });

  test('should have prisma client available', () => {
    expect(prisma).toBeDefined();
  });

  test('should connect to database when available', async () => {
    if (!dbAvailable) {
      console.log('Skipping database test - PostgreSQL not running');
      return;
    }
    
    const result = await prisma.$queryRaw`SELECT 1`;
    expect(result).toBeDefined();
  });
});

describe('Database Schema Validation', () => {
  let dbAvailable = false;

  beforeAll(async () => {
    try {
      await testConnection();
      dbAvailable = true;
    } catch (error) {
      console.log('Database not available for schema tests');
      dbAvailable = false;
    }
  });

  test('should enforce non-nullable password field', async () => {
    if (!dbAvailable) return;
    
    await expect(
      prisma.user.create({
        data: {
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          // password field missing
        },
      })
    ).rejects.toThrow();
  });

  test('should enforce email uniqueness', async () => {
    if (!dbAvailable) return;
    
    const email = 'unique@example.com';
    
    // Create first user
    await prisma.user.create({
      data: {
        email,
        password: 'hashedpassword',
        firstName: 'Test',
        lastName: 'User',
      },
    });

    // Try to create second user with same email
    await expect(
      prisma.user.create({
        data: {
          email,
          password: 'hashedpassword2',
          firstName: 'Test2',
          lastName: 'User2',
        },
      })
    ).rejects.toThrow();
  });

  test('should validate BudgetRecurrence enum values', async () => {
    if (!dbAvailable) return;
    
    // Create test user for budget
    const user = await prisma.user.create({
      data: {
        email: 'budget@example.com',
        password: 'hashedpassword',
        firstName: 'Budget',
        lastName: 'Test',
      },
    });

    // Test valid enum values
    await expect(
      prisma.budget.create({
        data: {
          name: 'Test Budget',
          amount: 100.50,
          recurrence: 'WEEKLY',
          createdBy: user.id,
          startDate: new Date(),
        },
      })
    ).resolves.toBeDefined();

    await expect(
      prisma.budget.create({
        data: {
          name: 'Test Budget 2',
          amount: 200.75,
          recurrence: 'MONTHLY',
          createdBy: user.id,
          startDate: new Date(),
        },
      })
    ).resolves.toBeDefined();

    // Test invalid enum value should fail
    await expect(
      prisma.budget.create({
        data: {
          name: 'Invalid Budget',
          amount: 300.00,
          recurrence: 'INVALID_VALUE',
          createdBy: user.id,
          startDate: new Date(),
        },
      })
    ).rejects.toThrow();
  });

  test('should validate ReceiptStatus enum with IN_PROGRESS', async () => {
    if (!dbAvailable) return;
    
    // Create test user
    const user = await prisma.user.create({
      data: {
        email: 'receipt@example.com',
        password: 'hashedpassword',
        firstName: 'Receipt',
        lastName: 'Test',
      },
    });

    // Test IN_PROGRESS status
    await expect(
      prisma.receipt.create({
        data: {
          userId: user.id,
          totalAmount: 50.25,
          purchaseDate: new Date(),
          status: 'IN_PROGRESS',
        },
      })
    ).resolves.toBeDefined();
  });

  test('should enforce foreign key constraints', async () => {
    if (!dbAvailable) return;
    
    // Test receipt with invalid user ID
    await expect(
      prisma.receipt.create({
        data: {
          userId: 'invalid-user-id',
          totalAmount: 25.00,
          purchaseDate: new Date(),
        },
      })
    ).rejects.toThrow();

    // Test receipt item with invalid receipt ID
    await expect(
      prisma.receiptItem.create({
        data: {
          receiptId: 'invalid-receipt-id',
          categoryId: 'invalid-category-id',
          name: 'Test Item',
          quantity: 1,
          unitPrice: 10.00,
          totalPrice: 10.00,
        },
      })
    ).rejects.toThrow();
  });

  test('should handle Decimal fields correctly', async () => {
    if (!dbAvailable) return;
    
    const user = await prisma.user.create({
      data: {
        email: 'decimal@example.com',
        password: 'hashedpassword',
        firstName: 'Decimal',
        lastName: 'Test',
      },
    });

    // Test budget with decimal amount
    const budget = await prisma.budget.create({
      data: {
        name: 'Decimal Budget',
        amount: 123.456,
        createdBy: user.id,
        startDate: new Date(),
      },
    });

    expect(budget.amount.toNumber()).toBe(123.456);

    // Test receipt with decimal amount
    const receipt = await prisma.receipt.create({
      data: {
        userId: user.id,
        totalAmount: 78.901,
        purchaseDate: new Date(),
        budgetId: budget.id,
      },
    });

    expect(receipt.totalAmount.toNumber()).toBe(78.901);

    // Test receipt item with decimal prices
    const category = await prisma.category.create({
      data: {
        name: 'Test Category',
        color: '#ff0000',
      },
    });

    const item = await prisma.receiptItem.create({
      data: {
        receiptId: receipt.id,
        categoryId: category.id,
        name: 'Test Item',
        quantity: 2.5,
        unitPrice: 15.99,
        totalPrice: 39.975,
      },
    });

    expect(item.quantity.toNumber()).toBe(2.5);
    expect(item.unitPrice.toNumber()).toBe(15.99);
    expect(item.totalPrice.toNumber()).toBe(39.975);
  });
});