import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  IconButton,
  Alert,
  FormHelperText,
  List,
  ListItem,
  ListItemText,
  Chip,
  Tooltip,
  Divider,
  Paper
} from '@mui/material';
import { Close, Delete, Add, MonetizationOn, Description, Category } from '@mui/icons-material';
import { proposalAPI } from '../../services/api';
import MDEditor from '@uiw/react-md-editor';

interface Props {
  isDarkMode: boolean;
  projectId: string;
  open: boolean;
  onClose: () => void;
  onProposalCreated?: (proposal: any) => void;
}

const NewProposalDialog: React.FC<Props> = ({ isDarkMode, projectId, open, onClose, onProposalCreated }) => {
  const [proposalTitle, setProposalTitle] = useState('');
  const [proposalDescription, setProposalDescription] = useState('');
  const [proposalCategory, setProposalCategory] = useState('');
  const [creatingProposal, setCreatingProposal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proposalAttachments, setProposalAttachments] = useState<File[]>([]);
  const [proposalAttachmentPreviews, setProposalAttachmentPreviews] = useState<string[]>([]);
  
  // 悬赏状态
  const [bountyAmount, setBountyAmount] = useState<number>(1);
  const [bountyDeadline, setBountyDeadline] = useState<string>('');
  const [bountyDialogOpen, setBountyDialogOpen] = useState(false);
  const [addingBounty, setAddingBounty] = useState(false);
  const [bountyError, setBountyError] = useState<string | null>(null);

  // 处理关闭对话框
  const handleClose = () => {
    // 重置表单
    setProposalTitle('');
    setProposalDescription('');
    setProposalCategory('');
    setProposalAttachments([]);
    setProposalAttachmentPreviews([]);
    setError(null);
    onClose();
  };

  // 处理附件上传
  const handleProposalAttachmentsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return;
    
    const files = Array.from(event.target.files);
    const validFiles = files.filter(file => file.size <= 5 * 1024 * 1024); // 5MB限制
    
    if (validFiles.length !== files.length) {
      setError('部分文件超过5MB限制，已自动过滤');
    }
    
    setProposalAttachments([...proposalAttachments, ...validFiles]);
    
    // 生成图片预览
    validFiles.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setProposalAttachmentPreviews(prev => [...prev, e.target?.result as string]);
        };
        reader.readAsDataURL(file);
      }
    });
  };

  // 处理删除附件
  const handleRemoveProposalAttachment = (index: number) => {
    const newAttachments = [...proposalAttachments];
    newAttachments.splice(index, 1);
    setProposalAttachments(newAttachments);
    
    // 如果是图片，也需要删除预览
    const newPreviews = [...proposalAttachmentPreviews];
    if (index < newPreviews.length) {
      newPreviews.splice(index, 1);
      setProposalAttachmentPreviews(newPreviews);
    }
  };

  // 处理创建提案
  const handleCreateProposal = async () => {
    if (!proposalTitle.trim()) {
      setError('请输入提案标题');
      return;
    }
    
    if (!proposalCategory) {
      setError('请选择提案分类');
      return;
    }

    setCreatingProposal(true);
    setError(null);

    try {
      let response;
      if (proposalAttachments.length > 0) {
        const formData = new FormData();
        formData.append('title', proposalTitle);
        formData.append('description', proposalDescription);
        formData.append('projectId', projectId);
        formData.append('category', proposalCategory);
        
        proposalAttachments.forEach(file => {
          formData.append('attachments', file);
        });
        
        response = await proposalAPI.createProposalWithAttachments(formData);
      } else {
        response = await proposalAPI.createProposal(
          proposalTitle,
          proposalDescription,
          projectId,
          proposalCategory
        );
      }

      // 如果提供了回调，则调用它以更新父组件的提案列表
      if (onProposalCreated && response.data) {
        onProposalCreated(response.data);
      }

      // 重置表单
      setProposalTitle('');
      setProposalDescription('');
      setProposalCategory('');
      setProposalAttachments([]);
      setProposalAttachmentPreviews([]);
      onClose();
    } catch (err) {
      setError('创建提案失败');
    } finally {
      setCreatingProposal(false);
    }
  };

  // 获取分类对应的颜色
  const getCategoryColor = () => {
    switch (proposalCategory) {
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
  
  // 获取分类对应的解释文本
  const getCategoryDescription = () => {
    switch (proposalCategory) {
      case '功能建议':
        return '想加入游戏中的新东西';
      case '数值调整':
        return '太难太肝 或 太简单太无聊';
      case 'bug反馈':
        return '发现异常情况';
      case '艺术性相关':
        return '请附带你认为更好的美术/音乐/剧情素材';
      default:
        return '请选择合适的分类';
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
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Description sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6">创建新提案</Typography>
        </Box>
        <IconButton onClick={handleClose} size="small">
          <Close fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

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
          <Box sx={{ display: 'flex', gap: 2, mb: 0 }}>
            <TextField
              autoFocus
              margin="dense"
              id="title"
              label="标题尽可能短，有助于吸引注意"
              type="text"
              fullWidth
              value={proposalTitle}
              onChange={(e) => setProposalTitle(e.target.value)}
              sx={{ flex: 3 }}
              variant="outlined"
            />
            <FormControl margin="dense" sx={{ flex: 1 }} required error={!proposalCategory}>
              <InputLabel id="proposal-category-label">分类</InputLabel>
              <Select
                labelId="proposal-category-label"
                id="proposal-category"
                value={proposalCategory}
                label="分类"
                onChange={(e) => setProposalCategory(e.target.value)}
              >
                <MenuItem value="">请选择</MenuItem>
                <MenuItem value="功能建议">功能建议</MenuItem>
                <MenuItem value="数值调整">数值调整</MenuItem>
                <MenuItem value="bug反馈">bug反馈</MenuItem>
                <MenuItem value="艺术性相关">艺术性相关</MenuItem>
              </Select>
            </FormControl>
          </Box>
          <FormHelperText sx={{ textAlign: 'right' }}>{!proposalCategory ? '必须选择分类' : getCategoryDescription()}</FormHelperText>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            描述 (支持Markdown格式)
          </Typography>
          <Box data-color-mode={isDarkMode ? "dark" : "light"}>
            <MDEditor
              value={proposalDescription}
              onChange={(value) => setProposalDescription(value || '')}
              height={200}
              preview="edit"
            />
          </Box>
        </Paper>

        {/* 附件上传区域 */}
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
            <Add fontSize="small" sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>附件 (可选)</Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <input
              accept="*/*"
              style={{ display: 'none' }}
              id="proposal-attachments"
              type="file"
              multiple
              onChange={handleProposalAttachmentsChange}
            />
            <label htmlFor="proposal-attachments">
              <Button
                variant="outlined"
                component="span"
                size="small"
                startIcon={<Add />}
              >
                添加附件
              </Button>
            </label>
            <Typography variant="caption" sx={{ ml: 2 }}>
              每个文件最大5MB
            </Typography>
          </Box>

          {/* 附件列表 */}
          {proposalAttachments.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <List dense>
                {proposalAttachments.map((file, index) => (
                  <ListItem
                    key={index}
                    secondaryAction={
                      <IconButton
                        edge="end"
                        onClick={() => handleRemoveProposalAttachment(index)}
                        size="small"
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    }
                    sx={{ 
                      borderRadius: 1,
                      '&:hover': {
                        bgcolor: theme => theme.palette.mode === 'dark' 
                          ? 'rgba(255, 255, 255, 0.05)' 
                          : 'rgba(0, 0, 0, 0.02)'
                      }
                    }}
                  >
                    <ListItemText
                      primary={file.name}
                      secondary={`${(file.size / 1024).toFixed(1)} KB`}
                      primaryTypographyProps={{ variant: 'body2' }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {/* 图片预览 */}
          {proposalAttachmentPreviews.length > 0 && (
            <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {proposalAttachmentPreviews.map((preview, index) => (
                <Box
                  key={index}
                  component="img"
                  src={preview}
                  sx={{
                    width: 80,
                    height: 80,
                    objectFit: 'cover',
                    borderRadius: 1,
                    border: '1px solid rgba(0,0,0,0.1)'
                  }}
                />
              ))}
            </Box>
          )}
        </Paper>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <Button onClick={handleClose} variant="outlined">取消</Button>
        <Button
          onClick={handleCreateProposal}
          variant="contained"
          disabled={!proposalTitle || !proposalCategory || creatingProposal}
          startIcon={creatingProposal ? null : <Description />}
        >
          {creatingProposal ? '创建中...' : '创建提案'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default NewProposalDialog;
