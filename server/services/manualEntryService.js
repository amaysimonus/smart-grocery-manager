const { prisma } = require('../config/database');

class ManualEntryService {
  // Create manual receipt
  async createManualReceipt(userId, receiptData) {
    try {
      // Check for duplicate receipts (same store and purchase date within 5 minutes)
      const duplicateCheck = await this.checkDuplicateReceipt(userId, receiptData);
      if (duplicateCheck) {
        throw new Error('Duplicate receipt detected for the same store and time');
      }

      // Create receipt record
      const receipt = await prisma.receipt.create({
        data: {
          userId,
          storeName: receiptData.storeName,
          storeNameZh: receiptData.storeNameZh || null,
          totalAmount: 0, // Will be calculated when items are added
          currency: receiptData.currency || 'SGD',
          receiptNumber: receiptData.receiptNumber || null,
          purchaseDate: new Date(receiptData.purchaseDate),
          budgetId: receiptData.budgetId || null,
          status: 'MANUAL' // Different status for manual entries
        }
      });

      return receipt;
    } catch (error) {
      console.error('Create manual receipt error:', error);
      throw error;
    }
  }

  // Add items to manual receipt
  async addItemsToReceipt(receiptId, userId, items) {
    try {
      // Verify receipt ownership
      const receipt = await prisma.receipt.findFirst({
        where: {
          id: receiptId,
          userId
        }
      });

      if (!receipt) {
        throw new Error('Receipt not found or access denied');
      }

      // Validate and prepare items
      const validatedItems = this.validateItems(items);

      // Get or create categories
      const categoryMap = await this.getOrCreateCategories(validatedItems);

      // Create receipt items
      const itemData = validatedItems.map(item => ({
        receiptId,
        categoryId: categoryMap[item.category] || item.categoryId,
        name: item.name,
        nameZh: item.nameZh || null,
        quantity: parseFloat(item.quantity),
        unitPrice: parseFloat(item.unitPrice),
        totalPrice: parseFloat(item.quantity) * parseFloat(item.unitPrice),
        category: item.category || null
      }));

      const createdItems = await prisma.receiptItem.createMany({
        data: itemData
      });

      // Calculate and update receipt total
      const totalAmount = itemData.reduce((sum, item) => sum + item.totalPrice, 0);
      
      await prisma.receipt.update({
        where: { id: receiptId },
        data: { totalAmount }
      });

      // Return created items with details
      const detailedItems = await prisma.receiptItem.findMany({
        where: { receiptId },
        include: {
          categoryRelation: true
        }
      });

      return {
        items: detailedItems,
        receipt: { ...receipt, totalAmount }
      };
    } catch (error) {
      console.error('Add items to receipt error:', error);
      throw error;
    }
  }

  // Update manual receipt
  async updateManualReceipt(receiptId, userId, updateData) {
    try {
      // Verify receipt ownership
      const existingReceipt = await prisma.receipt.findFirst({
        where: {
          id: receiptId,
          userId
        }
      });

      if (!existingReceipt) {
        throw new Error('Receipt not found or access denied');
      }

      // Parse and validate update data
      const parsedData = this.parseUpdateData(updateData);

      // Update receipt
      const updatedReceipt = await prisma.receipt.update({
        where: { id: receiptId },
        data: parsedData,
        include: {
          items: {
            include: {
              categoryRelation: true
            }
          }
        }
      });

      return updatedReceipt;
    } catch (error) {
      console.error('Update manual receipt error:', error);
      throw error;
    }
  }

  // Delete manual receipt
  async deleteManualReceipt(receiptId, userId) {
    try {
      // Verify receipt ownership
      const existingReceipt = await prisma.receipt.findFirst({
        where: {
          id: receiptId,
          userId
        }
      });

      if (!existingReceipt) {
        throw new Error('Receipt not found or access denied');
      }

      // Delete receipt (cascade will delete items)
      await prisma.receipt.delete({
        where: { id: receiptId }
      });

      return { message: 'Receipt deleted successfully' };
    } catch (error) {
      console.error('Delete manual receipt error:', error);
      throw error;
    }
  }

