import React from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Chip,
  SelectChangeEvent,
} from '@mui/material';
import { ReceiptFilters as FilterType } from '../types';

interface ReceiptFiltersProps {
  filters: FilterType;
  onFilterChange: (filters: FilterType) => void;
}

const STATUS_OPTIONS = ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'];

const ReceiptFilters: React.FC<ReceiptFiltersProps> = ({ filters, onFilterChange }) => {
  const handleStatusChange = (event: SelectChangeEvent<string[]>) => {
    const {
      target: { value },
    } = event;
    onFilterChange({
      ...filters,
      status: typeof value === 'string' ? value.split(',') : value,
    });
  };

  const handleChange = (field: keyof FilterType, value: string | string[]) => {
    onFilterChange({
      ...filters,
      [field]: value,
    });
  };

  return (
    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
      <TextField
        label="Store Name"
        variant="outlined"
        size="small"
        value={filters.storeName || ''}
        onChange={(e) => handleChange('storeName', e.target.value)}
      />
      
      <FormControl sx={{ minWidth: 200 }} size="small">
        <InputLabel id="status-filter-label">Status</InputLabel>
        <Select
          labelId="status-filter-label"
          multiple
          value={filters.status}
          onChange={handleStatusChange}
          input={<OutlinedInput id="select-multiple-chip" label="Status" />}
          renderValue={(selected) => (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {selected.map((value) => (
                <Chip key={value} label={value} size="small" />
              ))}
            </Box>
          )}
        >
          {STATUS_OPTIONS.map((status) => (
            <MenuItem key={status} value={status}>
              {status}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Add Date Range Pickers if needed, keeping simple for now */}
    </Box>
  );
};

export default ReceiptFilters;
