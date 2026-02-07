import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Switch,
  Divider,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Notifications,
  Smartphone,
  Home,
  Warning,
  CheckCircle,
} from '@mui/icons-material';
import { useI18n } from '../contexts/I18nContext';

interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  budgetAlerts: boolean;
  weeklyReports: boolean;
  priceAlerts: boolean;
  smartHomeIntegration: boolean;
}

interface NotificationRule {
  id: string;
  type: 'budget' | 'price' | 'weekly';
  title: string;
  description: string;
  enabled: boolean;
  threshold?: number;
}

const NotificationCenter: React.FC = () => {
  const { t } = useI18n();
  const [settings, setSettings] = useState<NotificationSettings>({
    emailNotifications: true,
    pushNotifications: false,
    budgetAlerts: true,
    weeklyReports: true,
    priceAlerts: false,
    smartHomeIntegration: false,
  });

  const [notificationRules, setNotificationRules] = useState<NotificationRule[]>([
    {
      id: 'budget-80',
      type: 'budget',
      title: '預算警告 (80%)',
      description: '當預算使用達到80%時發送通知',
      enabled: true,
      threshold: 80,
    },
    {
      id: 'budget-95',
      type: 'budget',
      title: '預算危急 (95%)',
      description: '當預算使用達到95%時發送緊急通知',
      enabled: true,
      threshold: 95,
    },
    {
      id: 'budget-exceeded',
      type: 'budget',
      title: '預算超支',
      description: '當支出超過預算時立即通知',
      enabled: true,
    },
    {
      id: 'weekly-report',
      type: 'weekly',
      title: '週報告',
      description: '每週一發送上週支出總結',
      enabled: true,
    },
    {
      id: 'price-drop',
      type: 'price',
      title: '價格提醒',
      description: '常用商品價格下降時通知',
      enabled: false,
    },
  ]);

  const [smartHomeDevices, setSmartHomeDevices] = useState([
    { id: 'google-home', name: 'Google Home', connected: false },
    { id: 'alexa', name: 'Amazon Alexa', connected: false },
    { id: 'apple-homepod', name: 'Apple HomePod', connected: false },
  ]);

  useEffect(() => {
    // TODO: Load notification settings from backend
    console.log('Loading notification settings...');
  }, []);

  const handleSettingChange = (setting: keyof NotificationSettings) => {
    setSettings({
      ...settings,
      [setting]: !settings[setting],
    });
  };

  const handleRuleToggle = (ruleId: string) => {
    setNotificationRules(rules =>
      rules.map(rule =>
        rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule
      )
    );
  };

  const handleThresholdChange = (ruleId: string, threshold: number) => {
    setNotificationRules(rules =>
      rules.map(rule =>
        rule.id === ruleId ? { ...rule, threshold } : rule
      )
    );
  };

  const handleSmartHomeToggle = (deviceId: string) => {
    setSmartHomeDevices(devices =>
      devices.map(device =>
        device.id === deviceId ? { ...device, connected: !device.connected } : device
      )
    );
  };

  const recentNotifications = [
    {
      id: '1',
      type: 'warning',
      title: '蔬菜類預算即將用完',
      message: '本月蔬菜類預算已使用78%，注意控制支出',
      time: '2小時前',
      read: false,
    },
    {
      id: '2',
      type: 'success',
      title: '週報告已生成',
      message: '上週總支出HK$1,234.56，比上週減少12%',
      time: '1天前',
      read: true,
    },
    {
      id: '3',
      type: 'info',
      title: '價格提醒：雞蛋降價',
      message: '惠康雞蛋價格從HK$28降至HK$25.9',
      time: '2天前',
      read: true,
    },
  ];

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'warning': return <Warning color="warning" />;
      case 'success': return <CheckCircle color="success" />;
      case 'info': return <Notifications color="info" />;
      default: return <Notifications />;
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        <Notifications sx={{ mr: 1, verticalAlign: 'middle' }} />
        通知中心
      </Typography>

      {/* Recent Notifications */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            最近通知
          </Typography>
          <List>
            {recentNotifications.map((notification) => (
              <ListItem key={notification.id} divider>
                <Box display="flex" alignItems="center" mr={2}>
                  {getNotificationIcon(notification.type)}
                </Box>
                <ListItemText
                  primary={
                    <Typography fontWeight={notification.read ? 'normal' : 'bold'}>
                      {notification.title}
                    </Typography>
                  }
                  secondary={`${notification.message} • ${notification.time}`}
                />
                <ListItemSecondaryAction>
                  {!notification.read && (
                    <Button size="small" variant="outlined">
                      標記已讀
                    </Button>
                  )}
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            通知設定
          </Typography>
          <List>
            <ListItem>
              <ListItemText
                primary="電郵通知"
                secondary="接收重要預算和支出提醒的電郵"
              />
              <ListItemSecondaryAction>
                <Switch
                  checked={settings.emailNotifications}
                  onChange={() => handleSettingChange('emailNotifications')}
                />
              </ListItemSecondaryAction>
            </ListItem>
            <ListItem>
              <ListItemText
                primary="推播通知"
                secondary="在瀏覽器中接收即時通知"
              />
              <ListItemSecondaryAction>
                <Switch
                  checked={settings.pushNotifications}
                  onChange={() => handleSettingChange('pushNotifications')}
                />
              </ListItemSecondaryAction>
            </ListItem>
            <ListItem>
              <ListItemText
                primary="預算提醒"
                secondary="當接近或超過預算時通知"
              />
              <ListItemSecondaryAction>
                <Switch
                  checked={settings.budgetAlerts}
                  onChange={() => handleSettingChange('budgetAlerts')}
                />
              </ListItemSecondaryAction>
            </ListItem>
            <ListItem>
              <ListItemText
                primary="週報告"
                secondary="每週發送支出總結報告"
              />
              <ListItemSecondaryAction>
                <Switch
                  checked={settings.weeklyReports}
                  onChange={() => handleSettingChange('weeklyReports')}
                />
              </ListItemSecondaryAction>
            </ListItem>
            <ListItem>
              <ListItemText
                primary="價格提醒"
                secondary="商品價格變化時通知"
              />
              <ListItemSecondaryAction>
                <Switch
                  checked={settings.priceAlerts}
                  onChange={() => handleSettingChange('priceAlerts')}
                />
              </ListItemSecondaryAction>
            </ListItem>
          </List>
        </CardContent>
      </Card>

      {/* Notification Rules */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            通知規則
          </Typography>
          <List>
            {notificationRules.map((rule) => (
              <ListItem key={rule.id} divider>
                <ListItemText
                  primary={rule.title}
                  secondary={rule.description}
                />
                <ListItemSecondaryAction>
                  {rule.threshold && (
                    <Box display="flex" alignItems="center" gap={1} mr={2}>
                      <Typography variant="body2">
                        閾值:
                      </Typography>
                      <Select
                        size="small"
                        value={rule.threshold}
                        onChange={(e) => handleThresholdChange(rule.id, e.target.value as number)}
                        sx={{ minWidth: 80 }}
                      >
                        <MenuItem value={70}>70%</MenuItem>
                        <MenuItem value={80}>80%</MenuItem>
                        <MenuItem value={90}>90%</MenuItem>
                        <MenuItem value={95}>95%</MenuItem>
                      </Select>
                    </Box>
                  )}
                  <Switch
                    checked={rule.enabled}
                    onChange={() => handleRuleToggle(rule.id)}
                  />
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>

      {/* Smart Home Integration */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <SmartHome sx={{ mr: 1, verticalAlign: 'middle' }} />
            智能家居整合
          </Typography>
          <Typography variant="body2" color="textSecondary" paragraph>
            連接智能音箱語音查詢預算和支出
          </Typography>
          
          <List>
            {smartHomeDevices.map((device) => (
              <ListItem key={device.id} divider>
                <ListItemText
                  primary={device.name}
                  secondary={device.connected ? '已連接' : '未連接'}
                />
                <ListItemSecondaryAction>
                  <Switch
                    checked={device.connected}
                    onChange={() => handleSmartHomeToggle(device.id)}
                  />
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>

          <Box mt={2}>
            <Button variant="outlined" fullWidth>
              <Home sx={{ mr: 1 }} />
              設置智能家居
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default NotificationCenter;