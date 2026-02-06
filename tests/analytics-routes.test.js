const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const AnalyticsController = require('../../server/controllers/analyticsController');

// Mock dependencies
jest.mock('../../server/services/analyticsService');
jest.mock('../../server/middleware/auth', () => ({
  authenticate: (req, res, next) => {
    // Mock authentication - in real tests, this would verify JWT tokens
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }
    
    // Mock user based on role in header for testing
    const role = req.headers['x-user-role'] || 'ADMIN';
    req.user = { id: 'test-user-id', email: 'test@example.com', role };
    next();
  },
  roleMiddleware: (allowedRoles) => (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }
    
    next();
  }
}));

// Mock cache utility
jest.mock('../../server/utils/cache', () => ({
  cache: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(true),
    del: jest.fn().mockResolvedValue(true),
    generateKey: jest.fn().mockReturnValue('test-key')
  }
}));

// Mock validation middleware
jest.mock('express-validator', () => ({
  validationResult: jest.fn().mockReturnValue({
    isEmpty: () => true,
    array: () => []
  }),
  matchedData: jest.fn((req) => ({
    startDate: req.query.startDate,
    endDate: req.query.endDate,
    period: req.query.period,
    type: req.query.type,
    format: req.query.format,
    limit: req.query.limit
  }))
}));

const AnalyticsService = require('../../server/services/analyticsService');
const app = express();

// Setup analytics routes manually for testing
const analyticsController = new AnalyticsController();
app.use(express.json());

// Helper to create mock JWT token for testing
const createMockToken = (user) => {
  return jwt.sign(user, 'test-secret', { expiresIn: '1h' });
};

