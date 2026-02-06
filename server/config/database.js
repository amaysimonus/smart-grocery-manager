const { PrismaClient } = require('@prisma/client');

// Create Prisma client with proper error handling
let prisma;

try {
  if (process.env.NODE_ENV === 'test') {
    // Use in-memory SQLite for tests
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL || 'file:./test.db',
        },
      },
      log: ['error'],
    });
  } else {
    prisma = new PrismaClient({
      log: ['query', 'error', 'warn'],
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });
  }
} catch (error) {
  console.error('Failed to initialize Prisma client:', error);
  prisma = null;
}

// Test database connection with timeout and retry logic
async function testConnection() {
  try {
    // Set connection timeout
    const connectionPromise = prisma.$connect();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Connection timeout')), 10000)
    );
    
    await Promise.race([connectionPromise, timeoutPromise]);
    console.log('✅ Database connected successfully');
    
    // Test basic query
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database query test passed');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    
    if (process.env.NODE_ENV === 'development') {
      console.error('Database connection details:', {
        url: process.env.DATABASE_URL ? 'SET' : 'NOT_SET',
        env: process.env.NODE_ENV,
      });
    }
    
    // Don't exit in test environment, just throw
    if (process.env.NODE_ENV === 'test') {
      throw error;
    } else if (process.env.NODE_ENV !== 'development') {
      process.exit(1);
    } else {
      throw error;
    }
  }
}

// Graceful shutdown
async function disconnect() {
  try {
    await prisma.$disconnect();
    console.log('✅ Database disconnected successfully');
  } catch (error) {
    console.error('❌ Error disconnecting from database:', error);
  }
}

module.exports = {
  prisma,
  testConnection,
  disconnect,
};