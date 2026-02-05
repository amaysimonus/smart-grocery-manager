# Receipt Tracking App Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a full-stack receipt tracking web application with OCR capabilities, multi-role user management, budget tracking, and smart home integration.

**Architecture:** React frontend with TypeScript, Node.js/Express backend, PostgreSQL database, Docker containerized deployment on Zeabur VPS with cloud migration path.

**Tech Stack:** React, TypeScript, Node.js, Express, PostgreSQL, Redis, MinIO, Tesseract.js, Passport.js, Twilio, Socket.IO, Material-UI, Docker.

---

## Phase 1: Project Infrastructure Setup

### Task 1: Project Structure and Configuration

**Files:**
- Create: `package.json` (already exists)
- Create: `docker-compose.yml`
- Create: `.env.example`
- Create: `.gitignore`
- Create: `README.md`

**Step 1: Set up package.json with dependencies**

```json
{
  "name": "receipt-tracking",
  "version": "1.0.0",
  "description": "Full-stack receipt tracking application",
  "main": "server/index.js",
  "scripts": {
    "dev": "concurrently \"npm run server:dev\" \"npm run client:dev\"",
    "server:dev": "nodemon server/index.js",
    "client:dev": "cd client && npm start",
    "build": "cd client && npm run build",
    "start": "node server/index.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "docker:dev": "docker-compose up -d",
    "docker:down": "docker-compose down"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "dotenv": "^16.3.1",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "passport": "^0.7.0",
    "passport-google-oauth20": "^2.0.0",
    "passport-apple": "^2.0.2",
    "passport-local": "^1.0.0",
    "express-rate-limit": "^7.1.5",
    "express-validator": "^7.0.1",
    "multer": "^1.4.5-lts.1",
    "sharp": "^0.33.1",
    "tesseract.js": "^5.0.4",
    "socket.io": "^4.7.4",
    "nodemailer": "^6.9.7",
    "twilio": "^4.19.0",
    "prisma": "^5.7.1",
    "@prisma/client": "^5.7.1",
    "redis": "^4.6.11",
    "minio": "^7.1.3",
    "joi": "^17.11.0",
    "winston": "^3.11.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.2",
    "concurrently": "^8.2.2",
    "jest": "^29.7.0",
    "supertest": "^6.3.3",
    "@types/jest": "^29.5.8"
  }
}
```

**Step 2: Run command to update dependencies**

Run: `npm install`
Expected: All dependencies install successfully

**Step 3: Create docker-compose.yml**

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: receipt_tracking
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data

  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/receipt_tracking
      - REDIS_URL=redis://redis:6379
      - MINIO_ENDPOINT=minio
      - MINIO_PORT=9000
      - MINIO_ACCESS_KEY=minioadmin
      - MINIO_SECRET_KEY=minioadmin
    depends_on:
      - postgres
      - redis
      - minio
    volumes:
      - .:/app
      - /app/node_modules

volumes:
  postgres_data:
  minio_data:
```

**Step 4: Create .env.example**

```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/receipt_tracking"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="7d"

# OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
APPLE_CLIENT_ID="your-apple-client-id"
APPLE_CLIENT_SECRET="your-apple-client-secret"

# Twilio
TWILIO_ACCOUNT_SID="your-twilio-sid"
TWILIO_AUTH_TOKEN="your-twilio-token"
TWILIO_PHONE_NUMBER="+1234567890"

# Email
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"

# MinIO
MINIO_ENDPOINT="localhost"
MINIO_PORT=9000
MINIO_ACCESS_KEY="minioadmin"
MINIO_SECRET_KEY="minioadmin"
MINIO_BUCKET="receipts"

# App
NODE_ENV="development"
PORT=3000
FRONTEND_URL="http://localhost:3001"
```

**Step 5: Create .gitignore**

```gitignore
node_modules/
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/

# nyc test coverage
.nyc_output

# Dependency directories
node_modules/
jspm_packages/

# Optional npm cache directory
.npm

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# dotenv environment variables file
.env

# parcel-bundler cache (https://parceljs.org/)
.cache
.parcel-cache

# next.js build output
.next

# nuxt.js build output
.nuxt

# vuepress build output
.vuepress/dist

# Serverless directories
.serverless

# FuseBox cache
.fusebox/

# DynamoDB Local files
.dynamodb/

# TernJS port file
.tern-port

# Stores VSCode versions used for testing VSCode extensions
.vscode-test

