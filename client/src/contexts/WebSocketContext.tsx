import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { Notification } from '../components/NotificationPopup';

interface WebSocketContextType {
  isConnected: boolean;
  onlineUsers: string[];
  notifications: Notification[];
  clearNotification: (id: string) => void;
  joinChatRoom: (chatRoomId: string) => boolean;
  leaveChatRoom: (chatRoomId: string) => boolean;
  sendChatMessage: (chatRoomId: string, content: string, messageId: string) => boolean;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

interface WebSocketProviderProps {
  children: ReactNode;
  wsUrl?: string;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ 
  children,
  wsUrl = `ws://${window.location.hostname}:5000/ws`
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [currentNotification, setCurrentNotification] = useState<Notification | null>(null);
  
  // 从 localStorage 获取 token
  const token = localStorage.getItem('token') || '';
  
  // 处理接收到的消息
  const handleMessage = useCallback((message: { type: string; payload: any }) => {
    if (message.type === 'notification') {
      const notification: Notification = {
        ...message.payload,
        read: false
      };
      
      // 添加到通知列表
      setNotifications(prev => [notification, ...prev]);
      
      // 设置当前通知用于显示弹窗
      setCurrentNotification(notification);
    }
  }, []);
  
  const {
    isConnected,
    onlineUsers,
    connect,
    disconnect,
    joinChatRoom: wsJoinChatRoom,
    leaveChatRoom: wsLeaveChatRoom,
    sendChatMessage: wsSendChatMessage
  } = useWebSocket({
    url: wsUrl,
    token,
    onMessage: handleMessage,
    onConnect: () => console.log('WebSocket 已连接'),
    onDisconnect: () => console.log('WebSocket 已断开')
  });
  
  // 登录后连接 WebSocket（使用 ref 避免重复连接）
  const connectRef = useRef(connect);
  connectRef.current = connect;
  
  useEffect(() => {
    // 只有有 token 时才连接
    if (token && !isConnected) {
      connectRef.current();
    }
    // 如果没有 token 或已断开，主动断开
    if (!token && isConnected) {
      disconnect();
    }
  }, [token, isConnected]);
  
  // 清除通知
  const clearNotification = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
    setCurrentNotification(null);
  }, []);
  
  // 加入聊天室
  const joinChatRoom = useCallback((chatRoomId: string) => {
    return wsJoinChatRoom(chatRoomId);
  }, [wsJoinChatRoom]);
  
  // 离开聊天室
  const leaveChatRoom = useCallback((chatRoomId: string) => {
    return wsLeaveChatRoom(chatRoomId);
  }, [wsLeaveChatRoom]);
  
  // 发送聊天消息
  const sendChatMessage = useCallback((chatRoomId: string, content: string, messageId: string) => {
    return wsSendChatMessage(chatRoomId, content, messageId);
  }, [wsSendChatMessage]);
  
  return (
    <WebSocketContext.Provider value={{
      isConnected,
      onlineUsers,
      notifications,
      clearNotification,
      joinChatRoom,
      leaveChatRoom,
      sendChatMessage
    }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocketContext = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext 必须在 WebSocketProvider 内使用');
  }
  return context;
};

// 导出当前通知状态供 NotificationManager 使用
export const useCurrentNotification = () => {
  const [currentNotification, setCurrentNotification] = useState<Notification | null>(null);
  const { notifications } = useWebSocketContext();
  
  useEffect(() => {
    // 获取最新的未读通知
    const latestUnread = notifications.find(n => !n.read);
    if (latestUnread && latestUnread.id !== currentNotification?.id) {
      setCurrentNotification(latestUnread);
    }
  }, [notifications, currentNotification]);
  
  return { currentNotification, setCurrentNotification };
};
