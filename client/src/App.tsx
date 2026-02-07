import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { I18nProvider } from './contexts/I18nContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import ReceiptsPage from './pages/ReceiptsPage';
import Dashboard from './pages/Dashboard';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import ManualReceiptEntry from './pages/ManualReceiptEntry';
import BudgetDashboard from './pages/BudgetDashboard';
import NotificationCenter from './pages/NotificationCenter';
import PrivateRoute from './components/PrivateRoute';
import SettingsPage from './pages/SettingsPage';
import ProfilePage from './pages/ProfilePage';
import NotFoundPage from './pages/NotFoundPage';

const AppRoutes: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        Loading...
      </Box>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={
        <PrivateRoute>
          <Layout>
            <Dashboard />
          </Layout>
        </PrivateRoute>
      } />
      <Route path="/receipts" element={
        <PrivateRoute>
          <Layout>
            <ReceiptsPage />
          </Layout>
        </PrivateRoute>
      } />
      <Route path="/analytics" element={
        <PrivateRoute>
          <Layout>
            <AnalyticsDashboard />
          </Layout>
        </PrivateRoute>
      } />
      <Route path="/receipts/new" element={
        <PrivateRoute>
          <Layout>
            <ManualReceiptEntry />
          </Layout>
        </PrivateRoute>
      } />
      <Route path="/budget" element={
        <PrivateRoute>
          <Layout>
            <BudgetDashboard />
          </Layout>
        </PrivateRoute>
      } />
      <Route path="/settings" element={
        <PrivateRoute>
          <Layout>
            <SettingsPage />
          </Layout>
        </PrivateRoute>
      } />
      <Route path="/profile" element={
        <PrivateRoute>
          <Layout>
            <ProfilePage />
          </Layout>
        </PrivateRoute>
      } />
      <Route path="/notifications" element={
        <PrivateRoute>
          <Layout>
            <NotificationCenter />
          </Layout>
        </PrivateRoute>
      } />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <I18nProvider>
        <AuthProvider>
          <Router>
            <AppRoutes />
          </Router>
        </AuthProvider>
      </I18nProvider>
    </ThemeProvider>
  );
};

export default App;
