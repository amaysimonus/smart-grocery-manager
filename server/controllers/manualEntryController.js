const manualEntryService = require('../services/manualEntryService');
const { body, validationResult } = require('express-validator');

const manualEntryController = {
  // Create manual receipt
  async createManualReceipt(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const userId = req.user.id;
      const receiptData = req.body;

      const receipt = await manualEntryService.createManualReceipt(userId, receiptData);

      res.status(201).json({
        success: true,
        message: 'Manual receipt created successfully',
        receipt
      });
    } catch (error) {
      console.error('Create manual receipt error:', error);
      
      if (error.message.includes('Duplicate receipt')) {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to create manual receipt'
      });
    }
  },

  // Add items to manual receipt
  async addItemsToReceipt(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { id } = req.params;
      const userId = req.user.id;
      const { items } = req.body;

      const result = await manualEntryService.addItemsToReceipt(id, userId, items);

      res.status(201).json({
        success: true,
        message: 'Items added successfully',
        items: result.items,
        receipt: result.receipt
      });
    } catch (error) {
      console.error('Add items to receipt error:', error);
      
      if (error.message.includes('not found') || error.message.includes('access denied')) {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }

      if (error.message.includes('required') || 
          error.message.includes('positive number') || 
          error.message.includes('unreasonable')) {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to add items to receipt'
      });
    }
  },

  // Create bulk wet market items
  async createBulkWetMarketItems(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { id } = req.params;
      const userId = req.user.id;
      const marketData = req.body;

      const result = await manualEntryService.createBulkWetMarketItems(id, userId, marketData);

      res.status(201).json({
        success: true,
        message: 'Bulk items added successfully',
        items: result.items,
        receipt: result.receipt
      });
    } catch (error) {
      console.error('Create bulk wet market items error:', error);
      
      if (error.message.includes('not found') || error.message.includes('access denied')) {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to create bulk items'
      });
    }
  },

  // Update manual receipt
  async updateManualReceipt(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { id } = req.params;
      const userId = req.user.id;
      const updateData = req.body;

      const receipt = await manualEntryService.updateManualReceipt(id, userId, updateData);

      res.json({
        success: true,
        message: 'Manual receipt updated successfully',
        receipt
      });
    } catch (error) {
      console.error('Update manual receipt error:', error);
      
      if (error.message.includes('not found') || error.message.includes('access denied')) {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to update manual receipt'
      });
    }
  },

  // Delete manual receipt
  async deleteManualReceipt(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const result = await manualEntryService.deleteManualReceipt(id, userId);

      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      console.error('Delete manual receipt error:', error);
      
      if (error.message.includes('not found') || error.message.includes('access denied')) {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to delete manual receipt'
      });
    }
  },

  // List manual receipts
  async listManualReceipts(req, res) {
    try {
      const userId = req.user.id;
      const options = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 10
      };

      const result = await manualEntryService.listManualReceipts(userId, options);

      res.json({
        success: true,
        receipts: result.receipts,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('List manual receipts error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list manual receipts'
      });
    }
  },

  // Get single manual receipt
  async getManualReceipt(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const receipt = await manualEntryService.getManualReceipt(id, userId);

      res.json({
        success: true,
        receipt
      });
    } catch (error) {
      console.error('Get manual receipt error:', error);
      
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to get manual receipt'
      });
    }
  }
};

// Validation middleware
const validateManualReceiptCreation = [
  body('storeName')
    .trim()
    .notEmpty()
    .withMessage('Store name is required')
    .isLength({ max: 255 })
    .withMessage('Store name must be less than 255 characters'),
  
  body('storeNameZh')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Chinese store name must be less than 255 characters'),
  
  body('purchaseDate')
    .isISO8601()
    .withMessage('Purchase date must be a valid date')
    .toDate(),
  
  body('currency')
    .optional()
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency must be a 3-letter code'),
  
  body('budgetId')
    .optional()
    .isString()
    .withMessage('Budget ID must be a string'),
  
  body('receiptNumber')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Receipt number must be less than 100 characters')
];

const validateReceiptItems = [
  body('items')
    .isArray({ min: 1 })
    .withMessage('At least one item is required'),
  
  body('items.*.name')
    .trim()
    .notEmpty()
    .withMessage('Item name is required')
    .isLength({ max: 255 })
    .withMessage('Item name must be less than 255 characters'),
  
  body('items.*.nameZh')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Chinese item name must be less than 255 characters'),
  
  body('items.*.quantity')
    .isFloat({ min: 0.01 })
    .withMessage('Item quantity must be a positive number'),
  
  body('items.*.unitPrice')
    .isFloat({ min: 0 })
    .withMessage('Item unit price must be a non-negative number'),
  
  body('items.*.categoryId')
    .optional()
    .isString()
    .withMessage('Category ID must be a string'),
  
  body('items.*.category')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Category name must be less than 100 characters')
];

const validateBulkWetMarketItems = [
  body('includeCommonItems')
    .optional()
    .isBoolean()
    .withMessage('includeCommonItems must be a boolean'),
  
  body('vegetables')
    .optional()
    .isBoolean()
    .withMessage('vegetables must be a boolean'),
  
  body('meats')
    .optional()
    .isBoolean()
    .withMessage('meats must be a boolean'),
  
  body('seafood')
    .optional()
    .isBoolean()
    .withMessage('seafood must be a boolean'),
  
  body('defaultQuantity')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Default quantity must be a positive number'),
  
  body('defaultPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Default price must be a non-negative number')
];

const validateManualReceiptUpdate = [
  body('storeName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Store name cannot be empty')
    .isLength({ max: 255 })
    .withMessage('Store name must be less than 255 characters'),
  
  body('storeNameZh')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Chinese store name must be less than 255 characters'),
  
  body('totalAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Total amount must be a non-negative number'),
  
  body('purchaseDate')
    .optional()
    .isISO8601()
    .withMessage('Purchase date must be a valid date')
    .toDate()
];

module.exports = {
  manualEntryController,
  validateManualReceiptCreation,
  validateReceiptItems,
  validateBulkWetMarketItems,
  validateManualReceiptUpdate
};