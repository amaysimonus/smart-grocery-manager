// Type definitions for the application
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  preferences: {
    language: 'en' | 'zh';
    currency: string;
    theme: 'light' | 'dark' | 'auto';
  };
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: Record<string, string[]>;
}

// Legacy Receipt interfaces (for backward compatibility)
export interface Receipt {
  id: string;
  storeName: string;
  purchaseDate: string;
  totalAmount: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  items: ReceiptItem[];
  imageUrl?: string;
}

export interface ReceiptItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  category?: string;
}

export interface ReceiptFilters {
  startDate?: Date | null;
  endDate?: Date | null;
  minAmount?: number;
  maxAmount?: number;
  status: string[]; // Changed to string[] for multi-select
  storeName: string; // Explicitly string to match implementation
}

export interface ReceiptStats {
  totalCount: number;
  totalAmount: number;
  averageAmount: number;
}

export type UserRole = 'ADMIN' | 'FAMILY' | 'HELPER';

// Export types from services
export type {
  Receipt as DetailedReceipt,
  ReceiptItem as DetailedReceiptItem,
  CreateReceiptRequest,
  ReceiptListResponse,
  GetReceiptsParams,
  Budget,
  CreateBudgetRequest,
  UpdateBudgetRequest,
  BudgetListResponse,
  GetBudgetsParams,
} from '../services/receiptApi';
