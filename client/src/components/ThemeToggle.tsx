import React, { useState } from 'react';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Card,
  CardContent,
  Typography,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Brightness4,
  Brightness7,
  Settings,
  Computer,
} from '@mui/icons-material';
import { useTheme } from '../contexts/ThemeContext';

const ThemeToggle: React.FC = () => {
  const { mode, setMode, currentTheme, toggleTheme } = useTheme();
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleQuickToggle = () => {
    if (mode === 'auto') {
      setMode('light');
    } else {
      setMode(mode === 'light' ? 'dark' : 'auto');
    }
  };

  const getThemeIcon = () => {
    switch (mode) {
      case 'light':
        return <Brightness7 />;
      case 'dark':
        return <Brightness4 />;
      case 'auto':
        return <Computer />;
      default:
        return <Brightness7 />;
    }
  };

  const getThemeLabel = () => {
    switch (mode) {
      case 'light':
        return '淺色模式';
      case 'dark':
        return '深色模式';
      case 'auto':
        return '自動';
      default:
        return '淺色模式';
    }
  };

  return (
    <>
      {/* Quick Toggle Button */}
      <Tooltip title={`主題: ${getThemeLabel()}`}>
        <IconButton
          color="inherit"
          onClick={handleQuickToggle}
          sx={{ ml: 1 }}
        >
          {getThemeIcon()}
        </IconButton>
      </Tooltip>

      {/* Theme Settings Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <Settings />
            主題設定
          </Box>
        </DialogTitle>
        <DialogContent>
          <FormControl component="fieldset">
            <FormLabel component="legend">選擇主題模式</FormLabel>
            <RadioGroup
              aria-label="theme-mode"
              name="theme-mode"
              value={mode}
              onChange={(e) => setMode(e.target.value as any)}
            >
              <FormControlLabel
                value="light"
                control={<Radio />}
                label={
                  <Box display="flex" alignItems="center" gap={2}>
                    <Brightness7 />
                    <Box>
                      <Typography variant="subtitle1">淺色模式</Typography>
                      <Typography variant="body2" color="textSecondary">
                        明亮的界面，適合白天使用
                      </Typography>
                    </Box>
                  </Box>
                }
              />
              <FormControlLabel
                value="dark"
                control={<Radio />}
                label={
                  <Box display="flex" alignItems="center" gap={2}>
                    <Brightness4 />
                    <Box>
                      <Typography variant="subtitle1">深色模式</Typography>
                      <Typography variant="body2" color="textSecondary">
                        暗色界面，適合夜間使用，省電護眼
                      </Typography>
                    </Box>
                  </Box>
                }
              />
              <FormControlLabel
                value="auto"
                control={<Radio />}
                label={
                  <Box display="flex" alignItems="center" gap={2}>
                    <Computer />
                    <Box>
                      <Typography variant="subtitle1">自動</Typography>
                      <Typography variant="body2" color="textSecondary">
                        根據系統設定自動切換
                      </Typography>
                    </Box>
                  </Box>
                }
              />
            </RadioGroup>
          </FormControl>

          <Box mt={3}>
            <Typography variant="h6" gutterBottom>
              主題預覽
            </Typography>
            
            <Card sx={{ mb: 2, border: '2px solid', borderColor: 'primary.main' }}>
              <CardContent>
                <Typography variant="h6" color="primary.main" gutterBottom>
                  主要色彩
                </Typography>
                <Typography variant="body1" paragraph>
                  這是主要文字內容的樣式範例
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  這是次要文字內容的樣式範例
                </Typography>
              </CardContent>
            </Card>

            <Box display="flex" gap={2}>
              <Card sx={{ flex: 1 }}>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Typography variant="button" color="primary">
                    主要按鈕
                  </Typography>
                </CardContent>
              </Card>
              
              <Card sx={{ flex: 1 }}>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Typography variant="button" variant="outlined">
                    次要按鈕
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>
            關閉
          </Button>
        </DialogActions>
      </Dialog>

      {/* Settings Menu Entry */}
      <Tooltip title="主題設定">
        <IconButton
          color="inherit"
          onClick={() => setDialogOpen(true)}
          sx={{ ml: 1 }}
        >
          <Settings />
        </IconButton>
      </Tooltip>
    </>
  );
};

export default ThemeToggle;