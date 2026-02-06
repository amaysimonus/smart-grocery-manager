const otpService = require('../server/services/otpService');

// Mock the database module for testing
jest.mock('../server/config/database', () => ({
  prisma: {
    otpCode: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $transaction: jest.fn((callback) => callback({
      otpCode: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    })),
  },
}));

describe('OTP Service', () => {
  let mockPrisma;

  beforeEach(() => {
    jest.clearAllMocks();
    const { prisma } = require('../server/config/database');
    mockPrisma = prisma;
  });

  describe('generateOtpCode', () => {
    it('should generate 6-digit OTP', () => {
      const otp = otpService.generateOtpCode();
      
      expect(otp).toMatch(/^\d{6}$/);
      expect(otp.length).toBe(6);
    });

    it('should generate different OTPs', () => {
      const otp1 = otpService.generateOtpCode();
      const otp2 = otpService.generateOtpCode();
      
      expect(otp1).not.toBe(otp2);
    });
  });

  describe('createOtpCode', () => {
    it('should create OTP code for email', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        emailVerified: false,
      };
      const mockOtp = {
        id: 'otp123',
        code: '123456',
        email: 'test@example.com',
        type: 'EMAIL_VERIFICATION',
        expiresAt: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        mockPrisma.otpCode.updateMany.mockResolvedValue({ count: 0 });
        mockPrisma.otpCode.create.mockResolvedValue(mockOtp);
        return callback(mockPrisma);
      });

      const result = await otpService.createOtpCode({
        email: 'test@example.com',
        type: 'EMAIL_VERIFICATION',
      });

      expect(result).toEqual(mockOtp);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' }
      });
    });
  });
    });

    it('should throw error for missing email and phone', async () => {
      await expect(
        otpService.createOtpCode({
          type: 'EMAIL_VERIFICATION',
        })
      ).rejects.toThrow('Either email or phone is required');
    });

    it('should throw error for invalid OTP type', async () => {
      await expect(
        otpService.createOtpCode({
          email: 'test@example.com',
          type: 'INVALID_TYPE',
        })
      ).rejects.toThrow('Invalid OTP type');
    });

    it('should enforce rate limiting', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        emailVerified: false,
      };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.otpCode.count.mockResolvedValue(5);

      await expect(
        otpService.createOtpCode({
          email: 'test@example.com',
          type: 'EMAIL_VERIFICATION',
        })
      ).rejects.toThrow('Rate limit exceeded');
    });
  });

  describe('verifyOtpCode', () => {
    it('should verify valid OTP', async () => {
      const mockUser = { id: 'user123', emailVerified: false };
      const mockOtp = {
        id: 'otp123',
        code: '123456',
        email: 'test@example.com',
        type: 'EMAIL_VERIFICATION',
        used: false,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        user: mockUser,
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          otpCode: {
            findFirst: jest.fn().mockResolvedValue(mockOtp),
            update: jest.fn().mockResolvedValue({}),
          },
          user: {
            update: jest.fn().mockResolvedValue({ ...mockUser, emailVerified: true }),
          },
        };
        return callback(tx);
      });

      const result = await otpService.verifyOtpCode({
        email: 'test@example.com',
        code: '123456',
        type: 'EMAIL_VERIFICATION',
      });

      expect(result.success).toBe(true);
      expect(result.otp).toEqual(mockOtp);
      expect(result.user).toEqual(mockUser);
      expect(mockPrisma.otpCode.update).toHaveBeenCalledWith({
        where: { id: 'otp123' },
        data: { used: true },
      });
    });

    it('should throw error for invalid OTP', async () => {
      mockPrisma.otpCode.findFirst.mockResolvedValue(null);

      await expect(
        otpService.verifyOtpCode({
          email: 'test@example.com',
          code: '999999',
          type: 'EMAIL_VERIFICATION',
        })
      ).rejects.toThrow('Invalid or expired OTP code');
    });

    it('should throw error for missing email and phone', async () => {
      await expect(
        otpService.verifyOtpCode({
          code: '123456',
          type: 'EMAIL_VERIFICATION',
        })
      ).rejects.toThrow('Either email or phone is required');
    });
  });
});