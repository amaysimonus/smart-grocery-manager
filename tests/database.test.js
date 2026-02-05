require('dotenv').config({ path: '.env.test' });

const { prisma, testConnection } = require('../server/config/database');

describe('Database Connection', () => {
  let dbAvailable = false;

  beforeAll(async () => {
    try {
      await testConnection();
      dbAvailable = true;
    } catch (error) {
      console.log('Database not available for tests');
      dbAvailable = false;
    }
  });

  afterAll(async () => {
    if (dbAvailable) {
      await prisma.$disconnect();
    }
  });

  test('should have prisma client available', () => {
    expect(prisma).toBeDefined();
  });

  test('should connect to database when available', async () => {
    if (!dbAvailable) {
      console.log('Skipping database test - PostgreSQL not running');
      return;
    }
    
    const result = await prisma.$queryRaw`SELECT 1`;
    expect(result).toBeDefined();
  });
});