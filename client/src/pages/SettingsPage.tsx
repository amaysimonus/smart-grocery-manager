import React, { useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Switch,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';

const SettingsPage: React.FC = () => {
  const { t, i18n } = useI18n();
  const { user } = useAuth();
  
  const [settings, setSettings] = useState({
    language: user?.preferences?.language || 'en',
    theme: user?.preferences?.theme || 'light',
    currency: user?.preferences?.currency || 'HKD',
    notifications: {
      email: true,
      push: false,
      budgetAlerts: true,
    },
    privacy: {
      shareData: false,
      analytics: true,
    },
  });

  const handleLanguageChange = (language: 'en' | 'zh') => {
    setSettings({ ...settings, language });
    i18n.changeLanguage(language);
  };

  const handleThemeChange = (theme: 'light' | 'dark' | 'auto') => {
    setSettings({ ...settings, theme });
  };

  const handleSave = () => {
    // TODO: Save settings to backend
    console.log('Saving settings:', settings);
  };

  return (
    <Container maxWidth="md">
      <Box py={4}>
        <Typography variant="h4" gutterBottom>
          {t('settings.title')}
        </Typography>

        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            {t('settings.language')}
          </Typography>
          <FormControl component="fieldset">
            <RadioGroup
              row
              value={settings.language}
              onChange={(e) => handleLanguageChange(e.target.value as 'en' | 'zh')}
            >
              <FormControlLabel value="en" control={<Radio />} label="English" />
              <FormControlLabel value="zh" control={<Radio />} label="中文" />
            </RadioGroup>
          </FormControl>
        </Paper>

        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            {t('settings.theme')}
          </Typography>
          <FormControl component="fieldset">
            <RadioGroup
              row
              value={settings.theme}
              onChange={(e) => handleThemeChange(e.target.value as 'light' | 'dark' | 'auto')}
            >
              <FormControlLabel value="light" control={<Radio />} label="Light" />
              <FormControlLabel value="dark" control={<Radio />} label="Dark" />
              <FormControlLabel value="auto" control={<Radio />} label="Auto" />
            </RadioGroup>
          </FormControl>
        </Paper>

        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            {t('settings.currency')}
          </Typography>
          <FormControl component="fieldset">
            <RadioGroup
              row
              value={settings.currency}
              onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
            >
              <FormControlLabel value="HKD" control={<Radio />} label="HKD" />
              <FormControlLabel value="USD" control={<Radio />} label="USD" />
              <FormControlLabel value="CNY" control={<Radio />} label="CNY" />
            </RadioGroup>
          </FormControl>
        </Paper>

        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            {t('settings.notifications')}
          </Typography>
          <List>
            <ListItem>
              <ListItemText primary="Email Notifications" />
              <ListItemSecondaryAction>
                <Switch
                  checked={settings.notifications.email}
                  onChange={(e) => setSettings({
                    ...settings,
                    notifications: { ...settings.notifications, email: e.target.checked }
                  })}
                />
              </ListItemSecondaryAction>
            </ListItem>
            <ListItem>
              <ListItemText primary="Push Notifications" />
              <ListItemSecondaryAction>
                <Switch
                  checked={settings.notifications.push}
                  onChange={(e) => setSettings({
                    ...settings,
                    notifications: { ...settings.notifications, push: e.target.checked }
                  })}
                />
              </ListItemSecondaryAction>
            </ListItem>
            <ListItem>
              <ListItemText primary="Budget Alerts" />
              <ListItemSecondaryAction>
                <Switch
                  checked={settings.notifications.budgetAlerts}
                  onChange={(e) => setSettings({
                    ...settings,
                    notifications: { ...settings.notifications, budgetAlerts: e.target.checked }
                  })}
                />
              </ListItemSecondaryAction>
            </ListItem>
          </List>
        </Paper>

        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            {t('settings.privacy')}
          </Typography>
          <List>
            <ListItem>
              <ListItemText 
                primary="Share Anonymous Data" 
                secondary="Help improve our service by sharing anonymous usage data"
              />
              <ListItemSecondaryAction>
                <Switch
                  checked={settings.privacy.shareData}
                  onChange={(e) => setSettings({
                    ...settings,
                    privacy: { ...settings.privacy, shareData: e.target.checked }
                  })}
                />
              </ListItemSecondaryAction>
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="Analytics" 
                secondary="Allow us to track your interactions for better user experience"
              />
              <ListItemSecondaryAction>
                <Switch
                  checked={settings.privacy.analytics}
                  onChange={(e) => setSettings({
                    ...settings,
                    privacy: { ...settings.privacy, analytics: e.target.checked }
                  })}
                />
              </ListItemSecondaryAction>
            </ListItem>
          </List>
        </Paper>

        <Box display="flex" gap={2}>
          <Button
            variant="contained"
            onClick={handleSave}
            size="large"
          >
            {t('common.save')}
          </Button>
          <Button
            variant="outlined"
            size="large"
          >
            {t('common.cancel')}
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default SettingsPage;