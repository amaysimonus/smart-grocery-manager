// Simple test to debug controller issues
jest.mock('../server/services/analyticsService');

const request = require('supertest');
const express = require('express');
const AnalyticsController = require('../server/controllers/analyticsService');

describe('Controller Debug', () => {
  it('should test simple controller', async () => {
    const app = express();
    app.use(express.json());
    
    // Simple route without validation
    app.get('/test', async (req, res) => {
      try {
        const AnalyticsService = require('../server/services/analyticsService');
        const service = new AnalyticsService();
        const result = await service.getSpendingOverview('test-user', {});
        res.json({ success: true, data: result });
      } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: error.message });
      }
    });

    const response = await request(app)
      .get('/test')
      .expect(200);

    expect(response.body.success).toBe(true);
  });
});