import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  CircularProgress,
} from '@mui/material';
import { 
  Dashboard as DashboardIcon,
  Receipt as ReceiptIcon,
  TrendingUp,
  Settings,
  AddCircle,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import { useAuth } from '../contexts/AuthContext';

const Dashboard: React.FC = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalReceipts: 0,
    totalSpending: 0,
    thisMonthSpending: 0,
    budgetUsed: 0,
  });
  const [recentReceipts, setRecentReceipts] = useState([]);

  useEffect(() => {
    // TODO: Fetch real dashboard data
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        // Mock data for now
        setTimeout(() => {
          setStats({
            totalReceipts: 42,
            totalSpending: 3847.50,
            thisMonthSpending: 892.30,
            budgetUsed: 67,
          });
          setRecentReceipts([
            {
              id: '1',
              storeName: 'Wellcome Supermarket',
              purchaseDate: '2024-01-15',
              totalAmount: 234.50,
            },
            {
              id: '2',
              storeName: 'ParknShop',
              purchaseDate: '2024-01-14',
              totalAmount: 156.80,
            },
            {
              id: '3',
              storeName: 'Market Place',
              purchaseDate: '2024-01-13',
              totalAmount: 89.90,
            },
          ]);
          setLoading(false);
        }, 1000);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Welcome Section */}
      <Box mb={4}>
        <Typography variant="h4" gutterBottom>
          {t('dashboard.title')}
        </Typography>
        <Typography variant="h6" color="textSecondary">
          {t('dashboard.welcome')} {user?.name || 'User'}!
        </Typography>
      </Box>

      {/* Quick Actions */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Button
            fullWidth
            variant="contained"
            size="large"
            startIcon={<AddCircle />}
            onClick={() => navigate('/receipts/new')}
            sx={{ height: '100%', py: 2 }}
          >
            {t('dashboard.addReceipt')}
          </Button>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Button
            fullWidth
            variant="outlined"
            size="large"
            startIcon={<TrendingUp />}
            onClick={() => navigate('/analytics')}
            sx={{ height: '100%', py: 2 }}
          >
            {t('dashboard.viewAnalytics')}
          </Button>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Button
            fullWidth
            variant="outlined"
            size="large"
            startIcon={<Settings />}
            onClick={() => navigate('/budget')}
            sx={{ height: '100%', py: 2 }}
          >
            {t('dashboard.manageBudgets')}
          </Button>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Button
            fullWidth
            variant="outlined"
            size="large"
            startIcon={<ReceiptIcon />}
            onClick={() => navigate('/receipts')}
            sx={{ height: '100%', py: 2 }}
          >
            View Receipts
          </Button>
        </Grid>
      </Grid>

      {/* Stats Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    {t('receipts.totalReceipts')}
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {stats.totalReceipts}
                  </Typography>
                </Box>
                <ReceiptIcon color="primary" fontSize="large" />
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
                    {t('analytics.totalSpending')}
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    HK${stats.totalSpending.toFixed(2)}
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
                    This Month
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    HK${stats.thisMonthSpending.toFixed(2)}
                  </Typography>
                </Box>
                <DashboardIcon color="info" fontSize="large" />
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
                    {t('analytics.budgetUsage')}
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {stats.budgetUsed}%
                  </Typography>
                </Box>
                <Chip
                  label={stats.budgetUsed > 80 ? 'High' : 'Normal'}
                  color={stats.budgetUsed > 80 ? 'warning' : 'success'}
                  size="small"
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Recent Receipts */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {t('dashboard.recentReceipts')}
              </Typography>
              <List>
                {recentReceipts.map((receipt: any) => (
                  <ListItem key={receipt.id} divider>
                    <ListItemText
                      primary={receipt.storeName}
                      secondary={new Date(receipt.purchaseDate).toLocaleDateString()}
                    />
                    <ListItemSecondaryAction>
                      <Typography variant="h6" color="primary">
                        HK${receipt.totalAmount.toFixed(2)}
                      </Typography>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
              <Box textAlign="center" mt={2}>
                <Button
                  variant="outlined"
                  onClick={() => navigate('/receipts')}
                >
                  View All Receipts
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Spending Overview */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {t('dashboard.spendingOverview')}
              </Typography>
              <Box mb={2}>
                <Typography variant="body2" color="textSecondary">
                  Top Category: Groceries
                </Typography>
                <Typography variant="h5" color="primary">
                  HK$1,234.50
                </Typography>
              </Box>
              <Box mb={2}>
                <Typography variant="body2" color="textSecondary">
                  Average Daily Spending
                </Typography>
                <Typography variant="h5" color="primary">
                  HK$28.90
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="textSecondary">
                  Budget Remaining
                </Typography>
                <Typography variant="h5" color="success">
                  HK$450.70
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;