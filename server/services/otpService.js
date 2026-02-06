const crypto = require('crypto');
const { prisma } = require('../config/database');

class OtpService {
  constructor() {
    this.OTP_LENGTH = 6;
    this.OTP_EXPIRY_MINUTES = 15;
    this.MAX_OTP_ATTEMPTS_PER_HOUR = 5;
  }

  /**
   * Generate a secure 6-digit OTP code
   * @returns {string} 6-digit OTP code
   */
  generateOtpCode() {
    const otp = crypto.randomInt(0, 1000000);
    return otp.toString().padStart(6, '0');
  }

  /**
   * Create and store OTP code
   * @param {Object} otpData - OTP data
   * @param {string} otpData.email - Email address (optional)
   * @param {string} otpData.phone - Phone number (optional)
   * @param {string} otpData.type - OTP type
   * @param {string} otpData.userId - User ID (optional)
   * @returns {Promise<Object>} Created OTP record
   */
  async createOtpCode({ email, phone, type, userId }) {
    // Validate required fields
    if (!email && !phone) {
      throw new Error('Either email or phone is required');
    }

    if (!type || !Object.values(['EMAIL_VERIFICATION', 'PHONE_VERIFICATION', 'PASSWORD_RESET', 'LOGIN']).includes(type)) {
      throw new Error('Invalid OTP type');
    }

    // Validate user existence and verification status
    await this.validateUserForOtp({ email, phone, type });

    // Check rate limiting
    await this.checkRateLimit(email, phone);

    // Generate OTP code
    const code = this.generateOtpCode();
    const expiresAt = new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000);

    // Create OTP record with transaction
    const result = await prisma.$transaction(async (tx) => {
      // Invalidate existing unused OTPs of same type for this email/phone
      await tx.otpCode.updateMany({
        where: {
          OR: [{ email }, { phone }],
          type,
          used: false,
        },
        data: { used: true },
      });

      // Create new OTP record
      return tx.otpCode.create({
        data: {
          email,
          phone,
          code,
          type,
          expiresAt,
          userId,
        },
      });
    });

    return result;
  }

  /**
   * Verify OTP code
   * @param {Object} verifyData - Verification data
   * @param {string} verifyData.email - Email address (optional)
   * @param {string} verifyData.phone - Phone number (optional)
   * @param {string} verifyData.code - OTP code
   * @param {string} verifyData.type - OTP type
   * @returns {Promise<Object>} Verification result
   */
  async verifyOtpCode({ email, phone, code, type }) {
    if (!email && !phone) {
      throw new Error('Either email or phone is required');
    }

    if (!code || !type) {
      throw new Error('Code and type are required');
    }

    // Use transaction to prevent race conditions
    const result = await prisma.$transaction(async (tx) => {
      // Find and lock valid OTP
      const otpCode = await tx.otpCode.findFirst({
        where: {
          email,
          phone,
          code,
          type,
          used: false,
          expiresAt: {
            gt: new Date(),
          },
        },
        include: {
          user: true,
        },
      });

      if (!otpCode) {
        throw new Error('Invalid or expired OTP code');
      }

      // Mark OTP as used immediately to prevent race conditions
      await tx.otpCode.update({
        where: { id: otpCode.id },
        data: { used: true },
      });

      // Update user verification status if user exists
      if (otpCode.user) {
        const updateData = {};
        if (type === 'EMAIL_VERIFICATION') {
          updateData.emailVerified = true;
        } else if (type === 'PHONE_VERIFICATION') {
          updateData.phoneVerified = true;
        }

        if (Object.keys(updateData).length > 0) {
          await tx.user.update({
            where: { id: otpCode.userId },
            data: updateData,
          });
        }
      }

      return {
        success: true,
        otp: otpCode,
        user: otpCode.user,
      };
    });

    return result;
  }

  /**
   * Check rate limiting for OTP requests
   * @param {string} email - Email address (optional)
   * @param {string} phone - Phone number (optional)
   * @returns {Promise<void>}
   */
  async checkRateLimit(email, phone) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const count = await prisma.otpCode.count({
      where: {
        OR: [
          { email },
          { phone },
        ],
        createdAt: {
          gte: oneHourAgo,
        },
      },
    });

    if (count >= this.MAX_OTP_ATTEMPTS_PER_HOUR) {
      throw new Error(`Rate limit exceeded. Maximum ${this.MAX_OTP_ATTEMPTS_PER_HOUR} OTP requests per hour.`);
    }
  }

  /**
   * Get OTP status for email/phone
   * @param {Object} statusData - Status check data
   * @param {string} statusData.email - Email address (optional)
   * @param {string} statusData.phone - Phone number (optional)
   * @param {string} statusData.type - OTP type
   * @returns {Promise<Object>} OTP status
   */
  async getOtpStatus({ email, phone, type }) {
    if (!email && !phone) {
      throw new Error('Either email or phone is required');
    }

    if (!type) {
      throw new Error('OTP type is required');
    }

    const otpCode = await prisma.otpCode.findFirst({
      where: {
        email,
        phone,
        type,
        used: false,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      hasActiveOtp: !!otpCode,
      expiresAt: otpCode?.expiresAt || null,
      createdAt: otpCode?.createdAt || null,
    };
  }

  /**
   * Resend OTP (creates new OTP and invalidates old ones)
   * @param {Object} resendData - Resend data
   * @param {string} resendData.email - Email address (optional)
   * @param {string} resendData.phone - Phone number (optional)
   * @param {string} resendData.type - OTP type
   * @returns {Promise<Object>} New OTP record
   */
  async resendOtp({ email, phone, type }) {
    if (!email && !phone) {
      throw new Error('Either email or phone is required');
    }

    if (!type) {
      throw new Error('OTP type is required');
    }

    // Invalidate existing unused OTPs
    await prisma.otpCode.updateMany({
      where: {
        email,
        phone,
        type,
        used: false,
      },
      data: {
        used: true,
      },
    });

    // Create new OTP
    return this.createOtpCode({ email, phone, type });
  }

  /**
   * Validate user existence and verification status for OTP
   * @param {Object} userData - User data
   * @param {string} userData.email - Email address (optional)
   * @param {string} userData.phone - Phone number (optional)
   * @param {string} userData.type - OTP type
   * @returns {Promise<void>}
   */
  async validateUserForOtp({ email, phone, type }) {
    // For EMAIL_VERIFICATION and PHONE_VERIFICATION, user must exist
    if (type === 'EMAIL_VERIFICATION' || type === 'PHONE_VERIFICATION') {
      const user = email 
        ? await prisma.user.findUnique({ where: { email } })
        : await prisma.user.findUnique({ where: { phone } });

      if (!user) {
        throw new Error('User not found');
      }

      // Check if already verified
      if (type === 'EMAIL_VERIFICATION' && user.emailVerified) {
        throw new Error('Email is already verified');
      }
      if (type === 'PHONE_VERIFICATION' && user.phoneVerified) {
        throw new Error('Phone is already verified');
      }
    }

    // For PASSWORD_RESET and LOGIN, user must exist
    if (type === 'PASSWORD_RESET' || type === 'LOGIN') {
      const user = email 
        ? await prisma.user.findUnique({ where: { email } })
        : await prisma.user.findUnique({ where: { phone } });

      if (!user) {
        throw new Error('No account found with this email or phone');
      }
    }
  }

  /**
   * Clean up expired OTP codes (maintenance method)
   * @returns {Promise<number>} Number of cleaned up records
   */
  async cleanupExpiredOtps() {
    const result = await prisma.otpCode.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    return result.count;
  }
}

module.exports = new OtpService();