# Build outputs
dist/
build/

# Database
*.db
*.sqlite

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db
```

**Step 6: Create README.md**

```markdown
# Receipt Tracking App

Full-stack receipt tracking application for family expense management with OCR capabilities, multi-role user management, and comprehensive analytics.

## Features

- Multi-language receipt OCR (English/Traditional Chinese)
- Dual input: receipt scanning + manual entry
- Role-based access (Admin, Family Members, Helpers)
- Budget tracking and analytics
- Smart home integration (Alexa/Google Assistant)
- Dark/light themes with customization
- Real-time notifications
- Data export (CSV, PDF, Excel)

## Quick Start

### Development

```bash
# Install dependencies
npm install

# Start services with Docker
npm run docker:dev

# Start development server
npm run dev
```

### Production

```bash
# Build for production
npm run build

# Start production server
npm start
```

## Technology Stack

- **Frontend**: React, TypeScript, Material-UI
- **Backend**: Node.js, Express, Socket.IO
- **Database**: PostgreSQL, Redis
- **Storage**: MinIO (S3-compatible)
- **OCR**: Tesseract.js
- **Auth**: JWT, OAuth (Google/Apple)
- **Deployment**: Docker, Zeabur VPS

## License

MIT
```

**Step 7: Run test to verify setup**

Run: `npm test`
Expected: "Error: no test specified" (baseline, will fix in next task)

**Step 8: Commit initial setup**

```bash
git add .
git commit -m "feat: set up project structure and configuration"
```

---

## Phase 2: Database Schema and Models

### Task 2: Database Schema Design

**Files:**
- Create: `prisma/schema.prisma`
- Create: `server/config/database.js`

**Step 1: Create Prisma schema**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id          String   @id @default(cuid())
  email       String   @unique
  phone       String?  @unique
  password    String?
  firstName   String
  lastName    String
  avatar      String?
  language    String   @default("en")
  timezone    String   @default("UTC")
  theme       String   @default("light")
  role        UserRole @default(HELPER)
  isActive    Boolean  @default(true)
  emailVerified Boolean @default(false)
  phoneVerified Boolean @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  masterAccount User?  @relation("MasterAccount", fields: [masterAccountId], references: [id])
  masterAccountId String?
  createdProfiles User[] @relation("MasterAccount")
  
  oauthProviders OAuthProvider[]
  sessions Session[]
  budgets Budget[]
  receipts Receipt[]
  notifications Notification[]
  otpCodes OtpCode[]

  @@map("users")
}

model OAuthProvider {
  id           String           @id @default(cuid())
  userId       String
  provider     OAuthProviderType
  providerId   String
  accessToken  String?
  refreshToken String?
  createdAt    DateTime        @default(now())
  updatedAt    DateTime        @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerId])
  @@map("oauth_providers")
}

model Session {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sessions")
}

model OtpCode {
  id        String   @id @default(cuid())
  userId    String?
  email     String?
  phone     String?
  code      String
  type      OtpType
  expiresAt DateTime
  used      Boolean  @default(false)
  createdAt DateTime @default(now())

  user User? @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("otp_codes")
}

model Budget {
  id          String     @id @default(cuid())
  name        String
  description String?
  amount      Float
  startDate   DateTime
  endDate     DateTime?
  isRecurring Boolean    @default(false)
  recurrence  String?    // weekly, bi-weekly, monthly
  isActive    Boolean    @default(true)
  createdBy   String
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  // Relations
  creator User @relation(fields: [createdBy], references: [id])
  receipts Receipt[]

  @@map("budgets")
}

model Category {
  id          String @id @default(cuid())
  name        String
  nameZh      String?
  color       String @default("#1976d2")
  icon        String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  items ReceiptItem[]

  @@map("categories")
}

model Receipt {
  id            String        @id @default(cuid())
  userId        String
  budgetId      String?
  storeName     String?
  storeNameZh   String?
  totalAmount   Float
  currency      String        @default("SGD")
  receiptNumber String?
  purchaseDate  DateTime
  imageUrl      String?
  thumbnailUrl  String?
  ocrConfidence Float?
  status        ReceiptStatus @default(PENDING)
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  // Relations
  user User @relation(fields: [userId], references: [id])
  budget Budget? @relation(fields: [budgetId], references: [id])
  items ReceiptItem[]

  @@map("receipts")
}

model ReceiptItem {
  id           String  @id @default(cuid())
  receiptId    String
  categoryId  String
  name         String
  nameZh       String?
  quantity     Float
  unitPrice    Float
  totalPrice   Float
  category     String?
  ocrConfidence Float?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  // Relations
  receipt Receipt @relation(fields: [receiptId], references: [id], onDelete: Cascade)
  category Category @relation(fields: [categoryId], references: [id])

  @@map("receipt_items")
}

model Notification {
  id        String           @id @default(cuid())
  userId    String
  type      NotificationType
  title     String
  titleZh   String?
  message   String
  messageZh String?
  data      Json?            // Additional data for the notification
  isRead    Boolean          @default(false)
  emailSent Boolean          @default(false)
  smsSent   Boolean          @default(false)
  createdAt DateTime         @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("notifications")
}

enum UserRole {
  MASTER
  ADMIN
  FAMILY_MEMBER
  HELPER
}

enum OAuthProviderType {
  GOOGLE
  APPLE
}

enum OtpType {
  EMAIL_VERIFICATION
  PHONE_VERIFICATION
  PASSWORD_RESET
  LOGIN
}

enum ReceiptStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
}

enum NotificationType {
  BUDGET_THRESHOLD
  NEW_RECEIPT
  WEEKLY_SUMMARY
  UNUSUAL_SPENDING
  BUDGET_ASSIGNED
}
```

