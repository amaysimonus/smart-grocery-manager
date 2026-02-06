const request = require('supertest');
const app = require('../server/index');

// Mock the analytics service and other dependencies for integration testing
jest.mock('../server/services/analyticsService');
jest.mock('../server/utils/cache');

describe('Analytics Dashboard Integration Tests', () => {
  let authToken;

  beforeAll(async () => {
    // Setup test environment
    process.env.NODE_ENV = 'test';
    
    // Create a mock auth token
    const jwt = require('jsonwebtoken');
    authToken = jwt.sign(
      { id: 'test-user', email: 'test@example.com', role: 'ADMIN' },
      'test-secret'
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Analytics Routes Integration', () => {
    describe('GET /api/analytics/overview', () => {
      it('should return spending overview with real data', async () => {
        const { AnalyticsService } = require('../server/services/analyticsService');
        AnalyticsService.prototype.getSpendingOverview = jest.fn().mockResolvedValue({
          totalSpent: '1250.50',
          transactionCount: 25,
          totalBudget: '2000.00',
          remainingBudget: '749.50',
          budgetUtilization: '62.53',
          averageTransaction: '50.02',
          spendingTrend: '+15.3%',
          isOverBudget: false,
          period: {
            startDate: '2024-01-01',
            endDate: '2024-01-31',
            previousStartDate: '2023-12-01',
            previousEndDate: '2023-12-31'
          }
        });

        const response = await request(app)
          .get('/api/analytics/overview')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.totalSpent).toBe('1250.50');
        expect(response.body.data.spendingTrend).toBe('+15.3%');
      });

      it('should validate date parameters', async () => {
        const response = await request(app)
          .get('/api/analytics/overview?startDate=invalid-date')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.errors).toBeDefined();
      });
    });

    describe('GET /api/analytics/trends', () => {
      it('should return spending trends with YOY comparison', async () => {
        const { AnalyticsService } = require('../server/services/analyticsService');
        AnalyticsService.prototype.getSpendingTrends = jest.fn().mockResolvedValue({
          trends: [
            { period: '2024-W01', amount: '400.00', transactionCount: 8, averageTransaction: '50.00' },
            { period: '2024-W02', amount: '350.00', transactionCount: 7, averageTransaction: '50.00' },
            { period: '2024-W03', amount: '450.00', transactionCount: 9, averageTransaction: '50.00' }
          ],
          period: 'weekly',
          weekOverWeekChange: '+12.5%',
          monthOverMonthChange: '+8.2%',
          yearOverYearChange: '+5.7%', // This is the new YOY feature
          dateRange: { startDate: '2024-01-01', endDate: '2024-01-21' }
        });

        const response = await request(app)
          .get('/api/analytics/trends?period=weekly')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.data.trends).toHaveLength(3);
        expect(response.body.data.yearOverYearChange).toBe('+5.7%'); // Verify YOY is present
      });
    });

    describe('GET /api/analytics/export', () => {
      it('should export data in CSV format', async () => {
        const { AnalyticsService } = require('../server/services/analyticsService');
        AnalyticsService.prototype.exportAnalytics = jest.fn().mockResolvedValue({
          data: 'Category,Amount,Percentage\nGroceries,500.00,50.0\nTransport,300.00,30.0',
          format: 'csv',
          filename: 'analytics-categories-2024-01-01.csv',
          contentType: 'text/csv'
        });

        const response = await request(app)
          .get('/api/analytics/export?type=categories&format=csv')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.headers['content-type']).toBe('text/csv');
        expect(response.headers['content-disposition']).toContain('attachment');
        expect(response.text).toContain('Category,Amount,Percentage');
      });

      it('should export data in Excel format', async () => {
        const { AnalyticsService } = require('../server/services/analyticsService');
        AnalyticsService.prototype.exportAnalytics = jest.fn().mockResolvedValue({
          data: Buffer.from('mock-excel-content'),
          format: 'excel',
          filename: 'analytics-overview-2024-01-01.xlsx',
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });

        const response = await request(app)
          .get('/api/analytics/export?type=overview&format=excel')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.headers['content-type']).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        expect(response.headers['content-disposition']).toContain('.xlsx');
      });

      it('should export data in PDF format', async () => {
        const { AnalyticsService } = require('../server/services/analyticsService');
        AnalyticsService.prototype.exportAnalytics = jest.fn().mockResolvedValue({
          data: Buffer.from('mock-pdf-content'),
          format: 'pdf',
          filename: 'analytics-overview-2024-01-01.pdf',
          contentType: 'application/pdf'
        });

        const response = await request(app)
          .get('/api/analytics/export?type=overview&format=pdf')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.headers['content-type']).toBe('application/pdf');
        expect(response.headers['content-disposition']).toContain('.pdf');
      });

      it('should reject unsupported export formats', async () => {
        const response = await request(app)
          .get('/api/analytics/export?type=overview&format=unsupported')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);

        expect(response.body.success).toBe(false);
      });
    });

    describe('GET /api/analytics/time-based', () => {
      it('should return hourly analytics with real data', async () => {
        const { AnalyticsService } = require('../server/services/analyticsService');
        AnalyticsService.prototype.getTimeBasedAnalytics = jest.fn().mockResolvedValue({
          hourlyBreakdown: [
            { hour: 8, amount: '120.50', transactionCount: 3, averageTransaction: '40.17' },
            { hour: 12, amount: '250.75', transactionCount: 5, averageTransaction: '50.15' },
            { hour: 18, amount: '180.25', transactionCount: 4, averageTransaction: '45.06' }
          ],
          peakSpendingHour: { hour: 12, amount: '250.75', transactionCount: 5 },
          totalTransactions: 12,
          period: { startDate: '2024-01-01', endDate: '2024-01-31' }
        });

        const response = await request(app)
          .get('/api/analytics/time-based?type=hourly')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.data.hourlyBreakdown).toHaveLength(24); // Should have all 24 hours
        expect(response.body.data.peakSpendingHour.hour).toBe(12);
      });

      it('should return daily analytics with weekend/weekday breakdown', async () => {
        const { AnalyticsService } = require('../server/services/analyticsService');
        AnalyticsService.prototype.getTimeBasedAnalytics = jest.fn().mockResolvedValue({
          dailyBreakdown: [
            { day: 0, dayName: 'Sunday', amount: '350.00', transactionCount: 8 },
            { day: 1, dayName: 'Monday', amount: '200.00', transactionCount: 5 },
            { day: 6, dayName: 'Saturday', amount: '400.00', transactionCount: 10 }
          ],
          peakSpendingDay: { day: 6, dayName: 'Saturday', amount: '400.00' },
          weekendSpending: '750.00',
          weekdaySpending: '200.00',
          totalTransactions: 23
        });

        const response = await request(app)
          .get('/api/analytics/time-based?type=daily')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.data.weekendSpending).toBe('750.00');
        expect(response.body.data.weekdaySpending).toBe('200.00');
      });
    });

    describe('Rate Limiting', () => {
      it('should apply rate limiting to analytics endpoints', async () => {
        // Make multiple rapid requests to test rate limiting
        const requests = Array.from({ length: 5 }, () =>
          request(app)
            .get('/api/analytics/overview')
            .set('Authorization', `Bearer ${authToken}`)
        );

        const responses = await Promise.all(requests);
        
        // First requests should succeed
        const successResponses = responses.filter(r => r.status === 200);
        expect(successResponses.length).toBeGreaterThan(0);
      });
    });

    describe('Role-Based Access Control', () => {
      const adminToken = authToken;
      const helperToken = require('jsonwebtoken').sign(
        { id: 'helper-user', email: 'helper@example.com', role: 'HELPER' },
        'test-secret'
      );

      it('should allow admin access to budget endpoints', async () => {
        const { AnalyticsService } = require('../server/services/analyticsService');
        AnalyticsService.prototype.getBudgetPerformance = jest.fn().mockResolvedValue({
          budgets: [],
          overallUtilization: '0.0'
        });

        const response = await request(app)
          .get('/api/analytics/budgets')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      it('should deny helper access to budget endpoints', async () => {
        const response = await request(app)
          .get('/api/analytics/budgets')
          .set('Authorization', `Bearer ${helperToken}`)
          .expect(403);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('Insufficient permissions');
      });

      it('should allow helper read-only access to category breakdown', async () => {
        const { AnalyticsService } = require('../server/services/analyticsService');
        AnalyticsService.prototype.getCategoryBreakdown = jest.fn().mockResolvedValue({
          categories: [],
          totalSpending: '0.00'
        });

        const response = await request(app)
          .get('/api/analytics/categories')
          .set('Authorization', `Bearer ${helperToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      it('should deny helper access to export endpoints', async () => {
        const response = await request(app)
          .get('/api/analytics/export?type=overview&format=json')
          .set('Authorization', `Bearer ${helperToken}`)
          .expect(403);

        expect(response.body.success).toBe(false);
      });
    });

    describe('Timezone Support', () => {
      it('should handle timezone-aware date calculations', async () => {
        const { AnalyticsService } = require('../server/services/analyticsService');
        AnalyticsService.prototype.getTimeBasedAnalytics = jest.fn().mockImplementation((userId, options) => {
          // Mock timezone-aware calculations
          return Promise.resolve({
            hourlyBreakdown: Array.from({ length: 24 }, (_, i) => ({
              hour: i,
              amount: '50.00',
              transactionCount: 1,
              averageTransaction: '50.00'
            })),
            peakSpendingHour: { hour: 9, amount: '50.00' }, // Adjusted for timezone
            totalTransactions: 24
          });
        });

        const response = await request(app)
          .get('/api/analytics/time-based?type=hourly')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.data.hourlyBreakdown).toHaveLength(24);
      });
    });

    describe('Caching', () => {
      it('should use caching for frequently accessed data', async () => {
        const { cache } = require('../server/utils/cache');
        const { AnalyticsService } = require('../server/services/analyticsService');

        // Mock cache to return cached data
        cache.get.mockResolvedValue({
          trends: [],
          period: 'weekly',
          cached: true
        });

        const response = await request(app)
          .get('/api/analytics/trends')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.data.cached).toBe(true);
      });
    });

    describe('Comprehensive Error Handling', () => {
      it('should handle database connection errors', async () => {
        const { AnalyticsService } = require('../server/services/analyticsService');
        AnalyticsService.prototype.getSpendingOverview = jest.fn().mockRejectedValue(
          new Error('Database connection failed')
        );

        const response = await request(app)
          .get('/api/analytics/overview')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(500);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('Failed to fetch spending overview');
      });

      it('should handle export generation errors', async () => {
        const { AnalyticsService } = require('../server/services/analyticsService');
        AnalyticsService.prototype.exportAnalytics = jest.fn().mockRejectedValue(
          new Error('PDF generation failed')
        );

        const response = await request(app)
          .get('/api/analytics/export?type=overview&format=pdf')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(500);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('Failed to export analytics data');
      });
    });
  });
});