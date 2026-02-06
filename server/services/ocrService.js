const Tesseract = require('tesseract.js');
const winston = require('winston');

class OCRService {
  constructor() {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({ filename: 'logs/ocr-service.log' }),
        new winston.transports.Console()
      ]
    });

    // Category keyword mappings for automatic categorization
    this.categoryKeywords = {
      'groceries': {
        english: ['apple', 'banana', 'bread', 'milk', 'cheese', 'rice', 'pasta', 'vegetable', 'fruit', 'meat', 'fish', 'chicken', 'egg', 'butter', 'yogurt', 'cereal', 'coffee', 'tea', 'sugar', 'salt', 'oil', 'flour', 'tomato', 'onion', 'potato', 'carrot'],
        chinese: ['苹果', '香蕉', '面包', '牛奶', '芝士', '米饭', '意面', '蔬菜', '水果', '肉', '鱼', '鸡肉', '鸡蛋', '黄油', '酸奶', '麦片', '咖啡', '茶', '糖', '盐', '油', '面粉', '番茄', '洋葱', '土豆', '胡萝卜']
      },
      'household': {
        english: ['soap', 'detergent', 'towel', 'tissue', 'cleaner', 'bleach', 'trash', 'bag', 'battery', 'light', 'bulb', 'paper', 'plate', 'cup', 'fork', 'spoon', 'knife'],
        chinese: ['肥皂', '洗衣粉', '毛巾', '纸巾', '清洁剂', '漂白水', '垃圾', '袋子', '电池', '灯', '灯泡', '纸', '盘子', '杯子', '叉子', '勺子', '刀']
      },
      'personal_care': {
        english: ['shampoo', 'conditioner', 'toothpaste', 'brush', 'soap', 'cream', 'lotion', 'makeup', 'perfume', 'razor', 'deodorant', 'toilet', 'paper'],
        chinese: ['洗发水', '护发素', '牙膏', '牙刷', '香皂', '面霜', '乳液', '化妆品', '香水', '剃须刀', '除臭剂', '卫生纸']
      },
      'electronics': {
        english: ['phone', 'laptop', 'cable', 'charger', 'headphone', 'speaker', 'mouse', 'keyboard', 'battery', 'adapter', 'usb', 'hdmi'],
        chinese: ['手机', '电脑', '线', '充电器', '耳机', '音响', '鼠标', '键盘', '电池', '适配器', 'USB', 'HDMI']
      },
      'clothing': {
        english: ['shirt', 'pants', 'dress', 'shoes', 'socks', 'jacket', 'coat', 'hat', 'gloves', 'scarf', 'underwear'],
        chinese: ['衬衫', '裤子', '裙子', '鞋子', '袜子', '夹克', '外套', '帽子', '手套', '围巾', '内衣']
      },
      'transportation': {
        english: ['gas', 'petrol', 'fuel', 'parking', 'toll', 'taxi', 'uber', 'grab', 'bus', 'train', 'subway'],
        chinese: ['汽油', '加油', '停车', '过路费', '出租车', '德士', '巴士', '地铁', '火车']
      },
      'dining': {
        english: ['restaurant', 'food', 'meal', 'breakfast', 'lunch', 'dinner', 'coffee', 'tea', 'drink', 'snack', 'dessert'],
        chinese: ['餐厅', '食物', '餐', '早餐', '午餐', '晚餐', '咖啡', '茶', '饮料', '零食', '甜点']
      },
      'entertainment': {
        english: ['movie', 'cinema', 'ticket', 'game', 'book', 'music', 'concert', 'show', 'streaming', 'netflix'],
        chinese: ['电影', '影院', '票', '游戏', '书', '音乐', '演唱会', '表演', '流媒体']
      },
      'healthcare': {
        english: ['medicine', 'drug', 'pharmacy', 'doctor', 'hospital', 'vitamin', 'supplement', 'mask', 'thermometer'],
        chinese: ['药', '药店', '医生', '医院', '维生素', '补品', '口罩', '温度计']
      },
      'education': {
        english: ['book', 'course', 'tuition', 'school', 'stationery', 'pen', 'pencil', 'notebook', 'paper'],
        chinese: ['书', '课程', '学费', '学校', '文具', '笔', '铅笔', '笔记本', '纸']
      }
    };

    // Store name patterns for common retailers
    this.storePatterns = {
      english: [
        /NTUC/i,
        /FairPrice/i,
        /Cold Storage/i,
        /Sheng Siong/i,
        /Giant/i,
        /7-Eleven/i,
        /Cheers/i,
        /Watson/i,
        /Guardian/i,
        /IKEA/i,
        /Uniqlo/i,
        /H&M/i,
        /Zara/i,
        /McDonald/i,
        /KFC/i,
        /Starbucks/i,
        /Subway/i,
        /Pizza Hut/i
      ],
      chinese: [
        /职总平价/i,
        /冷藏/i,
        /昇菘/i,
        /吉安/i,
        /7-11/i,
        /佳宁/i,
        /屈臣氏/i,
        /宜家/i,
        /麦当劳/i,
        /肯德基/i,
        /星巴克/i,
        / Subway/i,
        /必胜客/i
      ]
    };
  }

  async extractText(buffer, options = {}) {
    const {
      languages = ['eng'], // Default to English only for tests
      oem = 1, // LSTM OCR engine mode
      psm = 3  // Auto page segmentation
    } = options;

    try {
      const worker = await Tesseract.createWorker({
        logger: m => {
          // Log OCR progress for debugging
          if (m.status === 'recognizing text') {
            this.logger.debug('OCR progress:', m);
          }
        }
      });
      
      await worker.loadLanguage(languages.join('+'));
      await worker.initialize(languages.join('+'));
      
      // Set parameters after initialization
      await worker.setParameters({
        tessedit_pageseg_mode: psm
      });

      const { data: { text, confidence, lines, words } } = await worker.recognize(buffer);
      
      await worker.terminate();

      return {
        text: text.trim(),
        confidence,
        lines: lines.map(line => ({
          text: line.text.trim(),
          confidence: line.confidence,
          bbox: line.bbox
        })),
        words: words.map(word => ({
          text: word.text.trim(),
          confidence: word.confidence,
          bbox: word.bbox
        }))
      };
    } catch (error) {
      this.logger.error('OCR extraction failed:', error);
      throw new Error(`OCR processing failed: ${error.message}`);
    }
  }

  async extractTextWithRetry(buffer, options = {}) {
    const { maxRetries = 3, retryDelay = 1000 } = options;
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.extractText(buffer, options);
      } catch (error) {
        lastError = error;
        this.logger.warn(`OCR attempt ${attempt} failed:`, error);
        
        if (attempt < maxRetries) {
          // Wait before retry with exponential backoff
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
        }
      }
    }

    throw lastError;
  }

  parseItems(text) {
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    const items = [];

    // Item parsing patterns
    const patterns = [
      // Pattern: Item Name          2 @ 1.50    3.00
      /^(.+?)\s+(\d+)\s*@\s*([\d.,]+)\s+([\d.,]+)$/,
      // Pattern: Item Name                    2.50
      /^(.+?)\s+([\d.,]+)$/,
      // Pattern: 1x Item Name               5.75
      /^(\d+)x\s+(.+?)\s+([\d.,]+)$/,
      // Pattern: Item Name 1pcs            3.20
      /^(.+?)\s+\d+pcs?\s+([\d.,]+)$/
    ];

    for (const line of lines) {
      // Skip header/footer lines
      if (this.isHeaderFooterLine(line)) {
        continue;
      }

      let item = null;

      // Try each pattern
      for (const pattern of patterns) {
        const match = line.match(pattern);
        if (match) {
          if (match.length === 5) {
            // Pattern with quantity and unit price
            item = {
              name: match[1].trim(),
              quantity: parseFloat(match[2]) || 1,
              unitPrice: parseFloat(match[3].replace(',', '')) || 0,
              totalPrice: parseFloat(match[4].replace(',', '')) || 0
            };
          } else if (match.length === 4) {
            // Pattern with quantity prefix
            item = {
              name: match[2].trim(),
              quantity: parseFloat(match[1]) || 1,
              unitPrice: parseFloat(match[3].replace(',', '')) || 0,
              totalPrice: parseFloat(match[3].replace(',', '')) || 0
            };
          } else {
            // Simple pattern with just name and price
            item = {
              name: match[1].trim(),
              quantity: 1,
              unitPrice: parseFloat(match[2].replace(',', '')) || 0,
              totalPrice: parseFloat(match[2].replace(',', '')) || 0
            };
          }
          break;
        }
      }

      if (item && item.name && !isNaN(item.totalPrice) && item.totalPrice > 0) {
        items.push(item);
      }
    }

    return items;
  }

  isHeaderFooterLine(line) {
    const lowerLine = line.toLowerCase();
    const headerFooterPatterns = [
      /total|subtotal|gst|vat|tax|cash|card|credit/i,
      /receipt|invoice|bill/i,
      /thank|welcome|visit/i,
      /^\d{4}-\d{2}-\d{2}/, // Date
      /^\d{2}:\d{2}/, // Time
      /^[A-Z0-9]{10,}$/, // Long alphanumeric strings
      /^\s*[-=*_]+\s*$/ // Separator lines
    ];

    return headerFooterPatterns.some(pattern => pattern.test(lowerLine));
  }

  suggestCategories(items) {
    return items.map(item => {
      let category = 'miscellaneous';
      let maxScore = 0;

      for (const [categoryName, keywords] of Object.entries(this.categoryKeywords)) {
        let score = 0;
        const itemName = item.name.toLowerCase();
        
        // Check English keywords
        keywords.english.forEach(keyword => {
          if (itemName.includes(keyword.toLowerCase())) {
            score += 2; // Higher weight for direct matches
          }
        });

        // Check Chinese keywords (if item has Chinese name)
        if (item.nameZh) {
          const itemNameZh = item.nameZh.toLowerCase();
          keywords.chinese.forEach(keyword => {
            if (itemNameZh.includes(keyword)) {
              score += 2;
            }
          });
        }

        // Fuzzy matching (partial word matching)
        keywords.english.forEach(keyword => {
          const itemWords = itemName.split(/\s+/);
          const keywordWords = keyword.toLowerCase().split(/\s+/);
          keywordWords.forEach(kwWord => {
            itemWords.forEach(itemWord => {
              if (itemWord.length > 3 && kwWord.length > 3) {
                const similarity = this.calculateSimilarity(itemWord, kwWord);
                if (similarity > 0.7) {
                  score += 1;
                }
              }
            });
          });
        });

        if (score > maxScore) {
          maxScore = score;
          category = categoryName;
        }
      }

      return {
        ...item,
        category: maxScore > 0 ? category : 'miscellaneous',
        categoryConfidence: Math.min(maxScore / 10, 1.0) // Normalize to 0-1
      };
    });
  }

  calculateSimilarity(str1, str2) {
    // Simple Levenshtein distance based similarity
    const matrix = Array(str2.length + 1).fill(null).map(() => 
      Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator,
        );
      }
    }

    const distance = matrix[str2.length][str1.length];
    const maxLength = Math.max(str1.length, str2.length);
    return maxLength === 0 ? 1 : (maxLength - distance) / maxLength;
  }

  extractStoreInfo(text) {
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    
    let storeName = '';
    let storeNameZh = '';
    let storeAddress = '';

    // Extract store name from patterns
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Check English store patterns
      for (const pattern of this.storePatterns.english) {
        const match = trimmedLine.match(pattern);
        if (match && !storeName) {
          storeName = trimmedLine;
          break;
        }
      }

      // Check Chinese store patterns
      for (const pattern of this.storePatterns.chinese) {
        const match = trimmedLine.match(pattern);
        if (match && !storeNameZh) {
          storeNameZh = trimmedLine;
          break;
        }
      }

      // Address patterns (Singapore postal codes)
      const postalMatch = trimmedLine.match(/(\d{6})/);
      if (postalMatch && !storeAddress) {
        storeAddress = trimmedLine;
      }

      if (storeName && storeNameZh && storeAddress) {
        break;
      }
    }

    // If no specific pattern matches, use the first non-date line as store name
    if (!storeName && !storeNameZh) {
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine.match(/^\d{4}-\d{2}-\d{2}/) && 
            !trimmedLine.match(/^\d{2}:\d{2}/) &&
            !trimmedLine.match(/receipt|invoice/i)) {
          // Try to detect if it's Chinese
          if (/[\u4e00-\u9fff]/.test(trimmedLine)) {
            storeNameZh = trimmedLine;
          } else {
            storeName = trimmedLine;
          }
          break;
        }
      }
    }

    return {
      name: storeName || null,
      nameZh: storeNameZh || null,
      address: storeAddress || null
    };
  }

  extractReceiptInfo(text) {
    const lines = text.split('\n');
    let receiptNumber = '';
    let purchaseDate = null;
    let purchaseTime = null;

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Receipt number patterns
      const receiptPatterns = [
        /receipt\s*#?\s*([A-Z0-9-]+)/i,
        /invoice\s*#?\s*([A-Z0-9-]+)/i,
        /bill\s*#?\s*([A-Z0-9-]+)/i,
        /(\d{6,})/, // 6+ digits
        /#([A-Z0-9-]+)/
      ];

      for (const pattern of receiptPatterns) {
        const match = trimmedLine.match(pattern);
        if (match && !receiptNumber) {
          receiptNumber = match[1];
          break;
        }
      }

      // Date patterns
      const datePatterns = [
        /(\d{4}-\d{2}-\d{2})/,
        /(\d{2}\/\d{2}\/\d{4})/,
        /(\d{2}-\d{2}-\d{4})/,
        /date[:\s]*(\d{4}[-\/]\d{2}[-\/]\d{2})/i
      ];

      for (const pattern of datePatterns) {
        const match = trimmedLine.match(pattern);
        if (match && !purchaseDate) {
          purchaseDate = new Date(match[1]);
          break;
        }
      }

      // Time patterns
      const timePatterns = [
        /(\d{1,2}:\d{2}(:\d{2})?\s*(AM|PM)?)/
      ];

      for (const pattern of timePatterns) {
        const match = trimmedLine.match(pattern);
        if (match && !purchaseTime) {
          purchaseTime = match[1];
          break;
        }
      }
    }

    // Combine date and time
    if (purchaseDate && purchaseTime) {
      const dateTimeStr = `${purchaseDate.toISOString().split('T')[0]} ${purchaseTime}`;
      purchaseDate = new Date(dateTimeStr);
    }

    return {
      receiptNumber: receiptNumber || null,
      purchaseDate: purchaseDate || null
    };
  }

  async processReceipt(buffer, options = {}) {
    try {
      // Extract text with confidence
      const ocrResult = await this.extractTextWithRetry(buffer, options);
      
      // Parse items
      const items = this.parseItems(ocrResult.text);
      
      // Suggest categories
      const categorizedItems = this.suggestCategories(items);
      
      // Extract store information
      const storeInfo = this.extractStoreInfo(ocrResult.text);
      
      // Extract receipt metadata
      const receiptInfo = this.extractReceiptInfo(ocrResult.text);
      
      // Calculate total amount from items if not provided
      const calculatedTotal = categorizedItems.reduce((sum, item) => sum + item.totalPrice, 0);

      return {
        ocrText: ocrResult.text,
        ocrConfidence: ocrResult.confidence,
        lines: ocrResult.lines,
        words: ocrResult.words,
        items: categorizedItems,
        storeInfo,
        receiptInfo,
        calculatedTotal,
        itemCount: categorizedItems.length
      };
    } catch (error) {
      this.logger.error('Receipt processing failed:', error);
      throw error;
    }
  }
}

module.exports = new OCRService();