**Step 2: Create database configuration**

```javascript
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
});

// Test database connection
async function testConnection() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}

module.exports = {
  prisma,
  testConnection,
};
```

**Step 3: Write test for database connection**

Create: `tests/database.test.js`

```javascript
const { prisma, testConnection } = require('../server/config/database');

describe('Database Connection', () => {
  beforeAll(async () => {
    await testConnection();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('should connect to database', async () => {
    expect(prisma).toBeDefined();
    const result = await prisma.$queryRaw`SELECT 1`;
    expect(result).toBeDefined();
  });
});
```

**Step 4: Run test to verify database setup**

Run: `npm test`
Expected: Database connection test passes

**Step 5: Generate Prisma client**

Run: `npx prisma generate`
Expected: Prisma client generated successfully

**Step 6: Commit database schema**

```bash
git add .
git commit -m "feat: set up database schema and configuration"
```

---

## Phase 3: Authentication System

### Task 3: JWT and Session Management

**Files:**
- Create: `server/middleware/auth.js`
- Create: `server/utils/jwt.js`
- Create: `server/controllers/authController.js`
- Create: `tests/auth.test.js`

**Step 1: Write failing test for JWT utility**

```javascript
const jwt = require('../server/utils/jwt');

describe('JWT Utils', () => {
  test('should generate and verify JWT token', async () => {
    const payload = { userId: '123', email: 'test@example.com' };
    const token = jwt.generateToken(payload);
    
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    
    const decoded = jwt.verifyToken(token);
    expect(decoded.userId).toBe(payload.userId);
    expect(decoded.email).toBe(payload.email);
  });

  test('should reject invalid token', () => {
    expect(() => jwt.verifyToken('invalid-token')).toThrow();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL - "Cannot find module '../server/utils/jwt'"

**Step 3: Implement JWT utility**

Create: `server/utils/jwt.js`

```javascript
const jwt = require('jsonwebtoken');

const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid token');
  }
};

module.exports = {
  generateToken,
  verifyToken,
};
```

**Step 4: Run test to verify it passes**

Run: `npm test`
Expected: JWT tests pass

**Step 5: Write failing test for auth middleware**

```javascript
const request = require('supertest');
const express = require('express');
const authMiddleware = require('../server/middleware/auth');
const jwt = require('../server/utils/jwt');

const app = express();
app.use(express.json());

app.get('/protected', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

describe('Auth Middleware', () => {
  test('should allow access with valid token', async () => {
    const token = jwt.generateToken({ userId: '123', email: 'test@example.com' });
    
    const response = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.user.userId).toBe('123');
    expect(response.body.user.email).toBe('test@example.com');
  });

  test('should reject request without token', async () => {
    await request(app)
      .get('/protected')
      .expect(401);
  });

  test('should reject request with invalid token', async () => {
    await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);
  });
});
```

**Step 6: Run test to verify it fails**

Run: `npm test`
Expected: FAIL - "Cannot find module '../server/middleware/auth'"

**Step 7: Implement auth middleware**

Create: `server/middleware/auth.js`

```javascript
const { verifyToken } = require('../utils/jwt');

