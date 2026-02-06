// Simple test to debug controller issues
jest.mock('../server/services/analyticsService');
jest.mock('../server/middleware/auth', () => ({
  authenticateToken: (req, res, next) => {
    req.user = { id: 'test-user-id', role: 'ADMIN', email: 'test@example.com' };
    next();
  },
  requireRole: (roles) => (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }
    next();
  }
}));

jest.mock('express-validator', () => ({
  validationResult: jest.fn(() => ({
    isEmpty: () => true,
    array: () => []
  })),
  matchedData: jest.fn(() => ({}))
}));

const request = require('supertest');
const express = require('express');
const AnalyticsController = require('../server/controllers/analyticsController');
const AnalyticsService = require('../server/services/analyticsService');

describe('Controller Debug', () => {
  let analyticsController;

  beforeEach(() => {
    jest.clearAllMocks();
    analyticsController = new AnalyticsController();
  });

  it('should test simple controller', async () => {
    const app = express();
    app.use(express.json());
    
    // Simple route without validation
    app.get('/test', analyticsController.getSpendingOverview.bind(analyticsController));

    // Mock the service to return data
    const mockData = {
      totalSpent: '1500.75',
      transactionCount: 25
    };
    
    AnalyticsService.prototype.getSpendingOverview = jest.fn().mockResolvedValue(mockData);

    const response = await request(app)
      .get('/test')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual(mockData);
  });
});