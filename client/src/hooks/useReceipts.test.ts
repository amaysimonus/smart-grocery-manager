import { renderHook, act, waitFor } from '@testing-library/react';
import { useReceipts } from './useReceipts';

// Mock setTimeout to speed up tests
jest.useFakeTimers();

describe('useReceipts', () => {
  it('should start with loading true', async () => {
    const { result } = renderHook(() => useReceipts());
    expect(result.current.loading).toBe(true);
    expect(result.current.receipts).toEqual([]);
    
    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(500);
    });
    
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.receipts.length).toBeGreaterThan(0);
  });

  it('should calculate stats correctly', async () => {
    const { result } = renderHook(() => useReceipts());
    
    act(() => {
      jest.advanceTimersByTime(500);
    });
    
    await waitFor(() => expect(result.current.loading).toBe(false));

    const stats = result.current.calculateStats(result.current.receipts);
    expect(stats.totalCount).toBe(result.current.receipts.length);
    expect(stats.totalAmount).toBeGreaterThan(0);
    expect(stats.averageAmount).toBe(stats.totalAmount / stats.totalCount);
  });

  it('should delete a receipt', async () => {
    const { result } = renderHook(() => useReceipts());
    
    act(() => {
      jest.advanceTimersByTime(500);
    });
    await waitFor(() => expect(result.current.loading).toBe(false));

    const initialCount = result.current.receipts.length;
    const idToDelete = result.current.receipts[0].id;

    act(() => {
      result.current.deleteReceipt(idToDelete);
    });

    expect(result.current.receipts.length).toBe(initialCount - 1);
    expect(result.current.receipts.find(r => r.id === idToDelete)).toBeUndefined();
  });

  it('should update a receipt', async () => {
    const { result } = renderHook(() => useReceipts());
    
    act(() => {
      jest.advanceTimersByTime(500);
    });
    await waitFor(() => expect(result.current.loading).toBe(false));

    const idToUpdate = result.current.receipts[0].id;
    const newStoreName = 'Updated Store Name';

    act(() => {
      result.current.updateReceipt(idToUpdate, { storeName: newStoreName });
    });

    const updatedReceipt = result.current.receipts.find(r => r.id === idToUpdate);
    expect(updatedReceipt?.storeName).toBe(newStoreName);
  });
});
