const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const otpRoutes = require('../server/routes/otp');
const oauthRoutes = require('../server/routes/oauth');
const receiptRoutes = require('../server/routes/receipt');
const manualEntryRoutes = require('../server/routes/manualEntry');

// Create test Express app
const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/otp', otpRoutes);
app.use('/auth', oauthRoutes);
app.use('/receipts', receiptRoutes);
app.use('/api/manual-receipts', manualEntryRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'receipt-tracking-api',
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Error handler
app.use((error, req, res, next) => {
  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Internal server error',
  });
});

module.exports = app;