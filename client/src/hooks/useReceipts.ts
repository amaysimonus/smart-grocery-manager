import { useState, useEffect, useCallback } from 'react';
import { Receipt, ReceiptStats } from '../types';

export const calculateStats = (filteredReceipts: Receipt[]): ReceiptStats => {
  const totalCount = filteredReceipts.length;
  const totalAmount = filteredReceipts.reduce((sum, receipt) => sum + receipt.totalAmount, 0);
  const averageAmount = totalCount > 0 ? totalAmount / totalCount : 0;

  return {
    totalCount,
    totalAmount,
    averageAmount,
  };
};

// Mock data for development
const MOCK_RECEIPTS: Receipt[] = [
  {
    id: '1',
    storeName: 'NTUC FairPrice',
    purchaseDate: '2023-10-25T10:30:00Z',
    totalAmount: 125.50,
    status: 'COMPLETED',
    items: [],
  },
  {
    id: '2',
    storeName: 'Cold Storage',
    purchaseDate: '2023-10-26T14:15:00Z',
    totalAmount: 89.90,
    status: 'PROCESSING',
    items: [],
  },
  {
    id: '3',
    storeName: 'Sheng Siong',
    purchaseDate: '2023-10-27T09:00:00Z',
    totalAmount: 45.20,
    status: 'PENDING',
    items: [],
  },
];

export const useReceipts = () => {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Simulate API fetch
    const fetchReceipts = async () => {
      try {
        setLoading(true);
        // const response = await axios.get('/api/receipts');
        // setReceipts(response.data);
        setTimeout(() => {
          setReceipts(MOCK_RECEIPTS);
          setLoading(false);
        }, 500);
      } catch (err) {
        setError('Failed to fetch receipts');
        setLoading(false);
      }
    };

    fetchReceipts();
  }, []);



  const deleteReceipt = useCallback((id: string) => {
    setReceipts((prev) => prev.filter((receipt) => receipt.id !== id));
  }, []);

  const updateReceipt = useCallback((id: string, updates: Partial<Receipt>) => {
    setReceipts((prev) =>
      prev.map((receipt) =>
        receipt.id === id ? { ...receipt, ...updates } : receipt
      )
    );
  }, []);

  return {
    receipts,
    loading,
    error,
    calculateStats,
    setReceipts, // Exposed for updates
    deleteReceipt,
    updateReceipt,
  };
};
