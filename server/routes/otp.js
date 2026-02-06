const express = require('express');
const { requestOtp, verifyOtp, resendOtp, getOtpStatus, validateOtpRequest, validateOtpVerification, validateOtpStatus } = require('../controllers/otpController');
const rateLimit = require('express-rate-limit');

const router = express.Router();



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
  requestOtp
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
  verifyOtp
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
  resendOtp
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
  getOtpStatus
);

module.exports = router;