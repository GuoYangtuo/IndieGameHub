import { Router } from 'express';
import { sendNotification, broadcastNotification, getOnlineUsers, getChatRoomMembers } from '../controllers/notificationController';

const router = Router();

// 发送通知给指定用户
router.post('/send', sendNotification);

// 广播通知给所有在线用户
router.post('/broadcast', broadcastNotification);

// 获取在线用户列表
router.get('/online-users', getOnlineUsers);

// 获取聊天室在线成员
router.get('/chat-room/:chatRoomId/members', getChatRoomMembers);

export default router;
