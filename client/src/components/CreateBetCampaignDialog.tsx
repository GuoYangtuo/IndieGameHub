import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  TextField,
  Button,
  Box,
  Typography,
  InputAdornment,
  IconButton,
  FormControlLabel,
  Checkbox,
  Tabs,
  Tab,
  Stack,
  Chip,
} from '@mui/material';
import MDEditor from '@uiw/react-md-editor';
import { CloudUpload, Delete } from '@mui/icons-material';
import BetCampaignCard from './BetCampaignCard';

interface BetDonation {
  id: string;
  campaignId: string;
  userId: string;
  amount: number;
  message?: string;
  createdAt: string;
  username?: string;
  avatar_url?: string;
}

interface BetCampaign {
  id: string;
  projectId: string;
  createdBy: string;
  title: string;
  description?: string;
  targetAmount: number;
  fundingDays: number;
  developmentDays: number;
  fundingEndTime: string;
  developmentEndTime: string;
  developmentGoals?: string;
  developmentGoalImages?: string[];
  tierAmounts: number[];
  allowCustomAmount: boolean;
  status: 'funding' | 'development' | 'completed' | 'failed' | 'cancelled';
  result: 'pending' | 'success' | 'failed';
  totalRaised: number;
  createdAt: string;
  donations?: BetDonation[];
}

interface CreateBetCampaignDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: () => Promise<void>;
  creating: boolean;
  title: string;
  setTitle: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
  targetAmount: number;
  setTargetAmount: (value: number) => void;
  fundingDays: number;
  setFundingDays: (value: number) => void;
  developmentDays: number;
  setDevelopmentDays: (value: number) => void;
  developmentGoals: string;
  setDevelopmentGoals: (value: string) => void;
  goalImages: File[];
  imagePreviews: string[];
  setGoalImages: (files: File[]) => void;
  setImagePreviews: (previews: string[]) => void;
  tierAmounts: number[];
  setTierAmounts: (amounts: number[]) => void;
  allowCustomAmount: boolean;
  setAllowCustomAmount: (value: boolean) => void;
  projectName: string;
  projectSlug: string;
}

