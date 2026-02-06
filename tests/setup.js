// Set test environment variables
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing';
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://postgres:password@localhost:5432/receipt_tracking_test';

// OAuth environment variables for testing
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret';
process.env.GOOGLE_CALLBACK_URL = 'http://localhost:3001/auth/google/callback';
process.env.APPLE_CLIENT_ID = 'test-apple-client-id';
process.env.APPLE_TEAM_ID = 'test-apple-team-id';
process.env.APPLE_KEY_ID = 'test-apple-key-id';
process.env.APPLE_CALLBACK_URL = 'http://localhost:3001/auth/apple/callback';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Set up global test timeout
jest.setTimeout(30000);

// Mock email and SMS services for testing
jest.mock('../server/services/emailService', () => ({
  sendOtpEmail: jest.fn().mockResolvedValue({
    success: true,
    messageId: 'test-message-id',
  }),
  testConnection: jest.fn().mockResolvedValue(true),
}));

jest.mock('../server/services/smsService', () => ({
  sendOtpSms: jest.fn().mockResolvedValue({
    success: true,
    messageId: 'test-sms-id',
  }),
  testConnection: jest.fn().mockResolvedValue(true),
}));

// Prevent server from starting during tests
const originalExit = process.exit;
process.exit = jest.fn();

// Mock the server start function
jest.mock('../server/index', () => {
  return {
    listen: jest.fn(),
  };
});