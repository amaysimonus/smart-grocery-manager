const jwt = require('../server/utils/jwt');

// Mock database for auth tests
jest.mock('../server/config/database', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    budget: {
      create: jest.fn(),
    },
    receipt: {
      create: jest.fn(),
    },
    $queryRaw: jest.fn(),
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  },
  testConnection: jest.fn(),
  disconnect: jest.fn(),
}));

const { prisma } = require('../server/config/database');

// Clear all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

describe('JWT Utility', () => {
  describe('generateToken', () => {
    test('should generate a valid JWT token', () => {
      const payload = { userId: 123, email: 'test@example.com' };
      const token = jwt.generateToken(payload);
      
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });
  });

  describe('verifyToken', () => {
    test('should verify a valid token', () => {
      const payload = { userId: 123, email: 'test@example.com' };
      const token = jwt.generateToken(payload);
      const decoded = jwt.verifyToken(token);
      
      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.email).toBe(payload.email);
    });

    test('should reject invalid token', () => {
      const invalidToken = 'invalid.token.here';
      
      expect(() => {
        jwt.verifyToken(invalidToken);
      }).toThrow();
    });
  });
});

describe('Auth Middleware', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = {
      headers: {}
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();
  });

  test('should allow access with valid token', () => {
    const payload = { userId: 123, email: 'test@example.com' };
    const token = jwt.generateToken(payload);
    mockReq.headers.authorization = `Bearer ${token}`;

    const { authMiddleware } = require('../server/middleware/auth');
    authMiddleware(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockReq.user.userId).toBe(payload.userId);
    expect(mockReq.user.email).toBe(payload.email);
  });

  test('should reject request without token', () => {
    const { authMiddleware } = require('../server/middleware/auth');
    authMiddleware(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Access denied. No token provided.' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  test('should reject request with invalid token', () => {
    mockReq.headers.authorization = 'Bearer invalid.token.here';

    const { authMiddleware } = require('../server/middleware/auth');
    authMiddleware(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid token.' });
    expect(mockNext).not.toHaveBeenCalled();
  });
});

describe('Auth Controller', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    mockReq = {
      body: {},
      validation: jest.fn()
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  describe('register', () => {
    test('should register new user with email and password', async () => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe'
      };

      // Mock prisma responses
      prisma.user.findUnique.mockResolvedValue(null); // User doesn't exist
      prisma.user.create.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        createdAt: new Date()
      });

      const authController = require('../server/controllers/authController');
      await authController.register(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'User registered successfully',
          user: expect.objectContaining({
            email: 'test@example.com',
            firstName: 'John'
          }),
          token: expect.any(String)
        })
      );
    });

    test('should reject registration with invalid email', async () => {
      mockReq.body = {
        email: 'invalid-email',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe'
      };

      const authController = require('../server/controllers/authController');
      await authController.register(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    test('should reject registration with short password', async () => {
      mockReq.body = {
        email: 'test@example.com',
        password: '123',
        firstName: 'John',
        lastName: 'Doe'
      };

      const authController = require('../server/controllers/authController');
      await authController.register(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('login', () => {
    test('should login user with valid credentials', async () => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'password123'
      };

      // Mock user with hashed password
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('password123', 12);
      
      prisma.user.findUnique.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        password: hashedPassword,
        name: 'Test User',
        createdAt: new Date()
      });

      const authController = require('../server/controllers/authController');
      await authController.login(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Login successful',
          user: expect.any(Object),
          token: expect.any(String)
        })
      );
    });

    test('should reject login with invalid credentials', async () => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      const authController = require('../server/controllers/authController');
      await authController.login(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid credentials'
        })
      );
    });
  });
});