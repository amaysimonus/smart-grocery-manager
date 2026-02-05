const jwt = require('../server/utils/jwt');

// Mock database for OAuth tests
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  oauthProvider: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  $connect: jest.fn(),
  $disconnect: jest.fn(),
};

jest.mock('../server/config/database', () => ({
  prisma: mockPrisma,
  testConnection: jest.fn(),
  disconnect: jest.fn(),
}));

const { prisma } = require('../server/config/database');

// Clear all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  
  // Mock environment variables
  process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
  process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret';
  process.env.GOOGLE_CALLBACK_URL = '/auth/google/callback';
  process.env.APPLE_CLIENT_ID = 'test-apple-client-id';
  process.env.APPLE_TEAM_ID = 'test-apple-team-id';
  process.env.APPLE_KEY_ID = 'test-apple-key-id';
  process.env.APPLE_KEY_FILE_PATH = '/test/path/to/key.p8';
  process.env.APPLE_CALLBACK_URL = '/auth/apple/callback';
  process.env.JWT_SECRET = 'test-jwt-secret';
  process.env.CLIENT_URL = 'http://localhost:3000';
});

describe('OAuth Controller', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    mockReq = {
      user: {
        id: 'user-123',
        email: 'test@gmail.com',
        firstName: 'Test',
        lastName: 'User'
      },
      query: {},
      session: {}
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      redirect: jest.fn()
    };
  });

  describe('googleCallback', () => {
    test('should redirect to dashboard with JWT token on successful OAuth', async () => {
      const oauthController = require('../server/controllers/oauthController');
      await oauthController.googleCallback(mockReq, mockRes);

      expect(mockRes.redirect).toHaveBeenCalledWith(
        expect.stringContaining('/dashboard')
      );
      expect(mockRes.redirect).toHaveBeenCalledWith(
        expect.stringContaining('token=')
      );
    });

    test('should handle OAuth failure when user is missing', async () => {
      mockReq.user = null;
      
      const oauthController = require('../server/controllers/oauthController');
      await oauthController.googleCallback(mockReq, mockRes);

      expect(mockRes.redirect).toHaveBeenCalledWith('/login?error=oauth_failed');
    });

    test('should handle missing user email', async () => {
      mockReq.user = { id: 'user-123' }; // Missing email
      
      const oauthController = require('../server/controllers/oauthController');
      await oauthController.googleCallback(mockReq, mockRes);

      expect(mockRes.redirect).toHaveBeenCalledWith('/login?error=invalid_profile');
    });
  });

  describe('appleCallback', () => {
    test('should redirect to dashboard with JWT token on successful Apple OAuth', async () => {
      const oauthController = require('../server/controllers/oauthController');
      await oauthController.appleCallback(mockReq, mockRes);

      expect(mockRes.redirect).toHaveBeenCalledWith(
        expect.stringContaining('/dashboard')
      );
      expect(mockRes.redirect).toHaveBeenCalledWith(
        expect.stringContaining('token=')
      );
    });

    test('should handle Apple OAuth failure when user is missing', async () => {
      mockReq.user = null;
      
      const oauthController = require('../server/controllers/oauthController');
      await oauthController.appleCallback(mockReq, mockRes);

      expect(mockRes.redirect).toHaveBeenCalledWith('/login?error=oauth_failed');
    });
  });

  describe('oauthFailure', () => {
    test('should handle access_denied error', async () => {
      mockReq.query = { error: 'access_denied' };
      
      const oauthController = require('../server/controllers/oauthController');
      await oauthController.oauthFailure(mockReq, mockRes);

      expect(mockRes.redirect).toHaveBeenCalledWith('/login?error=access_denied');
    });

    test('should handle server_error', async () => {
      mockReq.query = { error: 'server_error' };
      
      const oauthController = require('../server/controllers/oauthController');
      await oauthController.oauthFailure(mockReq, mockRes);

      expect(mockRes.redirect).toHaveBeenCalledWith('/login?error=server_error');
    });

    test('should handle unknown errors', async () => {
      mockReq.query = { error: 'unknown_error' };
      
      const oauthController = require('../server/controllers/oauthController');
      await oauthController.oauthFailure(mockReq, mockRes);

      expect(mockRes.redirect).toHaveBeenCalledWith('/login?error=oauth_failed');
    });
  });

  describe('getLinkedProviders', () => {
    test('should return linked OAuth providers for authenticated user', async () => {
      const mockProviders = [
        { id: 'oauth-1', provider: 'GOOGLE', createdAt: new Date() },
        { id: 'oauth-2', provider: 'APPLE', createdAt: new Date() }
      ];
      
      prisma.oauthProvider.findMany.mockResolvedValue(mockProviders);
      
      const oauthController = require('../server/controllers/oauthController');
      await oauthController.getLinkedProviders(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ providers: mockProviders });
    });

    test('should return 401 for unauthenticated user', async () => {
      mockReq.user = null;
      
      const oauthController = require('../server/controllers/oauthController');
      await oauthController.getLinkedProviders(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'User not authenticated' });
    });
  });

  describe('unlinkOAuthProvider', () => {
    test('should unlink OAuth provider when user has password', async () => {
      mockReq.params = { provider: 'google' };
      
      // Mock user with password
      prisma.user.findUnique.mockResolvedValue({ password: 'hashed-password' });
      
      // Mock successful deletion
      prisma.oauthProvider.deleteMany.mockResolvedValue({ count: 1 });
      
      const oauthController = require('../server/controllers/oauthController');
      await oauthController.unlinkOAuthProvider(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ 
        message: 'google account unlinked successfully' 
      });
    });

    test('should reject unlinking when user has no password', async () => {
      mockReq.params = { provider: 'google' };
      
      // Mock user without password (OAuth-only user)
      prisma.user.findUnique.mockResolvedValue({ password: '' });
      
      const oauthController = require('../server/controllers/oauthController');
      await oauthController.unlinkOAuthProvider(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ 
        error: 'Cannot unlink OAuth provider without password. Please set a password first.' 
      });
    });

    test('should return 404 when OAuth provider not found', async () => {
      mockReq.params = { provider: 'google' };
      
      prisma.user.findUnique.mockResolvedValue({ password: 'hashed-password' });
      prisma.oauthProvider.deleteMany.mockResolvedValue({ count: 0 });
      
      const oauthController = require('../server/controllers/oauthController');
      await oauthController.unlinkOAuthProvider(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ 
        error: 'google account not found' 
      });
    });
  });
});

