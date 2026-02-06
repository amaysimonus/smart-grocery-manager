const express = require('express');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const BudgetController = require('../controllers/budgetController');

const router = express.Router();
const budgetController = new BudgetController();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Budget CRUD routes
router.post(
  '/',
  BudgetController.budgetRateLimit,
  roleMiddleware(['MASTER', 'ADMIN']),
  BudgetController.validateBudget,
  budgetController.createBudget
);

router.get(
  '/',
  BudgetController.validateQuery,
  budgetController.getBudgets
);

router.get(
  '/templates',
  budgetController.getBudgetTemplates
);

router.post(
  '/template',
  BudgetController.budgetRateLimit,
  roleMiddleware(['MASTER', 'ADMIN']),
  BudgetController.validateBudgetTemplate,
  budgetController.createBudgetFromTemplate
);

router.get(
  '/:id',
  budgetController.getBudgetById
);

router.put(
  '/:id',
  BudgetController.budgetRateLimit,
  roleMiddleware(['MASTER', 'ADMIN']),
  BudgetController.validateBudgetUpdate,
  budgetController.updateBudget
);

router.delete(
  '/:id',
  BudgetController.budgetRateLimit,
  roleMiddleware(['MASTER', 'ADMIN']),
  budgetController.deleteBudget
);

router.get(
  '/:id/spending',
  budgetController.getBudgetSpending
);

router.post(
  '/:id/assign',
  BudgetController.budgetRateLimit,
  roleMiddleware(['MASTER', 'ADMIN']),
  BudgetController.validateAssignment,
  budgetController.assignBudget
);

router.delete(
  '/:id/assign/:userId',
  BudgetController.budgetRateLimit,
  roleMiddleware(['MASTER', 'ADMIN']),
  budgetController.unassignBudget
);

router.post(
  '/:id/rollover',
  BudgetController.budgetRateLimit,
  roleMiddleware(['MASTER', 'ADMIN']),
  budgetController.handleBudgetRollover
);

module.exports = router;