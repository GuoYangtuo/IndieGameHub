import { Request, Response } from 'express';
import {
  createSystemNotification,
  getUserNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  clearAllNotifications,
  getUserNotificationSettings,
  updateUserNotificationSettings,
  createDefaultNotificationSettings
} from '../models/notificationModel';

// 给指定用户发送系统通知
export const sendNotification = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, title, content, type = 'system' } = req.body;

    if (!userId || !title || !content) {
      res.status(400).json({ message: 'userId, title, content 是必填项' });
      return;
    }

    // 从 app 获取 ws 实例
    const app = req.app as any;
    const ws = app?.ws;

    // 创建系统通知（会自动发送实时通知）
    const notification = await createSystemNotification(userId, title, content, type, undefined, undefined, ws);

    if (notification) {
      res.status(200).json({ message: '通知发送成功', notification });
    } else {
      res.status(500).json({ message: '通知发送失败' });
    }
  } catch (error) {
    console.error('发送通知失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 广播系统通知给所有在线用户
export const broadcastNotification = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, content, type = 'broadcast' } = req.body;

    if (!title || !content) {
      res.status(400).json({ message: 'title, content 是必填项' });
      return;
    }

    const app = req.app as any;
    const ws = app?.ws;

    if (ws) {
      ws.broadcast({
        type: 'notification',
        payload: {
          id: Date.now().toString(),
          title,
          content,
          type,
          createdAt: new Date().toISOString()
        }
      });

      res.status(200).json({ message: '广播通知发送成功' });
    } else {
      res.status(500).json({ message: 'WebSocket 服务未初始化' });
    }
  } catch (error) {
    console.error('发送广播通知失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 获取当前在线用户列表
export const getOnlineUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const app = req.app as any;
    const ws = app?.ws;

    if (ws) {
      const onlineUsers = ws.getOnlineUsers();
      res.status(200).json({ onlineUsers });
    } else {
      res.status(500).json({ message: 'WebSocket 服务未初始化' });
    }
  } catch (error) {
    console.error('获取在线用户失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 获取聊天室在线成员
export const getChatRoomMembers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { chatRoomId } = req.params;
    
    if (!chatRoomId) {
      res.status(400).json({ message: 'chatRoomId 是必填项' });
      return;
    }

    const app = req.app as any;
    const ws = app?.ws;

    if (ws) {
      const members = ws.getChatRoomMembers(chatRoomId);
      res.status(200).json({ members });
    } else {
      res.status(500).json({ message: 'WebSocket 服务未初始化' });
    }
  } catch (error) {
    console.error('获取聊天室成员失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 获取当前用户的系统通知列表
export const getMyNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: '未授权' });
      return;
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const notifications = await getUserNotifications(userId, limit, offset);
    const unreadCount = await getUnreadNotificationCount(userId);

    res.status(200).json({ notifications, unreadCount });
  } catch (error) {
    console.error('获取通知列表失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 获取当前用户未读通知数量
export const getMyUnreadCount = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: '未授权' });
      return;
    }

    const count = await getUnreadNotificationCount(userId);
    res.status(200).json({ count });
  } catch (error) {
    console.error('获取未读数量失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 标记通知为已读
export const markNotificationRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: '未授权' });
      return;
    }

    const { notificationId } = req.params;
    if (!notificationId) {
      res.status(400).json({ message: 'notificationId 是必填项' });
      return;
    }

    const success = await markNotificationAsRead(notificationId, userId);
    if (success) {
      res.status(200).json({ message: '通知已标记为已读' });
    } else {
      res.status(404).json({ message: '通知不存在' });
    }
  } catch (error) {
    console.error('标记已读失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 标记所有通知为已读
export const markAllNotificationsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: '未授权' });
      return;
    }

    await markAllNotificationsAsRead(userId);
    res.status(200).json({ message: '所有通知已标记为已读' });
  } catch (error) {
    console.error('标记全部已读失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 删除单条通知
export const removeNotification = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: '未授权' });
      return;
    }

    const { notificationId } = req.params;
    if (!notificationId) {
      res.status(400).json({ message: 'notificationId 是必填项' });
      return;
    }

    const success = await deleteNotification(notificationId, userId);
    if (success) {
      res.status(200).json({ message: '通知已删除' });
    } else {
      res.status(404).json({ message: '通知不存在' });
    }
  } catch (error) {
    console.error('删除通知失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 清空所有通知
export const clearNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: '未授权' });
      return;
    }

    await clearAllNotifications(userId);
    res.status(200).json({ message: '所有通知已清空' });
  } catch (error) {
    console.error('清空通知失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 获取当前用户的通知设置
export const getMyNotificationSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: '未授权' });
      return;
    }

    const settings = await getUserNotificationSettings(userId);
    res.status(200).json({ settings });
  } catch (error) {
    console.error('获取通知设置失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 更新当前用户的通知设置
export const updateMyNotificationSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: '未授权' });
      return;
    }

    const settings = req.body;
    const updated = await updateUserNotificationSettings(userId, settings);
    
    if (updated) {
      res.status(200).json({ message: '通知设置已更新', settings: updated });
    } else {
      res.status(500).json({ message: '更新通知设置失败' });
    }
  } catch (error) {
    console.error('更新通知设置失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};
