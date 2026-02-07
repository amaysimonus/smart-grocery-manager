import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Chip,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  LinearProgress,
  Divider,
  Tooltip,
  Fab,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Warning,
  TrendingUp,
  AccountBalanceWallet,
  Settings,
  CheckCircle,
  Error,
} from '@mui/icons-material';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from 'recharts';
import { format, addMonths, startOfMonth, endOfMonth } from 'date-fns';
import { useI18n } from '../contexts/I18nContext';
import { budgetApi, receiptApi } from '../services';
import type { Budget, CreateBudgetRequest, UpdateBudgetRequest } from '../types';

interface BudgetWithProgress extends Budget {
  spent: number;
  remaining: number;
  percentage: number;
  status: 'healthy' | 'warning' | 'critical' | 'exceeded';
  trend?: number; // percentage change from previous period
}

const BudgetDashboard: React.FC = () => {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [budgets, setBudgets] = useState<BudgetWithProgress[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<BudgetWithProgress | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [budgetToDelete, setBudgetToDelete] = useState<string | null>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);

  const [formData, setFormData] = useState<CreateBudgetRequest>({
    category: '',
    amount: 0,
    period: 'monthly',
    startDate: format(new Date(), 'yyyy-MM-dd'),
  });

  const categories = [
    '蔬菜', '水果', '肉類', '海鮮', '調味料', '乾貨', '雜貨', '外出用餐', '交通', '其他'
  ];

  const periods = [
    { value: 'weekly', label: '每週' },
    { value: 'monthly', label: '每月' },
    { value: 'yearly', label: '每年' },
  ];

  useEffect(() => {
    fetchBudgets();
    fetchAnalytics();
  }, []);

  const fetchBudgets = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [budgetsResponse, receiptsResponse] = await Promise.all([
        budgetApi.getBudgets(),
        receiptApi.getReceipts({ limit: 1000 })
      ]);

      const budgets = budgetsResponse.budgets;
      const receipts = receiptsResponse.receipts;
      
      const budgetsWithProgress = await Promise.all(
        budgets.map(async (budget) => {
          const spent = receipts
            .filter(r => new Date(r.purchaseDate) >= new Date(budget.startDate) && 
                        (!budget.endDate || new Date(r.purchaseDate) <= new Date(budget.endDate)))
            .reduce((sum, receipt) => {
              return sum + receipt.items
                .filter(item => item.category === budget.category)
                .reduce((itemSum, item) => itemSum + item.totalPrice, 0);
            }, 0);

          const remaining = budget.amount - spent;
          const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
          
          let status: BudgetWithProgress['status'] = 'healthy';
          if (percentage >= 100) status = 'exceeded';
          else if (percentage >= 90) status = 'critical';
          else if (percentage >= 75) status = 'warning';

          return {
            ...budget,
            spent,
            remaining,
            percentage,
            status,
          };
        })
      );

      setBudgets(budgetsWithProgress);
    } catch (err) {
      console.error('Failed to fetch budgets:', err);
      setError('載入預算失敗');
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await receiptApi.getReceiptStats({
        groupBy: 'category',
        startDate: startOfMonth(new Date()).toISOString(),
        endDate: endOfMonth(new Date()).toISOString(),
      });
      
      setAnalyticsData(response);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    }
  };

  const handleCreateBudget = () => {
    setEditingBudget(null);
    setFormData({
      category: '',
      amount: 0,
      period: 'monthly',
      startDate: format(new Date(), 'yyyy-MM-dd'),
    });
    setDialogOpen(true);
  };

  const handleEditBudget = (budget: BudgetWithProgress) => {
    setEditingBudget(budget);
    setFormData({
      category: budget.category,
      amount: budget.amount,
      period: budget.period,
      startDate: budget.startDate,
      endDate: budget.endDate,
    });
    setDialogOpen(true);
  };

  const handleSaveBudget = async () => {
    try {
      if (editingBudget) {
        await budgetApi.updateBudget(editingBudget.id, formData as UpdateBudgetRequest);
      } else {
        await budgetApi.createBudget(formData);
      }
      
      setDialogOpen(false);
      fetchBudgets();
    } catch (err) {
      console.error('Failed to save budget:', err);
      setError('保存預算失敗');
    }
  };

  const handleDeleteBudget = (budgetId: string) => {
    setBudgetToDelete(budgetId);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteBudget = async () => {
    if (budgetToDelete) {
      try {
        await budgetApi.deleteBudget(budgetToDelete);
        setDeleteDialogOpen(false);
        fetchBudgets();
      } catch (err) {
        console.error('Failed to delete budget:', err);
        setError('刪除預算失敗');
      }
    }
  };

  const getStatusColor = (status: BudgetWithProgress['status']) => {
    switch (status) {
      case 'healthy': return 'success';
      case 'warning': return 'warning';
      case 'critical': return 'error';
      case 'exceeded': return 'error';
      default: return 'primary';
    }
  };

  const getStatusIcon = (status: BudgetWithProgress['status']) => {
    switch (status) {
      case 'healthy': return <CheckCircle color="success" />;
      case 'warning': return <Warning color="warning" />;
      case 'critical': return <Error color="error" />;
      case 'exceeded': return <Error color="error" />;
      default: return <CheckCircle />;
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  const totalBudgeted = budgets.reduce((sum, budget) => sum + budget.amount, 0);
  const totalSpent = budgets.reduce((sum, budget) => sum + budget.spent, 0);
  const totalRemaining = totalBudgeted - totalSpent;
  const overallPercentage = totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0;

  return (
    <Box p={3}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">
          <AccountBalanceWallet sx={{ mr: 1, verticalAlign: 'middle' }} />
          預算管理
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleCreateBudget}
        >
          新增預算
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Summary Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    總預算
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    HK${totalBudgeted.toFixed(2)}
                  </Typography>
                </Box>
                <AccountBalanceWallet color="primary" fontSize="large" />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    已支出
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    HK${totalSpent.toFixed(2)}
                  </Typography>
                </Box>
                <TrendingUp color="info" fontSize="large" />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    剩餘預算
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    HK${totalRemaining.toFixed(2)}
                  </Typography>
                </Box>
                {getStatusIcon(
                  overallPercentage >= 100 ? 'exceeded' : 
                  overallPercentage >= 90 ? 'critical' : 
                  overallPercentage >= 75 ? 'warning' : 'healthy'
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    使用率
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {overallPercentage.toFixed(1)}%
                  </Typography>
                </Box>
                <Settings color="warning" fontSize="large" />
              </Box>
              <LinearProgress
                variant="determinate"
                value={Math.min(overallPercentage, 100)}
                color={overallPercentage >= 90 ? 'error' : overallPercentage >= 75 ? 'warning' : 'primary'}
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Budget List */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                預算列表
              </Typography>
              <List>
                {budgets.length === 0 ? (
                  <ListItem>
                    <ListItemText
                      primary="還沒有設定預算"
                      secondary="點擊「新增預算」開始管理您的支出"
                    />
                  </ListItem>
                ) : (
                  budgets.map((budget) => (
                    <Box key={budget.id}>
                      <ListItem>
                        <ListItemText
                          primary={
                            <Box display="flex" alignItems="center" justifyContent="space-between">
                              <Typography variant="subtitle1" fontWeight="bold">
                                {budget.category}
                              </Typography>
                              <Chip
                                label={periods.find(p => p.value === budget.period)?.label}
                                size="small"
                                variant="outlined"
                              />
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Box display="flex" justifyContent="space-between" mb={1}>
                                <Typography variant="body2" color="textSecondary">
                                  HK${budget.spent.toFixed(2)} / HK${budget.amount.toFixed(2)}
                                </Typography>
                                <Typography variant="body2" color={budget.status === 'exceeded' ? 'error' : 'textSecondary'}>
                                  {budget.percentage.toFixed(1)}% 已使用
                                </Typography>
                              </Box>
                              <LinearProgress
                                variant="determinate"
                                value={Math.min(budget.percentage, 100)}
                                color={getStatusColor(budget.status) as any}
                                sx={{ height: 6, borderRadius: 3 }}
                              />
                            </Box>
                          }
                        />
                        <ListItemSecondaryAction>
                          <Box display="flex" gap={1}>
                            <IconButton
                              edge="end"
                              onClick={() => handleEditBudget(budget)}
                              size="small"
                            >
                              <Edit />
                            </IconButton>
                            <IconButton
                              edge="end"
                              onClick={() => handleDeleteBudget(budget.id)}
                              size="small"
                              color="error"
                            >
                              <Delete />
                            </IconButton>
                          </Box>
                        </ListItemSecondaryAction>
                      </ListItem>
                      <Divider />
                    </Box>
                  ))
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Charts */}
        <Grid item xs={12} md={4}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                預算使用分佈
              </Typography>
              {budgets.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={budgets.map(budget => ({
                        name: budget.category,
                        value: budget.spent,
                        budget: budget.amount,
                      }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: HK${value.toFixed(0)}`}
                      outerRadius={70}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {budgets.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`HK${Number(value).toFixed(2)`, '支出']} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Box height={200} display="flex" alignItems="center" justifyContent="center">
                  <Typography color="textSecondary">
                    暫無數據
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Budget Status Summary */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                狀態摘要
              </Typography>
              <Box>
                {['healthy', 'warning', 'critical', 'exceeded'].map((status) => {
                  const count = budgets.filter(b => b.status === status).length;
                  if (count === 0) return null;
                  
                  return (
                    <Box key={status} display="flex" justifyContent="space-between" mb={1}>
                      <Box display="flex" alignItems="center" gap={1}>
                        {getStatusIcon(status as BudgetWithProgress['status'])}
                        <Typography variant="body2">
                          {status === 'healthy' && '正常'}
                          {status === 'warning' && '警告'}
                          {status === 'critical' && '危急'}
                          {status === 'exceeded' && '超支'}
                        </Typography>
                      </Box>
                      <Typography variant="body2" fontWeight="bold">
                        {count}
                      </Typography>
                    </Box>
                  );
                })}
                {budgets.length === 0 && (
                  <Typography color="textSecondary" textAlign="center">
                    設定預算後查看狀態
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="add budget"
        onClick={handleCreateBudget}
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
        }}
      >
        <Add />
      </Fab>

      {/* Create/Edit Budget Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingBudget ? '編輯預算' : '新增預算'}
        </DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={3} pt={1}>
            <FormControl fullWidth required>
              <InputLabel>類別</InputLabel>
              <Select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                {categories.map((category) => (
                  <MenuItem key={category} value={category}>
                    {category}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <TextField
              fullWidth
              label="預算金額"
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
              inputProps={{ min: 0, step: 0.01 }}
              required
            />
            
            <FormControl fullWidth required>
              <InputLabel>週期</InputLabel>
              <Select
                value={formData.period}
                onChange={(e) => setFormData({ ...formData, period: e.target.value as any })}
              >
                {periods.map((period) => (
                  <MenuItem key={period.value} value={period.value}>
                    {period.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <TextField
              fullWidth
              label="開始日期"
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
              required
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>
            取消
          </Button>
          <Button onClick={handleSaveBudget} variant="contained">
            {editingBudget ? '更新' : '創建'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>確認刪除</DialogTitle>
        <DialogContent>
          <Typography>
            確定要刪除此預算嗎？此操作無法撤銷。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            取消
          </Button>
          <Button onClick={confirmDeleteBudget} color="error" variant="contained">
            刪除
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BudgetDashboard;