const authMiddleware = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token.' });
  }
};

module.exports = authMiddleware;
```

**Step 8: Run test to verify it passes**

Run: `npm test`
Expected: All auth middleware tests pass

**Step 9: Write failing test for auth controller registration**

```javascript
const request = require('supertest');
const express = require('express');
const authController = require('../server/controllers/authController');
const { body, validationResult } = require('express-validator');

const app = express();
app.use(express.json());

// Mock Prisma
jest.mock('../server/config/database', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    otpCode: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  },
}));

app.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('firstName').notEmpty().trim(),
  body('lastName').notEmpty().trim(),
], authController.register);

describe('Auth Controller - Register', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should register new user with email and password', async () => {
    const userData = {
      email: 'test@example.com',
      password: 'password123',
      firstName: 'John',
      lastName: 'Doe',
    };

    const response = await request(app)
      .post('/register')
      .send(userData)
      .expect(201);

    expect(response.body.message).toBe('User registered successfully');
    expect(response.body.user.email).toBe(userData.email);
  });

  test('should reject registration with invalid email', async () => {
    const userData = {
      email: 'invalid-email',
      password: 'password123',
      firstName: 'John',
      lastName: 'Doe',
    };

    await request(app)
      .post('/register')
      .send(userData)
      .expect(400);
  });

  test('should reject registration with short password', async () => {
    const userData = {
      email: 'test@example.com',
      password: '123',
      firstName: 'John',
      lastName: 'Doe',
    };

    await request(app)
      .post('/register')
      .send(userData)
      .expect(400);
  });
});
```

**Step 10: Run test to verify it fails**

Run: `npm test`
Expected: FAIL - "Cannot find module '../server/controllers/authController'"

**Step 11: Implement auth controller**

Create: `server/controllers/authController.js`

```javascript
const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const { prisma } = require('../config/database');
const { generateToken } = require('../utils/jwt');

const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, firstName, lastName, phone } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { phone: phone || undefined }],
      },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone,
        role: 'MASTER', // First user is master account
        emailVerified: false,
        phoneVerified: phone ? false : true,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        emailVerified: true,
        phoneVerified: true,
      },
    });

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    res.status(201).json({
      message: 'User registered successfully',
      user,
      token,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.password) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

module.exports = {
  register,
  login,
};
```

**Step 12: Run test to verify it passes**

Run: `npm test`
Expected: All auth controller tests pass

**Step 13: Update Jest configuration**

Update: `package.json` scripts section

```json
"scripts": {
  "dev": "concurrently \"npm run server:dev\" \"npm run client:dev\"",
  "server:dev": "nodemon server/index.js",
  "client:dev": "cd client && npm start",
  "build": "cd client && npm run build",
  "start": "node server/index.js",
  "test": "jest",
  "test:watch": "jest --watch",
  "docker:dev": "docker-compose up -d",
  "docker:down": "docker-compose down"
}
```

Create: `jest.config.js`

```javascript
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
  collectCoverageFrom: [
    'server/**/*.js',
    '!server/index.js',
    '!**/node_modules/**',
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
};
```

Create: `tests/setup.js`

```javascript
require('dotenv').config({ path: '.env.test' });

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.DATABASE_URL = 'postgresql://postgres:password@localhost:5432/receipt_tracking_test';
```

**Step 14: Commit authentication system**

```bash
git add .
git commit -m "feat: implement JWT authentication and user registration"
```

---

[Continue with remaining phases... Due to length limits, this plan covers the first 3 phases. The complete plan would include:]

## Phase 4: OAuth Integration (Google/Apple)
## Phase 5: OTP System (Email/SMS verification)  
## Phase 6: Receipt OCR Pipeline
## Phase 7: Manual Entry System
## Phase 8: Budget Management
## Phase 9: Analytics Dashboard
## Phase 10: Notification System
## Phase 11: Theme System
## Phase 12: Smart Home Integration
## Phase 13: Frontend React App
## Phase 14: Mobile Optimization
## Phase 15: Deployment Configuration

---

**Total estimated tasks:** 75+ bite-sized steps
**Estimated timeline:** 2-3 weeks with focused development

**Next Steps:**
Choose execution approach:
1. **Subagent-Driven** (this session) - Fast iteration with code reviews
2. **Parallel Session** (separate) - Batch execution with checkpoints

Which approach would you prefer for implementing this receipt tracking app?