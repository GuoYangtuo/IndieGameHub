import React, { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Box,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert
} from '@mui/material';
import { Visibility, LocalAtm, Lock, LockOpen, Delete, PlaylistAdd, MonetizationOn, Person } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { proposalAPI } from '../services/api';
import { formatDate } from '../utils/dateUtils';
import { Theme } from '@mui/material/styles';

interface ProposalCardProps {
  id: string;
  title: string;
  description: string;
  createdBy: string;
  creatorNickname?: string;
  status: 'open' | 'closed' | 'queued' | 'completed';
  likes: string[];
  createdAt: string;
  bountyTotal?: number;
  category?: string;
  onLike?: (e: React.MouseEvent) => void;
  onClose?: (e: React.MouseEvent) => void;
  onDelete?: (e: React.MouseEvent) => void;
  onBountyAdd?: (amount: number) => void;
  onAddToQueue?: (e: React.MouseEvent) => void;
  isCreator?: boolean;
  isMember?: boolean;
  viewMode?: 'card' | 'list';
  onOpenDetail?: (e: React.MouseEvent) => void;
}

const ProposalCard: React.FC<ProposalCardProps> = ({
  id,
  title,
  description,
  createdBy,
  creatorNickname,
  status,
  likes,
  createdAt,
  bountyTotal = 0,
  category = '',
  onLike,
  onClose,
  onDelete,
  onBountyAdd,
  onAddToQueue,
  isCreator = false,
  isMember = false,
  viewMode = 'card',
  onOpenDetail
}) => {
  const { user } = useAuth();
  
  // 处理点赞
  const handleLike = (e: React.MouseEvent) => {
    if (!user) return;
    e.stopPropagation();
    
    try {
      // 检查当前是否已点赞
      const isLiked = likes.includes(user.id);
      
      // 通知父组件处理点赞逻辑和状态更新
      if (onLike) {
        onLike(e);
      }
    } catch (error) {
      console.error('点赞处理失败:', error);
    }
  };

  // 处理点击卡片，打开详情但不自动点赞
  const handleCardClick = (e: React.MouseEvent) => {
    // 检查事件源，如果是按钮或其他交互元素，不触发卡片点击
    if ((e.target as HTMLElement).closest('button') || 
        (e.target as HTMLElement).closest('a')) {
      return;
    }
    
    // 触发父组件提供的点击事件（打开详情等）
    if (onOpenDetail) {
      onOpenDetail(e);
    }
  };

  // 处理关闭提案
  const handleClose = async (e: React.MouseEvent) => {
    if (!user || (!isCreator && !isMember)) return;
    e.stopPropagation();
    
    try {
      await proposalAPI.closeProposal(id);
      if (onClose) onClose(e);
    } catch (error) {
      console.error('关闭提案失败:', error);
    }
  };

  // 处理删除提案
  const handleDelete = async (e: React.MouseEvent) => {
    if (!user || !isCreator) return;
    e.stopPropagation();
    
    try {
      if (onDelete) onDelete(e);
    } catch (error) {
      console.error('删除提案失败:', error);
    }
  };

  // 检查用户是否已点赞
  const hasLiked = user && likes && Array.isArray(likes) ? likes.includes(user.id) : false;

  // 处理添加到任务队列
  const handleAddToQueue = async (e: React.MouseEvent) => {
    if (!user || !isMember || status !== 'open') return;
    e.stopPropagation();
    
    try {
      if (onAddToQueue) onAddToQueue(e);
    } catch (error) {
      console.error('添加到任务队列失败:', error);
    }
  };

  // 获取提案类别对应的边框颜色
  const getCategoryBorderColor = () => {
    switch (category) {
      case '功能建议':
        return (theme: Theme) => theme.palette.mode === 'dark' ? '#1f6feb' : '#0969da'; // 蓝色
      case '数值调整':
        return (theme: Theme) => theme.palette.mode === 'dark' ? '#d29922' : '#bf8700'; // 橙色
      case 'bug反馈':
        return (theme: Theme) => theme.palette.mode === 'dark' ? '#f85149' : '#cf222e'; // 红色
      case '艺术性相关':
        return (theme: Theme) => theme.palette.mode === 'dark' ? '#8957e5' : '#8250df'; // 紫色
      default:
        return (theme: Theme) => theme.palette.mode === 'dark' ? '#30363d' : '#d0d7de'; // 默认灰色
    }
  };

  // 获取提案状态对应的徽章颜色
  const getStatusColor = () => {
    switch (status) {
      case 'open':
        return 'success';
      case 'closed':
        return 'default';
      case 'queued':
        return 'info';
      case 'completed':
        return 'success';
      default:
        return 'default';
    }
  };

  // 获取提案状态对应的徽章文本
  const getStatusText = () => {
    switch (status) {
      case 'open':
        return '开放中';
      case 'closed':
        return '已关闭';
      case 'queued':
        return '队列中';
      case 'completed':
        return '已完成';
      default:
        return '未知状态';
    }
  };

  // 检查提案是否是已关闭或已完成状态
  const isInactiveProposal = status === 'closed' || status === 'completed';

  if (viewMode === 'list') {
    // 列表视图
    return (
      <Card sx={{ 
        mb: 1, 
        opacity: isInactiveProposal ? 0.7 : 1,
        filter: isInactiveProposal ? 'grayscale(40%)' : 'none',
        borderLeft: `4px solid ${getCategoryBorderColor()}`,
        borderRadius: 2,
        transition: 'box-shadow 0.2s ease',
        '&:hover': {
          boxShadow: (theme: Theme) => theme.palette.mode === 'dark' 
            ? '0 3px 6px rgba(149, 157, 165, 0.2)'
            : '0 3px 6px rgba(149, 157, 165, 0.3)'
        }
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', p: 2 }} onClick={handleCardClick}>
          <Box sx={{ flexGrow: 1 }}>
            <Typography 
              variant="h6" 
              sx={{ 
                fontWeight: 600,
                color: (theme: Theme) => isInactiveProposal 
                  ? theme.palette.text.secondary 
                  : (theme.palette.mode === 'dark' ? '#c9d1d9' : '#24292f'),
                mb: 0.5
              }}
            >
              {title}
            </Typography>
            <Typography 
              variant="body2" 
              color="text.secondary" 
              sx={{ 
                mt: 0.5, 
                mb: 1,
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical'
              }}
            >
              {description.length > 100 ? `${description.substring(0, 100)}...` : description}
            </Typography>
            {/* 添加创建时间和创建人信息 */}
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
              <Person 
                fontSize="small" 
                sx={{ 
                  mr: 0.5, 
                  color: isMember ? 'primary.main' : 'text.secondary',
                  fontSize: '0.9rem'
                }} 
              />
              <Typography 
                variant="caption" 
                sx={{ 
                  color: isMember ? 'primary.main' : 'text.secondary',
                  fontWeight: isMember ? 'medium' : 'normal',
                  fontSize: '0.75rem'
                }}
              >
                {creatorNickname} • {formatDate(createdAt)}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', ml: 2 }}>
            {bountyTotal > 0 && (
              <Tooltip title="总悬赏金额">
                <Chip 
                  icon={<MonetizationOn fontSize="small" />} 
                  label={`${bountyTotal} 金币`}
                  color="primary"
                  size="small"
                  sx={{ 
                    mr: 1,
                    height: 24,
                    fontWeight: 500
                  }}
                />
              </Tooltip>
            )}
            
            <Chip 
              size="small"
              label={getStatusText()}
              color={getStatusColor()}
              sx={{ 
                mr: 1,
                height: 24,
                fontWeight: 500
              }}
            />
            
            {user && (
              <Tooltip title={hasLiked ? "取消感兴趣" : "感兴趣"}>
                <IconButton
                  size="small"
                  color={hasLiked ? "primary" : "default"}
                  onClick={handleLike}
                  sx={{
                    p: 0.75,
                    borderRadius: 1
                  }}
                >
                  <Visibility fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            
            {user && isMember && status === 'open' && (
              <Tooltip title="添加到任务队列">
                <IconButton
                  size="small"
                  color="info"
                  onClick={handleAddToQueue}
                  sx={{ 
                    ml: 1,
                    p: 0.75,
                    borderRadius: 1
                  }}
                >
                  <PlaylistAdd fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            
            {user && isMember && status === 'open' && (
              <Tooltip title="关闭提案">
                <IconButton 
                  size="small"
                  onClick={handleClose}
                  sx={{ 
                    ml: 1,
                    p: 0.75,
                    borderRadius: 1
                  }}
                >
                  <Lock fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            
            {/* 修改为允许创建者删除已关闭的提案 */}
            {user && isCreator && (status === 'open' || status === 'closed') && (
              <Tooltip title="删除提案">
                <IconButton 
                  size="small"
                  color="error"
                  onClick={handleDelete}
                  sx={{ 
                    ml: 1,
                    p: 0.75,
                    borderRadius: 1
                  }}
                >
                  <Delete fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>
      </Card>
    );
  }

  // 卡片视图
  return (
    <Card 
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        borderTop: `3px solid ${getCategoryBorderColor()}`,
        opacity: isInactiveProposal ? 0.7 : 1,
        filter: isInactiveProposal ? 'grayscale(40%)' : 'none',
        transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: (theme: Theme) => theme.palette.mode === 'dark' 
            ? '0 8px 24px rgba(149, 157, 165, 0.2)'
            : '0 8px 24px rgba(149, 157, 165, 0.3)'
        }
      }}
      onClick={handleCardClick}
    >
      <CardContent sx={{ p: 2, flexGrow: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0 }}>
          <Chip 
            size="small"
            label={getStatusText()}
            color={getStatusColor()}
            sx={{ 
              height: 22,
              fontSize: '0.7rem',
              fontWeight: 'medium'
            }}
          />
          {category && (
            <Chip 
              size="small"
              label={category}
              variant="outlined"
              sx={{ 
                height: 22, 
                fontSize: '0.7rem',
                borderColor: getCategoryBorderColor(),
                color: getCategoryBorderColor()
              }}
            />
          )}
        </Box>
        
        <Typography 
          variant="h6" 
          component="h3" 
          sx={{ 
            mt: 0.5, 
            mb: 0.5, 
            fontSize: '1.1rem',
            fontWeight: 600,
            lineHeight: 1.3,
            color: isInactiveProposal ? 'text.secondary' : 'text.primary',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical'
          }}
        >
          {title}
        </Typography>
        
        <Typography 
          variant="body2" 
          color="text.secondary"
          sx={{ 
            mb: 0.5,
            height: '3rem',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical'
          }}
        >
          {description.length > 80 ? `${description.substring(0, 80)}...` : description}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', mt: 'auto' }}>
          <Person 
            fontSize="small" 
            sx={{ 
              mr: 0.5, 
              color: 'text.secondary',
              fontSize: '0.9rem'
            }} 
          />
          <Typography 
            variant="caption" 
            sx={{ 
              color: 'text.secondary',
              fontSize: '0.75rem'
            }}
          >
            {creatorNickname} • {formatDate(createdAt)}
          </Typography>
        </Box>
      </CardContent>

      <CardActions 
        sx={{ 
          p: 1, 
          pt: 0.5,
          mt: 0.5,
          bgcolor: (theme: Theme) => theme.palette.mode === 'dark' ? 'rgba(13, 17, 23, 0.3)' : 'rgba(246, 248, 250, 0.5)',
          borderTop: (theme: Theme) => `1px solid ${theme.palette.mode === 'dark' ? '#21262d' : '#eaecef'}`
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Tooltip title={hasLiked ? "取消感兴趣" : "感兴趣"}>
              <IconButton
                size="small"
                color={hasLiked ? "primary" : "default"}
                onClick={handleLike}
                sx={{ mr: 1, p: 0.5 }}
              >
                <Visibility fontSize="small" />
              </IconButton>
            </Tooltip>
            <Typography variant="caption" color="text.secondary">
              {likes.length}
            </Typography>
            
            {bountyTotal > 0 && (
              <Chip 
                icon={<MonetizationOn fontSize="small" />} 
                label={`${bountyTotal} 金币`}
                color="primary"
                size="small"
                sx={{ 
                  fontWeight: 500,
                  height: 24,
                  ml: 2
                }}
              />
            )}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {user && isMember && status === 'open' && (
              <Tooltip title="添加到任务队列">
                <IconButton
                  size="small"
                  color="info"
                  onClick={handleAddToQueue}
                  sx={{ ml: 1, p: 0.5 }}
                >
                  <PlaylistAdd fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            
            {user && isMember && status === 'open' && (
              <Tooltip title="关闭提案">
                <IconButton 
                  size="small"
                  onClick={handleClose}
                  sx={{ ml: 1, p: 0.5 }}
                >
                  <Lock fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            
            {/* 修改为允许创建者删除已关闭的提案 */}
            {user && isCreator && (status === 'open' || status === 'closed') && (
              <Tooltip title="删除提案">
                <IconButton 
                  size="small"
                  color="error"
                  onClick={handleDelete}
                  sx={{ ml: 1, p: 0.5 }}
                >
                  <Delete fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>
      </CardActions>
    </Card>
  );
};

export default ProposalCard; 