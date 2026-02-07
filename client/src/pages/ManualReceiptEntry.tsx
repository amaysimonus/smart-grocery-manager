import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Stepper,
  Step,
  StepLabel,
  Alert,
  Divider,
} from '@mui/material';
import {
  Add,
  Remove,
  Delete,
  Save,
  ArrowBack,
  PhotoCamera,
  Restaurant,
  ShoppingCart,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
// Date imports will be added later
import { useI18n } from '../contexts/I18nContext';
import { receiptApi } from '../services';

interface ReceiptItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  category: string;
  isWeighted: boolean;
  weight?: number;
  unit?: string;
}

interface ManualEntryForm {
  storeName: string;
  purchaseDate: Date | null;
  paymentMethod: string;
  totalAmount: number;
  items: ReceiptItem[];
  notes?: string;
}

const ManualReceiptEntry: React.FC = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState<ManualEntryForm>({
    storeName: '',
    purchaseDate: new Date(),
    paymentMethod: 'cash',
    totalAmount: 0,
    items: [],
    notes: '',
  });

  const categories = [
    '蔬菜',
    '水果',
    '肉類',
    '海鮮',
    '調味料',
    '乾貨',
    '雜貨',
    '其他'
  ];

  const paymentMethods = [
    { value: 'cash', label: '現金' },
    { value: 'octopus', label: '八達通' },
    { value: 'credit', label: '信用卡' },
    { value: 'wechat', label: '微信支付' },
    { value: 'alipay', label: '支付寶' },
  ];

  const steps = ['基本資料', '添加項目', '確認總額'];

  const handleAddItem = () => {
    const newItem: ReceiptItem = {
      id: Date.now().toString(),
      name: '',
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
      category: categories[0],
      isWeighted: false,
      unit: '件',
    };
    
    setFormData({
      ...formData,
      items: [...formData.items, newItem],
    });
  };

  const handleUpdateItem = (itemId: string, field: keyof ReceiptItem, value: any) => {
    const updatedItems = formData.items.map(item => {
      if (item.id === itemId) {
        const updatedItem = { ...item, [field]: value };
        
        // Recalculate total price when quantity or unit price changes
        if (field === 'quantity' || field === 'unitPrice') {
          updatedItem.totalPrice = updatedItem.quantity * updatedItem.unitPrice;
        }
        
        return updatedItem;
      }
      return item;
    });

    const newTotalAmount = updatedItems.reduce((sum, item) => sum + item.totalPrice, 0);
    
    setFormData({
      ...formData,
      items: updatedItems,
      totalAmount: newTotalAmount,
    });
  };

  const handleRemoveItem = (itemId: string) => {
    const updatedItems = formData.items.filter(item => item.id !== itemId);
    const newTotalAmount = updatedItems.reduce((sum, item) => sum + item.totalPrice, 0);
    
    setFormData({
      ...formData,
      items: updatedItems,
      totalAmount: newTotalAmount,
    });
  };

  const handleNext = () => {
    if (activeStep === 0 && (!formData.storeName || !formData.purchaseDate)) {
      setError('請填寫店舖名稱和購買日期');
      return;
    }
    
    if (activeStep === 1 && formData.items.length === 0) {
      setError('請至少添加一個項目');
      return;
    }

    setError(null);
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
    setError(null);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      const receiptData = {
        merchant: {
          name: formData.storeName,
        },
        purchaseDate: formData.purchaseDate?.toISOString(),
        items: formData.items,
        totalAmount: formData.totalAmount,
        currency: 'HKD',
        category: 'wet_market',
        paymentMethod: formData.paymentMethod,
        hasLuckyDraw: false,
        receiptType: 'paper' as const,
        manualEntry: true,
      };

      await receiptApi.createReceipt(receiptData);
      setSuccess(true);
      
      setTimeout(() => {
        navigate('/receipts');
      }, 2000);
    } catch (err) {
      console.error('Failed to save receipt:', err);
      setError('保存收據失敗，請重試');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="店舖名稱"
                value={formData.storeName}
                onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>支付方式</InputLabel>
                <Select
                  value={formData.paymentMethod}
                  onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                >
                  {paymentMethods.map((method) => (
                    <MenuItem key={method.value} value={method.value}>
                      {method.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="購買日期"
                type="date"
                value={formData.purchaseDate ? formData.purchaseDate.toISOString().split('T')[0] : ''}
                onChange={(e) => setFormData({ ...formData, purchaseDate: new Date(e.target.value) })}
                InputLabelProps={{
                  shrink: true,
                }}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="備註"
                multiline
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </Grid>
          </Grid>
        );

      case 1:
        return (
          <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">
                購買項目
              </Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={handleAddItem}
              >
                添加項目
              </Button>
            </Box>

            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>項目名稱</TableCell>
                    <TableCell>類別</TableCell>
                    <TableCell align="right">數量</TableCell>
                    <TableCell align="right">單價</TableCell>
                    <TableCell align="right">總價</TableCell>
                    <TableCell align="center">操作</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {formData.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <TextField
                          size="small"
                          value={item.name}
                          onChange={(e) => handleUpdateItem(item.id, 'name', e.target.value)}
                          placeholder="輸入項目名稱"
                          fullWidth
                        />
                      </TableCell>
                      <TableCell>
                        <FormControl size="small" fullWidth>
                          <Select
                            value={item.category}
                            onChange={(e) => handleUpdateItem(item.id, 'category', e.target.value)}
                          >
                            {categories.map((category) => (
                              <MenuItem key={category} value={category}>
                                {category}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          type="number"
                          size="small"
                          value={item.quantity}
                          onChange={(e) => handleUpdateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                          inputProps={{ min: 0, step: 0.01 }}
                          sx={{ width: 80 }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          type="number"
                          size="small"
                          value={item.unitPrice}
                          onChange={(e) => handleUpdateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                          inputProps={{ min: 0, step: 0.01 }}
                          sx={{ width: 100 }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="bold">
                          HK${item.totalPrice.toFixed(2)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          color="error"
                          onClick={() => handleRemoveItem(item.id)}
                          size="small"
                        >
                          <Delete />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  {formData.items.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                        <Typography color="textSecondary">
                          還沒有添加任何項目，點擊上方按鈕開始添加
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <Box mt={2} textAlign="right">
              <Typography variant="h6">
                小計: HK${formData.totalAmount.toFixed(2)}
              </Typography>
            </Box>
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              確認收據資訊
            </Typography>
            
            <Card variant="outlined" sx={{ mb: 3 }}>
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="textSecondary">
                      店舖名稱
                    </Typography>
                    <Typography variant="body1">
                      {formData.storeName}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="textSecondary">
                      購買日期
                    </Typography>
                    <Typography variant="body1">
                      {formData.purchaseDate?.toLocaleDateString('zh-HK')}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="textSecondary">
                      支付方式
                    </Typography>
                    <Typography variant="body1">
                      {paymentMethods.find(m => m.value === formData.paymentMethod)?.label}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="textSecondary">
                      項目數量
                    </Typography>
                    <Typography variant="body1">
                      {formData.items.length} 項
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            <Typography variant="h6" gutterBottom>
              項目明細
            </Typography>
            
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>項目</TableCell>
                    <TableCell>類別</TableCell>
                    <TableCell align="right">數量</TableCell>
                    <TableCell align="right">單價</TableCell>
                    <TableCell align="right">總價</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {formData.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>
                        <Chip label={item.category} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell align="right">{item.quantity}</TableCell>
                      <TableCell align="right">HK${item.unitPrice.toFixed(2)}</TableCell>
                      <TableCell align="right">HK${item.totalPrice.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Box mt={3} textAlign="right">
              <Typography variant="h5" color="primary" fontWeight="bold">
                總計: HK${formData.totalAmount.toFixed(2)}
              </Typography>
            </Box>

            {formData.notes && (
              <Box mt={2}>
                <Typography variant="subtitle2" color="textSecondary">
                  備註
                </Typography>
                <Typography variant="body2">
                  {formData.notes}
                </Typography>
              </Box>
            )}
          </Box>
        );

      default:
        return null;
    }
  };

  if (success) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <Card sx={{ maxWidth: 400, textAlign: 'center', p: 3 }}>
          <CardContent>
            <Typography variant="h5" color="success.main" gutterBottom>
              ✓ 保存成功！
            </Typography>
            <Typography variant="body2" color="textSecondary">
              收據已成功保存，正在跳轉到收據列表...
            </Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Box display="flex" alignItems="center" mb={3}>
        <IconButton onClick={() => navigate('/receipts')} sx={{ mr: 1 }}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h4" fontWeight="bold">
          <ShoppingCart sx={{ mr: 1, verticalAlign: 'middle' }} />
          手動輸入收據
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Card>
        <CardContent>
          {renderStepContent(activeStep)}
        </CardContent>
      </Card>

      <Box display="flex" justifyContent="space-between" mt={3}>
        <Button
          disabled={activeStep === 0}
          onClick={handleBack}
          startIcon={<ArrowBack />}
        >
          上一步
        </Button>
        
        {activeStep === steps.length - 1 ? (
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={loading}
            startIcon={loading ? <div className="spinner" /> : <Save />}
          >
            {loading ? '保存中...' : '保存收據'}
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={handleNext}
            endIcon={<Add />}
          >
            下一步
          </Button>
        )}
      </Box>
    </Box>
  );
};

export default ManualReceiptEntry;