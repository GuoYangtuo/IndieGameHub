import { Request, Response } from 'express';

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

    if (ws) {
      const success = ws.sendToUser(userId, {
        type: 'notification',
        payload: {
          id: Date.now().toString(),
          title,
          content,
          type,
          createdAt: new Date().toISOString()
        }
      });

      if (success) {
        res.status(200).json({ message: '通知发送成功', online: true });
      } else {
        // 用户不在线，可以选择保存到数据库（这里暂时只返回不在线）
        res.status(200).json({ message: '用户当前不在线', online: false });
      }
    } else {
      res.status(500).json({ message: 'WebSocket 服务未初始化' });
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
