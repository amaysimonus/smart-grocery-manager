const { body, validationResult, query } = require('express-validator');
const BudgetService = require('../services/budgetService');
const rateLimit = require('express-rate-limit');

class BudgetController {
  constructor() {
    this.budgetService = new BudgetService();
  }

  // Validation middleware
  static validateBudget = [
    body('name')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Name must be between 1 and 100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description must not exceed 500 characters'),
    body('amount')
      .isDecimal({ decimal_digits: '0,2' })
      .withMessage('Amount must be a valid decimal with up to 2 decimal places')
      .custom((value) => {
        const amount = parseFloat(value);
        if (amount <= 0) {
          throw new Error('Amount must be greater than 0');
        }
        if (amount > 999999.99) {
          throw new Error('Amount must not exceed 999,999.99');
        }
        return true;
      }),
    body('startDate')
      .isISO8601()
      .withMessage('Start date must be a valid date'),
    body('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be a valid date')
      .custom((value, { req }) => {
        if (value && new Date(value) <= new Date(req.body.startDate)) {
          throw new Error('End date must be after start date');
        }
        return true;
      }),
    body('isRecurring')
      .optional()
      .isBoolean()
      .withMessage('isRecurring must be a boolean'),
    body('recurrence')
      .optional()
      .isIn(['WEEKLY', 'BI_WEEKLY', 'MONTHLY'])
      .withMessage('Recurrence must be one of: WEEKLY, BI_WEEKLY, MONTHLY')
      .custom((value, { req }) => {
        if (req.body.isRecurring && !value) {
          throw new Error('Recurrence is required when budget is recurring');
        }
        return true;
      })
  ];

  static validateBudgetUpdate = [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Name must be between 1 and 100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description must not exceed 500 characters'),
    body('amount')
      .optional()
      .isDecimal({ decimal_digits: '0,2' })
      .withMessage('Amount must be a valid decimal with up to 2 decimal places')
      .custom((value) => {
        const amount = parseFloat(value);
        if (amount <= 0) {
          throw new Error('Amount must be greater than 0');
        }
        if (amount > 999999.99) {
          throw new Error('Amount must not exceed 999,999.99');
        }
        return true;
      }),
    body('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be a valid date'),
    body('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be a valid date'),
    body('isRecurring')
      .optional()
      .isBoolean()
      .withMessage('isRecurring must be a boolean'),
    body('recurrence')
      .optional()
      .isIn(['WEEKLY', 'BI_WEEKLY', 'MONTHLY'])
      .withMessage('Recurrence must be one of: WEEKLY, BI_WEEKLY, MONTHLY')
  ];

  static validateBudgetTemplate = [
    body('templateName')
      .isIn([
        'weekly_groceries', 'monthly_utilities', 'weekly_transport',
        'monthly_entertainment', 'monthly_shopping', 'weekly_healthcare',
        'monthly_education', 'emergency_fund'
      ])
      .withMessage('Invalid template name'),
    body('name')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Name must be between 1 and 100 characters'),
    body('amount')
      .optional()
      .isDecimal({ decimal_digits: '0,2' })
      .withMessage('Amount must be a valid decimal with up to 2 decimal places')
      .custom((value) => {
        const amount = parseFloat(value);
        if (amount <= 0) {
          throw new Error('Amount must be greater than 0');
        }
        return true;
      }),
    body('startDate')
      .isISO8601()
      .withMessage('Start date must be a valid date')
  ];

  static validateQuery = [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('search')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Search term must be between 1 and 100 characters'),
    query('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean'),
    query('sortBy')
      .optional()
      .isIn(['name', 'amount', 'startDate', 'endDate', 'createdAt', 'updatedAt'])
      .withMessage('Invalid sort field'),
    query('sortOrder')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('Sort order must be asc or desc')
  ];