const CreateBetCampaignDialog: React.FC<CreateBetCampaignDialogProps> = ({
  open,
  onClose,
  onCreate,
  creating,
  title,
  setTitle,
  description,
  setDescription,
  targetAmount,
  setTargetAmount,
  fundingDays,
  setFundingDays,
  developmentDays,
  setDevelopmentDays,
  developmentGoals,
  setDevelopmentGoals,
  goalImages,
  imagePreviews,
  setGoalImages,
  setImagePreviews,
  tierAmounts,
  setTierAmounts,
  allowCustomAmount,
  setAllowCustomAmount,
  projectName,
  projectSlug
}) => {
  const [previewPhase, setPreviewPhase] = useState<'funding' | 'development' | 'completed'>('funding');

  // 模拟捐赠者数据
  const mockDonations: BetDonation[] = useMemo(() => [
    {
      id: '1',
      campaignId: 'preview',
      userId: 'user1',
      amount: 100,
      message: '期待这个项目！',
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      username: '开发者A',
      avatar_url: ''
    },
    {
      id: '2',
      campaignId: 'preview',
      userId: 'user2',
      amount: 50,
      message: '加油！',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      username: '支持者B',
      avatar_url: ''
    },
    {
      id: '3',
      campaignId: 'preview',
      userId: 'user3',
      amount: 200,
      message: '',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      username: '资深玩家C',
      avatar_url: ''
    }
  ], []);

  // 计算模拟的众筹进度
  const mockProgress = useMemo(() => {
    if (!title || !targetAmount) return { raised: 350, percent: 0 };
    const raised = Math.floor(targetAmount * 0.7);
    return {
      raised,
      percent: Math.min((raised / targetAmount) * 100, 100)
    };
  }, [targetAmount, title]);

  // 获取预览用的 campaign 对象
  const previewCampaign: BetCampaign = useMemo(() => {
    return {
      id: 'preview',
      projectId: 'preview-project',
      createdBy: 'preview-user',
      title: title || '（请输入标题）',
      description: description || undefined,
      targetAmount: targetAmount || 100,
      fundingDays,
      developmentDays,
      fundingEndTime: new Date(Date.now() + fundingDays * 24 * 60 * 60 * 1000).toISOString(),
      developmentEndTime: new Date(Date.now() + (fundingDays + developmentDays) * 24 * 60 * 60 * 1000).toISOString(),
      developmentGoals: developmentGoals || undefined,
      developmentGoalImages: imagePreviews.length > 0 ? imagePreviews : undefined,
      tierAmounts: tierAmounts.length > 0 ? tierAmounts : [5, 10, 20],
      allowCustomAmount,
      status: previewPhase === 'funding' ? 'funding' : previewPhase === 'development' ? 'development' : 'completed',
      result: previewPhase === 'completed' ? 'success' : 'pending',
      totalRaised: mockProgress.raised,
      createdAt: new Date().toISOString(),
      donations: mockDonations
    };
  }, [title, description, targetAmount, fundingDays, developmentDays, developmentGoals, imagePreviews, tierAmounts, allowCustomAmount, previewPhase, mockProgress, mockDonations]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      fullWidth
      PaperProps={{
        sx: {
          width: '100vw',
          height: '100vh',
          maxWidth: '100vw',
          maxHeight: '100vh',
          m: 0,
          borderRadius: 0
        }
      }}
    >
      <DialogContent sx={{ p: 0, display: 'flex', height: '100vh' }}>
        {/* 左侧：创建表单 */}
        <Box sx={{ width: '50%', borderRight: 1, borderColor: 'divider', overflow: 'auto', p: 3 }}>
          <Typography variant="h6" gutterBottom>填写对赌众筹信息</Typography>

          <TextField
            label="标题"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            fullWidth
            required
            sx={{ mb: 2, mt: 1 }}
          />

          <TextField
            label="简述（可选）"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            rows={2}
            sx={{ mb: 2 }}
          />

          <TextField
            label="目标金额"
            type="number"
            value={targetAmount}
            onChange={(e) => setTargetAmount(parseInt(e.target.value) || 0)}
            fullWidth
            required
            sx={{ mb: 2 }}
            InputProps={{
              startAdornment: <InputAdornment position="start">¥</InputAdornment>,
            }}
          />

          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <Box sx={{ flex: 1 }}>
              <TextField
                label="众筹阶段天数"
                type="number"
                value={fundingDays}
                onChange={(e) => setFundingDays(parseInt(e.target.value) || 0)}
                fullWidth
                required
                helperText={`创建之时起，众筹${fundingDays}天`}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <TextField
                label="开发阶段天数"
                type="number"
                value={developmentDays}
                onChange={(e) => setDevelopmentDays(parseInt(e.target.value) || 0)}
                fullWidth
                required
                helperText={`众筹成功后，开发${developmentDays}天`}
              />
            </Box>
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              详细描述你将在开发阶段完成的目标（支持Markdown格式）
            </Typography>
            <MDEditor
              value={developmentGoals}
              onChange={(val) => setDevelopmentGoals(val || '')}
              preview="edit"
              height={200}
              style={{ marginBottom: 8 }}
            />
          </Box>

          {/* 开发目标图片上传 */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              配图（思维导图，路线图，已经有的素材样图，参考效果图等，可选，最多10张）
            </Typography>
            <Button
              variant="outlined"
              component="label"
              startIcon={<CloudUpload />}
              sx={{ mb: 1 }}
            >
              上传图片
              <input
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => {
                  const files = e.target.files;
                  if (files) {
                    const newFiles = Array.from(files);
                    const totalFiles = goalImages.length + newFiles.length;
                    if (totalFiles > 10) {
                      alert('最多只能上传10张图片');
                      return;
                    }
                    setGoalImages([...goalImages, ...newFiles]);
                    const newPreviews = newFiles.map(file => URL.createObjectURL(file));
                    setImagePreviews([...imagePreviews, ...newPreviews]);
                  }
                }}
              />
            </Button>
            {imagePreviews.length > 0 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                {imagePreviews.map((preview, index) => (
                  <Box key={index} sx={{ position: 'relative' }}>
                    <img
                      src={preview}
                      alt={`预览 ${index + 1}`}
                      style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 4 }}
                    />
                    <IconButton
                      size="small"
                      sx={{
                        position: 'absolute',
                        top: -8,
                        right: -8,
                        bgcolor: 'error.main',
                        color: 'white',
                        '&:hover': { bgcolor: 'error.dark' },
                        width: 24,
                        height: 24
                      }}
                      onClick={() => {
                        const newImages = goalImages.filter((_, i) => i !== index);
                        const newPreviews = imagePreviews.filter((_, i) => i !== index);
                        setGoalImages(newImages);
                        setImagePreviews(newPreviews);
                      }}
                    >
                      <Delete sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            )}
          </Box>

          <Typography variant="subtitle2" gutterBottom>
            捐赠档位（选择默认档位或自定义）
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
            {[5, 10, 20, 50, 100].map((amount) => (
              <Chip
                key={amount}
                label={`¥${amount}`}
                onClick={() => {
                  if (!tierAmounts.includes(amount)) {
                    setTierAmounts([...tierAmounts, amount].sort((a, b) => a - b));
                  }
                }}
                color={tierAmounts.includes(amount) ? 'primary' : 'default'}
              />
            ))}
          </Stack>
          <TextField
            label="自定义档位（用逗号分隔）"
            value={tierAmounts.join(', ')}
            onChange={(e) => {
              const values = e.target.value.split(',').map(v => parseInt(v.trim())).filter(v => !isNaN(v) && v > 0);
              if (values.length > 0) {
                setTierAmounts(values.sort((a, b) => a - b));
              }
            }}
            fullWidth
            sx={{ mb: 2 }}
          />

          <FormControlLabel
            control={
              <Checkbox
                checked={allowCustomAmount}
                onChange={(e) => setAllowCustomAmount(e.target.checked)}
              />
            }
            label="允许自定义金额"
          />
        </Box>

        {/* 右侧：效果预览 */}
        <Box sx={{ width: '50%', overflow: 'auto' }}>
          <Box sx={{ p: 2, bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold">效果预览</Typography>
                <Tabs
                  value={previewPhase}
                  onChange={(_, newValue) => setPreviewPhase(newValue)}
                  sx={{
                    minHeight: 36,
                    '& .MuiTab-root': { minHeight: 36, py: 0.5 }
                  }}
                >
                  <Tab label="众筹阶段" value="funding" />
                  <Tab label="开发阶段" value="development" />
                  <Tab label="完成阶段" value="completed" />
                </Tabs>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Button onClick={onClose}>取消</Button>
                <Button
                  onClick={onCreate}
                  variant="contained"
                  disabled={creating || !title || !targetAmount || !fundingDays || !developmentDays}
                >
                  {creating ? '创建中...' : '创建'}
                </Button>
              </Box>
            </Box>
          </Box>

          <Box sx={{ p: 2 }}>
            <Box sx={{ maxWidth: 800, mx: 'auto' }}>
              <BetCampaignCard
                campaign={previewCampaign}
                mode="preview"
                previewPhase={previewPhase}
                mockProgress={mockProgress}
              />
            </Box>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default CreateBetCampaignDialog;
