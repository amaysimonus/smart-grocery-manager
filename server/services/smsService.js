const twilio = require('twilio');

class SmsService {
  constructor() {
    this.client = null;
    this.initializeClient();
  }

  /**
   * Initialize Twilio client
   */
  initializeClient() {
    try {
      this.client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
    } catch (error) {
      console.error('Failed to initialize Twilio client:', error);
    }
  }

  /**
   * Send OTP SMS
   * @param {Object} smsData - SMS data
   * @param {string} smsData.to - Recipient phone number
   * @param {string} smsData.otpCode - OTP code
   * @param {string} smsData.type - OTP type
   * @param {string} smsData.language - User language preference
   * @param {string} smsData.firstName - User first name
   * @returns {Promise<Object>} Send result
   */
  async sendOtpSms({ to, otpCode, type, language = 'en', firstName }) {
    if (!this.client) {
      throw new Error('Twilio client not initialized');
    }

    if (!process.env.TWILIO_PHONE_NUMBER) {
      throw new Error('Twilio phone number not configured');
    }

    const message = this.getSmsMessage({ type, language, firstName, otpCode });

    try {
      const result = await this.client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: to,
      });

      return {
        success: true,
        messageId: result.sid,
        status: result.status,
        to: result.to,
        from: result.from,
      };
    } catch (error) {
      console.error('Failed to send SMS:', error);
      throw new Error(`Failed to send SMS: ${error.message}`);
    }
  }

  /**
   * Get SMS message content based on type and language
   * @param {Object} messageData - Message data
   * @param {string} messageData.type - OTP type
   * @param {string} messageData.language - Language preference
   * @param {string} messageData.firstName - User first name
   * @param {string} messageData.otpCode - OTP code
   * @returns {string} SMS message
   */
  getSmsMessage({ type, language, firstName, otpCode }) {
    const isZh = language === 'zh';
    const greeting = firstName ? (isZh ? `${firstName}，` : `${firstName}, `) : '';

    const templates = {
      EMAIL_VERIFICATION: {
        en: `${greeting}Your email verification code is: ${otpCode}. This code will expire in 15 minutes.`,
        zh: `${greeting}您的電子郵件驗證碼是：${otpCode}。此代碼將在15分鐘後過期。`,
      },
      PHONE_VERIFICATION: {
        en: `${greeting}Your phone verification code is: ${otpCode}. This code will expire in 15 minutes.`,
        zh: `${greeting}您的電話驗證碼是：${otpCode}。此代碼將在15分鐘後過期。`,
      },
      PASSWORD_RESET: {
        en: `${greeting}Your password reset code is: ${otpCode}. This code will expire in 15 minutes. If you did not request this, please ignore.`,
        zh: `${greeting}您的密碼重置代碼是：${otpCode}。此代碼將在15分鐘後過期。如果您沒有請求此操作，請忽略。`,
      },
      LOGIN: {
        en: `${greeting}Your login code is: ${otpCode}. This code will expire in 15 minutes.`,
        zh: `${greeting}您的登入代碼是：${otpCode}。此代碼將在15分鐘後過期。`,
      },
    };

    return templates[type][isZh ? 'zh' : 'en'];
  }

  /**
   * Validate phone number format
   * @param {string} phoneNumber - Phone number to validate
   * @returns {boolean} Validation result
   */
  validatePhoneNumber(phoneNumber) {
    // Basic international phone number validation
    // Should start with + and contain only digits after that
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(phoneNumber);
  }

  /**
   * Format phone number for SMS
   * @param {string} phoneNumber - Phone number to format
   * @returns {string} Formatted phone number
   */
  formatPhoneNumber(phoneNumber) {
    // Remove any non-digit characters except +
    let formatted = phoneNumber.replace(/[^\d+]/g, '');
    
    // Ensure it starts with +
    if (!formatted.startsWith('+')) {
      formatted = '+' + formatted;
    }
    
    return formatted;
  }

  /**
   * Get SMS delivery status
   * @param {string} messageSid - Twilio message SID
   * @returns {Promise<Object>} Message status
   */
  async getSmsStatus(messageSid) {
    if (!this.client) {
      throw new Error('Twilio client not initialized');
    }

    try {
      const message = await this.client.messages(messageSid).fetch();
      return {
        sid: message.sid,
        status: message.status,
        errorCode: message.errorCode,
        errorMessage: message.errorMessage,
        dateCreated: message.dateCreated,
        dateUpdated: message.dateUpdated,
        to: message.to,
        from: message.from,
      };
    } catch (error) {
      console.error('Failed to get SMS status:', error);
      throw new Error(`Failed to get SMS status: ${error.message}`);
    }
  }

  /**
   * Test SMS configuration
   * @returns {Promise<boolean>} Test result
   */
  async testConnection() {
    if (!this.client) {
      return false;
    }

    try {
      // Try to fetch account info to test connection
      const account = await this.client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
      return !!account;
    } catch (error) {
      console.error('SMS configuration test failed:', error);
      return false;
    }
  }

  /**
   * Get SMS usage statistics
   * @param {Object} options - Query options
   * @param {Date} options.startDate - Start date
   * @param {Date} options.endDate - End date
   * @returns {Promise<Object>} Usage statistics
   */
  async getSmsUsage({ startDate, endDate } = {}) {
    if (!this.client) {
      throw new Error('Twilio client not initialized');
    }

    try {
      const messages = await this.client.messages.list({
        dateSentAfter: startDate,
        dateSentBefore: endDate,
        limit: 1000, // Maximum allowed
      });

      const usage = {
        totalMessages: messages.length,
        sentMessages: messages.filter(m => m.status === 'sent').length,
        failedMessages: messages.filter(m => m.status === 'failed' || m.status === 'undelivered').length,
        pendingMessages: messages.filter(m => m.status === 'queued' || m.status === 'sending').length,
        totalCost: messages.reduce((sum, m) => sum + (parseFloat(m.price) || 0), 0),
      };

      return usage;
    } catch (error) {
      console.error('Failed to get SMS usage:', error);
      throw new Error(`Failed to get SMS usage: ${error.message}`);
    }
  }
}

module.exports = new SmsService();