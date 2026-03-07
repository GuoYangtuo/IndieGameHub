import React, { useState, useRef } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  IconButton,
  Alert,
  Button,
  Paper,
  TextField,
  Collapse,
} from '@mui/material';
import { Theme } from '@mui/material/styles';
import { Send, Delete, Forum, Reply, Chat, ArrowForward } from '@mui/icons-material';
import { formatRelativeTime } from '../../utils/dateUtils';
import DebouncedInput from '../../components/DebouncedInput';
import { useNavigate } from 'react-router-dom';
import { commentAPI } from '../../services/api';

interface Comment {
  id: string;
  userId: string;
  userNickname: string;
  content: string;
  createdAt: string;
  userAvatarUrl?: string;
  parentId?: string | null;
  replies?: Comment[];
  chatRoomId?: string | null;
}

interface ProjectCommentsProps {
  comments: Comment[];
  user: any | null;
  commentContent: string;
  isAddingComment: boolean;
  commentError: string | null;
  onCommentContentChange: (content: string) => void;
  onAddComment: () => void;
  onDeleteComment: (commentId: string) => void;
  onReplyComment?: (commentId: string, content: string) => Promise<void>;
  projectSlug?: string;
}

// 为DebouncedInput组件定义接口
interface DebouncedInputHandle {
  resetValue: () => void;
  inputElement: HTMLInputElement | HTMLTextAreaElement | null;
}

