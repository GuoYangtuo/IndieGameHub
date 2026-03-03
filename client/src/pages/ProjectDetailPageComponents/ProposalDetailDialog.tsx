import React, { useState, useEffect, useMemo } from 'react';
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
  List,
  ListItem,
  ListItemText,
  Tooltip,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
} from '@mui/material';
import {
  Delete,
  Close,
  MonetizationOn,
  Description,
  Category,
  AttachFile,
  Person,
  Comment,
  Edit,
  BugReport,
  Brush,
  Tune,
  AddCircleOutline,
  Lock,
} from '@mui/icons-material';
import { proposalAPI, commentAPI, userAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import MDEditor from '@uiw/react-md-editor';
import { formatDate } from '../../utils/dateUtils';

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

const CATEGORY_CONFIG: Record<string, { color: string; icon: React.ReactNode }> = {
  '功能建议': { color: '#0969da', icon: <AddCircleOutline /> },
  '数值调整': { color: '#bf8700', icon: <Tune /> },
  'bug反馈': { color: '#cf222e', icon: <BugReport /> },
  '艺术性相关': { color: '#8250df', icon: <Brush /> },
};

const STATUS_CONFIG: Record<string, { label: string; color: 'success' | 'default' | 'info' }> = {
  'open': { label: '开放中', color: 'success' },
  'closed': { label: '已关闭', color: 'default' },
  'queued': { label: '队列中', color: 'info' },
  'completed': { label: '已完成', color: 'success' },
};

const ProposalDetailDialog: React.FC<ProposalDetailDialogProps> = ({
  isDarkMode,
  open,
  onClose,
  proposal,
  isMember,
  onProposalDelete,
  onProposalClose,
  onProposalUpdate,
  onCommentAdded,
  onCommentDeleted,
}) => {
  const { user, updateUser } = useAuth();

  const isProposalOwner = useMemo(() => {
    return !!(user && proposal && proposal.createdBy === user.id);
  }, [user, proposal]);

  const isClosed = proposal?.status === 'closed' || proposal?.status === 'completed';

  const [commentText, setCommentText] = useState('');
  const [addingComment, setAddingComment] = useState(false);
  const [proposalComments, setProposalComments] = useState<Comment[]>([]);

  const [bountyAmount, setBountyAmount] = useState<number>(1);
  const [bountyDeadline, setBountyDeadline] = useState<string>('');
  const [bountyDialogOpen, setBountyDialogOpen] = useState(false);
  const [addingBounty, setAddingBounty] = useState(false);
  const [bountyError, setBountyError] = useState<string | null>(null);

  const [isEditingProposal, setIsEditingProposal] = useState(false);
  const [editProposalTitle, setEditProposalTitle] = useState('');
  const [editProposalDescription, setEditProposalDescription] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  useEffect(() => {
    if (proposal) {
      setEditProposalTitle(proposal.title);
      setEditProposalDescription(proposal.description);
      setIsEditingProposal(isProposalOwner && proposal.status === 'open');
      setProposalComments(proposal.comments as Comment[] || []);
    }
  }, [proposal, isProposalOwner]);

  useEffect(() => {
    const fetchBountyUserNames = async () => {
      if (!proposal?.bounties || proposal.bounties.length === 0) return;

      const userIds = proposal.bounties
        .filter(bounty => !bounty.userNickname)
        .map(bounty => bounty.userId);

      if (userIds.length === 0) return;

      try {
        const response = await userAPI.getUsersByIds(userIds);
        if (response.data) {
          const updatedBounties = proposal.bounties.map(bounty => {
            if (!bounty.userNickname) {
              const userData = response.data.find((u: any) => u.id === bounty.userId);
              return { ...bounty, userNickname: userData?.nickname || '用户' };
            }
            return bounty;
          });
          onProposalUpdate({ ...proposal, bounties: updatedBounties });
        }
      } catch (err) {
        console.error('获取悬赏用户昵称失败:', err);
      }
    };

    fetchBountyUserNames();
  }, [proposal?.bounties, onProposalUpdate, proposal]);

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
    } catch (error: any) {
      const msg = error?.response?.data?.message || '更新提案失败';
      console.error('更新提案失败:', msg);
      alert(msg);
    } finally {
      setIsSavingEdit(false);
    }
  };

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

      if (response.data.proposal) {
        onProposalUpdate(response.data.proposal);
      }

      if (response.data.userCoins && user) {
        updateUser({ ...user, coins: response.data.userCoins });
      }

      setBountyDialogOpen(false);
      setBountyAmount(1);
      setBountyDeadline('');
    } catch (error: any) {
      console.error('添加悬赏失败:', error);
      setBountyError(error.response?.data?.message || '添加悬赏失败，请稍后再试');
    } finally {
      setAddingBounty(false);
    }
  };

  const handleAddComment = async () => {
    if (!user || !proposal || !commentText.trim()) return;

    setAddingComment(true);
    try {
      const response = await commentAPI.createComment(proposal.id, commentText);
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

  const handleDeleteComment = async (commentId: string) => {
    if (!user || !proposal) return;

    try {
      await commentAPI.deleteComment(commentId);
      setProposalComments(prev => prev.filter(comment => comment.id !== commentId));
      if (onCommentDeleted) {
        onCommentDeleted(proposal.id, commentId);
      }
    } catch (err: any) {
      console.error('删除评论失败:', err);
    }
  };

  const handleClose = () => {
    setIsEditingProposal(false);
    setEditProposalTitle('');
    setEditProposalDescription('');
    setBountyDialogOpen(false);
    setBountyAmount(1);
    setBountyDeadline('');
    setBountyError(null);
    setCommentText('');
    onClose();
  };

  const getCategoryStyle = (category?: string) => {
    const config = CATEGORY_CONFIG[category || ''];
    return config || { color: '#d0d7de', icon: <Category /> };
  };

  const getStatusStyle = (status?: string) => {
    return STATUS_CONFIG[status || 'open'];
  };

  const renderStatusChip = (status: string, sx?: object) => {
    const { label, color } = getStatusStyle(status);
    return <Chip size="small" label={label} color={color} sx={sx} />;
  };

  const markdownStyles = useMemo(() => ({
    '& .wmde-markdown': {
      backgroundColor: 'transparent !important',
      p: 0,
      color: isDarkMode ? '#c9d1d9 !important' : 'inherit',
    },
    '& .wmde-markdown .wmde-markdown-color': {
      backgroundColor: 'transparent !important',
    },
    '& .wmde-markdown p': {
      color: isDarkMode ? '#c9d1d9 !important' : 'inherit',
    },
    '& .wmde-markdown h1, & .wmde-markdown h2, & .wmde-markdown h3, & .wmde-markdown h4, & .wmde-markdown h5, & .wmde-markdown h6': {
      color: isDarkMode ? '#c9d1d9 !important' : 'inherit',
    },
    '& .wmde-markdown code': {
      color: isDarkMode ? '#c9d1d9 !important' : 'inherit',
    },
    '& .wmde-markdown pre': {
      backgroundColor: isDarkMode ? '#161b22 !important' : 'transparent',
      color: isDarkMode ? '#c9d1d9 !important' : 'inherit',
    },
    '& .wmde-markdown a': {
      color: isDarkMode ? '#58a6ff !important' : 'inherit',
    },
    '& .wmde-markdown ul, & .wmde-markdown ol': {
      color: isDarkMode ? '#c9d1d9 !important' : 'inherit',
    },
    '& .wmde-markdown blockquote': {
      color: isDarkMode ? '#8b949e !important' : 'inherit',
    },
    color: isClosed ? 'text.secondary' : isDarkMode ? '#c9d1d9' : 'text.primary',
  }), [isDarkMode, isClosed]);

  const renderEditTitle = () => (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
      <TextField
        fullWidth
        value={editProposalTitle}
        onChange={(e) => setEditProposalTitle(e.target.value)}
        variant="outlined"
        placeholder="提案标题"
        sx={{ mr: 2 }}
        size="small"
      />
      {proposal && renderStatusChip(proposal.status)}
    </Box>
  );

  const renderNormalTitle = () => (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Description sx={{ mr: 1, color: 'primary.main' }} />
        <Typography
          variant="h6"
          sx={{ color: isClosed ? 'text.secondary' : 'text.primary' }}
        >
          {proposal?.title || '提案详情'}
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        {proposal && renderStatusChip(proposal.status, { mr: 1 })}
        <IconButton onClick={handleClose} size="small">
          <Close fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  );

  const renderEditContent = () => (
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
  );

  const renderNormalContent = () => {
    const categoryStyle = getCategoryStyle(proposal?.category);

    return (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ mr: 1, color: categoryStyle.color }}>{categoryStyle.icon}</Box>
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 500, color: isClosed ? 'text.secondary' : 'text.primary' }}
            >
              {proposal?.category || '提案内容'}
            </Typography>
          </Box>
          {isProposalOwner && (
            <Button
              startIcon={<Edit />}
              size="small"
              onClick={() => {
                setEditProposalTitle(proposal!.title);
                setEditProposalDescription(proposal!.description);
                setIsEditingProposal(true);
              }}
            >
              编辑
            </Button>
          )}
        </Box>

        <Box data-color-mode={isDarkMode ? "dark" : "light"} sx={markdownStyles}>
          <MDEditor.Markdown source={proposal?.description || ''} />
        </Box>

        {proposal?.attachments && proposal.attachments.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" gutterBottom>附件</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {proposal.attachments.map((attachment, index) => (
                <Chip
                  key={index}
                  label={attachment.name}
                  variant="outlined"
                  icon={<AttachFile />}
                  onClick={() => attachment.url && window.open(attachment.url, '_blank')}
                  sx={{ cursor: 'pointer' }}
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
    );
  };

  const renderBountySection = () => {
    if (!user || !proposal || proposal.status !== 'open') return null;

    return (
      <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
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
            <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, flexWrap: 'wrap' }}>
              <TextField
                label="金额"
                type="number"
                size="small"
                value={bountyAmount}
                onChange={(e) => setBountyAmount(parseFloat(e.target.value) || 0)}
                inputProps={{ step: "0.1", min: 0.1 }}
                sx={{ width: '100px' }}
              />
              <FormControl sx={{ width: '150px' }} size="small">
                <InputLabel id="bounty-deadline-label">截止时间</InputLabel>
                <Select
                  labelId="bounty-deadline-label"
                  value={bountyDeadline || "6"}
                  onChange={(e) => setBountyDeadline(e.target.value)}
                  label="截止时间"
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
                disabled={addingBounty || bountyAmount <= 0}
              >
                {addingBounty ? '添加中...' : '确认添加'}
              </Button>
              <Button variant="outlined" size="small" onClick={() => setBountyDialogOpen(false)}>
                取消
              </Button>
            </Box>

            {bountyError && (
              <Alert severity="error" sx={{ mt: 1 }}>{bountyError}</Alert>
            )}
          </Box>
        )}

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
    );
  };

  const renderCommentSection = () => (
    <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
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
        <Alert severity="info" sx={{ mb: 2 }}>请登录后参与评论</Alert>
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
                '&:last-child': { borderBottom: 'none' },
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
  );

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          opacity: isClosed ? 0.85 : 1,
        },
      }}
    >
      <DialogTitle sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid',
        borderColor: 'divider',
        pb: 1,
      }}>
        {isEditingProposal && isProposalOwner ? renderEditTitle() : renderNormalTitle()}
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
          {isEditingProposal && isProposalOwner ? renderEditContent() : renderNormalContent()}
        </Paper>

        {renderBountySection()}
        {renderCommentSection()}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        {user && proposal && (
          <Box sx={{ display: 'flex', mr: 'auto' }}>
            {isProposalOwner && (
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

            {isMember && proposal.status === 'open' && !isProposalOwner && (
              <Button
                color="warning"
                onClick={() => onProposalClose(proposal.id)}
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
