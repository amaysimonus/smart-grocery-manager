// Receipt API functions
import { apiClient } from './client';

// Budget-related types (shared between services)
export interface Budget {
  id: string;
  category: string;
  amount: number;
  spent: number;
  period: 'monthly' | 'weekly' | 'yearly';
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBudgetRequest {
  category: string;
  amount: number;
  period: 'monthly' | 'weekly' | 'yearly';
  startDate: string;
  endDate?: string;
}

export interface UpdateBudgetRequest {
  category?: string;
  amount?: number;
  period?: 'monthly' | 'weekly' | 'yearly';
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
}

export interface BudgetListResponse {
  budgets: Budget[];
  total: number;
  page: number;
  limit: number;
}

export interface GetBudgetsParams {
  page?: number;
  limit?: number;
  category?: string;
  active?: boolean;
  period?: 'monthly' | 'weekly' | 'yearly';
}

export interface Receipt {
  id: string;
  userId: string;
  merchant: {
    name: string;
    address?: string;
    phone?: string;
    licenseNo?: string;
  };
  purchaseDate: string;
  items: ReceiptItem[];
  totalAmount: number;
  currency: string;
  category: string;
  paymentMethod: string;
  hasLuckyDraw: boolean;
  receiptType: 'electronic' | 'paper';
  ocrData?: {
    confidence: number;
    rawText?: string;
    processedAt: string;
  };
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  category: string;
  isWeighted: boolean;
  weight?: number;
  unit?: string;
}

export interface CreateReceiptRequest {
  merchant: {
    name: string;
    address?: string;
    phone?: string;
    licenseNo?: string;
  };
  purchaseDate: string;
  items: ReceiptItem[];
  totalAmount: number;
  currency: string;
  category: string;
  paymentMethod: string;
  hasLuckyDraw?: boolean;
  receiptType: 'electronic' | 'paper';
  imageFile?: File;
  manualEntry?: boolean;
}

export interface ReceiptListResponse {
  receipts: Receipt[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface GetReceiptsParams {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  category?: string;
  merchant?: string;
  minAmount?: number;
  maxAmount?: number;
  sortBy?: 'purchaseDate' | 'totalAmount' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface OCRUploadResponse {
  receiptId: string;
  confidence: number;
  extractedData: {
    merchant?: string;
    purchaseDate?: string;
    items?: Array<{
      name: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }>;
    totalAmount?: number;
  };
  needsConfirmation: boolean;
}

export const receiptApi = {
  // Get all receipts with filtering and pagination
  getReceipts: async (params?: GetReceiptsParams): Promise<ReceiptListResponse> => {
    const response = await apiClient.get<ReceiptListResponse>('/receipts', { params });
    return response.data;
  },

  // Get receipt by ID
  getReceipt: async (id: string): Promise<Receipt> => {
    const response = await apiClient.get<Receipt>(`/receipts/${id}`);
    return response.data;
  },

  // Create new receipt (manual entry)
  createReceipt: async (data: CreateReceiptRequest): Promise<Receipt> => {
    const response = await apiClient.post<Receipt>('/receipts', data);
    return response.data;
  },

  // Upload receipt image for OCR processing
  uploadAndProcess: async (imageFile: File): Promise<OCRUploadResponse> => {
    const formData = new FormData();
    formData.append('image', imageFile);
    
    const response = await apiClient.post<OCRUploadResponse>('/receipts/ocr', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Update receipt
  updateReceipt: async (id: string, data: Partial<CreateReceiptRequest>): Promise<Receipt> => {
    const response = await apiClient.put<Receipt>(`/receipts/${id}`, data);
    return response.data;
  },

  // Delete receipt
  deleteReceipt: async (id: string): Promise<void> => {
    await apiClient.delete(`/receipts/${id}`);
  },

  // Confirm OCR processed receipt
  confirmOCRReceipt: async (id: string, data: CreateReceiptRequest): Promise<Receipt> => {
    const response = await apiClient.post<Receipt>(`/receipts/${id}/confirm`, data);
    return response.data;
  },

  // Get receipt statistics
  getReceiptStats: async (params?: {
    startDate?: string;
    endDate?: string;
    groupBy?: 'day' | 'week' | 'month' | 'category';
  }): Promise<{
    totalAmount: number;
    totalReceipts: number;
    averageAmount: number;
    categoryBreakdown: Array<{
      category: string;
      amount: number;
      count: number;
      percentage: number;
    }>;
    dailySpending: Array<{
      date: string;
      amount: number;
      count: number;
    }>;
  }> => {
    const response = await apiClient.get('/receipts/stats', { params });
    return response.data;
  },
};