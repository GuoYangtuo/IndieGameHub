import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  TextField,
  IconButton,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Tooltip,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Divider
} from '@mui/material';
import { Delete, Send, Download, Lock, Close, MonetizationOn, Description, Category, AttachFile, Person, Comment, Edit, BugReport, Brush, Tune, AddCircleOutline } from '@mui/icons-material';
import { proposalAPI, commentAPI, userAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import MDEditor from '@uiw/react-md-editor';
import { formatDate, formatRelativeTime } from '../../utils/dateUtils';

interface Bounty {
  id: string;
  proposalId: string;
  userId: string;
  amount: number;
  createdAt: string;
  userNickname?: string;
}

interface Comment {
  id: string;
  proposalId: string;
  userId: string;
  userNickname: string;
  content: string;
  createdAt: string;
  userAvatarUrl?: string;
}

interface Proposal {
  id: string;
  title: string;
  description: string;
  createdBy: string;
  creatorNickname?: string;
  projectId: string;
  status: 'open' | 'closed' | 'queued' | 'completed';
  likes: string[];
  bountyTotal?: number;
  bounties?: Bounty[];
  createdAt: string;
  category?: string;
  attachments?: {
    name: string;
    url: string;
    size: number;
  }[];
  queuedAt?: string;
  queuedBy?: string;
  queuedByNickname?: string;
  comments?: Comment[];
}

interface ProposalDetailDialogProps {
  isDarkMode: boolean;
  open: boolean;
  onClose: () => void;
  proposal: Proposal | null;
  isMember: boolean;
  onProposalDelete: (proposalId: string) => void;
  onProposalClose: (proposalId: string) => void;
  onProposalUpdate: (updatedProposal: Proposal) => void;
  onOpenRechargeDialog?: () => void;
  onCommentAdded?: (proposalId: string, comment: Comment) => void;
  onCommentDeleted?: (proposalId: string, commentId: string) => void;
}

const ProposalDetailDialog: React.FC<ProposalDetailDialogProps> = ({
  isDarkMode,
  open,
  onClose,
  proposal,
  isMember,
  onProposalDelete,
  onProposalClose,
  onProposalUpdate,
  onOpenRechargeDialog,
  onCommentAdded,
  onCommentDeleted
}) => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  
  // 评论状态
  const [commentContent, setCommentContent] = useState('');
  const [commentText, setCommentText] = useState('');
  const [addingComment, setAddingComment] = useState(false);
  const [proposalComments, setProposalComments] = useState<Comment[]>([]);
  
  // 悬赏状态
  const [bountyAmount, setBountyAmount] = useState<number>(1);
  const [bountyDeadline, setBountyDeadline] = useState<string>('');
  const [bountyDialogOpen, setBountyDialogOpen] = useState(false);
  const [addingBounty, setAddingBounty] = useState(false);
  const [bountyError, setBountyError] = useState<string | null>(null);
  
  // 编辑状态
  const [isEditingProposal, setIsEditingProposal] = useState(false);
  const [editProposalTitle, setEditProposalTitle] = useState('');
  const [editProposalDescription, setEditProposalDescription] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  
  // 自动保存计时器
  const autoSaveTimeout = useRef<NodeJS.Timeout | null>(null);
  
  // 设置初始值
  React.useEffect(() => {
    if (proposal) {
      setEditProposalTitle(proposal.title);
      setEditProposalDescription(proposal.description);
      setIsEditingProposal(!!(user && proposal.createdBy === user.id));
      
      // 初始化评论
      setProposalComments(proposal.comments as Comment[] || []);
    }
  }, [proposal, user]);
  
  // 加载悬赏用户昵称
  useEffect(() => {
    const fetchBountyUserNames = async () => {
      if (proposal?.bounties && proposal.bounties.length > 0) {
        try {
          // 提取所有没有昵称的悬赏用户ID
          const userIds = proposal.bounties
            .filter(bounty => !bounty.userNickname)
            .map(bounty => bounty.userId);
          
          if (userIds.length > 0) {
            const response = await userAPI.getUsersByIds(userIds);
            if (response.data) {
              // 更新悬赏用户昵称
              const updatedBounties = proposal.bounties.map(bounty => {
                if (!bounty.userNickname) {
                  const userData = response.data.find((u: any) => u.id === bounty.userId);
                  return {
                    ...bounty,
                    userNickname: userData?.nickname || '用户'
                  };
                }
                return bounty;
              });
              
              // 更新提案
              onProposalUpdate({
                ...proposal,
                bounties: updatedBounties
              });
            }
          }
        } catch (err) {
          console.error('获取悬赏用户昵称失败:', err);
        }
      }
    };
    
    fetchBountyUserNames();
  }, [proposal?.bounties, onProposalUpdate]);
  
  // 处理保存提案编辑
  const handleSaveProposalEdit = async () => {
    if (!proposal || !user) return;
    
    setIsSavingEdit(true);
    
    try {
      const response = await proposalAPI.updateProposal(
        proposal.id,
        editProposalTitle,
        editProposalDescription
      );
      
      if (response.data) {
        onProposalUpdate(response.data);
        setIsEditingProposal(false);
      }
    } catch (error) {
      console.error('更新提案失败:', error);
    } finally {
      setIsSavingEdit(false);
    }
  };
  
  // 处理添加悬赏
  const handleAddBounty = async () => {
    if (!user || !proposal) return;
    
    setBountyError(null);
    setAddingBounty(true);
    
    try {
      const response = await proposalAPI.createBounty(
        proposal.id,
        bountyAmount,
        bountyDeadline || undefined
      );
      
      // 更新提案数据
      if (response.data.proposal) {
        onProposalUpdate(response.data.proposal);
      }
      
      // 更新用户金币
      if (response.data.userCoins && user) {
        // 使用useAuth中的updateUser方法更新用户金币
        updateUser({
          ...user,
          coins: response.data.userCoins
        });
      }
      
      setBountyDialogOpen(false);
      setBountyAmount(1);
      setBountyDeadline('');
    } catch (error: any) {
      console.error('添加悬赏失败:', error);
      if (error.response?.data?.message) {
        setBountyError(error.response.data.message);
      } else {
        setBountyError('添加悬赏失败，请稍后再试');
      }
    } finally {
      setAddingBounty(false);
    }
  };
  
  // 处理添加评论
  const handleAddComment = async () => {
    if (!user || !proposal || !commentText.trim()) return;
    
    setAddingComment(true);
    
    try {
      const response = await commentAPI.createComment(
        proposal.id,
        commentText
      );
      
      if (response.data && onCommentAdded) {
        onCommentAdded(proposal.id, response.data);
        setCommentText('');
      }
    } catch (error) {
      console.error('添加评论失败:', error);
    } finally {
      setAddingComment(false);
    }
  };
  
  // 删除评论
  const handleDeleteComment = async (commentId: string) => {
    if (!user || !proposal) return;
    
    try {
      await commentAPI.deleteComment(commentId);
      setProposalComments(proposalComments.filter(comment => comment.id !== commentId));
      
      // 通知父组件
      if (onCommentDeleted) {
        onCommentDeleted(proposal.id, commentId);
      }
    } catch (err: any) {
      console.error('删除评论失败:', err);
    }
  };
  
  // 关闭对话框
  const handleClose = () => {
    // 清理状态
    setIsEditingProposal(false);
    setEditProposalTitle('');
    setEditProposalDescription('');
    setBountyDialogOpen(false);
    setBountyAmount(1);
    setBountyDeadline('');
    setBountyError(null);
    setCommentContent('');
    onClose();
  };

  // 获取分类对应的颜色
  const getCategoryColor = (category?: string) => {
    switch (category) {
      case '功能建议':
        return '#0969da'; // 蓝色
      case '数值调整':
        return '#bf8700'; // 橙色
      case 'bug反馈':
        return '#cf222e'; // 红色
      case '艺术性相关':
        return '#8250df'; // 紫色
      default:
        return '#d0d7de'; // 默认灰色
    }
  };
  
  // 获取分类对应的图标
  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case '功能建议':
        return <AddCircleOutline sx={{ mr: 1, color: getCategoryColor(category) }} />;
      case '数值调整':
        return <Tune sx={{ mr: 1, color: getCategoryColor(category) }} />;
      case 'bug反馈':
        return <BugReport sx={{ mr: 1, color: getCategoryColor(category) }} />;
      case '艺术性相关':
        return <Brush sx={{ mr: 1, color: getCategoryColor(category) }} />;
      default:
        return <Category sx={{ mr: 1, color: getCategoryColor(category) }} />;
    }
  };

  return (
    <Dialog 
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        borderBottom: '1px solid',
        borderColor: 'divider',
        pb: 1
      }}>
        {isEditingProposal && user && proposal && (proposal.createdBy === user.id) ? (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <TextField
              fullWidth
              value={editProposalTitle}
              onChange={(e) => setEditProposalTitle(e.target.value)}
              variant="outlined"
              placeholder="提案标题"
              sx={{ mb: 1, mr: 2 }}
            />
            {proposal && (
              <Chip 
                size="small"
                label={
                  proposal.status === 'open' 
                    ? '开放中' 
                    : proposal.status === 'closed' 
                      ? '已关闭' 
                      : proposal.status === 'queued' 
                        ? '队列中'
                        : '已完成'
                }
                color={
                  proposal.status === 'open' 
                    ? 'success' 
                    : proposal.status === 'closed' 
                      ? 'default' 
                      : proposal.status === 'queued' 
                        ? 'info'
                        : 'success'
                }
              />
            )}
          </Box>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Description sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">
                {proposal?.title || '提案详情'}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {proposal && (
                <Chip 
                  size="small"
                  label={
                    proposal.status === 'open' 
                      ? '开放中' 
                      : proposal.status === 'closed' 
                        ? '已关闭' 
                        : proposal.status === 'queued' 
                          ? '队列中'
                          : '已完成'
                  }
                  color={
                    proposal.status === 'open' 
                      ? 'success' 
                      : proposal.status === 'closed' 
                        ? 'default' 
                        : proposal.status === 'queued' 
                          ? 'info'
                          : 'success'
                  }
                  sx={{ mr: 1 }}
                />
              )}
              <IconButton onClick={handleClose} size="small">
                <Close fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        )}
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        {/* 提案内容区域 */}
        <Paper 
          elevation={0} 
          sx={{ 
            p: 2, 
            mb: 3, 
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider'
          }}
        >
          {isEditingProposal && user && proposal && (proposal.createdBy === user.id) ? (
            <Box>
              <Box data-color-mode={isDarkMode ? "dark" : "light"}>
                <MDEditor
                  value={editProposalDescription}
                  onChange={(value) => setEditProposalDescription(value || '')}
                  height={300}
                  preview="edit"
                />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                <Button 
                  variant="outlined" 
                  onClick={() => setIsEditingProposal(false)}
                  sx={{ mr: 1 }}
                >
                  取消
                </Button>
                <Button 
                  variant="contained" 
                  onClick={handleSaveProposalEdit}
                  disabled={isSavingEdit}
                >
                  {isSavingEdit ? '保存中...' : '保存修改'}
                </Button>
              </Box>
            </Box>
          ) : (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  {getCategoryIcon(proposal?.category)}
                  <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                    {proposal?.category || '提案内容'}
                  </Typography>
                </Box>
                {user && proposal && (proposal.createdBy === user.id) && (
                  <Button
                    startIcon={<Edit />}
                    size="small"
                    onClick={() => {
                      setEditProposalTitle(proposal.title);
                      setEditProposalDescription(proposal.description);
                      setIsEditingProposal(true);
                    }}
                  >
                    编辑
                  </Button>
                )}
              </Box>
              <Box 
                data-color-mode={isDarkMode ? "dark" : "light"} 
                sx={{ 
                  '& .wmde-markdown': { 
                    backgroundColor: 'transparent',
                    p: 0
                  } 
                }}
              >
                <MDEditor.Markdown source={proposal?.description || ''} />
              </Box>
              
              {/* 附件区域 */}
              {proposal?.attachments && proposal.attachments.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Divider sx={{ mb: 2 }} />
                  <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
                    <AttachFile fontSize="small" sx={{ mr: 0.5 }} />
                    附件
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {proposal.attachments.map((attachment, index) => (
                      <Chip
                        key={index}
                        label={attachment.name}
                        onClick={() => window.open(attachment.url, '_blank')}
                        icon={<Download fontSize="small" />}
                        variant="outlined"
                        size="small"
                        sx={{ borderRadius: 1 }}
                      />
                    ))}
                  </Box>
                </Box>
              )}
              
              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Person fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary">
                    {proposal?.creatorNickname || '匿名用户'} • {proposal ? formatDate(proposal.createdAt) : ''}
                  </Typography>
                </Box>
                
                {proposal?.bountyTotal && proposal.bountyTotal > 0 && (
                  <Chip 
                    icon={<MonetizationOn fontSize="small" />} 
                    label={`${proposal.bountyTotal} 金币`}
                    color="primary"
                    size="small"
                  />
                )}
              </Box>
            </Box>
          )}
        </Paper>
        
        {/* 添加悬赏区域 */}
        {user && proposal && proposal.status === 'open' && (
          <Paper 
            elevation={0} 
            sx={{ 
              p: 2, 
              mb: 3, 
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: bountyDialogOpen ? 2 : 0 }}>
              <MonetizationOn fontSize="small" sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 500, flex: 1 }}>添加悬赏</Typography>
              
              {!bountyDialogOpen && (
                <Button
                  variant="outlined"
                  color="primary"
                  size="small"
                  onClick={() => setBountyDialogOpen(true)}
                  startIcon={<MonetizationOn />}
                >
                  添加悬赏
                </Button>
              )}
            </Box>
            
            {bountyDialogOpen && (
              <Box sx={{ mt: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
                  <TextField
                    label="金额"
                    type="number"
                    size="small"
                    value={bountyAmount}
                    onChange={(e) => setBountyAmount(parseFloat(e.target.value) || 0)}
                    inputProps={{ step: "0.1", min: 0.1 }}
                    sx={{ width: '100px' }}
                  />
                  <FormControl sx={{ width: '150px' }}>
                    <InputLabel id="bounty-deadline-label">截止时间</InputLabel>
                    <Select
                      labelId="bounty-deadline-label"
                      value={bountyDeadline || "6"}
                      onChange={(e) => setBountyDeadline(e.target.value)}
                      label="截止时间"
                      size="small"
                    >
                      <MenuItem value="1">1个月后</MenuItem>
                      <MenuItem value="3">3个月后</MenuItem>
                      <MenuItem value="6">6个月后</MenuItem>
                      <MenuItem value="12">12个月后</MenuItem>
                    </Select>
                  </FormControl>
                  <Button
                    variant="contained"
                    color="primary"
                    size="small"
                    onClick={handleAddBounty}
                    startIcon={<MonetizationOn />}
                    disabled={addingBounty || bountyAmount <= 0}
                  >
                    {addingBounty ? '添加中...' : '确认添加'}
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setBountyDialogOpen(false)}
                  >
                    取消
                  </Button>
                </Box>
                
                {bountyError && (
                  <Alert severity="error" sx={{ mt: 1 }}>
                    {bountyError}
                  </Alert>
                )}
              </Box>
            )}
            
            {/* 已有悬赏列表 - 改为一排小chip */}
            {proposal.bounties && proposal.bounties.length > 0 && (
              <Box sx={{ mt: bountyDialogOpen ? 2 : 0 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, display: bountyDialogOpen ? 'block' : 'none' }}>
                  已有悬赏
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {proposal.bounties.map((bounty) => (
                    <Chip
                      key={bounty.id}
                      icon={<MonetizationOn fontSize="small" />}
                      label={`${bounty.amount} (${bounty.userNickname || '匿名'})`}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  ))}
                </Box>
              </Box>
            )}
          </Paper>
        )}
        
        {/* 评论区域 */}
        <Paper 
          elevation={0} 
          sx={{ 
            p: 2, 
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Comment fontSize="small" sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>评论</Typography>
          </Box>
          
          {user ? (
            <Box sx={{ mb: 2 }}>
              <TextField
                fullWidth
                multiline
                rows={2}
                placeholder="添加评论..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                variant="outlined"
                size="small"
              />
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                <Button
                  variant="contained"
                  color="primary"
                  size="small"
                  onClick={handleAddComment}
                  disabled={!commentText.trim() || addingComment}
                >
                  {addingComment ? '发布中...' : '发布评论'}
                </Button>
              </Box>
            </Box>
          ) : (
            <Alert severity="info" sx={{ mb: 2 }}>
              请登录后参与评论
            </Alert>
          )}
          
          {proposalComments.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
              暂无评论，快来发表第一条评论吧
            </Typography>
          ) : (
            <List>
              {proposalComments.map((comment) => (
                <ListItem 
                  key={comment.id}
                  alignItems="flex-start"
                  sx={{ 
                    px: 0,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    '&:last-child': {
                      borderBottom: 'none'
                    }
                  }}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {comment.userNickname || '匿名用户'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(comment.createdAt)}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Typography 
                        variant="body2" 
                        color="text.primary"
                        sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}
                      >
                        {comment.content}
                      </Typography>
                    }
                  />
                  {user && user.id === comment.userId && (
                    <IconButton 
                      edge="end" 
                      size="small"
                      onClick={() => handleDeleteComment(comment.id)}
                      sx={{ ml: 1, mt: 1 }}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  )}
                </ListItem>
              ))}
            </List>
          )}
        </Paper>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        {user && proposal && (
          <Box sx={{ display: 'flex', mr: 'auto' }}>
            {/* 只对创建者显示删除按钮 */}
            {user.id === proposal.createdBy && (
              <Button 
                color="error" 
                onClick={() => {
                  onProposalDelete(proposal.id);
                  handleClose();
                }}
                startIcon={<Delete />}
                variant="outlined"
              >
                删除
              </Button>
            )}
            
            {/* 只对项目成员和管理员显示关闭按钮 */}
            {isMember && proposal.status === 'open' && user.id !== proposal.createdBy && (
              <Button 
                color="warning" 
                onClick={() => {
                  onProposalClose(proposal.id);
                }}
                startIcon={<Lock />}
                variant="outlined"
                sx={{ ml: 1 }}
              >
                关闭
              </Button>
            )}
          </Box>
        )}
        <Button onClick={handleClose} variant="outlined">
          关闭
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProposalDetailDialog;
