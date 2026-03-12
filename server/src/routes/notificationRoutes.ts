import { Router } from 'express';
import { 
  sendNotification, 
  broadcastNotification, 
  getOnlineUsers, 
  getChatRoomMembers,
  getMyNotifications,
  getMyUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  removeNotification,
  clearNotifications,
  getMyNotificationSettings,
  updateMyNotificationSettings
} from '../controllers/notificationController';
import { verifyToken } from '../middleware/authMiddleware';

const router = Router();

// 发送通知给指定用户
router.post('/send', sendNotification);

// 广播通知给所有在线用户
router.post('/broadcast', broadcastNotification);

// 获取在线用户列表
router.get('/online-users', getOnlineUsers);

// 获取聊天室在线成员
router.get('/chat-room/:chatRoomId/members', getChatRoomMembers);

// 以下路由需要认证

// 获取当前用户的系统通知列表
router.get('/my/notifications', verifyToken, getMyNotifications);

// 获取当前用户未读通知数量
router.get('/my/unread-count', verifyToken, getMyUnreadCount);

// 标记单条通知为已读
router.put('/my/notifications/:notificationId/read', verifyToken, markNotificationRead);

// 标记所有通知为已读
router.put('/my/notifications/read-all', verifyToken, markAllNotificationsRead);

// 删除单条通知
router.delete('/my/notifications/:notificationId', verifyToken, removeNotification);

// 清空所有通知
router.delete('/my/notifications', verifyToken, clearNotifications);

// 获取当前用户的通知设置
router.get('/my/settings', verifyToken, getMyNotificationSettings);

// 更新当前用户的通知设置
router.put('/my/settings', verifyToken, updateMyNotificationSettings);

export default router;
