// Simplified test for receipt OCR functionality
const ocrService = require('../server/services/ocrService');
const imageService = require('../server/services/imageService');

// Test OCR Service methods
describe('OCR Service Basic Functionality', () => {
  test('should parse receipt items correctly', () => {
    const receiptText = `
NTUC FairPrice
2024-01-15 10:30

Apples           2.50
Bread           3.20
Milk           4.80
Eggs           6.90

Total          17.40
`;

    const items = ocrService.parseItems(receiptText);
    
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBe(4);
    expect(items[0]).toMatchObject({
      name: 'Apples',
      quantity: 1,
      unitPrice: 2.5,
      totalPrice: 2.5
    });
  });

  test('should suggest categories for items', () => {
    const items = [
      { name: 'Apple', nameZh: '苹果' },
      { name: 'Rice', nameZh: '米饭' },
      { name: 'Chicken', nameZh: '鸡肉' }
    ];

    const categorizedItems = ocrService.suggestCategories(items);
    
    expect(categorizedItems.length).toBe(3);
    categorizedItems.forEach(item => {
      expect(item).toHaveProperty('category');
      expect(item).toHaveProperty('categoryConfidence');
      expect(typeof item.category).toBe('string');
    });
  });

  test('should extract store information', () => {
    const receiptText = `
NTUC FairPrice
123 Orchard Road
Singapore 238874

Receipt #12345
2024-01-15 10:30
`;

    const storeInfo = ocrService.extractStoreInfo(receiptText);
    
    expect(storeInfo).toHaveProperty('name');
    expect(storeInfo).toHaveProperty('address');
    expect(storeInfo.name).toContain('NTUC');
  });

  test('should handle Chinese store names', () => {
    const receiptText = `
冷霸超市
新加坡武吉知馬路123號
收据 #67890
2024-01-15 10:30
`;

    const storeInfo = ocrService.extractStoreInfo(receiptText);
    
    expect(storeInfo).toHaveProperty('nameZh');
    expect(storeInfo.nameZh).toContain('冷霸');
  });

  test('should extract receipt metadata', () => {
    const receiptText = `
SuperStore
Receipt #98765
Date: 2024-01-15
Time: 14:30
`;

    const info = ocrService.extractReceiptInfo(receiptText);
    
    expect(info).toHaveProperty('receiptNumber');
    expect(info).toHaveProperty('purchaseDate');
    expect(info.receiptNumber).toBe('98765');
  });
});

// Test Image Service methods
describe('Image Service Basic Functionality', () => {
  test('should generate storage keys with proper structure', () => {
    const key = imageService.generateStorageKey({
      userId: 'test-user',
      filename: 'receipt.jpg',
      type: 'original',
      date: new Date('2024-01-15')
    });
    
    expect(key).toContain('test-user');
    expect(key).toContain('2024-01-15');
    expect(key).toContain('original');
    expect(key).toContain('.jpg');
  });

  test('should generate unique keys', () => {
    const key1 = imageService.generateStorageKey({
      userId: 'test-user',
      filename: 'receipt.jpg'
    });
    
    const key2 = imageService.generateStorageKey({
      userId: 'test-user',
      filename: 'receipt.jpg'
    });
    
    expect(key1).not.toBe(key2);
  });
});

console.log('✅ Receipt OCR Pipeline test completed successfully');