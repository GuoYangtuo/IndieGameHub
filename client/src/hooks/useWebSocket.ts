import { useEffect, useRef, useState, useCallback } from 'react';

interface WebSocketMessage {
  type: string;
  payload: any;
}

interface UseWebSocketOptions {
  url: string;
  token: string;
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  reconnectInterval?: number;
}

export const useWebSocket = ({
  url,
  token,
  onMessage,
  onConnect,
  onDisconnect,
  reconnectInterval = 5000
}: UseWebSocketOptions) => {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // 使用 ref 存储回调，避免因回调函数变化导致重连
  const onConnectRef = useRef(onConnect);
  const onDisconnectRef = useRef(onDisconnect);
  const onMessageRef = useRef(onMessage);
  
  // 更新 ref
  useEffect(() => {
    onConnectRef.current = onConnect;
  }, [onConnect]);
  
  useEffect(() => {
    onDisconnectRef.current = onDisconnect;
  }, [onDisconnect]);
  
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  // 清理函数
  const cleanup = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  // 连接 WebSocket
  const connect = useCallback(() => {
    // 如果已有连接且正在连接中，不再重复创建
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }
    
    const wsUrl = `${url}?token=${token}`;
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('WebSocket 连接成功');
      setIsConnected(true);
      onConnectRef.current?.();
      
      // 清除重连定时器
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };
    
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        // 处理在线用户列表更新
        if (message.type === 'online_users') {
          setOnlineUsers(message.payload);
        }
        
        // 处理聊天消息
        if (message.type === 'new_chat_message' || 
            message.type === 'chat_room_members_updated' ||
            message.type === 'joined_chat_room') {
          onMessageRef.current?.(message);
        }
        
        // 处理通知
        if (message.type === 'notification') {
          onMessageRef.current?.(message);
        }
      } catch (error) {
        console.error('解析 WebSocket 消息失败:', error);
      }
    };
    
    ws.onclose = (event) => {
      console.log('WebSocket 连接关闭', event.code, event.reason);
      setIsConnected(false);
      onDisconnectRef.current?.();
      
      // 清除旧的连接
      wsRef.current = null;
      
      // 如果不是正常关闭（code 1000），则自动重连
      if (event.code !== 1000) {
        // 清除重连定时器避免重复
        if (reconnectTimerRef.current) {
          clearTimeout(reconnectTimerRef.current);
        }
        
        reconnectTimerRef.current = setTimeout(() => {
          console.log('正在重连 WebSocket...');
          connect();
        }, reconnectInterval);
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket 错误:', error);
    };
    
    wsRef.current = ws;
  }, [url, token, reconnectInterval]);
  
  // 发送消息
  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  }, []);
  
  // 加入聊天室
  const joinChatRoom = useCallback((chatRoomId: string) => {
    return sendMessage({
      type: 'join_chat_room',
      payload: { chatRoomId }
    });
  }, [sendMessage]);
  
  // 离开聊天室
  const leaveChatRoom = useCallback((chatRoomId: string) => {
    return sendMessage({
      type: 'leave_chat_room',
      payload: { chatRoomId }
    });
  }, [sendMessage]);
  
  // 发送聊天消息
  const sendChatMessage = useCallback((chatRoomId: string, content: string, messageId: string) => {
    return sendMessage({
      type: 'chat_message',
      payload: { chatRoomId, content, messageId }
    });
  }, [sendMessage]);
  
  // 断开连接（不再自动重连）
  const disconnect = useCallback(() => {
    // 清除重连定时器
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, '客户端主动断开');
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);
  
  // 组件卸载时断开连接
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);
  
  return {
    isConnected,
    onlineUsers,
    connect,
    disconnect,
    sendMessage,
    joinChatRoom,
    leaveChatRoom,
    sendChatMessage
  };
};
