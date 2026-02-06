const { validationResult, matchedData } = require('express-validator');
const AnalyticsService = require('../services/analyticsService');
const { cache } = require('../utils/cache');

class AnalyticsController {
  constructor() {
    this.analyticsService = new AnalyticsService();
  }

  /**
   * Helper method to check user permissions
   */
  checkPermissions(req, allowedRoles = ['MASTER', 'ADMIN', 'FAMILY_MEMBER']) {
    if (!req.user) {
      throw new Error('User not authenticated');
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      throw new Error('Insufficient permissions');
    }
    
    return true;
  }

  /**
   * Helper method for read-only permissions (Helpers can view)
   */
  checkReadPermissions(req) {
    return this.checkPermissions(req, ['MASTER', 'ADMIN', 'FAMILY_MEMBER', 'HELPER']);
  }

  /**
   * GET /analytics/overview - Dashboard summary with key metrics
   */
  async getSpendingOverview(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      // Check permissions - Admin + Family Members only
      this.checkPermissions(req);

      const { startDate, endDate, previousStartDate, previousEndDate } = matchedData(req);
      const userId = req.user.id;

      const overview = await this.analyticsService.getSpendingOverview(userId, {
        startDate,
        endDate,
        previousStartDate,
        previousEndDate
      });

      res.json({
        success: true,
        message: 'Spending overview retrieved successfully',
        data: overview
      });
    } catch (error) {
      console.error('Error fetching spending overview:', error);
      
      // Handle permission errors specifically
      if (error.message === 'Insufficient permissions') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Insufficient permissions.'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to fetch spending overview'
      });
    }
  }

  /**
   * GET /analytics/spending - Detailed spending analysis with filters
   */
  async getSpendingAnalysis(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      // Check permissions - All roles can view (read-only for Helpers)
      this.checkReadPermissions(req);

      const { startDate, endDate, category, store } = matchedData(req);
      const userId = req.user.id;

      // Get category breakdown
      const categoryBreakdown = await this.analyticsService.getCategoryBreakdown(userId, {
        startDate,
        endDate
      });

      // Get store analysis
      const storeAnalysis = await this.analyticsService.getStoreAnalysis(userId, {
        startDate,
        endDate
      });

      // Get top spending
      const topSpending = await this.analyticsService.getTopSpending(userId, {
        type: 'categories',
        limit: 10,
        startDate,
        endDate
      });

      res.json({
        success: true,
        message: 'Spending analysis retrieved successfully',
        data: {
          categoryBreakdown,
          storeAnalysis,
          topSpending
        }
      });
    } catch (error) {
      console.error('Error fetching spending analysis:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch spending analysis'
      });
    }
  }

  /**
   * GET /analytics/budgets - Budget performance and utilization
   */
  async getBudgetPerformance(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      // Check permissions - Admin + Family Members only
      this.checkPermissions(req);

      const { startDate, endDate } = matchedData(req);
      const userId = req.user.id;

      const budgetPerformance = await this.analyticsService.getBudgetPerformance(userId, {
        startDate,
        endDate
      });

      res.json({
        success: true,
        message: 'Budget performance retrieved successfully',
        data: budgetPerformance
      });
    } catch (error) {
      console.error('Error fetching budget performance:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch budget performance'
      });
    }
  }

  /**
   * GET /analytics/categories - Category breakdown and trends
   */
  async getCategoryBreakdown(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      // Check permissions - All roles can view (read-only for Helpers)
      this.checkReadPermissions(req);

      const { startDate, endDate } = matchedData(req);
      const userId = req.user.id;

      const categoryBreakdown = await this.analyticsService.getCategoryBreakdown(userId, {
        startDate,
        endDate
      });

      res.json({
        success: true,
        message: 'Category breakdown retrieved successfully',
        data: categoryBreakdown
      });
    } catch (error) {
      console.error('Error fetching category breakdown:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch category breakdown'
      });
    }
  }

  /**
   * GET /analytics/trends - Time-based comparisons and forecasts
   */
  async getSpendingTrends(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      // Check permissions - All roles can view (read-only for Helpers)
      this.checkReadPermissions(req);

      const { period = 'weekly', startDate, endDate } = matchedData(req);
      const userId = req.user.id;

      const trends = await this.analyticsService.getSpendingTrends(userId, {
        period,
        startDate,
        endDate
      });

      res.json({
        success: true,
        message: 'Spending trends retrieved successfully',
        data: trends
      });
    } catch (error) {
      console.error('Error fetching spending trends:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch spending trends'
      });
    }
  }

  /**
   * GET /analytics/top-spending - Top spending categories and items
   */
  async getTopSpending(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      // Check permissions - All roles can view (read-only for Helpers)
      this.checkReadPermissions(req);

      const { type = 'categories', limit = 10, startDate, endDate } = matchedData(req);
      const userId = req.user.id;

      if (!['categories', 'items'].includes(type)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid type. Must be "categories" or "items"'
        });
      }

      const topSpending = await this.analyticsService.getTopSpending(userId, {
        type,
        limit: parseInt(limit),
        startDate,
        endDate
      });

      res.json({
        success: true,
        message: `Top spending ${type} retrieved successfully`,
        data: topSpending
      });
    } catch (error) {
      console.error('Error fetching top spending:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch top spending data'
      });
    }
  }

  /**
   * GET /analytics/stores - Store preference and spending pattern analysis
   */
  async getStoreAnalysis(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      // Check permissions - All roles can view (read-only for Helpers)
      this.checkReadPermissions(req);

      const { startDate, endDate } = matchedData(req);
      const userId = req.user.id;

      const storeAnalysis = await this.analyticsService.getStoreAnalysis(userId, {
        startDate,
        endDate
      });

      res.json({
        success: true,
        message: 'Store analysis retrieved successfully',
        data: storeAnalysis
      });
    } catch (error) {
      console.error('Error fetching store analysis:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch store analysis'
      });
    }
  }

  /**
   * GET /analytics/time-based - Time-based analytics (hourly, daily patterns)
   */
  async getTimeBasedAnalytics(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      // Check permissions - All roles can view (read-only for Helpers)
      this.checkReadPermissions(req);

      const { type = 'hourly', startDate, endDate } = matchedData(req);
      const userId = req.user.id;

      if (!['hourly', 'daily'].includes(type)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid type. Must be "hourly" or "daily"'
        });
      }

      const timeBasedAnalytics = await this.analyticsService.getTimeBasedAnalytics(userId, {
        type,
        startDate,
        endDate
      });

      res.json({
        success: true,
        message: `Time-based analytics retrieved successfully`,
        data: timeBasedAnalytics
      });
    } catch (error) {
      console.error('Error fetching time-based analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch time-based analytics'
      });
    }
  }

  /**
   * GET /analytics/purchases - Purchase frequency and basket size analysis
   */
  async getPurchaseAnalytics(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      // Check permissions - All roles can view (read-only for Helpers)
      this.checkReadPermissions(req);

      const { 
        period = 'monthly', 
        includePatterns = false, 
        startDate, 
        endDate 
      } = matchedData(req);
      const userId = req.user.id;

      const purchaseAnalytics = await this.analyticsService.getPurchaseAnalytics(userId, {
        period,
        includePatterns: includePatterns === 'true' || includePatterns === true,
        startDate,
        endDate
      });

      res.json({
        success: true,
        message: 'Purchase analytics retrieved successfully',
        data: purchaseAnalytics
      });
    } catch (error) {
      console.error('Error fetching purchase analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch purchase analytics'
      });
    }
  }

  /**
   * GET /analytics/export - Data export in multiple formats
   */
  async exportAnalytics(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      // Check permissions - Admin + Family Members only for exports
      this.checkPermissions(req);

      const { 
        type = 'overview', 
        format = 'json', 
        startDate, 
        endDate 
      } = matchedData(req);
      const userId = req.user.id;

      if (!['overview', 'categories', 'trends', 'budgets'].includes(type)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid export type. Must be "overview", "categories", "trends", or "budgets"'
        });
      }

      // Validate date range is not too large (prevent performance issues)
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        
        if (daysDiff > 365 * 3) { // Maximum 3 years
          return res.status(400).json({
            success: false,
            message: 'Date range too large. Maximum allowed range is 3 years.'
          });
        }
      }

      const exportData = await this.analyticsService.exportAnalytics(userId, format, {
        type,
        startDate,
        endDate
      });

      // Handle different export formats
      if (format === 'json') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${exportData.filename || `analytics-${type}-${new Date().toISOString().split('T')[0]}.json`}"`);
        res.json(exportData);
      } else {
        // Handle binary data (CSV, Excel, PDF)
        if (exportData.data && typeof exportData.data !== 'string') {
          res.setHeader('Content-Type', exportData.contentType || 'application/octet-stream');
          res.setHeader('Content-Disposition', `attachment; filename="${exportData.filename}"`);
          res.setHeader('Content-Length', exportData.data.length);
          res.send(exportData.data);
        } else {
          // Handle string data (CSV)
          res.setHeader('Content-Type', exportData.contentType || 'text/plain');
          res.setHeader('Content-Disposition', `attachment; filename="${exportData.filename}"`);
          res.send(exportData.data);
        }
      }
    } catch (error) {
      console.error('Error exporting analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to export analytics data'
      });
    }
  }
}

module.exports = AnalyticsController;