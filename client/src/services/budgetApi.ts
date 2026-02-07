// Budget API functions
import { apiClient } from './client';
import type { Budget, CreateBudgetRequest, UpdateBudgetRequest, BudgetListResponse, GetBudgetsParams } from './receiptApi';

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

export const budgetApi = {
  // Get all budgets
  getBudgets: async (params?: GetBudgetsParams): Promise<BudgetListResponse> => {
    const response = await apiClient.get<BudgetListResponse>('/budgets', { params });
    return response.data;
  },

  // Get budget by ID
  getBudget: async (id: string): Promise<Budget> => {
    const response = await apiClient.get<Budget>(`/budgets/${id}`);
    return response.data;
  },

  // Create new budget
  createBudget: async (data: CreateBudgetRequest): Promise<Budget> => {
    const response = await apiClient.post<Budget>('/budgets', data);
    return response.data;
  },

  // Update budget
  updateBudget: async (id: string, data: UpdateBudgetRequest): Promise<Budget> => {
    const response = await apiClient.put<Budget>(`/budgets/${id}`, data);
    return response.data;
  },

  // Delete budget
  deleteBudget: async (id: string): Promise<void> => {
    await apiClient.delete(`/budgets/${id}`);
  },

  // Get budget utilization
  getBudgetUtilization: async (): Promise<Array<{
    category: string;
    budgeted: number;
    spent: number;
    remaining: number;
    percentage: number;
  }>> => {
    const response = await apiClient.get('/budgets/utilization');
    return response.data;
  },
};