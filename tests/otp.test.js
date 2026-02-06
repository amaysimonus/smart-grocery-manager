const request = require('supertest');
const app = require('./test-app');

// Mock Prisma
jest.mock('../server/config/database', () => {
  const mockPrisma = {
    otpCode: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn((callback) => {
      const tx = {
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
      };
      return callback(tx);
    }),
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  };
  return { prisma: mockPrisma };
});

const { prisma } = require('../server/config/database');
const bcrypt = require('bcryptjs');

describe('OTP System', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
  });

  describe('POST /otp/request', () => {
    it('should request OTP for email verification', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
      };

      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.otpCode.count.mockResolvedValue(0);
      prisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          otpCode: {
            updateMany: jest.fn().mockResolvedValue({ count: 0 }),
            create: jest.fn().mockResolvedValue({
              id: 'otp-id',
              code: '123456',
              email: 'test@example.com',
              type: 'EMAIL_VERIFICATION',
              expiresAt: new Date(),
              used: false
            }),
          }
        };
        return callback(tx);
      });

      const response = await request(app)
        .post('/otp/request')
        .send({
          email: 'test@example.com',
          type: 'EMAIL_VERIFICATION',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('OTP sent');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/otp/request')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /otp/verify', () => {
    it('should verify valid OTP code', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        emailVerified: false
      };

      const mockOtp = {
        id: 'otp-id',
        email: 'test@example.com',
        code: '123456',
        type: 'EMAIL_VERIFICATION',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        used: false,
        user: mockUser
      };

      prisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          otpCode: {
            findFirst: jest.fn().mockResolvedValue(mockOtp),
            update: jest.fn().mockResolvedValue({ ...mockOtp, used: true }),
          },
          user: {
            update: jest.fn().mockResolvedValue({ ...mockUser, emailVerified: true }),
          },
        };
        return callback(tx);
      });

      const response = await request(app)
        .post('/otp/verify')
        .send({
          email: 'test@example.com',
          code: '123456',
          type: 'EMAIL_VERIFICATION',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('verified');
    });

    it('should reject invalid OTP code', async () => {
      prisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          otpCode: {
            findFirst: jest.fn().mockResolvedValue(null),
          }
        };
        return callback(tx);
      });

      const response = await request(app)
        .post('/otp/verify')
        .send({
          email: 'test@example.com',
          code: '999999',
          type: 'EMAIL_VERIFICATION',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
});