const { PrismaClient } = require('@prisma/client');
const Decimal = require('decimal.js');

class BudgetService {
  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Create a new budget
   */
  async createBudget(budgetData, createdBy) {
    const { name, description, amount, startDate, endDate, isRecurring, recurrence } = budgetData;

    // Validate dates
    const start = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      if (end <= start) {
        throw new Error('End date must be after start date');
      }
    }

    // Validate amount
    const decimalAmount = new Decimal(amount);
    if (decimalAmount.lessThanOrEqualTo(0)) {
      throw new Error('Budget amount must be greater than 0');
    }

    // Create budget
    const budget = await this.prisma.budget.create({
      data: {
        name,
        description,
        amount: decimalAmount.toDecimalPlaces(2).toNumber(),
        startDate: start,
        endDate: endDate ? new Date(endDate) : null,
        isRecurring: Boolean(isRecurring),
        recurrence: isRecurring ? recurrence : null,
        createdBy,
        isActive: true
      },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    return this.formatBudget(budget);
  }

  /**
   * Get budgets with pagination and filtering
   */
  async getBudgets(options = {}) {
    const { 
      page = 1, 
      limit = 10, 
      search, 
      isActive, 
      createdBy,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = options;

    const skip = (page - 1) * limit;
    const where = {};

    // Build filters
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (createdBy) {
      where.createdBy = createdBy;
    }

    // Get budgets and total count
    const [budgets, total] = await Promise.all([
      this.prisma.budget.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          _count: {
            select: {
              receipts: true
            }
          }
        }
      }),
      this.prisma.budget.count({ where })
    ]);

