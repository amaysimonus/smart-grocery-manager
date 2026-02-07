// Main API entry point
export * from './client';
export * from './receiptApi';
export * from './budgetApi';

// Re-export commonly used types
export type { 
  Receipt, 
  ReceiptItem, 
  CreateReceiptRequest, 
  ReceiptListResponse, 
  GetReceiptsParams,
  Budget,
  CreateBudgetRequest,
  UpdateBudgetRequest,
  BudgetListResponse,
  GetBudgetsParams
} from './receiptApi';

export type { Budget as BudgetType } from './budgetApi';