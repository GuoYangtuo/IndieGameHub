import React, { useState, useRef } from 'react';
import {
  Box,
  Typography,
  Alert,
  Button,
  Paper,
  TextField,
  Collapse,
  Chip,
  Avatar,
  IconButton,
} from '@mui/material';
import { Theme } from '@mui/material/styles';
import { Send, Delete, Forum, ChatBubbleOutline, Chat, ArrowForward } from '@mui/icons-material';
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
  projectCreatedBy?: string;
  projectMemberIds?: string[];
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
  projectSlug = '',
  projectCreatedBy,
  projectMemberIds = []
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

  // 跳转到用户主页
  const goToUserProfile = (userId: string) => {
    navigate(`/user/${userId}`);
  };

  // 检查用户是否为项目创建者
  const isUserCreator = (userId: string) => {
    return projectCreatedBy === userId;
  };

  // 检查用户是否为项目成员
  const isUserMember = (userId: string) => {
    return projectMemberIds.includes(userId);
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
      const confirmed = window.confirm('创建在线聊天室继续讨论？');
      if (confirmed && projectSlug) {
        // 创建或获取聊天房间
        try {
          const response = await commentAPI.createOrGetChatRoom(commentId);
          const chatRoomId = response.data.chatRoomId;
          
          // 跳转到讨论区（传递初始消息）
          goToChatRoom(chatRoomId);
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
        <Box sx={{ mb: 2 }}>
          {comments.map((comment) => (
            <Box key={comment.id}>
              {/* 评论主体 - 桌面端：头像+内容在左，操作按钮在右；移动端：垂直布局 */}
              <Box sx={{ 
                display: 'flex', 
                gap: 2, 
                py: 2, 
                borderBottom: '1px solid', 
                borderColor: 'divider',
                flexDirection: { xs: 'column', md: 'row' }
              }}>
                {/* 头像 - 桌面端放在内容左侧，移动端隐藏（昵称行会显示小头像） */}
                <Box 
                  sx={{ 
                    cursor: 'pointer', 
                    flexShrink: 0,
                    display: { xs: 'none', md: 'block' }
                  }}
                  onClick={() => goToUserProfile(comment.userId)}
                >
                  <Avatar 
                    src={comment.userAvatarUrl} 
                    sx={{ width: 40, height: 40 }}
                  >
                    {comment.userNickname.charAt(0).toUpperCase()}
                  </Avatar>
                </Box>
                
                {/* 内容区域 */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  {/* 移动端：头像和昵称在同一行 */}
                  <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1, mb: 1 }}>
                    <Box 
                      sx={{ cursor: 'pointer', flexShrink: 0 }}
                      onClick={() => goToUserProfile(comment.userId)}
                    >
                      <Avatar 
                        src={comment.userAvatarUrl} 
                        sx={{ width: 32, height: 32 }}
                      >
                        {comment.userNickname.charAt(0).toUpperCase()}
                      </Avatar>
                    </Box>
                    <Typography 
                      variant="subtitle2" 
                      sx={{ cursor: 'pointer', '&:hover': { color: 'primary.main' } }}
                      onClick={() => goToUserProfile(comment.userId)}
                    >
                      {comment.userNickname}
                    </Typography>
                    {isUserCreator(comment.userId) && (
                      <Chip 
                        label="创建者" 
                        size="small" 
                        color="primary" 
                        variant="outlined"
                        sx={{ height: 16, fontSize: '0.6rem' }}
                      />
                    )}
                    {isUserMember(comment.userId) && !isUserCreator(comment.userId) && (
                      <Chip 
                        label="成员" 
                        size="small" 
                        color="secondary" 
                        variant="outlined"
                        sx={{ height: 16, fontSize: '0.6rem' }}
                      />
                    )}
                    <Typography variant="caption" color="text.secondary">
                      {formatRelativeTime(comment.createdAt)}
                    </Typography>
                  </Box>

                  {/* 桌面端：昵称和标签 */}
                  <Box 
                    sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 1, cursor: 'pointer', flexWrap: 'wrap' }}
                    onClick={() => goToUserProfile(comment.userId)}
                  >
                    <Typography variant="subtitle2" sx={{ '&:hover': { color: 'primary.main' } }}>
                      {comment.userNickname}
                    </Typography>
                    {isUserCreator(comment.userId) && (
                      <Chip 
                        label="创建者" 
                        size="small" 
                        color="primary" 
                        variant="outlined"
                        sx={{ height: 18, fontSize: '0.65rem' }}
                      />
                    )}
                    {isUserMember(comment.userId) && !isUserCreator(comment.userId) && (
                      <Chip 
                        label="成员" 
                        size="small" 
                        color="secondary" 
                        variant="outlined"
                        sx={{ height: 18, fontSize: '0.65rem' }}
                      />
                    )}
                    <Typography variant="caption" color="text.secondary">
                      {formatRelativeTime(comment.createdAt)}
                    </Typography>
                  </Box>
                  
                  {/* 评论内容 */}
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    {comment.content}
                  </Typography>
                  
                  {/* 移动端：评论操作按钮 - 放在评论下方 */}
                  <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1, mt: 1 }}>
                    {user && (
                      <IconButton 
                        size="small" 
                        onClick={() => handleReplyClick(comment.id)}
                      >
                        <ChatBubbleOutline fontSize="small" />
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
                  
                  {/* 回复列表 - 统一显示在评论下方 */}
                  {comment.replies && comment.replies.length > 0 && (
                    <Box sx={{ mt: 2, pl: 2, borderLeft: '2px solid', borderColor: 'divider' }}>
                      {comment.replies.map((reply) => (
                        <Box 
                          key={reply.id} 
                          sx={{ 
                            py: 1.5, 
                            borderBottom: '1px solid', 
                            borderColor: 'divider',
                            display: 'flex',
                            gap: 1.5,
                            flexDirection: { xs: 'column', md: 'row' }
                          }}
                        >
                          {/* 回复头像 - 桌面端显示，移动端隐藏 */}
                          <Box 
                            sx={{ 
                              cursor: 'pointer', 
                              flexShrink: 0,
                              display: { xs: 'none', md: 'block' }
                            }}
                            onClick={() => goToUserProfile(reply.userId)}
                          >
                            <Avatar 
                              src={reply.userAvatarUrl} 
                              sx={{ width: 32, height: 32 }}
                            >
                              {reply.userNickname.charAt(0).toUpperCase()}
                            </Avatar>
                          </Box>
                          
                          {/* 回复内容区域 */}
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            {/* 移动端：头像和昵称在同一行 */}
                            <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1, mb: 0.5 }}>
                              <Box 
                                sx={{ cursor: 'pointer', flexShrink: 0 }}
                                onClick={() => goToUserProfile(reply.userId)}
                              >
                                <Avatar 
                                  src={reply.userAvatarUrl} 
                                  sx={{ width: 24, height: 24 }}
                                >
                                  {reply.userNickname.charAt(0).toUpperCase()}
                                </Avatar>
                              </Box>
                              <Typography 
                                variant="subtitle2" 
                                sx={{ fontSize: '0.8rem', cursor: 'pointer', '&:hover': { color: 'primary.main' } }}
                                onClick={() => goToUserProfile(reply.userId)}
                              >
                                {reply.userNickname}
                              </Typography>
                              {isUserCreator(reply.userId) && (
                                <Chip 
                                  label="创建者" 
                                  size="small" 
                                  color="primary" 
                                  variant="outlined"
                                  sx={{ height: 14, fontSize: '0.5rem' }}
                                />
                              )}
                              {isUserMember(reply.userId) && !isUserCreator(reply.userId) && (
                                <Chip 
                                  label="成员" 
                                  size="small" 
                                  color="secondary" 
                                  variant="outlined"
                                  sx={{ height: 14, fontSize: '0.5rem' }}
                                />
                              )}
                              <Typography variant="caption" color="text.secondary">
                                {formatRelativeTime(reply.createdAt)}
                              </Typography>
                            </Box>

                            {/* 桌面端：回复者信息和标签 */}
                            <Box 
                              sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 1, cursor: 'pointer' }}
                              onClick={() => goToUserProfile(reply.userId)}
                            >
                              <Typography variant="subtitle2" sx={{ fontSize: '0.875rem', '&:hover': { color: 'primary.main' } }}>
                                {reply.userNickname}
                              </Typography>
                              {isUserCreator(reply.userId) && (
                                <Chip 
                                  label="创建者" 
                                  size="small" 
                                  color="primary" 
                                  variant="outlined"
                                  sx={{ height: 16, fontSize: '0.6rem' }}
                                />
                              )}
                              {isUserMember(reply.userId) && !isUserCreator(reply.userId) && (
                                <Chip 
                                  label="成员" 
                                  size="small" 
                                  color="secondary" 
                                  variant="outlined"
                                  sx={{ height: 16, fontSize: '0.6rem' }}
                                />
                              )}
                              <Typography variant="caption" color="text.secondary">
                                {formatRelativeTime(reply.createdAt)}
                              </Typography>
                            </Box>
                            
                            {/* 回复内容 */}
                            <Typography variant="body2" sx={{ mt: 0.25 }}>
                              {reply.content}
                            </Typography>
                            
                            {/* 移动端：回复操作按钮 - 放在内容下方 */}
                            <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                              {user && (
                                <IconButton 
                                  size="small" 
                                  onClick={() => handleReplyToReplyClick(comment.id)}
                                >
                                  <ChatBubbleOutline fontSize="small" />
                                </IconButton>
                              )}
                            </Box>
                          </Box>

                          {/* 桌面端：回复操作按钮 - 放在右侧 */}
                          <Box sx={{ 
                            display: { xs: 'none', md: 'flex' }, 
                            flexDirection: 'column', 
                            alignItems: 'center', 
                            justifyContent: 'flex-start',
                            gap: 0.25,
                            flexShrink: 0,
                            minWidth: 32
                          }}>
                            {user && (
                              <IconButton 
                                size="small" 
                                onClick={() => handleReplyToReplyClick(comment.id)}
                                title="回复"
                              >
                                <ChatBubbleOutline fontSize="small" />
                              </IconButton>
                            )}
                          </Box>
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
                        onClick={() => goToChatRoom(comment.chatRoomId!)}
                      >
                        查看更多讨论记录
                      </Button>
                    </Box>
                  )}
                </Box>

                {/* 桌面端：评论操作按钮 - 放在评论右侧 */}
                <Box sx={{ 
                  display: { xs: 'none', md: 'flex' }, 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'flex-start',
                  gap: 0.5,
                  flexShrink: 0,
                  minWidth: 40
                }}>
                  {user && user.id === comment.userId && (
                    <IconButton 
                      size="small" 
                      onClick={() => onDeleteComment(comment.id)}
                      title="删除"
                      color="error"
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  )}
                  {user && (
                    <IconButton 
                      size="small" 
                      onClick={() => handleReplyClick(comment.id)}
                      title="回复"
                    >
                      <ChatBubbleOutline fontSize="small" />
                    </IconButton>
                  )}
                </Box>
              </Box>
            </Box>
          ))}
        </Box>
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