  // List manual receipts with pagination
  async listManualReceipts(userId, options = {}) {
    try {
      const page = parseInt(options.page) || 1;
      const limit = parseInt(options.limit) || 10;
      const skip = (page - 1) * limit;

      const [receipts, total] = await Promise.all([
        prisma.receipt.findMany({
          where: {
            userId,
            status: 'MANUAL' // Only manual receipts
          },
          include: {
            items: {
              include: {
                categoryRelation: true
              }
            },
            budget: true
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.receipt.count({
          where: {
            userId,
            status: 'MANUAL'
          }
        })
      ]);

      return {
        receipts,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('List manual receipts error:', error);
      throw error;
    }
  }

  // Get manual receipt details
  async getManualReceipt(receiptId, userId) {
    try {
      const receipt = await prisma.receipt.findFirst({
        where: {
          id: receiptId,
          userId,
          status: 'MANUAL'
        },
        include: {
          items: {
            include: {
              categoryRelation: true
            }
          },
          budget: true
        }
      });

      if (!receipt) {
        throw new Error('Manual receipt not found');
      }

      return receipt;
    } catch (error) {
      console.error('Get manual receipt error:', error);
      throw error;
    }
  }

  // Private helper methods

  // Check for duplicate receipts
  async checkDuplicateReceipt(userId, receiptData) {
    const purchaseDate = new Date(receiptData.purchaseDate);
    const timeWindow = 5 * 60 * 1000; // 5 minutes in milliseconds

    const duplicate = await prisma.receipt.findFirst({
      where: {
        userId,
        status: 'MANUAL',
        storeName: receiptData.storeName,
        purchaseDate: {
          gte: new Date(purchaseDate.getTime() - timeWindow),
          lte: new Date(purchaseDate.getTime() + timeWindow)
        }
      }
    });

    return duplicate;
  }

  // Validate items data
  validateItems(items) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('At least one item is required');
    }

    return items.map(item => {
      // Validate required fields
      if (!item.name || item.name.trim() === '') {
        throw new Error('Item name is required');
      }

      // Validate quantity and price
      const quantity = parseFloat(item.quantity);
      const unitPrice = parseFloat(item.unitPrice);

      if (isNaN(quantity) || quantity <= 0) {
        throw new Error('Item quantity must be a positive number');
      }

      if (isNaN(unitPrice) || unitPrice < 0) {
        throw new Error('Item unit price must be a non-negative number');
      }

      // Business rule validation
      if (quantity > 1000) {
        throw new Error('Item quantity seems unreasonable (> 1000)');
      }

      if (unitPrice > 10000) {
        throw new Error('Item unit price seems unreasonable (> $10,000)');
      }

      return {
        name: item.name.trim(),
        nameZh: item.nameZh?.trim() || null,
        quantity: quantity.toString(),
        unitPrice: unitPrice.toFixed(2),
        categoryId: item.categoryId || null,
        category: item.category || null
      };
    });
  }

  // Get or create categories
  async getOrCreateCategories(items) {
    const categoryMap = {};

    for (const item of items) {
      if (item.category && !categoryMap[item.category]) {
        // Check if category exists
        let category = await prisma.category.findFirst({
          where: { 
            OR: [
              { name: item.category },
              { nameZh: item.category }
            ]
          }
        });

        if (!category) {
          // Create new category
          category = await prisma.category.create({
            data: {
              name: item.category,
              nameZh: item.categoryZh || null
            }
          });
        }

        categoryMap[item.category] = category.id;
      }
    }

    return categoryMap;
  }

  // Parse update data
  parseUpdateData(updateData) {
    const parsedData = { ...updateData };

    // Parse numeric fields
    if (updateData.totalAmount !== undefined) {
      parsedData.totalAmount = parseFloat(updateData.totalAmount);
    }

    if (updateData.purchaseDate !== undefined) {
      parsedData.purchaseDate = new Date(updateData.purchaseDate);
    }

    // Remove fields that shouldn't be updated
    delete parsedData.id;
    delete parsedData.userId;
    delete parsedData.createdAt;
    delete parsedData.updatedAt;
    delete parsedData.status; // Don't allow status changes through manual entry

    return parsedData;
  }

  // Bulk item creation for wet market purchases
  async createBulkWetMarketItems(receiptId, userId, marketData) {
    try {
      const commonItems = {
        vegetables: [
          { name: 'Bok Choy', nameZh: '白菜', category: 'Vegetables' },
          { name: 'Spinach', nameZh: '菠菜', category: 'Vegetables' },
          { name: 'Chinese Cabbage', nameZh: '包菜', category: 'Vegetables' },
          { name: 'Carrots', nameZh: '胡萝卜', category: 'Vegetables' },
          { name: 'Tomatoes', nameZh: '番茄', category: 'Vegetables' }
        ],
        meats: [
          { name: 'Pork', nameZh: '猪肉', category: 'Meat' },
          { name: 'Chicken', nameZh: '鸡肉', category: 'Meat' },
          { name: 'Beef', nameZh: '牛肉', category: 'Meat' }
        ],
        seafood: [
          { name: 'Fish', nameZh: '鱼', category: 'Seafood' },
          { name: 'Shrimp', nameZh: '虾', category: 'Seafood' }
        ]
      };

      const items = [];
      
      // Process market data items
      if (marketData.items && Array.isArray(marketData.items)) {
        items.push(...marketData.items);
      }

      // Add common items with estimated prices
      if (marketData.includeCommonItems) {
        for (const category in commonItems) {
          if (marketData[category] || marketData.includeAll) {
            items.push(...commonItems[category].map(item => ({
              ...item,
              quantity: marketData.defaultQuantity || 1,
              unitPrice: marketData.defaultPrice || 5.00
            })));
          }
        }
      }

      return await this.addItemsToReceipt(receiptId, userId, items);
    } catch (error) {
      console.error('Create bulk wet market items error:', error);
      throw error;
    }
  }
}

module.exports = new ManualEntryService();