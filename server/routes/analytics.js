const express = require('express');
const rateLimit = require('express-rate-limit');
const { body, query } = require('express-validator');
const AnalyticsController = require('../controllers/analyticsController');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();
const analyticsController = new AnalyticsController();

// Rate limiting for analytics endpoints
const analyticsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many analytics requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all analytics routes
router.use(analyticsLimiter);

// Role-based access control for analytics endpoints
// Admin + Family Members (MASTER, ADMIN, FAMILY_MEMBER) can access all endpoints
// Helpers (HELPER) have limited access to read-only endpoints
const adminFamilyAccess = requireRole(['MASTER', 'ADMIN', 'FAMILY_MEMBER']);
const readOnlyAccess = requireRole(['MASTER', 'ADMIN', 'FAMILY_MEMBER', 'HELPER']);

// Authentication middleware for all routes
router.use(authenticateToken);
const dateValidation = [
  query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO 8601 date'),
  query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO 8601 date'),
  query('previousStartDate').optional().isISO8601().withMessage('Previous start date must be a valid ISO 8601 date'),
  query('previousEndDate').optional().isISO8601().withMessage('Previous end date must be a valid ISO 8601 date'),
];

const paginationValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
];

const exportValidation = [
  query('type').isIn(['overview', 'categories', 'trends', 'budgets']).withMessage('Type must be one of: overview, categories, trends, budgets'),
  query('format').optional().isIn(['json', 'csv', 'pdf', 'excel']).withMessage('Format must be one of: json, csv, pdf, excel'),
  ...dateValidation,
];

const periodValidation = [
  query('period').optional().isIn(['weekly', 'monthly', 'yearly']).withMessage('Period must be one of: weekly, monthly, yearly'),
  ...dateValidation,
];

// Routes

/**
 * GET /api/analytics/overview
 * Dashboard summary with key metrics
 * Access: Admin + Family Members
 */
router.get('/overview', 
  adminFamilyAccess,
  dateValidation,
  analyticsController.getSpendingOverview.bind(analyticsController)
);

/**
 * GET /api/analytics/spending
 * Detailed spending analysis with filters
 * Access: Admin + Family Members (Helpers can view read-only)
 */
router.get('/spending',
  readOnlyAccess,
  dateValidation,
  paginationValidation,
  query('category').optional().isString().withMessage('Category filter must be a string'),
  query('store').optional().isString().withMessage('Store filter must be a string'),
  analyticsController.getSpendingAnalysis.bind(analyticsController)
);

/**
 * GET /api/analytics/budgets
 * Budget performance and utilization
 * Access: Admin + Family Members
 */
router.get('/budgets',
  adminFamilyAccess,
  dateValidation,
  paginationValidation,
  analyticsController.getBudgetPerformance.bind(analyticsController)
);

/**
 * GET /api/analytics/categories
 * Category breakdown and trends
 * Access: Admin + Family Members (Helpers can view read-only)
 */
router.get('/categories',
  readOnlyAccess,
  dateValidation,
  paginationValidation,
  analyticsController.getCategoryBreakdown.bind(analyticsController)
);

/**
 * GET /api/analytics/trends
 * Time-based comparisons and forecasts
 * Access: Admin + Family Members (Helpers can view read-only)
 */
router.get('/trends',
  readOnlyAccess,
  periodValidation,
  analyticsController.getSpendingTrends.bind(analyticsController)
);

/**
 * GET /api/analytics/top-spending
 * Top spending categories and items
 * Access: Admin + Family Members (Helpers can view read-only)
 */
router.get('/top-spending',
  readOnlyAccess,
  dateValidation,
  paginationValidation,
  query('type').optional().isIn(['categories', 'items']).withMessage('Type must be either "categories" or "items"'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  analyticsController.getTopSpending.bind(analyticsController)
);

/**
 * GET /api/analytics/stores
 * Store preference and spending pattern analysis
 * Access: Admin + Family Members (Helpers can view read-only)
 */
router.get('/stores',
  readOnlyAccess,
  dateValidation,
  paginationValidation,
  analyticsController.getStoreAnalysis.bind(analyticsController)
);

/**
 * GET /api/analytics/time-based
 * Time-based analytics (hourly, daily patterns)
 * Access: Admin + Family Members (Helpers can view read-only)
 */
router.get('/time-based',
  readOnlyAccess,
  dateValidation,
  query('type').optional().isIn(['hourly', 'daily']).withMessage('Type must be either "hourly" or "daily"'),
  analyticsController.getTimeBasedAnalytics.bind(analyticsController)
);

/**
 * GET /api/analytics/purchases
 * Purchase frequency and basket size analysis
 * Access: Admin + Family Members (Helpers can view read-only)
 */
router.get('/purchases',
  readOnlyAccess,
  dateValidation,
  query('period').optional().isIn(['weekly', 'monthly', 'yearly']).withMessage('Period must be one of: weekly, monthly, yearly'),
  query('includePatterns').optional().isBoolean().withMessage('includePatterns must be a boolean'),
  analyticsController.getPurchaseAnalytics.bind(analyticsController)
);

/**
 * GET /api/analytics/export
 * Data export in multiple formats
 * Access: Admin + Family Members only
 */
router.get('/export',
  adminFamilyAccess,
  exportValidation,
  analyticsController.exportAnalytics.bind(analyticsController)
);

module.exports = router;