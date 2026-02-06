const request = require('supertest');
const app = require('./test-app');
const { prisma } = require('../server/config/database');
const bcrypt = require('bcryptjs');

describe('OTP System', () => {
  beforeEach(async () => {
    await prisma.otpCode.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /otp/request', () => {
    it('should request OTP for email verification', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          password: await bcrypt.hash('password123', 10),
          firstName: 'Test',
          lastName: 'User',
        },
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

      const otpCode = await prisma.otpCode.findFirst({
        where: { email: 'test@example.com', type: 'EMAIL_VERIFICATION' },
      });

      expect(otpCode).toBeTruthy();
      expect(otpCode.code).toMatch(/^\d{6}$/);
      expect(otpCode.expiresAt).toBeInstanceOf(Date);
      expect(otpCode.used).toBe(false);
    });

    it('should request OTP for phone verification', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          phone: '+1234567890',
          password: await bcrypt.hash('password123', 10),
          firstName: 'Test',
          lastName: 'User',
        },
      });

      const response = await request(app)
        .post('/otp/request')
        .send({
          phone: '+1234567890',
          type: 'PHONE_VERIFICATION',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const otpCode = await prisma.otpCode.findFirst({
        where: { phone: '+1234567890', type: 'PHONE_VERIFICATION' },
      });

      expect(otpCode).toBeTruthy();
      expect(otpCode.code).toMatch(/^\d{6}$/);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/otp/request')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('required');
    });

    it('should enforce rate limiting', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          password: await bcrypt.hash('password123', 10),
          firstName: 'Test',
          lastName: 'User',
        },
      });

      // Request 6 OTPs (should exceed rate limit of 5 per hour)
      const requests = [];
      for (let i = 0; i < 6; i++) {
        requests.push(
          request(app)
            .post('/otp/request')
            .send({
              email: 'test@example.com',
              type: 'EMAIL_VERIFICATION',
            })
        );
      }

      const responses = await Promise.all(requests);
      
      // First 5 should succeed
      for (let i = 0; i < 5; i++) {
        expect(responses[i].status).toBe(200);
      }
      
      // 6th should fail due to rate limiting
      expect(responses[5].status).toBe(429);
      expect(responses[5].body.success).toBe(false);
      expect(responses[5].body.message).toContain('rate limit');
    });
  });

  describe('POST /otp/verify', () => {
    it('should verify valid OTP code', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          password: await bcrypt.hash('password123', 10),
          firstName: 'Test',
          lastName: 'User',
        },
      });

      // Create OTP code
      const otpCode = await prisma.otpCode.create({
        data: {
          email: 'test@example.com',
          code: '123456',
          type: 'EMAIL_VERIFICATION',
          expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes from now
          userId: user.id,
        },
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

      // Check OTP is marked as used
      const updatedOtp = await prisma.otpCode.findUnique({
        where: { id: otpCode.id },
      });

      expect(updatedOtp.used).toBe(true);

      // Check user email is verified
      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id },
      });

      expect(updatedUser.emailVerified).toBe(true);
    });

    it('should reject invalid OTP code', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          password: await bcrypt.hash('password123', 10),
          firstName: 'Test',
          lastName: 'User',
        },
      });

      await prisma.otpCode.create({
        data: {
          email: 'test@example.com',
          code: '123456',
          type: 'EMAIL_VERIFICATION',
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          userId: user.id,
        },
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
      expect(response.body.message).toContain('invalid');
    });

    it('should reject expired OTP code', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          password: await bcrypt.hash('password123', 10),
          firstName: 'Test',
          lastName: 'User',
        },
      });

      await prisma.otpCode.create({
        data: {
          email: 'test@example.com',
          code: '123456',
          type: 'EMAIL_VERIFICATION',
          expiresAt: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
          userId: user.id,
        },
      });

      const response = await request(app)
        .post('/otp/verify')
        .send({
          email: 'test@example.com',
          code: '123456',
          type: 'EMAIL_VERIFICATION',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('expired');
    });

    it('should reject already used OTP code', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          password: await bcrypt.hash('password123', 10),
          firstName: 'Test',
          lastName: 'User',
        },
      });

      await prisma.otpCode.create({
        data: {
          email: 'test@example.com',
          code: '123456',
          type: 'EMAIL_VERIFICATION',
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          used: true,
          userId: user.id,
        },
      });

      const response = await request(app)
        .post('/otp/verify')
        .send({
          email: 'test@example.com',
          code: '123456',
          type: 'EMAIL_VERIFICATION',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('used');
    });
  });

  describe('POST /otp/resend', () => {
    it('should resend OTP code', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          password: await bcrypt.hash('password123', 10),
          firstName: 'Test',
          lastName: 'User',
        },
      });

      // Create initial OTP
      await prisma.otpCode.create({
        data: {
          email: 'test@example.com',
          code: '123456',
          type: 'EMAIL_VERIFICATION',
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          userId: user.id,
        },
      });

      const response = await request(app)
        .post('/otp/resend')
        .send({
          email: 'test@example.com',
          type: 'EMAIL_VERIFICATION',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Check new OTP was created
      const otpCodes = await prisma.otpCode.findMany({
        where: { email: 'test@example.com', type: 'EMAIL_VERIFICATION' },
      });

      expect(otpCodes.length).toBe(2);
    });
  });

  describe('GET /otp/status', () => {
    it('should check OTP status', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          password: await bcrypt.hash('password123', 10),
          firstName: 'Test',
          lastName: 'User',
        },
      });

      await prisma.otpCode.create({
        data: {
          email: 'test@example.com',
          code: '123456',
          type: 'EMAIL_VERIFICATION',
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          userId: user.id,
        },
      });

      const response = await request(app)
        .get('/otp/status')
        .query({
          email: 'test@example.com',
          type: 'EMAIL_VERIFICATION',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.hasActiveOtp).toBe(true);
      expect(response.body.expiresAt).toBeTruthy();
    });
  });
});