import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Divider,
  Avatar,
  TextField,
  Chip,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Tooltip,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Stack,
  useTheme,
  Checkbox,
  FormControlLabel,
  Grid,
  Slider
} from '@mui/material';
import MDEditor from '@uiw/react-md-editor';
import {
  ArrowBack,
  AttachMoney,
  EmojiEvents,
  Warning,
  CheckCircle,
  Cancel,
  Timer,
  People,
  MonetizationOn,
  Add,
  Delete,
  History,
  Create,
  Image as ImageIcon,
  HelpOutline,
  CloudUpload
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { betCampaignAPI, projectAPI } from '../services/api';
import { formatDate, formatRelativeTime } from '../utils/dateUtils';
import BetCampaignGuide from '../components/BetCampaignGuide';

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

interface Project {
  id: string;
  name: string;
  slug: string;
  description: string;
  createdBy: string;
  members: string[];
}

const BetCampaignManagePage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const theme = useTheme();

  const [project, setProject] = useState<Project | null>(null);
  const [campaigns, setCampaigns] = useState<BetCampaign[]>([]);
  const [activeCampaign, setActiveCampaign] = useState<BetCampaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [guideHidden, setGuideHidden] = useState(() => {
    return localStorage.getItem('bet_campaign_guide_hidden') === 'true';
  });
  const [guideForceShow, setGuideForceShow] = useState(0);

  // 创建对话框状态
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // 创建表单状态
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetAmount, setTargetAmount] = useState(100);
  const [fundingDays, setFundingDays] = useState(3);
  const [developmentDays, setDevelopmentDays] = useState(7);
  const [developmentGoals, setDevelopmentGoals] = useState('');
  const [goalImages, setGoalImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [tierAmounts, setTierAmounts] = useState<number[]>([5, 10, 20]);
  const [allowCustomAmount, setAllowCustomAmount] = useState(true);

  // 获取项目和对赌众筹数据
  useEffect(() => {
    const fetchData = async () => {
      if (!slug || !user) return;

      try {
        setLoading(true);

        // 获取项目信息
        const projectResponse = await projectAPI.getProjectBySlug(slug);
        const projectData = projectResponse.data;
        setProject(projectData);

        // 检查是否是项目成员
        const memberCheck = projectData.members.includes(user.id) || projectData.createdBy === user.id;
        setIsMember(memberCheck);

        if (!memberCheck) {
          setError('只有项目成员才能管理对赌众筹');
          return;
        }

        // 获取所有对赌众筹
        const campaignsResponse = await betCampaignAPI.getBetCampaigns(projectData.id);
        setCampaigns(campaignsResponse.data);

        // 获取进行中的对赌众筹
        const activeResponse = await betCampaignAPI.getActiveBetCampaign(projectData.id);
        if (activeResponse.data) {
          setActiveCampaign(activeResponse.data);
        }
      } catch (err: any) {
        console.error('获取数据失败:', err);
        setError(err.response?.data?.error || '获取数据失败');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [slug, user]);

  // 处理创建对赌众筹
  const handleCreate = async () => {
    if (!project) return;

    if (!title || !targetAmount || !fundingDays || !developmentDays) {
      alert('请填写所有必填字段');
      return;
    }

    if (fundingDays < 1 || developmentDays < 1) {
      alert('天数必须大于0');
      return;
    }

    if (targetAmount < 1) {
      alert('目标金额必须大于0');
      return;
    }

    try {
      setCreating(true);
      await betCampaignAPI.createBetCampaign({
        projectId: project.id,
        title,
        description,
        targetAmount,
        fundingDays,
        developmentDays,
        developmentGoals: developmentGoals || undefined,
        tierAmounts,
        allowCustomAmount
      }, goalImages);

      // 刷新数据
      const campaignsResponse = await betCampaignAPI.getBetCampaigns(project.id);
      setCampaigns(campaignsResponse.data);

      const activeResponse = await betCampaignAPI.getActiveBetCampaign(project.id);
      if (activeResponse.data) {
        setActiveCampaign(activeResponse.data);
      }

      // 关闭对话框并重置表单
      setCreateDialogOpen(false);
      resetForm();

      alert('对赌众筹创建成功！');
    } catch (err: any) {
      console.error('创建失败:', err);
      alert(err.response?.data?.error || '创建失败，请稍后再试');
    } finally {
      setCreating(false);
    }
  };

  // 处理删除对赌众筹
  const handleDelete = async (campaignId: string) => {
    if (!project) return;

    if (!confirm('确定要删除这个对赌众筹吗？删除后无法恢复。')) {
      return;
    }

    try {
      await betCampaignAPI.deleteBetCampaign(campaignId);

      // 刷新数据
      const campaignsResponse = await betCampaignAPI.getBetCampaigns(project.id);
      setCampaigns(campaignsResponse.data);

      const activeResponse = await betCampaignAPI.getActiveBetCampaign(project.id);
      if (activeResponse.data) {
        setActiveCampaign(activeResponse.data);
      } else {
        setActiveCampaign(null);
      }

      alert('对赌众筹已取消');
    } catch (err: any) {
      console.error('删除失败:', err);
      alert(err.response?.data?.error || '删除失败，请稍后再试');
    }
  };

  // 处理设置开发结果
  const handleSetResult = async (campaignId: string, result: 'success' | 'failed') => {
    if (!project) return;

    const confirmMessage = result === 'success'
      ? '确定要标记为挑战成功吗？这将把捐款转给开发者。'
      : '确定要标记为挑战失败吗？这将退还所有捐款。';

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      await betCampaignAPI.setDevelopmentResult(campaignId, result);

      // 刷新数据
      const campaignsResponse = await betCampaignAPI.getBetCampaigns(project.id);
      setCampaigns(campaignsResponse.data);

      const activeResponse = await betCampaignAPI.getActiveBetCampaign(project.id);
      setActiveCampaign(activeResponse.data);

      alert(result === 'success' ? '已标记为挑战成功！' : '已标记为挑战失败，捐款已退还。');
    } catch (err: any) {
      console.error('设置结果失败:', err);
      alert(err.response?.data?.error || '操作失败，请稍后再试');
    }
  };

  // 重置表单
  const resetForm = () => {
    setTitle('');
    setDescription('');
    setTargetAmount(100);
    setFundingDays(3);
    setDevelopmentDays(7);
    setDevelopmentGoals('');
    setGoalImages([]);
    setImagePreviews([]);
    setTierAmounts([5, 10, 20]);
    setAllowCustomAmount(true);
  };

  // 获取状态颜色和文字
  const getStatusInfo = (status: string, result?: string) => {
    switch (status) {
      case 'funding':
        return { color: 'primary', text: '众筹中' };
      case 'development':
        return { color: 'warning', text: '开发中' };
      case 'completed':
        return { color: 'success', text: '挑战成功' };
      case 'failed':
        return { color: 'error', text: result === 'failed' ? '众筹失败' : '挑战失败' };
      case 'cancelled':
        return { color: 'default', text: '已取消' };
      default:
        return { color: 'default', text: status };
    }
  };

  // 计算剩余时间
  const getRemainingTime = (endTime: string): string => {
    if (!endTime) return '';
    const now = new Date();
    const end = new Date(endTime);
    const diff = end.getTime() - now.getTime();

    if (diff <= 0) return '已结束';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    let result = '';
    if (days > 0) result += `${days}天 `;
    if (hours > 0) result += `${hours}小时 `;
    if (minutes > 0) result += `${minutes}分钟`;

    return result || '即将结束';
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 8, textAlign: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error || !project) {
    return (
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || '未找到项目'}
        </Alert>
        <Button startIcon={<ArrowBack />} onClick={() => navigate(`/projects/${slug}`)}>
          返回项目
        </Button>
      </Container>
    );
  }

  if (!isMember) {
    return (
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          只有项目成员才能管理对赌众筹
        </Alert>
        <Button startIcon={<ArrowBack />} onClick={() => navigate(`/projects/${slug}`)}>
          返回项目
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* 返回按钮 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate(`/projects/${slug}`)}>
          返回项目
        </Button>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {guideHidden && (
            <Tooltip title="显示对赌众筹说明">
              <IconButton
                onClick={() => {
                  localStorage.removeItem('bet_campaign_guide_hidden');
                  setGuideHidden(false);
                  setGuideForceShow(prev => prev + 1);
                }}
                size="small"
              >
                <HelpOutline />
              </IconButton>
            </Tooltip>
          )}
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setCreateDialogOpen(true)}
            disabled={!!activeCampaign}
          >
            创建对赌众筹
          </Button>
        </Box>
      </Box>

      {/* 对赌众筹说明 */}
      <BetCampaignGuide forceShow={guideForceShow} onNeverShow={() => setGuideHidden(true)} />

      {/* 进行中的对赌众筹 */}
      {activeCampaign && (
        <Paper sx={{ p: 3, mb: 3, border: 2, borderColor: 'primary.main' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Typography variant="h6">{activeCampaign.title}</Typography>
            <Chip
              label={getStatusInfo(activeCampaign.status, activeCampaign.result).text}
              color={getStatusInfo(activeCampaign.status).color as any}
            />
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            目标：¥{activeCampaign.targetAmount} | 已筹集：¥{activeCampaign.totalRaised}
            {' | '}众筹：{activeCampaign.fundingDays}天 | 开发：{activeCampaign.developmentDays}天
          </Typography>

          {activeCampaign.status === 'funding' && (
            <Typography variant="body2" color="primary" sx={{ mb: 2 }}>
              剩余时间：{getRemainingTime(activeCampaign.fundingEndTime)}
            </Typography>
          )}

          {activeCampaign.status === 'development' && (
            <>
              <Typography variant="body2" color="warning.main" sx={{ mb: 2 }}>
                剩余开发时间：{getRemainingTime(activeCampaign.developmentEndTime)}
              </Typography>
              <Stack direction="row" spacing={2}>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<CheckCircle />}
                  onClick={() => handleSetResult(activeCampaign.id, 'success')}
                >
                  标记为成功
                </Button>
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<Cancel />}
                  onClick={() => handleSetResult(activeCampaign.id, 'failed')}
                >
                  标记为失败
                </Button>
              </Stack>
            </>
          )}

          <Divider sx={{ my: 2 }} />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<Create />}
              onClick={() => navigate(`/projects/${slug}/bet-campaign/${activeCampaign.id}`)}
            >
              查看详情
            </Button>
            {activeCampaign.status === 'funding' && activeCampaign.totalRaised < activeCampaign.targetAmount && (
              <Button
                variant="outlined"
                color="error"
                startIcon={<Delete />}
                onClick={() => handleDelete(activeCampaign.id)}
              >
                取消众筹
              </Button>
            )}
          </Box>
        </Paper>
      )}

      {/* 对赌众筹历史 */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          <History sx={{ mr: 1, verticalAlign: 'middle' }} />
          对赌众筹历史
        </Typography>

        {campaigns.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            暂无对赌众筹记录
          </Typography>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>标题</TableCell>
                  <TableCell>状态</TableCell>
                  <TableCell align="right">目标金额</TableCell>
                  <TableCell align="right">已筹集</TableCell>
                  <TableCell>时间</TableCell>
                  <TableCell>操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {campaigns.map((campaign) => (
                  <TableRow key={campaign.id}>
                    <TableCell>{campaign.title}</TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusInfo(campaign.status, campaign.result).text}
                        color={getStatusInfo(campaign.status, campaign.result).color as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">¥{campaign.targetAmount}</TableCell>
                    <TableCell align="right">¥{campaign.totalRaised}</TableCell>
                    <TableCell>{formatRelativeTime(campaign.createdAt)}</TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        onClick={() => navigate(`/projects/${slug}/bet-campaign/${campaign.id}`)}
                      >
                        查看
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* 创建对赌众筹对话框 */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>创建对赌众筹</DialogTitle>
        <DialogContent>
          <TextField
            label="标题"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            fullWidth
            required
            sx={{ mb: 2, mt: 1 }}
          />

          <TextField
            label="描述（可选）"
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
            {/* <Typography variant="caption" color="text.secondary">
              支持Markdown格式
            </Typography> */}
          </Box>

          {/* 开发目标图片上传 */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              配图（思维导图，路线图，参考效果图等，可选，最多10张）
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
                    // 创建预览
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
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>取消</Button>
          <Button
            onClick={handleCreate}
            variant="contained"
            disabled={creating || !title || !targetAmount || !fundingDays || !developmentDays}
          >
            {creating ? '创建中...' : '创建'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default BetCampaignManagePage;