const ProjectComments: React.FC<ProjectCommentsProps> = ({
  comments,
  user,
  commentContent,
  isAddingComment,
  commentError,
  onCommentContentChange,
  onAddComment,
  onDeleteComment,
  onReplyComment,
  projectSlug = ''
}) => {
  // 添加对输入框的引用
  const inputRef = useRef<DebouncedInputHandle>(null);
  const navigate = useNavigate();

  // 回复相关状态
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  // 自定义清空函数
  const clearInput = () => {
    // 使用组件提供的resetValue方法重置输入
    if (inputRef.current) {
      inputRef.current.resetValue();
    }
  };

  // 处理回复按钮点击
  const handleReplyClick = (commentId: string) => {
    if (replyingTo === commentId) {
      setReplyingTo(null);
      setReplyContent('');
    } else {
      setReplyingTo(commentId);
      setReplyContent('');
    }
  };

  // 处理回复某个回复（会提示进入在线讨论区）
  const handleReplyToReplyClick = async (commentId: string) => {
    // 检查是否已经有chatRoomId
    const comment = comments.find(c => c.id === commentId);
    if (comment?.chatRoomId) {
      // 已有讨论区，直接跳转（传递初始消息）
      goToChatRoom(comment.chatRoomId);
    } else {
      // 需要创建讨论区
      if (!onReplyComment) {
        alert('无法创建在线讨论区，请稍后再试');
        return;
      }
      
      // 提示用户进入讨论区
      const confirmed = window.confirm('讨论已升级为在线讨论区，是否进入？');
      if (confirmed && projectSlug) {
        // 创建或获取聊天房间
        try {
          const response = await commentAPI.createOrGetChatRoom(commentId);
          const chatRoomId = response.data.chatRoomId;
          
          // 跳转到讨论区（传递初始消息）
          goToChatRoom(chatRoomId, comment);
        } catch (error) {
          console.error('创建讨论区失败:', error);
          alert('创建在线讨论区失败，请稍后再试');
        }
      }
    }
  };

  // 提交回复
  const handleSubmitReply = async (parentId: string) => {
    if (!replyContent.trim() || !onReplyComment) return;
    
    setIsSubmittingReply(true);
    try {
      await onReplyComment(parentId, replyContent);
      setReplyingTo(null);
      setReplyContent('');
    } catch (error) {
      console.error('回复失败:', error);
    } finally {
      setIsSubmittingReply(false);
    }
  };

  // 跳转到在线讨论区
  const goToChatRoom = (chatRoomId: string) => {
    const url = `/chat/${chatRoomId}?project=${projectSlug}`;
    navigate(url);
  };

  // 自定义提交评论函数
  const handleAddComment = () => {
    onAddComment();
    // 提交后立即清空输入框
    clearInput();
  };
  
  return (
    <Paper 
      elevation={0} 
      sx={{ 
        mb: 3, 
        p: 2, 
        borderRadius: 1,
        border: theme => `1px solid ${theme.palette.divider}`,
        transition: 'box-shadow 0.2s ease-in-out',
        '&:hover': {
          boxShadow: theme => theme.palette.mode === 'dark' 
            ? '0 3px 6px rgba(149, 157, 165, 0.1)' 
            : '0 3px 6px rgba(149, 157, 165, 0.2)',
        }
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Forum fontSize="small" sx={{ mr: 1, color: 'primary.main' }} />
        <Typography variant="h6">讨论区</Typography>
      </Box>
      
      {comments.length === 0 ? (
        <Alert severity="info" sx={{ mb: 2 }}>暂无评论，快来发表第一条评论吧！</Alert>
      ) : (
        <List sx={{ mb: 2 }}>
          {comments.map((comment) => (
            <Box key={comment.id}>
              <ListItem 
                divider 
                sx={{
                  '&:last-child': {
                    borderBottom: 'none'
                  }
                }}
              >
                <ListItemAvatar>
                  <Avatar src={comment.userAvatarUrl}>
                    {comment.userNickname.charAt(0).toUpperCase()}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="subtitle2">{comment.userNickname}</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          {formatRelativeTime(comment.createdAt)}
                        </Typography>
                        {user && (
                          <IconButton 
                            size="small" 
                            onClick={() => handleReplyClick(comment.id)}
                            sx={{ ml: 1 }}
                          >
                            <Reply fontSize="small" />
                          </IconButton>
                        )}
                        {user && user.id === comment.userId && (
                          <IconButton 
                            size="small" 
                            onClick={() => onDeleteComment(comment.id)}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        )}
                      </Box>
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        {comment.content}
                      </Typography>
                      
                      {/* 回复输入框 */}
                      <Collapse in={replyingTo === comment.id}>
                        <Box sx={{ mt: 2, pl: 2, borderLeft: '2px solid', borderColor: 'primary.main' }}>
                          <TextField
                            fullWidth
                            size="small"
                            placeholder="写下你的回复..."
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            multiline
                            minRows={1}
                            maxRows={4}
                            sx={{ 
                              '& .MuiOutlinedInput-root': {
                                borderRadius: '12px',
                              }
                            }}
                          />
                          <Box sx={{ mt: 1, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                            <Button 
                              size="small" 
                              onClick={() => handleReplyClick(comment.id)}
                            >
                              取消
                            </Button>
                            <Button 
                              size="small" 
                              variant="contained"
                              disabled={!replyContent.trim() || isSubmittingReply || !onReplyComment}
                              onClick={() => handleSubmitReply(comment.id)}
                              startIcon={<Send />}
                            >
                              回复
                            </Button>
                          </Box>
                        </Box>
                      </Collapse>
                      
                      {/* 直接显示的单级回复 */}
                      {comment.replies && comment.replies.length > 0 && (
                        <Box sx={{ mt: 2, pl: 2, borderLeft: '2px solid', borderColor: 'divider' }}>
                          {comment.replies.map((reply) => (
                            <Box key={reply.id} sx={{ py: 1 }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="subtitle2" sx={{ fontSize: '0.85rem' }}>
                                  {reply.userNickname}
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <Typography variant="caption" color="text.secondary">
                                    {formatRelativeTime(reply.createdAt)}
                                  </Typography>
                                  {user && (
                                    <IconButton 
                                      size="small" 
                                      onClick={() => handleReplyToReplyClick(comment.id)}
                                      sx={{ ml: 0.5 }}
                                    >
                                      <Reply fontSize="small" />
                                    </IconButton>
                                  )}
                                </Box>
                              </Box>
                              <Typography variant="body2" sx={{ mt: 0.5 }}>
                                {reply.content}
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      )}
                      
                      {/* 有chatRoomId时显示跳转到在线讨论区的链接 */}
                      {comment.chatRoomId && (
                        <Box sx={{ mt: 2 }}>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<Chat />}
                            endIcon={<ArrowForward />}
                            onClick={() => goToChatRoom(comment.chatRoomId!, comment)}
                          >
                            查看更多回复
                          </Button>
                        </Box>
                      )}
                    </Box>
                  }
                />
              </ListItem>
              
              {/* 如果有回复但没有chatRoomId，显示提示按钮可以进入在线讨论区 */}
              {comment.replies && comment.replies.length > 0 && !comment.chatRoomId && (
                <Box sx={{ pl: 8, pb: 2 }}>
                  <Button
                    size="small"
                    startIcon={<Chat />}
                    onClick={() => {
                      // 提示用户进入在线讨论区
                      alert('讨论已升级为在线讨论区，点击下方链接继续参与讨论');
                    }}
                  >
                    进入在线讨论区继续交流
                  </Button>
                </Box>
              )}
            </Box>
          ))}
        </List>
      )}
      
      {user && (
        <Box sx={{ display: 'flex', mt: 2 }}>
          <DebouncedInput
            ref={inputRef}
            fullWidth
            placeholder="发表评论..."
            value={commentContent}
            onDebouncedChange={(value) => onCommentContentChange(value)}
            variant="outlined"
            size="small"
            multiline
            minRows={1}
            maxRows={6}
            sx={{ 
              '& .MuiOutlinedInput-root': {
                borderRadius: '24px',
                paddingRight: '14px'
              }
            }}
          />
          <IconButton
            color="primary"
            disabled={!commentContent.trim() || isAddingComment}
            onClick={handleAddComment}
            sx={{ ml: 1 }}
          >
            <Send />
          </IconButton>
        </Box>
      )}
      
      {commentError && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {commentError}
        </Alert>
      )}
    </Paper>
  );
};

export default ProjectComments;
