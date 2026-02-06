// Mock database for analytics tests
jest.mock('../server/config/database', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    receipt: {
      findMany: jest.fn(),
      aggregate: jest.fn(),
      groupBy: jest.fn(),
    },
    receiptItem: {
      groupBy: jest.fn(),
      findMany: jest.fn(),
    },
    budget: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      aggregate: jest.fn(),
    },
    category: {
      findMany: jest.fn(),
    },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  },
}));

const AnalyticsService = require('../server/services/analyticsService');
const { prisma } = require('../server/config/database');
const Decimal = require('decimal.js');

describe('Analytics Service', () => {
  let analyticsService;
  let testUser;

  beforeAll(() => {
    analyticsService = new AnalyticsService();
    testUser = {
      id: 'user-1',
      email: 'test@example.com',
      role: 'ADMIN',
      timezone: 'Asia/Singapore'
    };
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getSpendingOverview', () => {
    it('should calculate spending overview with trends', async () => {
      // Mock database responses
      prisma.receipt.aggregate.mockResolvedValueOnce({
        _sum: { totalAmount: 1500.75 },
        _count: { id: 25 }
      });

      prisma.budget.aggregate.mockResolvedValueOnce({
        _sum: { amount: 2000.00 },
        _count: { id: 3 }
      });

      // Mock previous period data for trends
      prisma.receipt.aggregate.mockResolvedValueOnce({
        _sum: { totalAmount: 1200.50 },
        _count: { id: 20 }
      });

      const result = await analyticsService.getSpendingOverview(testUser.id, {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        previousStartDate: '2023-12-01',
        previousEndDate: '2023-12-31'
      });

      expect(result.totalSpent).toBe('1500.75');
      expect(result.transactionCount).toBe(25);
      expect(result.totalBudget).toBe('2000.00');
      expect(result.remainingBudget).toBe('499.25');
      expect(result.budgetUtilization).toBe('75.04');
      expect(result.averageTransaction).toBe('60.03');
      expect(result.spendingTrend).toBe('+25.0%'); // (1500.75 - 1200.50) / 1200.50 * 100
    });

    it('should handle zero spending gracefully', async () => {
      prisma.receipt.aggregate.mockResolvedValue({
        _sum: { totalAmount: null },
        _count: { id: 0 }
      });

      prisma.budget.aggregate.mockResolvedValue({
        _sum: { amount: 1000.00 },
        _count: { id: 2 }
      });

      const result = await analyticsService.getSpendingOverview(testUser.id);

      expect(result.totalSpent).toBe('0.00');
      expect(result.transactionCount).toBe(0);
      expect(result.averageTransaction).toBe('0.00');
      expect(result.spendingTrend).toBe('0.0%');
    });

    it('should handle division by zero for trends', async () => {
      prisma.receipt.aggregate.mockResolvedValueOnce({
        _sum: { totalAmount: 500.00 },
        _count: { id: 10 }
      });

      prisma.budget.aggregate.mockResolvedValue({
        _sum: { amount: 1000.00 },
        _count: { id: 2 }
      });

      // Previous period has zero spending
      prisma.receipt.aggregate.mockResolvedValueOnce({
        _sum: { totalAmount: null },
        _count: { id: 0 }
      });

      const result = await analyticsService.getSpendingOverview(testUser.id, {
        previousStartDate: '2023-12-01',
        previousEndDate: '2023-12-31'
      });

      expect(result.spendingTrend).toBe('N/A');
    });
  });

  describe('getCategoryBreakdown', () => {
    it('should calculate category spending with percentages', async () => {
      const mockCategoryData = [
        { categoryId: 'cat-1', _sum: { totalPrice: 500.00 } },
        { categoryId: 'cat-2', _sum: { totalPrice: 300.00 } },
        { categoryId: 'cat-3', _sum: { totalPrice: 200.00 } }
      ];

      const mockCategories = [
        { id: 'cat-1', name: 'Groceries', color: '#4CAF50' },
        { id: 'cat-2', name: 'Transport', color: '#2196F3' },
        { id: 'cat-3', name: 'Entertainment', color: '#FF9800' }
      ];

      prisma.receiptItem.groupBy.mockResolvedValue(mockCategoryData);
      prisma.category.findMany.mockResolvedValue(mockCategories);

      const result = await analyticsService.getCategoryBreakdown(testUser.id);

      expect(result.categories).toHaveLength(3);
      expect(result.categories[0]).toMatchObject({
        categoryId: 'cat-1',
        categoryName: 'Groceries',
        amount: '500.00',
        percentage: '50.0'
      });
      expect(result.totalSpending).toBe('1000.00');
    });

    it('should handle empty category data', async () => {
      prisma.receiptItem.groupBy.mockResolvedValue([]);
      prisma.category.findMany.mockResolvedValue([]);

      const result = await analyticsService.getCategoryBreakdown(testUser.id);

      expect(result.categories).toHaveLength(0);
      expect(result.totalSpending).toBe('0.00');
    });
  });

  describe('getSpendingTrends', () => {
    it('should calculate week-on-week spending trends', async () => {
      const mockWeeklyData = [
        { week: '2024-W01', _sum: { totalAmount: 400.00 }, _count: { id: 8 } },
        { week: '2024-W02', _sum: { totalAmount: 350.00 }, _count: { id: 7 } },
        { week: '2024-W03', _sum: { totalAmount: 450.00 }, _count: { id: 9 } },
        { week: '2024-W04', _sum: { totalAmount: 300.00 }, _count: { id: 6 } }
      ];

      prisma.receipt.groupBy.mockResolvedValue(mockWeeklyData);

      const result = await analyticsService.getSpendingTrends(testUser.id, {
        period: 'weekly',
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      });

      expect(result.trends).toHaveLength(4);
      expect(result.trends[0]).toMatchObject({
        period: '2024-W01',
        amount: '400.00',
        transactionCount: 8,
        averageTransaction: '50.00'
      });
      expect(result.weekOverWeekChange).toBe('-33.3%'); // (300 - 450) / 450 * 100
    });

    it('should calculate month-on-month spending trends', async () => {
      const mockMonthlyData = [
        { month: '2024-01', _sum: { totalAmount: 1500.00 }, _count: { id: 30 } },
        { month: '2024-02', _sum: { totalAmount: 1800.00 }, _count: { id: 35 } }
      ];

      prisma.receipt.groupBy.mockResolvedValue(mockMonthlyData);

      const result = await analyticsService.getSpendingTrends(testUser.id, {
        period: 'monthly',
        startDate: '2024-01-01',
        endDate: '2024-02-29'
      });

      expect(result.trends).toHaveLength(2);
      expect(result.monthOverMonthChange).toBe('+20.0%'); // (1800 - 1500) / 1500 * 100
    });
  });

  describe('getBudgetPerformance', () => {
    it('should calculate budget utilization for all budgets', async () => {
      const mockBudgets = [
        {
          id: 'budget-1',
          name: 'Weekly Groceries',
          amount: 200.00,
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-07')
        },
        {
          id: 'budget-2',
          name: 'Monthly Transport',
          amount: 150.00,
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31')
        }
      ];

      const mockSpending = [
        { budgetId: 'budget-1', _sum: { totalAmount: 180.00 }, _count: { id: 15 } },
        { budgetId: 'budget-2', _sum: { totalAmount: 75.00 }, _count: { id: 8 } }
      ];

      prisma.budget.findMany.mockResolvedValue(mockBudgets);
      prisma.receipt.groupBy.mockResolvedValue(mockSpending);

      const result = await analyticsService.getBudgetPerformance(testUser.id);

      expect(result.budgets).toHaveLength(2);
      expect(result.budgets[0]).toMatchObject({
        budgetId: 'budget-1',
        budgetName: 'Weekly Groceries',
        budgetAmount: '200.00',
        spent: '180.00',
        remaining: '20.00',
        utilization: '90.0',
        isOverBudget: false
      });
      expect(result.overallUtilization).toBe('72.9'); // (180+75)/(200+150)*100
    });

    it('should identify over-budget scenarios', async () => {
      const mockBudgets = [
        {
          id: 'budget-1',
          name: 'Test Budget',
          amount: 100.00,
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31')
        }
      ];

      const mockSpending = [
        { budgetId: 'budget-1', _sum: { totalAmount: 120.00 }, _count: { id: 10 } }
      ];

      prisma.budget.findMany.mockResolvedValue(mockBudgets);
      prisma.receipt.groupBy.mockResolvedValue(mockSpending);

      const result = await analyticsService.getBudgetPerformance(testUser.id);

      expect(result.budgets[0].isOverBudget).toBe(true);
      expect(result.budgets[0].remaining).toBe('-20.00');
    });
  });

  describe('getTopSpending', () => {
    it('should identify top spending categories', async () => {
      const mockCategorySpending = [
        { categoryId: 'cat-1', _sum: { totalPrice: 800.00 }, _count: { id: 25 } },
        { categoryId: 'cat-2', _sum: { totalPrice: 600.00 }, _count: { id: 18 } },
        { categoryId: 'cat-3', _sum: { totalPrice: 400.00 }, _count: { id: 12 } }
      ];

      const mockCategories = [
        { id: 'cat-1', name: 'Groceries' },
        { id: 'cat-2', name: 'Transport' },
        { id: 'cat-3', name: 'Entertainment' }
      ];

      prisma.receiptItem.groupBy.mockResolvedValue(mockCategorySpending);
      prisma.category.findMany.mockResolvedValue(mockCategories);

      const result = await analyticsService.getTopSpending(testUser.id, {
        type: 'categories',
        limit: 10
      });

      expect(result.topCategories).toHaveLength(3);
      expect(result.topCategories[0]).toMatchObject({
        name: 'Groceries',
        amount: '800.00',
        percentage: '44.4' // 800/1800 * 100
      });
    });

    it('should identify top spending items', async () => {
      const mockItems = [
        {
          name: 'Organic Milk',
          _sum: { totalPrice: 150.00 },
          _count: { id: 10 },
          category: { name: 'Groceries' }
        },
        {
          name: 'Gasoline',
          _sum: { totalPrice: 200.00 },
          _count: { id: 4 },
          category: { name: 'Transport' }
        }
      ];

      prisma.receiptItem.groupBy.mockResolvedValue(mockItems);

      const result = await analyticsService.getTopSpending(testUser.id, {
        type: 'items',
        limit: 10
      });

      expect(result.topItems).toHaveLength(2);
      expect(result.topItems[0]).toMatchObject({
        name: 'Organic Milk',
        amount: '150.00',
        purchaseCount: 10,
        averagePrice: '15.00'
      });
    });
  });

  describe('getStoreAnalysis', () => {
    it('should analyze store preferences and spending', async () => {
      const mockStoreData = [
        { storeName: 'NTUC FairPrice', _sum: { totalAmount: 500.00 }, _count: { id: 12 } },
        { storeName: 'Cold Storage', _sum: { totalAmount: 350.00 }, _count: { id: 8 } },
        { storeName: 'Sheng Siong', _sum: { totalAmount: 200.00 }, _count: { id: 5 } }
      ];

      prisma.receipt.groupBy.mockResolvedValue(mockStoreData);

      const result = await analyticsService.getStoreAnalysis(testUser.id);

      expect(result.stores).toHaveLength(3);
      expect(result.stores[0]).toMatchObject({
        storeName: 'NTUC FairPrice',
        totalSpent: '500.00',
        visitCount: 12,
        averageSpent: '41.67',
        percentage: '47.6' // 500/1050 * 100
      });
      expect(result.preferredStore).toBe('NTUC FairPrice');
    });

    it('should handle missing store names', async () => {
      const mockStoreData = [
        { storeName: null, _sum: { totalAmount: 100.00 }, _count: { id: 3 } },
        { storeName: 'NTUC FairPrice', _sum: { totalAmount: 200.00 }, _count: { id: 5 } }
      ];

      prisma.receipt.groupBy.mockResolvedValue(mockStoreData);

      const result = await analyticsService.getStoreAnalysis(testUser.id);

      expect(result.stores[0].storeName).toBe('Unknown Store');
    });
  });

  describe('getTimeBasedAnalytics', () => {
    it('should analyze spending by time of day', async () => {
      // Mock hourly spending data
      const mockHourlyData = Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        _sum: { totalAmount: i % 6 === 0 ? 100.00 : 50.00 },
        _count: { id: i % 6 === 0 ? 5 : 2 }
      }));

      prisma.receipt.groupBy.mockResolvedValue(mockHourlyData);

      const result = await analyticsService.getTimeBasedAnalytics(testUser.id, {
        type: 'hourly'
      });

      expect(result.hourlyBreakdown).toHaveLength(24);
      expect(result.peakSpendingHour).toBeDefined();
      expect(result.peakSpendingHour.hour).toBe(0); // Hour 0 has 100.00
      expect(result.peakSpendingHour.amount).toBe('100.00');
    });

    it('should analyze spending by day of week', async () => {
      const mockDailyData = [
        { dayOfWeek: 1, _sum: { totalAmount: 200.00 }, _count: { id: 8 } }, // Monday
        { dayOfWeek: 6, _sum: { totalAmount: 400.00 }, _count: { id: 12 } }, // Saturday
        { dayOfWeek: 0, _sum: { totalAmount: 350.00 }, _count: { id: 10 } }  // Sunday
      ];

      prisma.receipt.groupBy.mockResolvedValue(mockDailyData);

      const result = await analyticsService.getTimeBasedAnalytics(testUser.id, {
        type: 'daily'
      });

      expect(result.dailyBreakdown).toHaveLength(3);
      expect(result.peakSpendingDay.day).toBe(6); // Saturday with 400.00
      expect(result.weekendSpending).toBe('750.00'); // Saturday + Sunday
      expect(result.weekdaySpending).toBe('200.00'); // Monday
    });
  });

  describe('Purchase Analytics', () => {
    it('should calculate purchase frequency metrics', async () => {
      prisma.receipt.aggregate.mockResolvedValue({
        _count: { id: 45 },
        _sum: { totalAmount: 2250.00 }
      });

      const result = await analyticsService.getPurchaseAnalytics(testUser.id, {
        period: 'monthly' // 30 days
      });

      expect(result.totalPurchases).toBe(45);
      expect(result.averageDailyPurchases).toBe('1.5'); // 45/30
      expect(result.averageBasketSize).toBe('50.00'); // 2250/45
      expect(result.totalSpent).toBe('2250.00');
    });

    it('should calculate purchase patterns', async () => {
      const mockReceipts = [
        { purchaseDate: new Date('2024-01-15T10:00:00Z') },
        { purchaseDate: new Date('2024-01-15T18:30:00Z') },
        { purchaseDate: new Date('2024-01-16T09:15:00Z') }
      ];

      prisma.receipt.findMany.mockResolvedValue(mockReceipts);

      const result = await analyticsService.getPurchaseAnalytics(testUser.id, {
        includePatterns: true
      });

      expect(result.mostCommonPurchaseTime).toBeDefined();
      expect(result.purchaseDays).toBe(2); // 2 distinct days
    });
  });
});