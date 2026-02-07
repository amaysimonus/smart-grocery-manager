import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Chip,
  Tab,
  Tabs,
  IconButton,
  Menu,
  MenuList,
  MenuItem as MenuItemsItem,
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import { Download, TrendingUp, Calendar, Category, AttachMoney } from '@mui/icons-material';
import { format, subMonths } from 'date-fns';
import { receiptApi, budgetApi } from '../services';
import type { DetailedReceipt as Receipt, Budget } from '../types';
import { useI18n } from '../contexts/I18nContext';

interface AnalyticsData {
  totalSpending: number;
  totalReceipts: number;
  averagePerReceipt: number;
  monthlySpending: Array<{ month: string; amount: number; count: number }>;
  categorySpending: Array<{ category: string; amount: number; percentage: number }>;
  budgetUtilization: Array<{ category: string; budgeted: number; spent: number; percentage: number }>;
  dailySpending: Array<{ date: string; amount: number }>;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const AnalyticsDashboard: React.FC = () => {
  const { t, i18n } = useI18n();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [timeRange, setTimeRange] = useState('6months');
  const [tabValue, setTabValue] = useState(0);
  const [exportMenuAnchor, setExportMenuAnchor] = useState<null | HTMLElement>(null);

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const endDate = new Date();
      const startDate = getStartDate(timeRange);
      
      const [receiptsResponse, budgetsResponse] = await Promise.all([
        receiptApi.getReceipts({
          startDate: format(startDate, 'yyyy-MM-dd'),
          endDate: format(endDate, 'yyyy-MM-dd'),
          limit: 1000
        }),
        budgetApi.getBudgets({ active: true })
      ]);

      const receipts = receiptsResponse.data;
      const budgets = budgetsResponse.data;

      const analyticsData = processAnalyticsData(receipts, budgets);
      setData(analyticsData);
    } catch (err) {
      console.error('Failed to fetch analytics data:', err);
      setError(i18n.language === 'zh' ? '無法加載分析數據' : 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const getStartDate = (range: string): Date => {
    const endDate = new Date();
    switch (range) {
      case '1month':
        return subMonths(endDate, 1);
      case '3months':
        return subMonths(endDate, 3);
      case '6months':
        return subMonths(endDate, 6);
      case '1year':
        return subMonths(endDate, 12);
      default:
        return subMonths(endDate, 6);
    }
  };

  const processAnalyticsData = (receipts: Receipt[], budgets: Budget[]): AnalyticsData => {
    const totalSpending = receipts.reduce((sum, receipt) => sum + receipt.totalAmount, 0);
    const totalReceipts = receipts.length;
    const averagePerReceipt = totalReceipts > 0 ? totalSpending / totalReceipts : 0;

    // Monthly spending data
    const monthlyData = new Map<string, { amount: number; count: number }>();
    receipts.forEach(receipt => {
      const month = format(new Date(receipt.purchaseDate), 'yyyy-MM');
      const current = monthlyData.get(month) || { amount: 0, count: 0 };
      monthlyData.set(month, {
        amount: current.amount + receipt.totalAmount,
        count: current.count + 1
      });
    });

    const monthlySpending = Array.from(monthlyData.entries())
      .map(([month, data]) => ({
        month: format(new Date(month + '-01'), i18n.language === 'zh' ? 'yyyy年MM月' : 'MMM yyyy'),
        amount: data.amount,
        count: data.count
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Category spending data
    const categoryData = new Map<string, number>();
    receipts.forEach(receipt => {
      receipt.items.forEach(item => {
        const current = categoryData.get(item.category) || 0;
        categoryData.set(item.category, current + item.totalPrice);
      });
    });

    const categorySpending = Array.from(categoryData.entries())
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalSpending > 0 ? (amount / totalSpending) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6);

    // Budget utilization
    const budgetUtilization = budgets.map(budget => {
      const spent = receipts
        .filter(r => r.items.some(item => item.category === budget.category))
        .reduce((sum, receipt) => {
          return sum + receipt.items
            .filter(item => item.category === budget.category)
            .reduce((itemSum, item) => itemSum + item.totalPrice, 0);
        }, 0);

      return {
        category: budget.category,
        budgeted: budget.amount,
        spent,
        percentage: budget.amount > 0 ? (spent / budget.amount) * 100 : 0
      };
    });

    // Daily spending (last 30 days)
    const dailyData = new Map<string, number>();
    const thirtyDaysAgo = subMonths(new Date(), 1);
    
    receipts
      .filter(r => new Date(r.purchaseDate) >= thirtyDaysAgo)
      .forEach(receipt => {
        const date = format(new Date(receipt.purchaseDate), 'yyyy-MM-dd');
        const current = dailyData.get(date) || 0;
        dailyData.set(date, current + receipt.totalAmount);
      });

    const dailySpending = Array.from(dailyData.entries())
      .map(([date, amount]) => ({
        date: format(new Date(date), i18n.language === 'zh' ? 'MM/dd' : 'MMM dd'),
        amount
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalSpending,
      totalReceipts,
      averagePerReceipt,
      monthlySpending,
      categorySpending,
      budgetUtilization,
      dailySpending
    };
  };

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    // TODO: Implement export functionality
    console.log(`Exporting data as ${format}`);
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!data) return null;

  return (
    <Box p={3}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">
          {i18n.language === 'zh' ? '分析儀表板' : 'Analytics Dashboard'}
        </Typography>
        <Box display="flex" gap={2}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>{i18n.language === 'zh' ? '時間範圍' : 'Time Range'}</InputLabel>
            <Select
              value={timeRange}
              label={i18n.language === 'zh' ? '時間範圍' : 'Time Range'}
              onChange={(e) => setTimeRange(e.target.value)}
            >
              <MenuItem value="1month">
                {i18n.language === 'zh' ? '1個月' : '1 Month'}
              </MenuItem>
              <MenuItem value="3months">
                {i18n.language === 'zh' ? '3個月' : '3 Months'}
              </MenuItem>
              <MenuItem value="6months">
                {i18n.language === 'zh' ? '6個月' : '6 Months'}
              </MenuItem>
              <MenuItem value="1year">
                {i18n.language === 'zh' ? '1年' : '1 Year'}
              </MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={(e) => setExportMenuAnchor(e.currentTarget)}
          >
            {i18n.language === 'zh' ? '導出' : 'Export'}
          </Button>
          <Menu
            anchorEl={exportMenuAnchor}
            open={Boolean(exportMenuAnchor)}
            onClose={() => setExportMenuAnchor(null)}
          >
            <MenuList>
              <MenuItemsItem onClick={() => { handleExport('csv'); setExportMenuAnchor(null); }}>
                {i18n.language === 'zh' ? '導出為 CSV' : 'Export as CSV'}
              </MenuItemsItem>
              <MenuItemsItem onClick={() => { handleExport('pdf'); setExportMenuAnchor(null); }}>
                {i18n.language === 'zh' ? '導出為 PDF' : 'Export as PDF'}
              </MenuItemsItem>
              <MenuItemsItem onClick={() => { handleExport('excel'); setExportMenuAnchor(null); }}>
                {i18n.language === 'zh' ? '導出為 Excel' : 'Export as Excel'}
              </MenuItemsItem>
            </MenuList>
          </Menu>
        </Box>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    {i18n.language === 'zh' ? '總支出' : 'Total Spending'}
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    HK${data.totalSpending.toFixed(2)}
                  </Typography>
                </Box>
                <AttachMoney color="primary" fontSize="large" />
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
                    {i18n.language === 'zh' ? '收據數量' : 'Total Receipts'}
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {data.totalReceipts}
                  </Typography>
                </Box>
                <TrendingUp color="success" fontSize="large" />
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
                    {i18n.language === 'zh' ? '平均每張' : 'Average per Receipt'}
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    HK${data.averagePerReceipt.toFixed(2)}
                  </Typography>
                </Box>
                <Category color="info" fontSize="large" />
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
                    {i18n.language === 'zh' ? '預算使用率' : 'Budget Usage'}
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {data.budgetUtilization.length > 0
                      ? `${(data.budgetUtilization.reduce((sum, b) => sum + b.percentage, 0) / data.budgetUtilization.length).toFixed(1)}%`
                      : 'N/A'
                    }
                  </Typography>
                </Box>
                <Calendar color="warning" fontSize="large" />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Box mb={3}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="Analytics tabs">
          <Tab label={i18n.language === 'zh' ? '支出趨勢' : 'Spending Trends'} />
          <Tab label={i18n.language === 'zh' ? '類別分析' : 'Category Analysis'} />
          <Tab label={i18n.language === 'zh' ? '預算使用' : 'Budget Utilization'} />
          <Tab label={i18n.language === 'zh' ? '每日支出' : 'Daily Spending'} />
        </Tabs>
      </Box>

      {/* Tab Content */}
      {tabValue === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {i18n.language === 'zh' ? '每月支出趨勢' : 'Monthly Spending Trend'}
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={data.monthlySpending}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`HK$${Number(value).toFixed(2)}`, i18n.language === 'zh' ? '支出' : 'Spending']} />
                    <Area type="monotone" dataKey="amount" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {tabValue === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {i18n.language === 'zh' ? '類別支出分佈' : 'Spending by Category'}
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={data.categorySpending}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ category, percentage }) => `${category} ${percentage.toFixed(1)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="amount"
                    >
                      {data.categorySpending.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`HK$${Number(value).toFixed(2)}`, i18n.language === 'zh' ? '支出' : 'Spending']} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {i18n.language === 'zh' ? '類別排行榜' : 'Category Ranking'}
                </Typography>
                {data.categorySpending.map((category, index) => (
                  <Box key={category.category} mb={2}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="body2" fontWeight="medium">
                        {index + 1}. {category.category}
                      </Typography>
                      <Typography variant="body2" fontWeight="bold">
                        HK${category.amount.toFixed(2)}
                      </Typography>
                    </Box>
                    <Box width="100%" bgcolor="grey.200" borderRadius={1}>
                      <Box
                        width={`${category.percentage}%`}
                        bgcolor={COLORS[index % COLORS.length]}
                        height={8}
                        borderRadius={1}
                      />
                    </Box>
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {tabValue === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {i18n.language === 'zh' ? '預算使用情況' : 'Budget Utilization'}
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.budgetUtilization}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`HK$${Number(value).toFixed(2)}`, '']} />
                    <Legend />
                    <Bar dataKey="budgeted" fill="#8884d8" name={i18n.language === 'zh' ? '預算' : 'Budgeted'} />
                    <Bar dataKey="spent" fill="#82ca9d" name={i18n.language === 'zh' ? '已支出' : 'Spent'} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {i18n.language === 'zh' ? '預算警告' : 'Budget Alerts'}
                </Typography>
                {data.budgetUtilization
                  .filter(b => b.percentage > 80)
                  .map(budget => (
                    <Box key={budget.category} mb={2} p={2} bgcolor="warning.light" borderRadius={1}>
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" fontWeight="medium">
                          {budget.category}
                        </Typography>
                        <Chip
                          label={`${budget.percentage.toFixed(1)}%`}
                          color={budget.percentage >= 100 ? 'error' : 'warning'}
                          size="small"
                        />
                      </Box>
                      <Typography variant="caption" color="textSecondary">
                        {i18n.language === 'zh' ? '已使用' : 'Used'} HK${budget.spent.toFixed(2)} / HK${budget.budgeted.toFixed(2)}
                      </Typography>
                    </Box>
                  ))}
                {data.budgetUtilization.filter(b => b.percentage > 80).length === 0 && (
                  <Typography color="textSecondary" textAlign="center" py={2}>
                    {i18n.language === 'zh' ? '所有預算使用正常' : 'All budgets are within limits'}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {tabValue === 3 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {i18n.language === 'zh' ? '每日支出（最近30天）' : 'Daily Spending (Last 30 Days)'}
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={data.dailySpending}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`HK$${Number(value).toFixed(2)}`, i18n.language === 'zh' ? '支出' : 'Spending']} />
                    <Line type="monotone" dataKey="amount" stroke="#8884d8" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default AnalyticsDashboard;