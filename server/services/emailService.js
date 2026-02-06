const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  /**
   * Initialize nodemailer transporter
   */
  initializeTransporter() {
    try {
      this.transporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    } catch (error) {
      console.error('Failed to initialize email transporter:', error);
    }
  }

  /**
   * Send OTP email
   * @param {Object} emailData - Email data
   * @param {string} emailData.to - Recipient email
   * @param {string} emailData.otpCode - OTP code
   * @param {string} emailData.type - OTP type
   * @param {string} emailData.language - User language preference
   * @param {string} emailData.firstName - User first name
   * @returns {Promise<Object>} Send result
   */
  async sendOtpEmail({ to, otpCode, type, language = 'en', firstName }) {
    if (!this.transporter) {
      throw new Error('Email transporter not initialized');
    }

    const content = this.getEmailContent({ type, language, firstName, otpCode });

    const mailOptions = {
      from: `"${process.env.APP_NAME || 'Receipt Tracking'}" <${process.env.SMTP_USER}>`,
      to,
      subject: content.subject,
      html: content.html,
      text: content.text,
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      return {
        success: true,
        messageId: result.messageId,
        response: result.response,
      };
    } catch (error) {
      console.error('Failed to send email:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  /**
   * Get email content based on type and language
   * @param {Object} contentData - Content data
   * @param {string} contentData.type - OTP type
   * @param {string} contentData.language - Language preference
   * @param {string} contentData.firstName - User first name
   * @param {string} contentData.otpCode - OTP code
   * @returns {Object} Email content
   */
  getEmailContent({ type, language, firstName, otpCode }) {
    const isZh = language === 'zh';

    const templates = {
      EMAIL_VERIFICATION: {
        en: {
          subject: 'Verify your email address',
          greeting: `Hello${firstName ? ` ${firstName}` : ''},`,
          message: 'Thank you for signing up! Please use the verification code below to verify your email address:',
          instructions: 'This code will expire in 15 minutes.',
          codeLabel: 'Verification Code',
        },
        zh: {
          subject: '驗證您的電子郵件地址',
          greeting: `您好${firstName ? ` ${firstName}` : ''}，`,
          message: '感謝您註冊！請使用下面的驗證碼來驗證您的電子郵件地址：',
          instructions: '此驗證碼將在15分鐘後過期。',
          codeLabel: '驗證碼',
        },
      },
      PHONE_VERIFICATION: {
        en: {
          subject: 'Verify your phone number',
          greeting: `Hello${firstName ? ` ${firstName}` : ''},`,
          message: 'Please use the verification code below to verify your phone number:',
          instructions: 'This code will expire in 15 minutes.',
          codeLabel: 'Verification Code',
        },
        zh: {
          subject: '驗證您的電話號碼',
          greeting: `您好${firstName ? ` ${firstName}` : ''}，`,
          message: '請使用下面的驗證碼來驗證您的電話號碼：',
          instructions: '此驗證碼將在15分鐘後過期。',
          codeLabel: '驗證碼',
        },
      },
      PASSWORD_RESET: {
        en: {
          subject: 'Reset your password',
          greeting: `Hello${firstName ? ` ${firstName}` : ''},`,
          message: 'We received a request to reset your password. Please use the code below:',
          instructions: 'This code will expire in 15 minutes. If you did not request this, please ignore this email.',
          codeLabel: 'Reset Code',
        },
        zh: {
          subject: '重置您的密碼',
          greeting: `您好${firstName ? ` ${firstName}` : ''}，`,
          message: '我們收到了重置密碼的請求。請使用下面的代碼：',
          instructions: '此代碼將在15分鐘後過期。如果您沒有請求此操作，請忽略此郵件。',
          codeLabel: '重置代碼',
        },
      },
      LOGIN: {
        en: {
          subject: 'Your login code',
          greeting: `Hello${firstName ? ` ${firstName}` : ''},`,
          message: 'Please use the code below to sign in to your account:',
          instructions: 'This code will expire in 15 minutes.',
          codeLabel: 'Login Code',
        },
        zh: {
          subject: '您的登入代碼',
          greeting: `您好${firstName ? ` ${firstName}` : ''}，`,
          message: '請使用下面的代碼登入您的帳戶：',
          instructions: '此代碼將在15分鐘後過期。',
          codeLabel: '登入代碼',
        },
      },
    };

    const template = templates[type][isZh ? 'zh' : 'en'];

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${template.subject}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background-color: #1976d2;
              color: white;
              padding: 20px;
              text-align: center;
              border-radius: 5px 5px 0 0;
            }
            .content {
              background-color: #f9f9f9;
              padding: 30px;
              border-radius: 0 0 5px 5px;
            }
            .otp-code {
              background-color: #e3f2fd;
              border: 2px dashed #1976d2;
              padding: 20px;
              text-align: center;
              font-size: 24px;
              font-weight: bold;
              letter-spacing: 3px;
              margin: 20px 0;
              border-radius: 5px;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              font-size: 12px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${template.subject}</h1>
          </div>
          <div class="content">
            <p>${template.greeting}</p>
            <p>${template.message}</p>
            <div class="otp-code">${otpCode}</div>
            <p><strong>${template.codeLabel}:</strong> ${otpCode}</p>
            <p><em>${template.instructions}</em></p>
          </div>
          <div class="footer">
            <p>${isZh ? '此郵件由系統自動發送，請勿回覆。' : 'This email was sent automatically, please do not reply.'}</p>
          </div>
        </body>
      </html>
    `;

    const text = `
${template.subject}

${template.greeting}

${template.message}

${template.codeLabel}: ${otpCode}

${template.instructions}

---
${isZh ? '此郵件由系統自動發送，請勿回覆。' : 'This email was sent automatically, please do not reply.'}
    `;

    return {
      subject: template.subject,
      html,
      text,
    };
  }

  /**
   * Test email configuration
   * @returns {Promise<boolean>} Test result
   */
  async testConnection() {
    if (!this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('Email configuration test failed:', error);
      return false;
    }
  }
}

module.exports = new EmailService();