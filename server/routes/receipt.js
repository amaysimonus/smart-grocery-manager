const express = require('express');
const { auth } = require('../middleware/auth');
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
  auth,
  upload.single('receipt'),
  handleMulterErrors,
  validateReceiptUpload,
  receiptController.uploadReceipt
);

// Process OCR for existing receipt
router.post('/process',
  auth,
  validateReceiptProcess,
  receiptController.processReceiptOCR
);

// List receipts with pagination
router.get('/', 
  auth,
  receiptController.listReceipts
);

// Get single receipt details
router.get('/:id', 
  auth,
  receiptController.getReceipt
);

// Update receipt with manual corrections
router.put('/:id',
  auth,
  validateReceiptUpdate,
  receiptController.updateReceipt
);

// Delete receipt
router.delete('/:id',
  auth,
  receiptController.deleteReceipt
);

module.exports = router;