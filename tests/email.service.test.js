// Mock nodemailer before requiring email service
const mockSendMail = jest.fn().mockResolvedValue({
  messageId: 'test-message-id',
  response: '250 OK',
});

const mockVerify = jest.fn().mockResolvedValue(true);

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: mockSendMail,
    verify: mockVerify,
  })),
}));

// We need to clear cache to make sure the mock is used if the module was already required
jest.isolateModules(() => {
  const emailService = require('../server/services/emailService');

  describe('Email Service', () => {
    beforeEach(() => {
      jest.clearAllMocks();
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
      });
    });

    describe('sendOtpEmail', () => {
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
        expect(mockSendMail).toHaveBeenCalled();
      });

      it('should throw error when transporter not initialized', async () => {
        // Backup
        const originalTransporter = emailService.transporter;
        emailService.transporter = null;

        await expect(
          emailService.sendOtpEmail({
            to: 'test@example.com',
            otpCode: '123456',
            type: 'EMAIL_VERIFICATION',
          })
        ).rejects.toThrow('Email transporter not initialized');

        // Restore
        emailService.transporter = originalTransporter;
      });
    });
  });
});