  // Rate limiting middleware
  static budgetRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // Limit each IP to 50 requests per windowMs
    message: {
      success: false,
      error: 'Too many budget requests, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false
  });

  /**
   * Create new budget
   */
  createBudget = async (req, res) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          errors: errors.array()
        });
      }

      const budget = await this.budgetService.createBudget(req.body, req.user.id);

      res.status(201).json({
        success: true,
        message: 'Budget created successfully',
        data: budget
      });
    } catch (error) {
      console.error('Create budget error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  };

  /**
   * Get budgets with pagination and filtering
   */
  getBudgets = async (req, res) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          errors: errors.array()
        });
      }

      const options = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 10,
        search: req.query.search,
        isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined,
        createdBy: req.user.role === 'MASTER' || req.user.role === 'ADMIN' ? undefined : req.user.id,
        sortBy: req.query.sortBy || 'createdAt',
        sortOrder: req.query.sortOrder || 'desc'
      };

      const result = await this.budgetService.getBudgets(options);

      res.json({
        success: true,
        data: result.budgets,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('Get budgets error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve budgets'
      });
    }
  };

  /**
   * Get single budget by ID
   */
  getBudgetById = async (req, res) => {
    try {
      const budget = await this.budgetService.getBudgetById(req.params.id);

      // Check if user has access to this budget
      if (req.user.role !== 'MASTER' && req.user.role !== 'ADMIN' && budget.createdBy !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to this budget'
        });
      }

      res.json({
        success: true,
        data: budget
      });
    } catch (error) {
      console.error('Get budget error:', error);
      if (error.message === 'Budget not found') {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve budget'
      });
    }
  };

  /**
   * Update budget
   */
  updateBudget = async (req, res) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          errors: errors.array()
        });
      }

      // Check if user has permission to update this budget
      const existingBudget = await this.budgetService.getBudgetById(req.params.id);
      if (req.user.role !== 'MASTER' && req.user.role !== 'ADMIN' && existingBudget.createdBy !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to update this budget'
        });
      }

      const budget = await this.budgetService.updateBudget(req.params.id, req.body, req.user.id);

      res.json({
        success: true,
        message: 'Budget updated successfully',
        data: budget
      });
    } catch (error) {
      console.error('Update budget error:', error);
      if (error.message === 'Budget not found') {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  };

  /**
   * Delete budget
   */
  deleteBudget = async (req, res) => {
    try {
      // Check if user has permission to delete this budget
      const existingBudget = await this.budgetService.getBudgetById(req.params.id);
      if (req.user.role !== 'MASTER' && req.user.role !== 'ADMIN' && existingBudget.createdBy !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to delete this budget'
        });
      }

      const result = await this.budgetService.deleteBudget(req.params.id, req.user.id);

      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      console.error('Delete budget error:', error);
      if (error.message === 'Budget not found') {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  };

  /**
   * Get spending against budget
   */
  getBudgetSpending = async (req, res) => {
    try {
      // Check if user has access to this budget
      const budget = await this.budgetService.getBudgetById(req.params.id);
      if (req.user.role !== 'MASTER' && req.user.role !== 'ADMIN' && budget.createdBy !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to this budget'
        });
      }

      const spending = await this.budgetService.getBudgetSpending(req.params.id);

      res.json({
        success: true,
        data: spending
      });
    } catch (error) {
      console.error('Get budget spending error:', error);
      if (error.message === 'Budget not found') {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve budget spending'
      });
    }
  };

  /**
   * Get budget templates
   */
  getBudgetTemplates = async (req, res) => {
    try {
      const templates = await this.budgetService.getBudgetTemplates();

      res.json({
        success: true,
        data: templates
      });
    } catch (error) {
      console.error('Get budget templates error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve budget templates'
      });
    }
  };

  /**
   * Create budget from template
   */
  createBudgetFromTemplate = async (req, res) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          errors: errors.array()
        });
      }

      const budget = await this.budgetService.createBudgetFromTemplate(req.body, req.user.id);

      res.status(201).json({
        success: true,
        message: 'Budget created from template successfully',
        data: budget
      });
    } catch (error) {
      console.error('Create budget from template error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  };

  /**
   * Handle budget rollover
   */
  handleBudgetRollover = async (req, res) => {
    try {
      const { rolloverPolicy = 'carry_forward' } = req.body;

      // Check if user has permission
      const budget = await this.budgetService.getBudgetById(req.params.id);
      if (req.user.role !== 'MASTER' && req.user.role !== 'ADMIN' && budget.createdBy !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to handle rollover for this budget'
        });
      }

      const result = await this.budgetService.handleBudgetRollover(req.params.id, rolloverPolicy);

      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      console.error('Handle budget rollover error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  };
}

module.exports = BudgetController;