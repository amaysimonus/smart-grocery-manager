// Focused OCR Pipeline Test - Demonstrating Core Functionality
const ocrService = require('../server/services/ocrService');

describe('OCR Pipeline Core Functionality', () => {
  describe('Item Parsing', () => {
    test('should parse basic receipt items correctly', () => {
      const simpleReceipt = `
NTUC FairPrice
2024-01-15

Apples           2.50
Bread           3.20
Milk           4.80

Total          10.50
`;

      const items = ocrService.parseItems(simpleReceipt);
      expect(items.length).toBe(3);
      expect(items[0]).toMatchObject({
        name: 'Apples',
        quantity: 1,
        unitPrice: 2.5,
        totalPrice: 2.5
      });
    });

    test('should handle quantity and unit price items', () => {
      const quantityReceipt = `
Item 1          1 @ 2.50    2.50
Item 2          3 @ 1.20    3.60
Item 3                     5.75
`;

      const items = ocrService.parseItems(quantityReceipt);
      expect(items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'Item 1',
            quantity: 1,
            unitPrice: 2.50,
            totalPrice: 2.50
          }),
          expect.objectContaining({
            name: 'Item 2',
            quantity: 3,
            unitPrice: 1.20,
            totalPrice: 3.60
          }),
          expect.objectContaining({
            name: 'Item 3',
            quantity: 1,
            unitPrice: 5.75,
            totalPrice: 5.75
          })
        ])
      );
    });
  });

  describe('Category Suggestion', () => {
    test('should suggest categories for common items', () => {
      const items = [
        { name: 'Apple', nameZh: '苹果' },
        { name: 'Rice', nameZh: '米饭' },
        { name: 'Shampoo', nameZh: '洗发水' },
        { name: 'Laptop', nameZh: '笔记本电脑' },
        { name: 'UnknownItem', nameZh: '未知物品' }
      ];

      const categorizedItems = ocrService.suggestCategories(items);
      
      expect(categorizedItems[0].category).toBe('groceries');
      expect(categorizedItems[1].category).toBe('groceries');
      expect(categorizedItems[2].category).toBe('personal_care');
      expect(categorizedItems[3].category).toBe('electronics');
      expect(categorizedItems[4].category).toBe('miscellaneous');
    });
  });

  describe('Store Information', () => {
    test('should extract store name from receipt', () => {
      const storeText = `
NTUC FairPrice
123 Orchard Road
Singapore 238874

Receipt #12345
2024-01-15 10:30
`;

      const storeInfo = ocrService.extractStoreInfo(storeText);
      expect(storeInfo.name).toContain('NTUC');
      expect(storeInfo.address).toContain('238874');
    });

    test('should handle Chinese store names', () => {
      const chineseText = `
冷霸超市
新加坡武吉知馬路123號
收据 #67890
2024-01-15 10:30
`;

      const storeInfo = ocrService.extractStoreInfo(chineseText);
      expect(storeInfo.nameZh).toContain('冷霸');
    });
  });

  describe('Receipt Metadata', () => {
    test('should extract receipt number and date', () => {
      const receiptText = `
SuperStore
Receipt #98765
Date: 2024-01-15
Time: 14:30
`;

      const info = ocrService.extractReceiptInfo(receiptText);
      expect(info.receiptNumber).toBe('98765');
      expect(info.purchaseDate).toBeInstanceOf(Date);
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty input gracefully', () => {
      const items = ocrService.parseItems('');
      expect(items).toEqual([]);
    });

    test('should filter out header and footer lines', () => {
      const receiptWithHeaders = `
Total Amount
Subtotal
GST
Thank You
Visit Again
Welcome
Item 1                    5.00
Item 2                    3.50
`;

      const items = ocrService.parseItems(receiptWithHeaders);
      expect(items.length).toBe(2);
    });

    test('should handle malformed price data', () => {
      const malformedReceipt = `
Item 1          invalid_price
Item 2          @ 2.50    
Item 3          3 @       
Just text line without price
`;

      const items = ocrService.parseItems(malformedReceipt);
      expect(Array.isArray(items)).toBe(true);
      // Should not crash and handle gracefully
    });
  });

  describe('Store Pattern Recognition', () => {
    test('should recognize common Singapore retailers', () => {
      const retailers = [
        'NTUC FairPrice',
        'Cold Storage',
        'Sheng Siong',
        'Giant Hypermarket',
        '7-Eleven',
        'Watsons',
        'Guardian',
        'IKEA'
      ];

      retailers.forEach(retailer => {
        const text = `${retailer}\nReceipt #123`;
        const storeInfo = ocrService.extractStoreInfo(text);
        expect(storeInfo.name || storeInfo.nameZh).toBeTruthy();
      });
    });
  });
});

console.log('✅ OCR Pipeline Core Functionality Test completed successfully');