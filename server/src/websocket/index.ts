import { WebSocket, WebSocketServer } from 'ws';
import { Server } from 'http';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  isAlive?: boolean;
}

// 在线用户映射: userId -> WebSocket
const onlineUsers: Map<string, AuthenticatedWebSocket> = new Map();

// 聊天室成员映射: chatRoomId -> Set<userId>
const chatRoomMembers: Map<string, Set<string>> = new Map();

export const initializeWebSocket = (server: Server) => {
  const wss = new WebSocketServer({ server, path: '/ws' });

  // 心跳检测间隔
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws: AuthenticatedWebSocket) => {
      if (ws.isAlive === false) {
        // 用户离线
        if (ws.userId) {
          onlineUsers.delete(ws.userId);
          // 从所有聊天室中移除
          chatRoomMembers.forEach((members) => {
            members.delete(ws.userId!);
          });
          broadcastOnlineUsers();
        }
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('connection', (ws: AuthenticatedWebSocket, req) => {
    ws.isAlive = true;

    // 从 URL 获取 token
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const token = url.searchParams.get('token');

    if (!token) {
      ws.close(4001, '未授权');
      return;
    }

    // 验证 token
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret') as { userId: string };
      ws.userId = decoded.userId;
      onlineUsers.set(decoded.userId, ws);
      
      // 广播在线用户列表
      broadcastOnlineUsers();
      
      console.log(`用户 ${decoded.userId} 连接 WebSocket`);
    } catch (error) {
      ws.close(4001, 'token无效');
      return;
    }

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        handleMessage(ws, message);
      } catch (error) {
        console.error('解析消息失败:', error);
      }
    });

    ws.on('close', () => {
      if (ws.userId) {
        onlineUsers.delete(ws.userId);
        // 从所有聊天室中移除
        chatRoomMembers.forEach((members) => {
          members.delete(ws.userId!);
        });
        broadcastOnlineUsers();
        console.log(`用户 ${ws.userId} 断开 WebSocket`);
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket 错误:', error);
    });
  });

  // 处理各类消息
  const handleMessage = (ws: AuthenticatedWebSocket, message: { type: string; payload: any }) => {
    switch (message.type) {
      case 'join_chat_room':
        handleJoinChatRoom(ws, message.payload);
        break;
      case 'leave_chat_room':
        handleLeaveChatRoom(ws, message.payload);
        break;
      case 'chat_message':
        handleChatMessage(ws, message.payload);
        break;
      case 'get_online_users':
        ws.send(JSON.stringify({
          type: 'online_users',
          payload: Array.from(onlineUsers.keys())
        }));
        break;
    }
  };

  // 加入聊天室
  const handleJoinChatRoom = (ws: AuthenticatedWebSocket, payload: { chatRoomId: string }) => {
    const { chatRoomId } = payload;
    if (!ws.userId) return;

    if (!chatRoomMembers.has(chatRoomId)) {
      chatRoomMembers.set(chatRoomId, new Set());
    }
    chatRoomMembers.get(chatRoomId)!.add(ws.userId);

    // 通知用户加入成功
    ws.send(JSON.stringify({
      type: 'joined_chat_room',
      payload: {
        chatRoomId,
        members: Array.from(chatRoomMembers.get(chatRoomId)!)
      }
    }));

    // 广播聊天室成员更新
    broadcastToChatRoom(chatRoomId, {
      type: 'chat_room_members_updated',
      payload: {
        chatRoomId,
        members: Array.from(chatRoomMembers.get(chatRoomId)!)
      }
    }, ws.userId);

    console.log(`用户 ${ws.userId} 加入聊天室 ${chatRoomId}`);
  };

  // 离开聊天室
  const handleLeaveChatRoom = (ws: AuthenticatedWebSocket, payload: { chatRoomId: string }) => {
    const { chatRoomId } = payload;
    if (!ws.userId) return;

    chatRoomMembers.get(chatRoomId)?.delete(ws.userId);

    // 广播聊天室成员更新
    broadcastToChatRoom(chatRoomId, {
      type: 'chat_room_members_updated',
      payload: {
        chatRoomId,
        members: Array.from(chatRoomMembers.get(chatRoomId)!)
      }
    }, ws.userId);

    console.log(`用户 ${ws.userId} 离开聊天室 ${chatRoomId}`);
  };

  // 处理聊天消息
  const handleChatMessage = (ws: AuthenticatedWebSocket, payload: { chatRoomId: string; content: string; messageId: string }) => {
    const { chatRoomId, content, messageId } = payload;
    if (!ws.userId) return;

    // 广播消息给聊天室所有成员
    broadcastToChatRoom(chatRoomId, {
      type: 'new_chat_message',
      payload: {
        chatRoomId,
        messageId,
        userId: ws.userId,
        content,
        createdAt: new Date().toISOString()
      }
    });

    console.log(`聊天室 ${chatRoomId} 收到新消息 from ${ws.userId}`);
  };

  // 广播给聊天室所有成员
  const broadcastToChatRoom = (chatRoomId: string, message: any, excludeUserId?: string) => {
    const members = chatRoomMembers.get(chatRoomId);
    if (!members) return;

    const messageStr = JSON.stringify(message);
    members.forEach((userId) => {
      if (userId !== excludeUserId) {
        const ws = onlineUsers.get(userId);
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(messageStr);
        }
      }
    });
  };

  // 广播所有在线用户
  const broadcastOnlineUsers = () => {
    const message = JSON.stringify({
      type: 'online_users',
      payload: Array.from(onlineUsers.keys())
    });
    
    wss.clients.forEach((ws: AuthenticatedWebSocket) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  };

  // 导出给外部使用的推送方法
  return {
    // 发送消息给指定用户
    sendToUser: (userId: string, message: any) => {
      const ws = onlineUsers.get(userId);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
        return true;
      }
      return false;
    },

    // 广播给所有在线用户
    broadcast: (message: any) => {
      const messageStr = JSON.stringify(message);
      wss.clients.forEach((ws: AuthenticatedWebSocket) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(messageStr);
        }
      });
    },

    // 获取所有在线用户
    getOnlineUsers: () => Array.from(onlineUsers.keys()),

    // 获取聊天室成员
    getChatRoomMembers: (chatRoomId: string) => Array.from(chatRoomMembers.get(chatRoomId) || [])
  };
};
