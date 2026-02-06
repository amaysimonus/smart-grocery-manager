const express = require('express');
const router = express.Router();
const { 
  manualEntryController,
  validateManualReceiptCreation,
  validateReceiptItems,
  validateBulkWetMarketItems,
  validateManualReceiptUpdate
} = require('../controllers/manualEntryController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Role-based access - Helpers and Family Members can create, all authenticated users can view
const canCreate = roleMiddleware(['HELPER', 'FAMILY_MEMBER', 'ADMIN', 'MASTER']);

// POST /api/manual-receipts - Create manual receipt
router.post('/', 
  canCreate,
  validateManualReceiptCreation,
  manualEntryController.createManualReceipt
);

// POST /api/manual-receipts/:id/items - Add items to manual receipt
router.post('/:id/items',
  canCreate,
  validateReceiptItems,
  manualEntryController.addItemsToReceipt
);

// POST /api/manual-receipts/:id/bulk-items - Create bulk wet market items
router.post('/:id/bulk-items',
  canCreate,
  validateBulkWetMarketItems,
  manualEntryController.createBulkWetMarketItems
);

// GET /api/manual-receipts - List manual receipts with pagination
router.get('/',
  manualEntryController.listManualReceipts
);

// GET /api/manual-receipts/:id - Get manual receipt details
router.get('/:id',
  manualEntryController.getManualReceipt
);

// PUT /api/manual-receipts/:id - Update manual receipt
router.put('/:id',
  canCreate,
  validateManualReceiptUpdate,
  manualEntryController.updateManualReceipt
);

// DELETE /api/manual-receipts/:id - Delete manual receipt
router.delete('/:id',
  canCreate,
  manualEntryController.deleteManualReceipt
);

module.exports = router;