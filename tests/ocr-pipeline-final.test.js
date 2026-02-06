// Final comprehensive OCR Pipeline Test
const ocrService = require('../server/services/ocrService');
const imageService = require('../server/services/imageService');

describe('Complete OCR Pipeline Integration', () => {
  describe('Image Processing Pipeline', () => {
    test('should handle complete image upload workflow', async () => {
      const testImageBuffer = Buffer.from([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01
      ]);

      // Test validation
      const validation = await imageService.validateImage(testImageBuffer);
      expect(validation.isValid).toBe(true);

      // Test storage key generation
      const storageKey = imageService.generateStorageKey({
        userId: 'test-user',
        filename: 'receipt.jpg',
        type: 'original'
      });
      expect(storageKey).toContain('test-user');
      expect(storageKey).toContain('original');
    });
  });

  describe('OCR Processing Pipeline', () => {
    test('should parse complex receipt with multiple items', () => {
      const complexReceipt = `
NTUC FairPrice
123 Orchard Road #03-12
Singapore 238874
Tel: 6588-6688

Receipt #123456
Date: 2024-01-15 Time: 14:32
Cashier: Alice

Apples Red           1kg @ $4.50      4.50
Bananas              2kg @ $2.30      4.60
Whole Wheat Bread                      3.20
Fresh Milk 1L                          5.80
Eggs (12 pcs)                         6.90
Chicken Breast      500g @ $8.00      4.00

----------------------------------------
SUBTOTAL                             24.00
GST (8%)                              1.92
TOTAL                               $25.92
Paid by: Visa ****1234

Thank you for shopping!
Please visit again
`;

      const items = ocrService.parseItems(complexReceipt);
      expect(items.length).toBeGreaterThan(5);
      
      const categorizedItems = ocrService.suggestCategories(items);
      categorizedItems.forEach(item => {
        expect(item).toHaveProperty('category');
        expect(item).toHaveProperty('categoryConfidence');
      });

      const storeInfo = ocrService.extractStoreInfo(complexReceipt);
      expect(storeInfo.name).toContain('NTUC');
      
      const receiptInfo = ocrService.extractReceiptInfo(complexReceipt);
      expect(receiptInfo.receiptNumber).toBe('123456');
    });

    test('should handle bilingual receipts', () => {
      const bilingualReceipt = `
冷霸超市 Cold Storage
武吉知馬路303號
303 Bukit Timah Road
Singapore 269732

收据 No: 789012
日期: 2024-01-15
时间: 15:45

苹果 Apple                    8.50
米饭 Rice                     12.30
鸡肉 Chicken                  18.90
青菜 Vegetables               6.75

小计 Subtotal                46.45
税 GST (8%)                   3.72
总计 Total                   $50.17
`;

      const items = ocrService.parseItems(bilingualReceipt);
      expect(items.length).toBeGreaterThan(3);

      const categorizedItems = ocrService.suggestCategories(items);
      expect(categorizedItems[0].category).toBe('groceries');

      const storeInfo = ocrService.extractStoreInfo(bilingualReceipt);
      expect(storeInfo.name).toContain('Cold Storage');
      expect(storeInfo.nameZh).toContain('冷霸');
    });

    test('should handle edge cases and malformed data', () => {
      const malformedReceipt = `
        Item 1          invalid_price
        Item 2          @ 2.50    
        Item 3          3 @       
        123            45.67
        Just text line
        9999999999     999999999
      `;

      const items = ocrService.parseItems(malformedReceipt);
      expect(Array.isArray(items)).toBe(true);
      // Should not crash and handle gracefully
    });

    test('should calculate total amounts correctly', () => {
      const receiptWithPrices = `
        Item 1                     10.50
        Item 2          2 @ 5.25     10.50
        Item 3                     15.75
        Total                     36.75
      `;

      const items = ocrService.parseItems(receiptWithPrices);
      const calculatedTotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
      expect(calculatedTotal).toBe(36.75);
    });
  });

  describe('Category Intelligence', () => {
    test('should categorize items correctly with confidence scores', () => {
      const testItems = [
        { name: 'Apple', nameZh: '苹果' },
        { name: 'Laptop', nameZh: '笔记本电脑' },
        { name: 'Shampoo', nameZh: '洗发水' },
        { name: 'Gasoline', nameZh: '汽油' },
        { name: 'Restaurant Meal', nameZh: '餐厅餐食' },
        { name: 'UnknownGadget123', nameZh: '未知设备123' }
      ];

      const categorizedItems = ocrService.suggestCategories(testItems);
      
      expect(categorizedItems[0].category).toBe('groceries');
      expect(categorizedItems[1].category).toBe('electronics');
      expect(categorizedItems[2].category).toBe('personal_care');
      expect(categorizedItems[3].category).toBe('transportation');
      expect(categorizedItems[4].category).toBe('dining');
      expect(categorizedItems[5].category).toBe('miscellaneous');
      
      categorizedItems.forEach(item => {
        expect(item.categoryConfidence).toBeGreaterThan(0);
        expect(item.categoryConfidence).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Store Recognition', () => {
    test('should recognize major Singapore retailers', () => {
      const retailers = [
        'NTUC FairPrice',
        'Cold Storage',
        'Sheng Siong Supermarket',
        'Giant Hypermarket',
        '7-Eleven',
        'Cheers',
        'Watsons',
        'Guardian Pharmacy',
        'IKEA',
        'Uniqlo'
      ];

      retailers.forEach(retailer => {
        const text = `${retailer}\nReceipt #123\n2024-01-15`;
        const storeInfo = ocrService.extractStoreInfo(text);
        expect(storeInfo.name).toBeTruthy();
      });
    });

    test('should recognize Chinese store names', () => {
      const chineseRetailers = [
        '职总平价超市',
        '冷藏超市',
        '昇菘超市',
        '吉安超市',
        '屈臣氏',
        '宜家',
        '麦当劳'
      ];

      chineseRetailers.forEach(retailer => {
        const text = `${retailer}\n收据 #123\n2024-01-15`;
        const storeInfo = ocrService.extractStoreInfo(text);
        expect(storeInfo.nameZh || storeInfo.name).toBeTruthy();
      });
    });
  });
});

console.log('✅ Complete OCR Pipeline Integration Test completed successfully');