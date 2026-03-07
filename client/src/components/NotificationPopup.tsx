import React, { useState, useEffect } from 'react';
import { Box, Paper, Typography, IconButton, Slide, Snackbar, Alert } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import NotificationsIcon from '@mui/icons-material/Notifications';

export interface Notification {
  id: string;
  title: string;
  content: string;
  type?: string;
  createdAt: string;
  read?: boolean;
}

interface NotificationPopupProps {
  notification: Notification | null;
  onClose: () => void;
}

const NotificationPopup: React.FC<NotificationPopupProps> = ({ notification, onClose }) => {
  if (!notification) return null;

  return (
    <Slide direction="up" in={!!notification}>
      <Paper
        elevation={6}
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          maxWidth: 360,
          width: '100%',
          zIndex: 9999,
          overflow: 'hidden'
        }}
      >
        {/* 标题栏 */}
        <Box
          sx={{
            bgcolor: 'primary.main',
            color: 'white',
            px: 2,
            py: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <NotificationsIcon fontSize="small" />
            <Typography variant="subtitle2">{notification.title}</Typography>
          </Box>
          <IconButton
            size="small"
            onClick={onClose}
            sx={{ color: 'white' }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
        
        {/* 内容 */}
        <Box sx={{ p: 2 }}>
          <Typography variant="body2" color="text.primary">
            {notification.content}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            {new Date(notification.createdAt).toLocaleString()}
          </Typography>
        </Box>
      </Paper>
    </Slide>
  );
};

// 通知管理器组件
interface NotificationManagerProps {
  notifications: Notification[];
  onNotificationClose: (id: string) => void;
  currentNotification: Notification | null;
}

export const NotificationManager: React.FC<NotificationManagerProps> = ({
  notifications,
  onNotificationClose,
  currentNotification
}) => {
  const [showPopup, setShowPopup] = useState(false);
  const [latestNotification, setLatestNotification] = useState<Notification | null>(null);

  // 当有新通知时显示弹窗
  useEffect(() => {
    if (currentNotification) {
      setLatestNotification(currentNotification);
      setShowPopup(true);
    }
  }, [currentNotification]);

  const handleClosePopup = () => {
    setShowPopup(false);
    if (latestNotification) {
      onNotificationClose(latestNotification.id);
    }
  };

  return (
    <>
      {/* 右下角通知弹窗 */}
      <NotificationPopup
        notification={showPopup ? latestNotification : null}
        onClose={handleClosePopup}
      />
      
      {/* 也可以同时显示 MUI Snackbar（可选） */}
      <Snackbar
        open={showPopup}
        autoHideDuration={6000}
        onClose={handleClosePopup}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleClosePopup}
          severity="info"
          variant="filled"
          sx={{ width: '100%' }}
        >
          {latestNotification?.content}
        </Alert>
      </Snackbar>
    </>
  );
};

export default NotificationPopup;
