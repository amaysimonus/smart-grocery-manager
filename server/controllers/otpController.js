const { body, query, validationResult } = require('express-validator');
const otpService = require('../services/otpService');
const emailService = require('../services/emailService');
const smsService = require('../services/smsService');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

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

      // Find user if available
      let user = null;
      if (email) {
        user = await prisma.user.findUnique({
          where: { email },
        });
      } else if (phone) {
        user = await prisma.user.findUnique({
          where: { phone },
        });
      }

      // Create OTP
      const otpCode = await otpService.createOtpCode({
        email,
        phone,
        type,
        userId: user?.id,
      });

      // Send OTP via email or SMS
      if (email && user) {
        try {
          await emailService.sendOtpEmail({
            to: email,
            otpCode: otpCode.code,
            type,
            language: user.language || 'en',
            firstName: user.firstName,
          });
        } catch (emailError) {
          console.error('Failed to send OTP email:', emailError);
          // Don't fail the request if email fails, but log it
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
        } catch (smsError) {
          console.error('Failed to send OTP SMS:', smsError);
          // Don't fail the request if SMS fails, but log it
        }
      }

      res.status(200).json({
        success: true,
        message: 'OTP sent successfully',
        otpId: otpCode.id,
        // In production, don't return the actual OTP code
        // For development/testing, we can include it
        ...(process.env.NODE_ENV === 'development' && { otpCode: otpCode.code }),
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

      // Find user if available
      let user = null;
      if (email) {
        user = await prisma.user.findUnique({
          where: { email },
        });
      } else if (phone) {
        user = await prisma.user.findUnique({
          where: { phone },
        });
      }

      // Resend OTP
      const otpCode = await otpService.resendOtp({
        email,
        phone,
        type,
      });

      // Send OTP via email or SMS
      if (email && user) {
        try {
          await emailService.sendOtpEmail({
            to: email,
            otpCode: otpCode.code,
            type,
            language: user.language || 'en',
            firstName: user.firstName,
          });
        } catch (emailError) {
          console.error('Failed to resend OTP email:', emailError);
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
        } catch (smsError) {
          console.error('Failed to resend OTP SMS:', smsError);
        }
      }

      res.status(200).json({
        success: true,
        message: 'OTP resent successfully',
        otpId: otpCode.id,
        ...(process.env.NODE_ENV === 'development' && { otpCode: otpCode.code }),
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

module.exports = new OtpController();