describe('Passport Configuration', () => {
  test('should configure passport without errors', () => {
    const passportConfig = require('../server/config/passport');
    
    expect(passportConfig).toBeDefined();
    expect(typeof passportConfig.generateState).toBe('function');
    expect(typeof passportConfig.validateState).toBe('function');
  });

  test('should generate state parameter', () => {
    const { generateState } = require('../server/config/passport');
    const state = generateState();
    
    expect(typeof state).toBe('string');
    expect(state.length).toBeGreaterThan(0);
  });

  test('should validate state parameter', () => {
    const { validateState } = require('../server/config/passport');
    
    const mockReq = {
      query: { state: 'test-state' },
      session: { oauthState: 'test-state' }
    };
    const mockRes = { redirect: jest.fn() };
    const mockNext = jest.fn();
    
    validateState(mockReq, mockRes, mockNext);
    
    expect(mockNext).toHaveBeenCalled();
    expect(mockReq.session.oauthState).toBeUndefined();
  });

  test('should reject invalid state parameter', () => {
    const { validateState } = require('../server/config/passport');
    
    const mockReq = {
      query: { state: 'invalid-state' },
      session: { oauthState: 'valid-state' }
    };
    const mockRes = { redirect: jest.fn() };
    const mockNext = jest.fn();
    
    validateState(mockReq, mockRes, mockNext);
    
    expect(mockRes.redirect).toHaveBeenCalledWith('/login?error=invalid_state');
    expect(mockNext).not.toHaveBeenCalled();
  });
});

describe('OAuth Routes', () => {
  test('should load OAuth routes without errors', () => {
    const oauthRoutes = require('../server/routes/oauth');
    
    expect(oauthRoutes).toBeDefined();
    expect(typeof oauthRoutes).toBe('function');
  });
});