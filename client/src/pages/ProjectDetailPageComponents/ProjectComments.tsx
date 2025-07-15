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
  Paper
} from '@mui/material';
import { Theme } from '@mui/material/styles';
import { Send, Delete, Forum } from '@mui/icons-material';
import { formatRelativeTime } from '../../utils/dateUtils';
import DebouncedInput from '../../components/DebouncedInput';

interface Comment {
  id: string;
  userId: string;
  userNickname: string;
  content: string;
  createdAt: string;
  userAvatarUrl?: string;
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
  onDeleteComment
}) => {
  // 添加对输入框的引用
  const inputRef = useRef<DebouncedInputHandle>(null);

  // 自定义清空函数
  const clearInput = () => {
    // 使用组件提供的resetValue方法重置输入
    if (inputRef.current) {
      inputRef.current.resetValue();
    }
  };

  // 自定义提交评论函数
  const handleAddComment = () => {
    onAddComment();
    // 提交后立即清空输入框
    clearInput();
  };

  console.log('comments', comments);
  
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
            <ListItem 
              key={comment.id} 
              divider 
              secondaryAction={
                user && user.id === comment.userId && (
                  <IconButton 
                    edge="end" 
                    size="small" 
                    onClick={() => onDeleteComment(comment.id)}
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                )
              }
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
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="subtitle2">{comment.userNickname}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatRelativeTime(comment.createdAt)}
                    </Typography>
                  </Box>
                }
                secondary={comment.content}
              />
            </ListItem>
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
