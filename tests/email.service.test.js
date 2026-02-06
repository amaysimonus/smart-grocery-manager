// Mock nodemailer before requiring email service
jest.mock('nodemailer', () => ({
  createTransporter: jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue({
      messageId: 'test-message-id',
      response: '250 OK',
    }),
    verify: jest.fn().mockResolvedValue(true),
  })),
}));

const EmailService = require('../server/services/emailService');

describe('Email Service', () => {
  let emailService;

  beforeEach(() => {
    jest.clearAllMocks();
    emailService = EmailService; // Use the exported instance
  });

  describe('getEmailContent', () => {
    it('should generate English email content for EMAIL_VERIFICATION', () => {
      const content = emailService.getEmailContent({
        type: 'EMAIL_VERIFICATION',
        language: 'en',
        firstName: 'John',
        otpCode: '123456',
      });

      expect(content.subject).toBe('Verify your email address');
      expect(content.html).toContain('123456');
      expect(content.html).toContain('Hello John');
      expect(content.text).toContain('123456');
      expect(content.text).toContain('Hello John');
    });

    it('should generate Chinese email content for EMAIL_VERIFICATION', () => {
      const content = emailService.getEmailContent({
        type: 'EMAIL_VERIFICATION',
        language: 'zh',
        firstName: 'John',
        otpCode: '123456',
      });

      expect(content.subject).toBe('驗證您的電子郵件地址');
      expect(content.html).toContain('123456');
      expect(content.html).toContain('您好 John');
      expect(content.text).toContain('123456');
      expect(content.text).toContain('您好 John');
    });

    it('should generate email content without first name', () => {
      const content = emailService.getEmailContent({
        type: 'PASSWORD_RESET',
        language: 'en',
        firstName: null,
        otpCode: '123456',
      });

      expect(content.subject).toBe('Reset your password');
      expect(content.html).toContain('Hello,');
      expect(content.html).toContain('123456');
    });

    it('should handle different OTP types', () => {
      const types = ['EMAIL_VERIFICATION', 'PHONE_VERIFICATION', 'PASSWORD_RESET', 'LOGIN'];
      
      types.forEach(type => {
        const content = emailService.getEmailContent({
          type,
          language: 'en',
          firstName: 'Test',
          otpCode: '123456',
        });

        expect(content.subject).toBeTruthy();
        expect(content.html).toContain('123456');
        expect(content.text).toContain('123456');
      });
    });
  });

  describe('sendOtpEmail', () => {
    beforeEach(() => {
      // Mock nodemailer
      const nodemailer = require('nodemailer');
      nodemailer.createTransporter = jest.fn(() => ({
        sendMail: jest.fn().mockResolvedValue({
          messageId: 'test-message-id',
          response: '250 OK',
        }),
      }));

      // Initialize transporter
      emailService.initializeTransporter();
    });

    it('should send OTP email successfully', async () => {
      const result = await emailService.sendOtpEmail({
        to: 'test@example.com',
        otpCode: '123456',
        type: 'EMAIL_VERIFICATION',
        language: 'en',
        firstName: 'John',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('test-message-id');
    });

    it('should throw error when transporter not initialized', async () => {
      emailService.transporter = null;

      await expect(
        emailService.sendOtpEmail({
          to: 'test@example.com',
          otpCode: '123456',
          type: 'EMAIL_VERIFICATION',
        })
      ).rejects.toThrow('Email transporter not initialized');
    });
  });
});