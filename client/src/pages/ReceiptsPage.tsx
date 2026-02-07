import React, { useState, useMemo } from 'react';
import { Container, Typography, Box, Grid, Paper, CircularProgress, Alert } from '@mui/material';
import { ReceiptFilters as FilterType, Receipt } from '../types';
import { useReceipts, calculateStats } from '../hooks/useReceipts';
import ReceiptList from '../components/ReceiptList';
import ReceiptFilters from '../components/ReceiptFilters';

const ReceiptsPage: React.FC = () => {
  const { receipts, loading, error, calculateStats, deleteReceipt, updateReceipt } = useReceipts();
  
  const [filters, setFilters] = useState<FilterType>({
    status: [], // Empty array means all
    storeName: '',
  });

  const filteredReceipts = useMemo(() => {
    return receipts.filter((receipt) => {
      // Filter by Store Name
      if (filters.storeName && !receipt.storeName.toLowerCase().includes(filters.storeName.toLowerCase())) {
        return false;
      }
      
      // Filter by Status (Multi-select)
      if (filters.status && filters.status.length > 0) {
        if (!filters.status.includes(receipt.status)) {
          return false;
        }
      }

      // Add other filters here (date, amount) if needed

      return true;
    });
  }, [receipts, filters]);

  const stats = useMemo(() => calculateStats(filteredReceipts), [filteredReceipts]);

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this receipt?')) {
      deleteReceipt(id);
    }
  };

  const handleEdit = (receipt: Receipt) => {
    // TODO: Replace with Material-UI Dialog for better UX
    const newStoreName = window.prompt('Enter new store name:', receipt.storeName);
    if (newStoreName && newStoreName !== receipt.storeName) {
      updateReceipt(receipt.id, { storeName: newStoreName });
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Receipts Manager
      </Typography>

      {/* Summary Statistics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography color="textSecondary">Total Count</Typography>
            <Typography variant="h4">{stats.totalCount}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography color="textSecondary">Total Amount</Typography>
            <Typography variant="h4">${stats.totalAmount.toFixed(2)}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography color="textSecondary">Average Amount</Typography>
            <Typography variant="h4">${stats.averageAmount.toFixed(2)}</Typography>
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ p: 2, mb: 2 }}>
        <ReceiptFilters filters={filters} onFilterChange={setFilters} />
      </Paper>

      <ReceiptList 
        receipts={filteredReceipts} 
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </Container>
  );
};

export default ReceiptsPage;
