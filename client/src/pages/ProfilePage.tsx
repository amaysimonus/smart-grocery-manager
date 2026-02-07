import React, { useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  Avatar,
  Divider,
} from '@mui/material';
import { Edit, Save, Cancel } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';

const ProfilePage: React.FC = () => {
  const { t } = useI18n();
  const { user } = useAuth();
  
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData({
      name: user?.name || '',
      email: user?.email || '',
    });
  };

  const handleSave = () => {
    // TODO: Update user profile
    console.log('Saving profile:', formData);
    setIsEditing(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <Container maxWidth="sm">
      <Box py={4}>
        <Typography variant="h4" gutterBottom>
          {t('profile.title')}
        </Typography>

        <Paper elevation={2} sx={{ p: 3 }}>
          <Box display="flex" alignItems="center" mb={3}>
            <Avatar
              sx={{ width: 64, height: 64, mr: 3 }}
              src={user?.avatar}
            >
              {user?.name?.charAt(0).toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="h6">
                {user?.name}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {user?.role}
              </Typography>
            </Box>
            {!isEditing && (
              <Box ml="auto">
                <Button
                  variant="outlined"
                  startIcon={<Edit />}
                  onClick={handleEdit}
                >
                  Edit Profile
                </Button>
              </Box>
            )}
          </Box>

          <Divider sx={{ mb: 3 }} />

          {isEditing ? (
            <Box>
              <TextField
                fullWidth
                label={t('profile.name')}
                name="name"
                value={formData.name}
                onChange={handleChange}
                margin="normal"
              />
              <TextField
                fullWidth
                label={t('profile.email')}
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                margin="normal"
                disabled // Email typically shouldn't be changeable
              />
              <Box display="flex" gap={2} mt={3}>
                <Button
                  variant="contained"
                  startIcon={<Save />}
                  onClick={handleSave}
                >
                  {t('common.save')}
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Cancel />}
                  onClick={handleCancel}
                >
                  {t('common.cancel')}
                </Button>
              </Box>
            </Box>
          ) : (
            <Box>
              <Typography variant="h6" gutterBottom>
                {t('profile.name')}
              </Typography>
              <Typography variant="body1" paragraph>
                {user?.name}
              </Typography>

              <Typography variant="h6" gutterBottom>
                {t('profile.email')}
              </Typography>
              <Typography variant="body1" paragraph>
                {user?.email}
              </Typography>

              <Typography variant="h6" gutterBottom>
                {t('profile.role')}
              </Typography>
              <Typography variant="body1" paragraph>
                {user?.role}
              </Typography>

              <Typography variant="h6" gutterBottom>
                Member Since
              </Typography>
              <Typography variant="body1" paragraph>
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
              </Typography>
            </Box>
          )}

          <Divider sx={{ my: 3 }} />

          <Button variant="outlined" fullWidth>
            {t('profile.changePassword')}
          </Button>
        </Paper>
      </Box>
    </Container>
  );
};

export default ProfilePage;