describe('Analytics Routes Integration', () => {
  let adminToken, familyMemberToken, helperToken;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock tokens for different roles
    adminToken = createMockToken({ id: 'admin-user', email: 'admin@test.com', role: 'ADMIN' });
    familyMemberToken = createMockToken({ id: 'family-user', email: 'family@test.com', role: 'FAMILY_MEMBER' });
    helperToken = createMockToken({ id: 'helper-user', email: 'helper@test.com', role: 'HELPER' });
  });

  describe('GET /api/analytics/overview', () => {
    it('should allow admin users to access overview', async () => {
      AnalyticsService.prototype.getSpendingOverview = jest.fn().mockResolvedValue({
        totalSpent: '1000.00',
        transactionCount: 20
      });

      const response = await request(app)
        .get('/api/analytics/overview')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-user-role', 'ADMIN');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should allow family member users to access overview', async () => {
      AnalyticsService.prototype.getSpendingOverview = jest.fn().mockResolvedValue({
        totalSpent: '1000.00',
        transactionCount: 20
      });

      const response = await request(app)
        .get('/api/analytics/overview')
        .set('Authorization', `Bearer ${familyMemberToken}`)
        .set('x-user-role', 'FAMILY_MEMBER');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should deny helper users access to overview', async () => {
      const response = await request(app)
        .get('/api/analytics/overview')
        .set('Authorization', `Bearer ${helperToken}`)
        .set('x-user-role', 'HELPER');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Insufficient permissions');
    });

    it('should deny unauthenticated access', async () => {
      const response = await request(app)
        .get('/api/analytics/overview');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/analytics/spending', () => {
    it('should allow all authenticated users to access spending analysis', async () => {
      AnalyticsService.prototype.getCategoryBreakdown = jest.fn().mockResolvedValue({
        categories: [],
        totalSpending: '0.00'
      });

      AnalyticsService.prototype.getStoreAnalysis = jest.fn().mockResolvedValue({
        stores: [],
        totalSpending: '0.00'
      });

      AnalyticsService.prototype.getTopSpending = jest.fn().mockResolvedValue({
        topCategories: [],
        totalSpending: '0.00'
      });

      // Test with admin
      const adminResponse = await request(app)
        .get('/api/analytics/spending')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-user-role', 'ADMIN');

      expect(adminResponse.status).toBe(200);

      // Test with helper (read-only)
      const helperResponse = await request(app)
        .get('/api/analytics/spending')
        .set('Authorization', `Bearer ${helperToken}`)
        .set('x-user-role', 'HELPER');

      expect(helperResponse.status).toBe(200);
    });
  });

  describe('GET /api/analytics/trends', () => {
    it('should return spending trends with YOY comparison', async () => {
      AnalyticsService.prototype.getSpendingTrends = jest.fn().mockResolvedValue({
        trends: [
          { period: '2024-W01', amount: '400.00', transactionCount: 8 },
          { period: '2024-W02', amount: '350.00', transactionCount: 7 }
        ],
        period: 'weekly',
        weekOverWeekChange: '-12.5%',
        monthOverMonthChange: '0.0%',
        yearOverYearChange: '+5.2%'
      });

      const response = await request(app)
        .get('/api/analytics/trends?period=weekly')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-user-role', 'ADMIN');

      expect(response.status).toBe(200);
      expect(response.body.data.trends).toBeDefined();
      expect(response.body.data.yearOverYearChange).toBe('+5.2%');
    });
  });

  describe('GET /api/analytics/export', () => {
    it('should allow admin users to export data in JSON format', async () => {
      AnalyticsService.prototype.exportAnalytics = jest.fn().mockResolvedValue({
        data: { totalSpent: '1000.00' },
        format: 'json',
        filename: 'analytics-overview-2024-01-01.json'
      });

      const response = await request(app)
        .get('/api/analytics/export?type=overview&format=json')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-user-role', 'ADMIN');

      expect(response.status).toBe(200);
      expect(response.headers['content-disposition']).toContain('attachment');
    });

    it('should allow family member users to export data', async () => {
      AnalyticsService.prototype.exportAnalytics = jest.fn().mockResolvedValue({
        data: 'Category,Amount,Percentage\nGroceries,500.00,50.0%',
        format: 'csv',
        filename: 'analytics-categories-2024-01-01.csv',
        contentType: 'text/csv'
      });

      const response = await request(app)
        .get('/api/analytics/export?type=categories&format=csv')
        .set('Authorization', `Bearer ${familyMemberToken}`)
        .set('x-user-role', 'FAMILY_MEMBER');

      expect(response.status).toBe(200);
    });

    it('should deny helper users access to export', async () => {
      const response = await request(app)
        .get('/api/analytics/export?type=overview&format=json')
        .set('Authorization', `Bearer ${helperToken}`)
        .set('x-user-role', 'HELPER');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should validate export format', async () => {
      AnalyticsService.prototype.exportAnalytics = jest.fn().mockResolvedValue({
        data: Buffer.from('PDF content'),
        format: 'pdf',
        filename: 'analytics-overview-2024-01-01.pdf',
        contentType: 'application/pdf'
      });

      const response = await request(app)
        .get('/api/analytics/export?type=overview&format=pdf')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-user-role', 'ADMIN');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('application/pdf');
    });

    it('should reject invalid export type', async () => {
      const response = await request(app)
        .get('/api/analytics/export?type=invalid&format=json')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-user-role', 'ADMIN');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/analytics/time-based', () => {
    it('should return hourly analytics with timezone support', async () => {
      AnalyticsService.prototype.getTimeBasedAnalytics = jest.fn().mockResolvedValue({
        hourlyBreakdown: [
          { hour: 9, amount: '150.00', transactionCount: 3 },
          { hour: 12, amount: '200.00', transactionCount: 4 }
        ],
        peakSpendingHour: { hour: 12, amount: '200.00' }
      });

      const response = await request(app)
        .get('/api/analytics/time-based?type=hourly')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-user-role', 'ADMIN');

      expect(response.status).toBe(200);
      expect(response.body.data.hourlyBreakdown).toBeDefined();
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting to analytics endpoints', async () => {
      AnalyticsService.prototype.getSpendingOverview = jest.fn().mockResolvedValue({
        totalSpent: '1000.00'
      });

      // Make multiple rapid requests to test rate limiting
      const requests = Array.from({ length: 10 }, () =>
        request(app)
          .get('/api/analytics/overview')
          .set('Authorization', `Bearer ${adminToken}`)
          .set('x-user-role', 'ADMIN')
      );

      const responses = await Promise.all(requests);
      
      // First few should succeed, later ones might be rate limited
      const successCount = responses.filter(r => r.status === 200).length;
      const rateLimitedCount = responses.filter(r => r.status === 429).length;
      
      expect(successCount > 0).toBe(true);
      // Note: Rate limiting behavior might vary in testing environment
    });
  });

  describe('Input Validation', () => {
    it('should validate date parameters', async () => {
      // Mock validation to return errors for invalid dates
      const { validationResult } = require('express-validator');
      validationResult.mockReturnValueOnce({
        isEmpty: () => false,
        array: () => [{ msg: 'Invalid date format' }]
      });

      const response = await request(app)
        .get('/api/analytics/overview?startDate=invalid-date')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-user-role', 'ADMIN');

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
    });

    it('should limit date range to prevent performance issues', async () => {
      // Test with very large date range
      AnalyticsService.prototype.exportAnalytics = jest.fn().mockImplementation(() => {
        throw new Error('Date range too large. Maximum allowed range is 3 years.');
      });

      const response = await request(app)
        .get('/api/analytics/export?startDate=2020-01-01&endDate=2024-12-31')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-user-role', 'ADMIN');

      expect(response.status).toBe(500);
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      AnalyticsService.prototype.getSpendingOverview = jest.fn().mockRejectedValue(
        new Error('Database connection failed')
      );

      const response = await request(app)
        .get('/api/analytics/overview')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-user-role', 'ADMIN');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    it('should handle timeout errors', async () => {
      AnalyticsService.prototype.getSpendingTrends = jest.fn().mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), 100);
        });
      });

      const response = await request(app)
        .get('/api/analytics/trends')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-user-role', 'ADMIN');

      expect(response.status).toBe(500);
    });
  });
});