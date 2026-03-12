import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Typography,
  IconButton,
  Badge,
  Divider,
  Button,
  TextField,
  InputAdornment,
  CircularProgress,
  Chip,
  Tooltip,
  FormControlLabel,
  Switch,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Notifications,
  Delete,
  CheckCircle,
  CircleOutlined,
  Search,
  Settings,
  Email,
  MarkEmailRead,
  Campaign,
  Comment,
  PlaylistAddCheck,
  QuestionAnswer,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { notificationAPI } from '../services/api';

interface Notification {
  id: string;
  userId: string;
  title: string;
  content: string;
  type: string;
  isRead: boolean;
  relatedType?: string;
  relatedId?: string;
  createdAt: string;
}

interface NotificationSettings {
  notifyOnNewProposal: boolean;
  notifyOnNewComment: boolean;
  notifyOnSurveySubmission: boolean;
  notifyOnProposalQueued: boolean;
  emailOnNewProposal: boolean;
  emailOnNewComment: boolean;
  emailOnSurveySubmission: boolean;
  emailOnProposalQueued: boolean;
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'new_proposal':
      return <Campaign color="primary" />;
    case 'new_comment':
      return <Comment color="info" />;
    case 'survey_submission':
      return <QuestionAnswer color="warning" />;
    case 'proposal_queued':
      return <PlaylistAddCheck color="success" />;
    default:
      return <Notifications color="default" />;
  }
};

const getNotificationTypeLabel = (type: string) => {
  switch (type) {
    case 'new_proposal':
      return '新提案';
    case 'new_comment':
      return '新评论';
    case 'survey_submission':
      return '意见征询';
    case 'proposal_queued':
      return '提案队列';
    default:
      return '系统通知';
  }
};

