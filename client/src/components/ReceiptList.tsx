import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardActions,
  Typography,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  Chip,
  Button
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  ViewList as ListIcon,
  GridView as GridIcon,
} from '@mui/icons-material';
import { Receipt } from '../types';
import { useAuth } from '../context/AuthContext';

interface ReceiptListProps {
  receipts: Receipt[];
  onEdit?: (receipt: Receipt) => void;
  onDelete?: (id: string) => void;
}

const ReceiptList: React.FC<ReceiptListProps> = ({ receipts, onEdit, onDelete }) => {
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const { user } = useAuth();

  const canEdit = user?.role === 'ADMIN' || user?.role === 'FAMILY';

  const handleViewChange = (
    event: React.MouseEvent<HTMLElement>,
    newView: 'list' | 'grid' | null,
  ) => {
    if (newView !== null) {
      setViewMode(newView);
    }
  };

  const getStatusColor = (status: string): 'success' | 'info' | 'error' | 'default' => {
    switch (status) {
      case 'COMPLETED': return 'success';
      case 'PROCESSING': return 'info';
      case 'FAILED': return 'error';
      default: return 'default';
    }
  };

  if (receipts.length === 0) {
    return <Typography sx={{ mt: 4, textAlign: 'center' }}>No receipts found.</Typography>;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={handleViewChange}
          aria-label="view mode"
        >
          <ToggleButton value="list" aria-label="list view">
            <ListIcon />
          </ToggleButton>
          <ToggleButton value="grid" aria-label="grid view">
            <GridIcon />
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {viewMode === 'list' ? (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Store</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Status</TableCell>
                {canEdit && <TableCell align="right">Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {receipts.map((receipt) => (
                <TableRow key={receipt.id}>
                  <TableCell>{new Date(receipt.purchaseDate).toLocaleDateString()}</TableCell>
                  <TableCell>{receipt.storeName}</TableCell>
                  <TableCell>${receipt.totalAmount.toFixed(2)}</TableCell>
                  <TableCell>
                    <Chip 
                      label={receipt.status} 
                      color={getStatusColor(receipt.status)} 
                      size="small" 
                    />
                  </TableCell>
                  {canEdit && (
                    <TableCell align="right">
                      <IconButton 
                        size="small" 
                        color="primary" 
                        onClick={() => onEdit && onEdit(receipt)}
                        aria-label="edit"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        color="error" 
                        onClick={() => onDelete && onDelete(receipt.id)}
                        aria-label="delete"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Grid container spacing={2}>
          {receipts.map((receipt) => (
            <Grid item xs={12} sm={6} md={4} key={receipt.id}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {receipt.storeName}
                  </Typography>
                  <Typography color="textSecondary" gutterBottom>
                    {new Date(receipt.purchaseDate).toLocaleDateString()}
                  </Typography>
                  <Typography variant="h5">
                    ${receipt.totalAmount.toFixed(2)}
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    <Chip 
                      label={receipt.status} 
                      color={getStatusColor(receipt.status)} 
                      size="small" 
                    />
                  </Box>
                </CardContent>
                {canEdit && (
                  <CardActions sx={{ justifyContent: 'flex-end' }}>
                    <Button 
                      size="small" 
                      startIcon={<EditIcon />} 
                      onClick={() => onEdit && onEdit(receipt)}
                    >
                      Edit
                    </Button>
                    <Button 
                      size="small" 
                      color="error" 
                      startIcon={<DeleteIcon />} 
                      onClick={() => onDelete && onDelete(receipt.id)}
                    >
                      Delete
                    </Button>
                  </CardActions>
                )}
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default ReceiptList;
