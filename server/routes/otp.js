const express = require('express');
const otpController = require('../controllers/otpController');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Import validation functions directly
const { body, query } = require('express-validator');

// Rate limiting for OTP endpoints
const otpRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per 15-minute window
  message: {
    success: false,
    message: 'Too many OTP requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiting for OTP requests
const otpRequestLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each email/phone to 5 OTP requests per hour
  keyGenerator: (req) => {
    // Use email or phone as the key for more precise limiting
    return req.body.email || req.body.phone || req.ip;
  },
  message: {
    success: false,
    message: 'Rate limit exceeded. Maximum 5 OTP requests per hour per email/phone.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Validation functions
const validateOtpRequest = () => {
  return [
    body('type')
      .isIn(['EMAIL_VERIFICATION', 'PHONE_VERIFICATION', 'PASSWORD_RESET', 'LOGIN'])
      .withMessage('Invalid OTP type'),
    body('email')
      .optional()
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
    body('phone')
      .optional()
      .matches(/^\+[1-9]\d{1,14}$/)
      .withMessage('Valid phone number in international format is required (+XX... )'),
    // Either email or phone must be provided
    body().custom((value, { req }) => {
      if (!req.body.email && !req.body.phone) {
        throw new Error('Either email or phone number is required');
      }
      return true;
    }),
  ];
};

const validateOtpVerification = () => {
  return [
    body('type')
      .isIn(['EMAIL_VERIFICATION', 'PHONE_VERIFICATION', 'PASSWORD_RESET', 'LOGIN'])
      .withMessage('Invalid OTP type'),
    body('code')
      .isLength({ min: 6, max: 6 })
      .isNumeric()
      .withMessage('OTP code must be 6 digits'),
    body('email')
      .optional()
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
    body('phone')
      .optional()
      .matches(/^\+[1-9]\d{1,14}$/)
      .withMessage('Valid phone number in international format is required (+XX...)'),
    // Either email or phone must be provided
    body().custom((value, { req }) => {
      if (!req.body.email && !req.body.phone) {
        throw new Error('Either email or phone number is required');
      }
      return true;
    }),
  ];
};

const validateOtpStatus = () => {
  return [
    query('type')
      .isIn(['EMAIL_VERIFICATION', 'PHONE_VERIFICATION', 'PASSWORD_RESET', 'LOGIN'])
      .withMessage('Invalid OTP type'),
    query('email')
      .optional()
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
    query('phone')
      .optional()
      .matches(/^\+[1-9]\d{1,14}$/)
      .withMessage('Valid phone number in international format is required (+XX...)'),
    // Either email or phone must be provided
    query().custom((value, { req }) => {
      if (!req.query.email && !req.query.phone) {
        throw new Error('Either email or phone number is required');
      }
      return true;
    }),
  ];
};

/**
 * @route   POST /otp/request
 * @desc    Request OTP for email or phone verification
 * @access  Public
 */
router.post(
  '/request',
  otpRateLimit,
  otpRequestLimit,
  validateOtpRequest(),
  otpController.requestOtp
);

/**
 * @route   POST /otp/verify
 * @desc    Verify OTP code
 * @access  Public
 */
router.post(
  '/verify',
  otpRateLimit,
  validateOtpVerification(),
  otpController.verifyOtp
);

/**
 * @route   POST /otp/resend
 * @desc    Resend OTP code
 * @access  Public
 */
router.post(
  '/resend',
  otpRateLimit,
  otpRequestLimit,
  validateOtpRequest(),
  otpController.resendOtp
);

/**
 * @route   GET /otp/status
 * @desc    Check OTP status
 * @access  Public
 */
router.get(
  '/status',
  otpRateLimit,
  validateOtpStatus(),
  otpController.getOtpStatus
);

module.exports = router;