const InboxPage: React.FC = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings>({
    notifyOnNewProposal: true,
    notifyOnNewComment: true,
    notifyOnSurveySubmission: true,
    notifyOnProposalQueued: true,
    emailOnNewProposal: false,
    emailOnNewComment: false,
    emailOnSurveySubmission: false,
    emailOnProposalQueued: false,
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  // 获取通知列表
  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await notificationAPI.getMyNotifications(100, 0);
      setNotifications(response.data.notifications);
    } catch (error) {
      console.error('获取通知列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 加载通知设置
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await notificationAPI.getMyNotificationSettings();
        if (response.data.settings) {
          setSettings(response.data.settings);
        }
      } catch (error) {
        console.error('获取通知设置失败:', error);
      }
    };
    fetchSettings();
  }, []);

  // 过滤通知
  const filteredNotifications = notifications.filter(
    (n) =>
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 处理点击通知
  const handleNotificationClick = async (notification: Notification) => {
    setSelectedNotification(notification);
    
    // 标记为已读
    if (!notification.isRead) {
      try {
        await notificationAPI.markNotificationRead(notification.id);
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notification.id ? { ...n, isRead: true } : n
          )
        );
      } catch (error) {
        console.error('标记已读失败:', error);
      }
    }
  };

  // 处理全部标记已读
  const handleMarkAllRead = async () => {
    try {
      await notificationAPI.markAllNotificationsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true }))
      );
      if (selectedNotification) {
        setSelectedNotification({ ...selectedNotification, isRead: true });
      }
    } catch (error) {
      console.error('标记全部已读失败:', error);
    }
  };

  // 处理删除通知
  const handleDeleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await notificationAPI.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (selectedNotification?.id === id) {
        setSelectedNotification(null);
      }
    } catch (error) {
      console.error('删除通知失败:', error);
    }
  };

  // 处理清空所有通知
  const handleClearAll = async () => {
    if (!window.confirm('确定要清空所有通知吗？')) return;
    try {
      await notificationAPI.clearAllNotifications();
      setNotifications([]);
      setSelectedNotification(null);
    } catch (error) {
      console.error('清空通知失败:', error);
    }
  };

  // 保存通知设置
  const handleSaveSettings = async () => {
    try {
      setSavingSettings(true);
      await notificationAPI.updateMyNotificationSettings(settings);
      setSettingsOpen(false);
    } catch (error) {
      console.error('保存通知设置失败:', error);
    } finally {
      setSavingSettings(false);
    }
  };

  // 格式化时间
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours === 0) {
        const minutes = Math.floor(diff / (1000 * 60));
        return minutes <= 1 ? '刚刚' : `${minutes}分钟前`;
      }
      return `${hours}小时前`;
    }
    if (days === 1) return '昨天';
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString();
  };

  // 获取未读数量
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <Box
      sx={{
        display: 'flex',
        height: 'calc(100vh - 64px)',
        bgcolor: 'background.default',
        p: 2,
        gap: 2,
      }}
    >
      {/* 左侧通知列表 */}
      <Paper
        sx={{
          width: 380,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* 列表头部 */}
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              站内信
              {unreadCount > 0 && (
                <Chip
                  size="small"
                  label={unreadCount}
                  color="error"
                  sx={{ ml: 1 }}
                />
              )}
            </Typography>
            <Box>
              <Tooltip title="全部标记已读">
                <IconButton size="small" onClick={handleMarkAllRead}>
                  <MarkEmailRead />
                </IconButton>
              </Tooltip>
              <Tooltip title="清空所有">
                <IconButton size="small" onClick={handleClearAll}>
                  <Delete />
                </IconButton>
              </Tooltip>
              <Tooltip title="通知设置">
                <IconButton size="small" onClick={() => setSettingsOpen(true)}>
                  <Settings />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
          <TextField
            fullWidth
            size="small"
            placeholder="搜索通知..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        {/* 通知列表 */}
        <Box ref={listRef} sx={{ flex: 1, overflow: 'auto' }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : filteredNotifications.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Notifications sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography color="text.secondary">
                {searchQuery ? '没有找到相关通知' : '暂无通知'}
              </Typography>
            </Box>
          ) : (
            <List sx={{ py: 0 }}>
              {filteredNotifications.map((notification, index) => (
                <React.Fragment key={notification.id}>
                  <ListItem
                    button
                    onClick={() => handleNotificationClick(notification)}
                    sx={{
                      py: 1.5,
                      bgcolor: selectedNotification?.id === notification.id
                        ? 'action.selected'
                        : notification.isRead
                        ? 'transparent'
                        : 'action.hover',
                      '&:hover': {
                        bgcolor: 'action.selected',
                      },
                    }}
                    secondaryAction={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {!notification.isRead && (
                          <CircleOutlined sx={{ fontSize: 12, color: 'primary.main' }} />
                        )}
                        <IconButton
                          edge="end"
                          size="small"
                          onClick={(e) => handleDeleteNotification(notification.id, e)}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Box>
                    }
                  >
                    <ListItemAvatar>
                      <Badge
                        overlap="circular"
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        badgeContent={
                          !notification.isRead ? (
                            <Box
                              sx={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                bgcolor: 'primary.main',
                              }}
                            />
                          ) : null
                        }
                      >
                        <Avatar sx={{ bgcolor: 'background.default' }}>
                          {getNotificationIcon(notification.type)}
                        </Avatar>
                      </Badge>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: notification.isRead ? 'normal' : 'bold',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {notification.title}
                        </Typography>
                      }
                      secondary={
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            display: 'block',
                          }}
                        >
                          {notification.content}
                        </Typography>
                      }
                    />
                  </ListItem>
                  {index < filteredNotifications.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </Box>
      </Paper>

      {/* 右侧详情区域 */}
      <Paper
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {selectedNotification ? (
          <>
            {/* 详情头部 */}
            <Box
              sx={{
                p: 2,
                borderBottom: 1,
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 2,
              }}
            >
              <Avatar sx={{ bgcolor: 'primary.light' }}>
                {getNotificationIcon(selectedNotification.type)}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  {selectedNotification.title}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                  <Chip
                    size="small"
                    label={getNotificationTypeLabel(selectedNotification.type)}
                    variant="outlined"
                  />
                  <Typography variant="caption" color="text.secondary">
                    {formatTime(selectedNotification.createdAt)}
                  </Typography>
                  {selectedNotification.isRead && (
                    <Chip
                      size="small"
                      label="已读"
                      color="default"
                      sx={{ height: 20 }}
                    />
                  )}
                </Box>
              </Box>
              <IconButton onClick={() => handleDeleteNotification(selectedNotification.id, { stopPropagation: () => {} } as any)}>
                <Delete />
              </IconButton>
            </Box>

            {/* 详情内容 */}
            <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
                {selectedNotification.content}
              </Typography>

              {/* 关联内容链接 */}
              {selectedNotification.relatedType && selectedNotification.relatedId && (
                <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    关联内容
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      if (selectedNotification.relatedType === 'proposal') {
                        // TODO: 跳转到提案页面
                      } else if (selectedNotification.relatedType === 'comment') {
                        // TODO: 跳转到评论页面
                      } else if (selectedNotification.relatedType === 'survey') {
                        // TODO: 跳转到征询页面
                      }
                    }}
                  >
                    查看详情
                  </Button>
                </Box>
              )}
            </Box>
          </>
        ) : (
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'text.secondary',
            }}
          >
            <Email sx={{ fontSize: 64, mb: 2 }} />
            <Typography variant="h6">选择一条通知查看详情</Typography>
          </Box>
        )}
      </Paper>

      {/* 通知设置对话框 */}
      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>通知设置</DialogTitle>
        <DialogContent>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
            选择您希望接收的通知类型
          </Typography>
          
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
              站内通知
            </Typography>
            <Box sx={{ pl: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.notifyOnNewProposal}
                    onChange={(e) =>
                      setSettings({ ...settings, notifyOnNewProposal: e.target.checked })
                    }
                  />
                }
                label="项目新提案"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.notifyOnNewComment}
                    onChange={(e) =>
                      setSettings({ ...settings, notifyOnNewComment: e.target.checked })
                    }
                  />
                }
                label="项目新评论"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.notifyOnSurveySubmission}
                    onChange={(e) =>
                      setSettings({ ...settings, notifyOnSurveySubmission: e.target.checked })
                    }
                  />
                }
                label="意见征询提交"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.notifyOnProposalQueued}
                    onChange={(e) =>
                      setSettings({ ...settings, notifyOnProposalQueued: e.target.checked })
                    }
                  />
                }
                label="提案加入队列"
              />
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
              邮件通知
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              开启邮件通知后，当上述事件发生时，您将收到电子邮件提醒
            </Typography>
            <Box sx={{ pl: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.emailOnNewProposal}
                    onChange={(e) =>
                      setSettings({ ...settings, emailOnNewProposal: e.target.checked })
                    }
                    disabled={!settings.notifyOnNewProposal}
                  />
                }
                label="新提案邮件通知"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.emailOnNewComment}
                    onChange={(e) =>
                      setSettings({ ...settings, emailOnNewComment: e.target.checked })
                    }
                    disabled={!settings.notifyOnNewComment}
                  />
                }
                label="新评论邮件通知"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.emailOnSurveySubmission}
                    onChange={(e) =>
                      setSettings({ ...settings, emailOnSurveySubmission: e.target.checked })
                    }
                    disabled={!settings.notifyOnSurveySubmission}
                  />
                }
                label="征询提交邮件通知"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.emailOnProposalQueued}
                    onChange={(e) =>
                      setSettings({ ...settings, emailOnProposalQueued: e.target.checked })
                    }
                    disabled={!settings.notifyOnProposalQueued}
                  />
                }
                label="提案入队邮件通知"
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>取消</Button>
          <Button
            onClick={handleSaveSettings}
            variant="contained"
            disabled={savingSettings}
          >
            {savingSettings ? '保存中...' : '保存'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InboxPage;