    return {
      budgets: budgets.map(budget => this.formatBudget(budget)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Get single budget by ID
   */
  async getBudgetById(id) {
    const budget = await this.prisma.budget.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        receipts: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          },
          orderBy: {
            purchaseDate: 'desc'
          }
        },
        _count: {
          select: {
            receipts: true
          }
        }
      }
    });

    if (!budget) {
      throw new Error('Budget not found');
    }

    return this.formatBudget(budget);
  }

  /**
   * Update budget
   */
  async updateBudget(id, updateData, updatedBy) {
    // Check if budget exists
    const existingBudget = await this.prisma.budget.findUnique({
      where: { id }
    });

    if (!existingBudget) {
      throw new Error('Budget not found');
    }

    // Validate update data
    const { amount, startDate, endDate } = updateData;

    if (amount !== undefined) {
      const decimalAmount = new Decimal(amount);
      if (decimalAmount.lessThanOrEqualTo(0)) {
        throw new Error('Budget amount must be greater than 0');
      }
      updateData.amount = decimalAmount.toDecimalPlaces(2).toNumber();
    }

    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : existingBudget.startDate;
      const end = endDate ? new Date(endDate) : existingBudget.endDate;

      if (end && end <= start) {
        throw new Error('End date must be after start date');
      }

      updateData.startDate = start;
      updateData.endDate = end;
    }

    // Update budget
    const budget = await this.prisma.budget.update({
      where: { id },
      data: updateData,
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    return this.formatBudget(budget);
  }

  /**
   * Delete budget
   */
  async deleteBudget(id, deletedBy) {
    // Check if budget exists
    const budget = await this.prisma.budget.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            receipts: true
          }
        }
      }
    });

    if (!budget) {
      throw new Error('Budget not found');
    }

    // Check if budget has receipts
    if (budget._count.receipts > 0) {
      throw new Error('Cannot delete budget with existing receipts');
    }

    await this.prisma.budget.delete({
      where: { id }
    });

    return { success: true, message: 'Budget deleted successfully' };
  }

  /**
   * Get spending against budget
   */
  async getBudgetSpending(id) {
    const budget = await this.prisma.budget.findUnique({
      where: { id }
    });

    if (!budget) {
      throw new Error('Budget not found');
    }

    // Calculate total spending from receipts
    const spendingResult = await this.prisma.receipt.aggregate({
      where: {
        budgetId: id,
        status: 'COMPLETED'
      },
      _sum: {
        totalAmount: true
      },
      _count: {
        id: true
      }
    });

    const totalSpent = new Decimal(spendingResult._sum.totalAmount || 0);
    const budgetAmount = new Decimal(budget.amount);
    const remainingAmount = budgetAmount.minus(totalSpent);
    const percentageUsed = budgetAmount.greaterThan(0) 
      ? totalSpent.dividedBy(budgetAmount).times(100).toDecimalPlaces(2)
      : new Decimal(0);

    return {
      budgetId: id,
      budgetName: budget.name,
      budgetAmount: budgetAmount.toDecimalPlaces(2).toString(),
      totalSpent: totalSpent.toDecimalPlaces(2).toString(),
      remainingAmount: remainingAmount.toDecimalPlaces(2).toString(),
      percentageUsed: percentageUsed.toString(),
      receiptCount: spendingResult._count.id,
      isOverBudget: totalSpent.greaterThan(budgetAmount),
      startDate: budget.startDate,
      endDate: budget.endDate,
      isRecurring: budget.isRecurring,
      recurrence: budget.recurrence
    };
  }

  /**
   * Get budget templates
   */
  async getBudgetTemplates() {
    const templates = [
      {
        name: 'weekly_groceries',
        displayName: 'Weekly Groceries',
        description: 'Budget for weekly grocery shopping',
        defaultAmount: '150.00',
        isRecurring: true,
        recurrence: 'WEEKLY',
        category: 'food',
        icon: '🛒'
      },
      {
        name: 'monthly_utilities',
        displayName: 'Monthly Utilities',
        description: 'Budget for monthly utility bills',
        defaultAmount: '300.00',
        isRecurring: true,
        recurrence: 'MONTHLY',
        category: 'utilities',
        icon: '💡'
      },
      {
        name: 'weekly_transport',
        displayName: 'Weekly Transport',
        description: 'Budget for weekly transportation expenses',
        defaultAmount: '50.00',
        isRecurring: true,
        recurrence: 'WEEKLY',
        category: 'transport',
        icon: '🚗'
      },
      {
        name: 'monthly_entertainment',
        displayName: 'Monthly Entertainment',
        description: 'Budget for movies, dining out, and entertainment',
        defaultAmount: '200.00',
        isRecurring: true,
        recurrence: 'MONTHLY',
        category: 'entertainment',
        icon: '🎬'
      },
      {
        name: 'monthly_shopping',
        displayName: 'Monthly Shopping',
        description: 'Budget for clothing and personal shopping',
        defaultAmount: '100.00',
        isRecurring: true,
        recurrence: 'MONTHLY',
        category: 'shopping',
        icon: '🛍️'
      },
      {
        name: 'weekly_healthcare',
        displayName: 'Weekly Healthcare',
        description: 'Budget for healthcare and medical expenses',
        defaultAmount: '25.00',
        isRecurring: true,
        recurrence: 'WEEKLY',
        category: 'healthcare',
        icon: '🏥'
      },
      {
        name: 'monthly_education',
        displayName: 'Monthly Education',
        description: 'Budget for education and learning expenses',
        defaultAmount: '50.00',
        isRecurring: true,
        recurrence: 'MONTHLY',
        category: 'education',
        icon: '📚'
      },
      {
        name: 'emergency_fund',
        displayName: 'Emergency Fund',
        description: 'Budget for unexpected expenses',
        defaultAmount: '500.00',
        isRecurring: false,
        recurrence: null,
        category: 'emergency',
        icon: '🆘'
      }
    ];

    return templates;
  }

  /**
   * Create budget from template
   */
  async createBudgetFromTemplate(templateData, createdBy) {
    const { templateName, name, amount, startDate } = templateData;

    // Get template
    const templates = await this.getBudgetTemplates();
    const template = templates.find(t => t.name === templateName);

    if (!template) {
      throw new Error('Template not found');
    }

    // Create budget from template
    const budgetData = {
      name: name || template.displayName,
      description: template.description,
      amount: amount || template.defaultAmount,
      startDate,
      endDate: null, // Will be calculated based on recurrence
      isRecurring: template.isRecurring,
      recurrence: template.recurrence
    };

    // Calculate end date for recurring budgets
    if (template.isRecurring && template.recurrence) {
      const start = new Date(startDate);
      let endDate = new Date(start);

      switch (template.recurrence) {
        case 'WEEKLY':
          endDate.setDate(endDate.getDate() + 7);
          break;
        case 'BI_WEEKLY':
          endDate.setDate(endDate.getDate() + 14);
          break;
        case 'MONTHLY':
          endDate.setMonth(endDate.getMonth() + 1);
          break;
      }

      budgetData.endDate = endDate;
    }

    return await this.createBudget(budgetData, createdBy);
  }

  /**
   * Format budget for response
   */
  formatBudget(budget) {
    return {
      ...budget,
      amount: new Decimal(budget.amount).toDecimalPlaces(2).toString(),
      createdAt: budget.createdAt.toISOString(),
      updatedAt: budget.updatedAt.toISOString(),
      startDate: budget.startDate.toISOString(),
      endDate: budget.endDate ? budget.endDate.toISOString() : null
    };
  }

  /**
   * Handle budget rollover logic
   */
  async handleBudgetRollover(budgetId, rolloverPolicy = 'carry_forward') {
    const budget = await this.prisma.budget.findUnique({
      where: { id: budgetId },
      include: {
        receipts: {
          where: { status: 'COMPLETED' }
        }
      }
    });

    if (!budget || !budget.isRecurring) {
      throw new Error('Budget not found or not recurring');
    }

    const spending = await this.getBudgetSpending(budgetId);
    const remainingAmount = new Decimal(spending.remainingAmount);

    if (rolloverPolicy === 'carry_forward' && remainingAmount.greaterThan(0)) {
      // Create new budget period with carried forward amount
      const newStartDate = new Date(budget.endDate);
      let newEndDate = new Date(newStartDate);

      switch (budget.recurrence) {
        case 'WEEKLY':
          newEndDate.setDate(newEndDate.getDate() + 7);
          break;
        case 'BI_WEEKLY':
          newEndDate.setDate(newEndDate.getDate() + 14);
          break;
        case 'MONTHLY':
          newEndDate.setMonth(newEndDate.getMonth() + 1);
          break;
      }

      const newAmount = new Decimal(budget.amount).plus(remainingAmount);

      await this.prisma.budget.create({
        data: {
          name: budget.name,
          description: budget.description,
          amount: newAmount.toDecimalPlaces(2).toNumber(),
          startDate: newStartDate,
          endDate: newEndDate,
          isRecurring: budget.isRecurring,
          recurrence: budget.recurrence,
          createdBy: budget.createdBy,
          isActive: true
        }
      });
    }

    return { success: true, message: 'Budget rollover handled' };
  }
}

module.exports = BudgetService;