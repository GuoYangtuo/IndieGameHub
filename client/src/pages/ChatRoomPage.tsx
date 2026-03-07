import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  IconButton,
  Avatar,
  AppBar,
  Toolbar,
  CircularProgress,
  Alert,
  Chip,
  Stack
} from '@mui/material';
import { Send, ArrowBack, Chat } from '@mui/icons-material';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { commentAPI } from '../services/api';
import { formatRelativeTime } from '../utils/dateUtils';
import { useWebSocketContext } from '../contexts/WebSocketContext';

interface ChatMessage {
  id: string;
  userId: string;
  userNickname: string;
  content: string;
  createdAt: string;
  userAvatarUrl?: string;
  isSelf?: boolean;
}

interface ChatRoomInfo {
  id: string;
  commentId: string;
}

const ChatRoomPage: React.FC = () => {
  const { chatRoomId } = useParams<{ chatRoomId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const projectSlug = searchParams.get('project') || '';
  
  const { 
    isConnected, 
    onlineUsers, 
    joinChatRoom, 
    leaveChatRoom, 
    sendChatMessage: wsSendChatMessage 
  } = useWebSocketContext();
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatRoomInfo, setChatRoomInfo] = useState<ChatRoomInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const currentUserId = localStorage.getItem('userId');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 加载聊天记录
  useEffect(() => {
    const fetchChatRoom = async () => {
      if (!chatRoomId) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const response = await commentAPI.getChatRoomMessages(chatRoomId);
        
        const chatMessages: ChatMessage[] = response.data.messages.map((msg: any) => ({
          ...msg,
          isSelf: msg.userId === currentUserId
        }));
        
        setMessages(chatMessages);
        setChatRoomInfo(response.data.chatRoom || null);
      } catch (err: any) {
        console.error('获取聊天记录失败:', err);
        setError(err.response?.data?.message || '加载聊天记录失败，请稍后再试');
      } finally {
        setLoading(false);
      }
    };

    fetchChatRoom();
  }, [chatRoomId, currentUserId]);

  // 加入/离开聊天室
  useEffect(() => {
    if (chatRoomId && isConnected) {
      joinChatRoom(chatRoomId);
    }
    
    return () => {
      if (chatRoomId && isConnected) {
        leaveChatRoom(chatRoomId);
      }
    };
  }, [chatRoomId, isConnected, joinChatRoom, leaveChatRoom]);

  // 监听 WebSocket 消息
  useEffect(() => {
    if (!isConnected) return;
    
    // 通过轮询检查新消息（简化实现，实际项目中可以在 context 中添加消息回调）
    const interval = setInterval(async () => {
      if (!chatRoomId) return;
      
      try {
        const response = await commentAPI.getChatRoomMessages(chatRoomId);
        const newMessages: ChatMessage[] = response.data.messages.map((msg: any) => ({
          ...msg,
          isSelf: msg.userId === currentUserId
        }));
        
        // 检查是否有新消息
        if (newMessages.length > messages.length) {
          setMessages(newMessages);
        }
      } catch (err) {
        // 忽略错误
      }
    }, 3000);
    
    return () => clearInterval(interval);
  }, [chatRoomId, isConnected, currentUserId, messages.length]);

  // 自动滚动到最新消息
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // 发送消息（同时发送到 API 和 WebSocket）
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !chatRoomId) return;
    
    const messageContent = newMessage.trim();
    const messageId = Date.now().toString() + Math.floor(Math.random() * 1000).toString();
    
    // 先添加到本地显示
    const tempMessage: ChatMessage = {
      id: messageId,
      userId: currentUserId || '',
      userNickname: '我',
      content: messageContent,
      createdAt: new Date().toISOString(),
      isSelf: true
    };
    setMessages(prev => [...prev, tempMessage]);
    
    setNewMessage('');
    setSending(true);
    
    try {
      // 发送到 WebSocket（实时）
      wsSendChatMessage(chatRoomId, messageContent, messageId);
      
      // 同时保存到数据库
      await commentAPI.sendChatMessage(chatRoomId, messageContent);
    } catch (err: any) {
      console.error('发送消息失败:', err);
      setError(err.response?.data?.message || '发送消息失败，请稍后再试');
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const goBack = () => {
    if (projectSlug) {
      navigate(`/projects/${projectSlug}`);
    } else {
      navigate(-1);
    }
  };

  if (loading && messages.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: 'background.default' }}>
      {/* 顶部导航栏 */}
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar>
          <IconButton edge="start" onClick={goBack} sx={{ mr: 2 }}>
            <ArrowBack />
          </IconButton>
          <Chat sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            在线讨论
          </Typography>
          {/* 显示在线成员头像 */}
          {isConnected && onlineUsers.length > 0 && (
            <Stack direction="row" spacing={-1} sx={{ mr: 2 }}>
              {onlineUsers.slice(0, 5).map((userId, index) => (
                <Avatar 
                  key={userId} 
                  sx={{ 
                    width: 28, 
                    height: 28, 
                    border: '2px solid white',
                    fontSize: '12px',
                    zIndex: 5 - index
                  }}
                >
                  {userId.charAt(0).toUpperCase()}
                </Avatar>
              ))}
              {onlineUsers.length > 5 && (
                <Avatar sx={{ width: 28, height: 28, bgcolor: 'grey.500', fontSize: '10px' }}>
                  +{onlineUsers.length - 5}
                </Avatar>
              )}
            </Stack>
          )}
          {/* 连接状态 */}
          <Chip 
            label={isConnected ? '已连接' : '未连接'} 
            color={isConnected ? 'success' : 'default'} 
            size="small" 
            sx={{ mr: 1 }}
          />
        </Toolbar>
      </AppBar>

      {/* 错误提示 */}
      {error && (
        <Alert severity="error" sx={{ m: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* 消息列表 */}
      <Paper 
        elevation={0}
        sx={{ 
          flexGrow: 1, 
          overflow: 'auto', 
          p: 2,
          bgcolor: 'background.paper',
          borderRadius: 0
        }}
      >
        {messages.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Typography color="text.secondary">
              暂无消息，开始讨论吧！
            </Typography>
          </Box>
        ) : (
          <Box>
            {messages.map((message, index) => {
              const showTimeDivider = index === 0 || 
                new Date(message.createdAt).getTime() - new Date(messages[index - 1].createdAt).getTime() > 5 * 60 * 1000;
              
              return (
                <React.Fragment key={message.id}>
                  {showTimeDivider && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        {formatRelativeTime(message.createdAt)}
                      </Typography>
                    </Box>
                  )}
                  
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: message.isSelf ? 'row-reverse' : 'row',
                      alignItems: 'flex-start',
                      mb: 2,
                      gap: 1
                    }}
                  >
                    <Avatar 
                      src={message.userAvatarUrl}
                      sx={{ width: 32, height: 32 }}
                    >
                      {message.userNickname?.charAt(0).toUpperCase() || '?'}
                    </Avatar>
                    
                    <Box sx={{ maxWidth: '70%' }}>
                      {!message.isSelf && (
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                          {message.userNickname}
                        </Typography>
                      )}
                      
                      <Paper
                        elevation={1}
                        sx={{
                          p: 1.5,
                          borderRadius: 2,
                          bgcolor: message.isSelf ? 'primary.main' : 'action.hover',
                          color: message.isSelf ? 'white' : 'text.primary',
                          borderTopRightRadius: message.isSelf ? 0 : 16,
                          borderTopLeftRadius: message.isSelf ? 16 : 0,
                          wordBreak: 'break-word',
                          whiteSpace: 'pre-wrap'
                        }}
                      >
                        <Typography variant="body2">
                          {message.content}
                        </Typography>
                      </Paper>
                    </Box>
                  </Box>
                </React.Fragment>
              );
            })}
            <div ref={messagesEndRef} />
          </Box>
        )}
      </Paper>

      {/* 消息输入框 */}
      <Paper 
        elevation={3}
        sx={{ 
          p: 2, 
          borderRadius: 0,
          bgcolor: 'background.paper'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
          <TextField
            fullWidth
            multiline
            minRows={1}
            maxRows={6}
            placeholder="输入消息..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            sx={{ 
              '& .MuiOutlinedInput-root': {
                borderRadius: '24px',
              }
            }}
          />
          <IconButton 
            color="primary" 
            disabled={!newMessage.trim() || sending}
            onClick={handleSendMessage}
            sx={{ 
              bgcolor: 'primary.main',
              color: 'white',
              '&:hover': {
                bgcolor: 'primary.dark',
              },
              '&:disabled': {
                bgcolor: 'action.disabledBackground',
                color: 'action.disabled',
              }
            }}
          >
            <Send />
          </IconButton>
        </Box>
      </Paper>
    </Box>
  );
};

export default ChatRoomPage;
