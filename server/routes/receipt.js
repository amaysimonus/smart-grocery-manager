const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { 
  upload, 
  receiptController, 
  validateReceiptUpload,
  validateReceiptProcess,
  validateReceiptUpdate,
  handleMulterErrors
} = require('../controllers/receiptController');

const router = express.Router();

// Upload receipt image and start OCR processing
router.post('/upload', 
  authMiddleware,
  upload.single('receipt'),
  handleMulterErrors,
  validateReceiptUpload,
  receiptController.uploadReceipt
);

// Process OCR for existing receipt
router.post('/process',
  authMiddleware,
  validateReceiptProcess,
  receiptController.processReceiptOCR
);

// List receipts with pagination
router.get('/', 
  authMiddleware,
  receiptController.listReceipts
);

// Get single receipt details
router.get('/:id', 
  authMiddleware,
  receiptController.getReceipt
);

// Update receipt with manual corrections
router.put('/:id',
  authMiddleware,
  validateReceiptUpdate,
  receiptController.updateReceipt
);

// Delete receipt
router.delete('/:id',
  authMiddleware,
  receiptController.deleteReceipt
);

module.exports = router;