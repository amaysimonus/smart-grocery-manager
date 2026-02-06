const { body, query, validationResult } = require('express-validator');
const otpService = require('../services/otpService');
const emailService = require('../services/emailService');
const smsService = require('../services/smsService');
const { prisma } = require('../config/database');

class OtpController {
  /**
   * Request OTP
   */
  async requestOtp(req, res) {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { email, phone, type } = req.body;

      // Create OTP - service handles user validation
      const otpCode = await otpService.createOtpCode({
        email,
        phone,
        type,
      });

      // Get user for sending OTP (service already validated existence)
      const user = email 
        ? await prisma.user.findUnique({ where: { email } })
        : await prisma.user.findUnique({ where: { phone } });

      // Send OTP via email or SMS with proper error handling
      let sendSuccessful = false;
      if (email && user) {
        try {
          await emailService.sendOtpEmail({
            to: email,
            otpCode: otpCode.code,
            type,
            language: user.language || 'en',
            firstName: user.firstName,
          });
          sendSuccessful = true;
        } catch (emailError) {
          console.error('Failed to send OTP email:', emailError);
          throw new Error('Failed to send OTP via email. Please try again.');
        }
      } else if (phone && user) {
        try {
          await smsService.sendOtpSms({
            to: phone,
            otpCode: otpCode.code,
            type,
            language: user.language || 'en',
            firstName: user.firstName,
          });
          sendSuccessful = true;
        } catch (smsError) {
          console.error('Failed to send OTP SMS:', smsError);
          throw new Error('Failed to send OTP via SMS. Please try again.');
        }
      }

      if (!sendSuccessful && user) {
        throw new Error('Failed to send OTP. Please try again.');
      }

      res.status(200).json({
        success: true,
        message: 'OTP sent successfully',
        otpId: otpCode.id,
      });
    } catch (error) {
      console.error('Request OTP error:', error);
      
      if (error.message.includes('Rate limit')) {
        return res.status(429).json({
          success: false,
          message: error.message,
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to send OTP. Please try again.',
      });
    }
  }

  /**
   * Verify OTP
   */
  async verifyOtp(req, res) {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { email, phone, code, type } = req.body;

      // Verify OTP
      const result = await otpService.verifyOtpCode({
        email,
        phone,
        code,
        type,
      });

      res.status(200).json({
        success: true,
        message: 'OTP verified successfully',
        user: result.user ? {
          id: result.user.id,
          email: result.user.email,
          phone: result.user.phone,
          emailVerified: result.user.emailVerified,
          phoneVerified: result.user.phoneVerified,
        } : null,
      });
    } catch (error) {
      console.error('Verify OTP error:', error);
      
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to verify OTP',
      });
    }
  }

  /**
   * Resend OTP
   */
  async resendOtp(req, res) {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { email, phone, type } = req.body;

      // Resend OTP - service handles validation
      const otpCode = await otpService.resendOtp({
        email,
        phone,
        type,
      });

      // Get user for sending OTP
      const user = email 
        ? await prisma.user.findUnique({ where: { email } })
        : await prisma.user.findUnique({ where: { phone } });

      // Send OTP via email or SMS with proper error handling
      let sendSuccessful = false;
      if (email && user) {
        try {
          await emailService.sendOtpEmail({
            to: email,
            otpCode: otpCode.code,
            type,
            language: user.language || 'en',
            firstName: user.firstName,
          });
          sendSuccessful = true;
        } catch (emailError) {
          console.error('Failed to resend OTP email:', emailError);
          throw new Error('Failed to resend OTP via email. Please try again.');
        }
      } else if (phone && user) {
        try {
          await smsService.sendOtpSms({
            to: phone,
            otpCode: otpCode.code,
            type,
            language: user.language || 'en',
            firstName: user.firstName,
          });
          sendSuccessful = true;
        } catch (smsError) {
          console.error('Failed to resend OTP SMS:', smsError);
          throw new Error('Failed to resend OTP via SMS. Please try again.');
        }
      }

      if (!sendSuccessful && user) {
        throw new Error('Failed to resend OTP. Please try again.');
      }

      res.status(200).json({
        success: true,
        message: 'OTP resent successfully',
        otpId: otpCode.id,
      });
    } catch (error) {
      console.error('Resend OTP error:', error);
      
      if (error.message.includes('Rate limit')) {
        return res.status(429).json({
          success: false,
          message: error.message,
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to resend OTP. Please try again.',
      });
    }
  }

  /**
   * Get OTP status
   */
  async getOtpStatus(req, res) {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { email, phone, type } = req.query;

      // Get OTP status
      const status = await otpService.getOtpStatus({
        email,
        phone,
        type,
      });

      res.status(200).json({
        success: true,
        data: status,
      });
    } catch (error) {
      console.error('Get OTP status error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to get OTP status',
      });
    }
  }

  /**
   * Validation middleware for OTP request
   */
  static validateOtpRequest() {
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
  }

  /**
   * Validation middleware for OTP verification
   */
  static validateOtpVerification() {
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
  }

  /**
   * Validation middleware for OTP status check
   */
  static validateOtpStatus() {
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
  }
}

const otpController = new OtpController();

module.exports = {
  requestOtp: otpController.requestOtp.bind(otpController),
  verifyOtp: otpController.verifyOtp.bind(otpController),
  resendOtp: otpController.resendOtp.bind(otpController),
  getOtpStatus: otpController.getOtpStatus.bind(otpController),
  validateOtpRequest: OtpController.validateOtpRequest.bind(OtpController),
  validateOtpVerification: OtpController.validateOtpVerification.bind(OtpController),
  validateOtpStatus: OtpController.validateOtpStatus.bind(OtpController),
};