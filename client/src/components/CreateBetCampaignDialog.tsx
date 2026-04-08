import React, { useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Dialog,
  DialogContent,
  TextField,
  Button,
  Box,
  Typography,
  Paper,
  LinearProgress,
  Chip,
  Stack,
  InputAdornment,
  IconButton,
  FormControlLabel,
  Checkbox,
  Divider,
  Tabs,
  Tab,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  useTheme,
  Tooltip,
  Alert
} from '@mui/material';
import MDEditor from '@uiw/react-md-editor';
import {
  CloudUpload,
  Delete,
  EmojiEvents,
  FlagOutlined,
  MonetizationOn,
  People,
  Timer,
  ArrowBack
} from '@mui/icons-material';

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
  // 表单数据
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
  // 项目信息
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
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const [previewPhase, setPreviewPhase] = useState<'funding' | 'development' | 'completed'>('funding');

  // 模拟捐赠者数据（用于预览）
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

  // 计算模拟的众筹进度（用于预览）
  const mockProgress = useMemo(() => {
    if (!title || !targetAmount) return { raised: 350, percent: 0 };
    const raised = Math.floor(targetAmount * 0.7);
    return {
      raised,
      percent: Math.min((raised / targetAmount) * 100, 100)
    };
  }, [targetAmount, title]);

  // 计算模拟的剩余时间
  const getMockRemainingTime = (days: number): { days: number; hours: number; minutes: number } => {
    return { days: Math.floor(days * 0.6), hours: Math.floor(Math.random() * 24), minutes: Math.floor(Math.random() * 60) };
  };

  // 获取预览用的 campaign 对象
  const previewCampaign: BetCampaign = useMemo(() => {
    const baseCampaign: BetCampaign = {
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
    return baseCampaign;
  }, [title, description, targetAmount, fundingDays, developmentDays, developmentGoals, imagePreviews, tierAmounts, allowCustomAmount, previewPhase, mockProgress, mockDonations]);

  // 格式化相对时间
  const formatRelativeTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (days > 0) return `${days}天前`;
    if (hours > 0) return `${hours}小时前`;
    if (minutes > 0) return `${minutes}分钟前`;
    return '刚刚';
  };

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
        <Box sx={{ width: '50%', overflow: 'auto', bgcolor: isDarkMode ? '#121212' : '#f5f5f5' }}>
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
              {/* 返回按钮 */}
              <Button
                startIcon={<ArrowBack />}
                sx={{ mb: 2 }}
              >
                返回项目
              </Button>

              {/* 对赌众筹信息卡片 */}
              <Paper sx={{ p: 3, mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h5" component="h1">
                    {previewCampaign.title}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Chip
                      label={`众筹${previewCampaign.fundingDays}天`}
                      size="small"
                      variant="outlined"
                    />
                    <Chip
                      label={`开发${previewCampaign.developmentDays}天`}
                      size="small"
                      variant="outlined"
                    />
                    <Chip
                      label={previewPhase === 'funding' ? '正在众筹中' : previewPhase === 'development' ? '正在开发中' : '挑战成功'}
                      color={previewPhase === 'funding' ? 'primary' : previewPhase === 'development' ? 'info' : 'success'}
                      size="small"
                      sx={previewPhase === 'development' ? {
                        backgroundColor: isDarkMode ? 'rgba(88, 166, 255, 0.2)' : 'rgba(9, 105, 218, 0.12)',
                        color: isDarkMode ? '#79b8ff' : '#0550ae',
                        fontWeight: 600,
                      } : undefined}
                    />
                  </Box>
                </Box>
                {previewCampaign.description && (
                  <Typography variant="body1" sx={{ mb: 3 }}>
                    {previewCampaign.description}
                  </Typography>
                )}

                {/* 开发目标 */}
                {previewCampaign.developmentGoals && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      <FlagOutlined sx={{ mr: 1, verticalAlign: 'middle', fontSize: 28, color: 'primary.main' }} />
                      计划在开发阶段完成的目标（承诺你将会得到什么）
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Box sx={{ '& img': { maxWidth: '100%', height: 'auto' } }}>
                        <ReactMarkdown>{previewCampaign.developmentGoals}</ReactMarkdown>
                      </Box>
                    </Paper>
                  </Box>
                )}

                {/* 开发目标图片 */}
                {previewCampaign.developmentGoalImages && previewCampaign.developmentGoalImages.length > 0 && (
                  <Box sx={{ mb: 3 }}>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                      {previewCampaign.developmentGoalImages.map((image, index) => (
                        <Box
                          key={index}
                          component="img"
                          src={image}
                          alt={`开发目标配图 ${index + 1}`}
                          sx={{
                            maxWidth: '100%',
                            maxHeight: 400,
                            objectFit: 'contain',
                            borderRadius: 2,
                            boxShadow: 1
                          }}
                        />
                      ))}
                    </Box>
                  </Box>
                )}

                {/* 众筹进度显示 - 仅在众筹阶段显示 */}
                {previewPhase === 'funding' && (
                  <Box sx={{ mb: 2 }}>
                    <LinearProgress
                      variant="determinate"
                      value={mockProgress.percent}
                      sx={{ height: 10, borderRadius: 5, mb: 0.5 }}
                      color={mockProgress.percent >= 100 ? 'success' : 'primary'}
                    />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2">
                        已筹到：<strong style={{ color: theme.palette.primary.main }}>¥{mockProgress.raised}</strong>
                      </Typography>
                      <Typography variant="body2">
                        目标：¥{previewCampaign.targetAmount} ({mockProgress.percent.toFixed(1)}%)
                      </Typography>
                    </Box>
                  </Box>
                )}

                {/* 剩余时间 */}
                {(previewPhase === 'funding' || previewPhase === 'development') && (
                  <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    mb: 1,
                    p: 2,
                    bgcolor: isDarkMode ? 'rgba(63, 185, 80, 0.12)' : 'rgba(63, 185, 80, 0.08)',
                    borderRadius: 2,
                    border: `1px solid ${isDarkMode ? 'rgba(63, 185, 80, 0.25)' : 'rgba(63, 185, 80, 0.15)'}`,
                  }}>
                    <Timer color="primary" />
                    <Typography variant="body1">
                      {previewPhase === 'funding'
                        ? <>众筹将在 <strong>{(() => { const t = getMockRemainingTime(fundingDays); return `${t.days > 0 ? `${t.days}天 ` : ''}${t.hours > 0 ? `${t.hours}小时 ` : ''}${t.minutes > 0 ? `${t.minutes}分钟` : ''}`; })()} </strong> 内结束，若达到目标金额则进入开发阶段，否则众筹失败退回已筹捐款</>
                        : <>开发将在 <strong>{(() => { const t = getMockRemainingTime(developmentDays); return `${t.days > 0 ? `${t.days}天 ` : ''}${t.hours > 0 ? `${t.hours}小时 ` : ''}${t.minutes > 0 ? `${t.minutes}分钟` : ''}`; })()} </strong> 内结束，若未达成开发目标，将退回所有捐款</>
                      }
                    </Typography>
                  </Box>
                )}

                {/* 捐赠档位 - 仅在众筹阶段显示 */}
                {previewPhase === 'funding' && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      <MonetizationOn sx={{ mr: 1, verticalAlign: 'middle', fontSize: 28, color: 'primary.main' }} />
                      选择捐赠档位
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
                      {previewCampaign.tierAmounts.map((amount) => (
                        <Button
                          key={amount}
                          variant="outlined"
                          sx={{ minWidth: 80 }}
                        >
                          ¥{amount}
                        </Button>
                      ))}
                      {previewCampaign.allowCustomAmount && (
                        <Button
                          variant="outlined"
                          sx={{ minWidth: 80 }}
                        >
                          自定义
                        </Button>
                      )}
                    </Stack>

                    <TextField
                      label="给开发者的留言（可选）"
                      multiline
                      rows={2}
                      fullWidth
                      sx={{ mb: 2 }}
                    />

                    <Button
                      variant="contained"
                      size="large"
                      fullWidth
                      startIcon={<MonetizationOn />}
                    >
                      确认捐赠
                    </Button>
                  </Box>
                )}

                {/* 开发阶段结束后的结果提示 */}
                {previewPhase === 'development' && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    开发阶段进行中，请耐心等待开发者完成目标。开发完成后，结果将在这里公布。
                  </Alert>
                )}

                {(previewPhase === 'completed' || previewCampaign.result === 'success') && (
                  <Alert severity="success" sx={{ mt: 2 }}>
                    挑战成功！开发者已完成目标，感谢所有支持者的参与！
                  </Alert>
                )}
              </Paper>

              {/* 捐赠者列表 */}
              {mockDonations.length > 0 && (
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    <People sx={{ mr: 1, verticalAlign: 'middle' }} />
                    捐赠者名单 ({mockDonations.length}人)
                  </Typography>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>排名</TableCell>
                          <TableCell>用户</TableCell>
                          <TableCell align="right">金额</TableCell>
                          <TableCell>时间</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {mockDonations.map((donation, index) => (
                          <TableRow key={donation.id}>
                            <TableCell>
                              {index === 0 && <EmojiEvents color="warning" />}
                              {index === 1 && <EmojiEvents sx={{ color: '#c0c0c0' }} />}
                              {index === 2 && <EmojiEvents sx={{ color: '#cd7f32' }} />}
                              {index > 2 && index + 1}
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Avatar
                                  src={donation.avatar_url}
                                  sx={{ width: 32, height: 32, mr: 1 }}
                                >
                                  {donation.username?.[0]?.toUpperCase()}
                                </Avatar>
                                {donation.username}
                              </Box>
                            </TableCell>
                            <TableCell align="right">
                              <strong>¥{donation.amount}</strong>
                            </TableCell>
                            <TableCell>
                              {formatRelativeTime(donation.createdAt)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              )}
            </Box>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default CreateBetCampaignDialog;
