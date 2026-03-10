import React, { useState, useEffect } from 'react';
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
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  InputAdornment,
  Tooltip,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Stack,
  useTheme
} from '@mui/material';
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
  Image as ImageIcon,
  Delete,
  History
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
  developmentGoals?: string | string[];
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

const BetCampaignPage: React.FC = () => {
  const { slug, campaignId } = useParams<{ slug: string; campaignId?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const theme = useTheme();

  const [project, setProject] = useState<Project | null>(null);
  const [campaign, setCampaign] = useState<BetCampaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 捐赠相关状态
  const [selectedAmount, setSelectedAmount] = useState<number>(10);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [donationMessage, setDonationMessage] = useState('');
  const [donating, setDonating] = useState(false);
  const [donationSuccess, setDonationSuccess] = useState(false);

  // 获取项目和对赌众筹数据
  useEffect(() => {
    const fetchData = async () => {
      if (!slug) return;

      try {
        setLoading(true);

        // 获取项目信息
        const projectResponse = await projectAPI.getProjectBySlug(slug);
        const projectData = projectResponse.data;
        setProject(projectData);

        // 获取对赌众筹详情
        if (campaignId) {
          const campaignResponse = await betCampaignAPI.getBetCampaignById(campaignId);
          setCampaign(campaignResponse.data);
        } else {
          // 如果没有指定campaignId，尝试获取进行中的对赌众筹
          const activeResponse = await betCampaignAPI.getActiveBetCampaign(projectData.id);
          if (activeResponse.data) {
            setCampaign(activeResponse.data);
          }
        }
      } catch (err: any) {
        console.error('获取数据失败:', err);
        setError(err.response?.data?.error || '获取数据失败');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [slug, campaignId]);

  // 计算剩余时间
  const getRemainingTime = (endTime: string): { days: number; hours: number; minutes: number } | null => {
    if (!endTime) return null;
    const now = new Date();
    const end = new Date(endTime);
    const diff = end.getTime() - now.getTime();

    if (diff <= 0) return { days: 0, hours: 0, minutes: 0 };

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return { days, hours, minutes };
  };

  // 处理捐赠
  const handleDonate = async () => {
    if (!campaign || !user) {
      alert('请先登录');
      return;
    }

    const amount = campaign.allowCustomAmount && customAmount ? parseInt(customAmount) : selectedAmount;
    if (!amount || amount <= 0) {
      alert('请选择或输入有效的捐赠金额');
      return;
    }

    try {
      setDonating(true);
      await betCampaignAPI.donateToBetCampaign(campaign.id, amount, donationMessage);
      setDonationSuccess(true);

      // 刷新数据
      const campaignResponse = await betCampaignAPI.getBetCampaignById(campaign.id);
      setCampaign(campaignResponse.data);
    } catch (err: any) {
      console.error('捐赠失败:', err);
      alert(err.response?.data?.error || '捐赠失败，请稍后再试');
    } finally {
      setDonating(false);
    }
  };

  // 获取状态颜色和文字
  const getStatusInfo = () => {
    if (!campaign) return { color: 'default', text: '' };

    switch (campaign.status) {
      case 'funding':
        return { color: 'primary', text: '众筹中' };
      case 'development':
        return { color: 'warning', text: '开发中' };
      case 'completed':
        return { color: 'success', text: '挑战成功' };
      case 'failed':
        return { color: 'error', text: '挑战失败' };
      case 'cancelled':
        return { color: 'default', text: '已取消' };
      default:
        return { color: 'default', text: campaign.status };
    }
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error || !campaign) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || '未找到对赌众筹'}
        </Alert>
        <Button startIcon={<ArrowBack />} onClick={() => navigate(`/projects/${slug}`)}>
          返回项目
        </Button>
      </Container>
    );
  }

  const statusInfo = getStatusInfo();
  const remainingTime = campaign.status === 'funding'
    ? getRemainingTime(campaign.fundingEndTime)
    : campaign.status === 'development'
      ? getRemainingTime(campaign.developmentEndTime)
      : null;

  const progress = Math.min((campaign.totalRaised / campaign.targetAmount) * 100, 100);

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* 返回按钮 */}
      <Button
        startIcon={<ArrowBack />}
        onClick={() => navigate(`/projects/${slug}`)}
        sx={{ mb: 2 }}
      >
        返回项目
      </Button>

      {/* 对赌众筹说明 */}
      <BetCampaignGuide />

      {/* 对赌众筹信息卡片 */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              {campaign.title}
            </Typography>
            <Chip
              label={statusInfo.text}
              color={statusInfo.color as any}
              sx={{ mr: 1 }}
            />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              目标金额：<strong>¥{campaign.targetAmount}</strong>
              {' | '}众筹天数：<strong>{campaign.fundingDays}天</strong>
              {' | '}开发天数：<strong>{campaign.developmentDays}天</strong>
            </Typography>
          </Box>
        </Box>

        {campaign.description && (
          <Typography variant="body1" sx={{ mb: 3 }}>
            {campaign.description}
          </Typography>
        )}

        {/* 进度显示 */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2">
              已筹集：<strong style={{ color: theme.palette.primary.main }}>¥{campaign.totalRaised}</strong>
            </Typography>
            <Typography variant="body2">
              目标：¥{campaign.targetAmount} ({progress.toFixed(1)}%)
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{ height: 10, borderRadius: 5 }}
            color={progress >= 100 ? 'success' : 'primary'}
          />
        </Box>

        {/* 剩余时间 */}
        {remainingTime && campaign.status !== 'completed' && campaign.status !== 'failed' && campaign.status !== 'cancelled' && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, p: 2, bgcolor: 'grey.100', borderRadius: 2 }}>
            <Timer color="primary" />
            <Typography variant="body1">
              {campaign.status === 'funding' ? '众筹剩余时间' : '开发剩余时间'}：
              <strong>
                {remainingTime.days > 0 && `${remainingTime.days}天 `}
                {remainingTime.hours > 0 && `${remainingTime.hours}小时 `}
                {remainingTime.minutes > 0 && `${remainingTime.minutes}分钟`}
                {remainingTime.days === 0 && remainingTime.hours === 0 && remainingTime.minutes === 0 && '已结束'}
              </strong>
            </Typography>
          </Box>
        )}

        {/* 开发目标 */}
        {campaign.developmentGoals && campaign.developmentGoals.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              <CheckCircle sx={{ mr: 1, verticalAlign: 'middle' }} />
              开发目标
            </Typography>
            <Paper variant="outlined" sx={{ p: 2 }}>
              {Array.isArray(campaign.developmentGoals) ? (
                <List dense>
                  {campaign.developmentGoals.map((goal, index) => (
                    <ListItem key={index}>
                      <ListItemText primary={goal} />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2">{campaign.developmentGoals}</Typography>
              )}
            </Paper>
          </Box>
        )}

        {/* 捐赠档位 */}
        {campaign.status === 'funding' && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              <MonetizationOn sx={{ mr: 1, verticalAlign: 'middle' }} />
              选择捐赠档位
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
              {campaign.tierAmounts.map((amount) => (
                <Button
                  key={amount}
                  variant={selectedAmount === amount ? 'contained' : 'outlined'}
                  onClick={() => {
                    setSelectedAmount(amount);
                    setCustomAmount('');
                  }}
                  sx={{ minWidth: 80 }}
                >
                  ¥{amount}
                </Button>
              ))}
            </Stack>

            {campaign.allowCustomAmount && (
              <TextField
                label="自定义金额"
                type="number"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                InputProps={{
                  startAdornment: <InputAdornment position="start">¥</InputAdornment>,
                }}
                sx={{ mb: 2 }}
                fullWidth
              />
            )}

            <TextField
              label="给开发者的留言（可选）"
              value={donationMessage}
              onChange={(e) => setDonationMessage(e.target.value)}
              multiline
              rows={2}
              fullWidth
              sx={{ mb: 2 }}
            />

            <Button
              variant="contained"
              size="large"
              fullWidth
              onClick={handleDonate}
              disabled={donating || !user}
              startIcon={<MonetizationOn />}
            >
              {donating ? '处理中...' : user ? '确认捐赠' : '请先登录后捐赠'}
            </Button>

            {donationSuccess && (
              <Alert severity="success" sx={{ mt: 2 }}>
                捐赠成功！感谢您的支持！
              </Alert>
            )}
          </Box>
        )}

        {/* 开发阶段结束后的结果提示 */}
        {campaign.status === 'development' && (
          <Alert severity="info" sx={{ mt: 2 }}>
            开发阶段进行中，请耐心等待开发者完成目标。开发完成后，结果将在这里公布。
          </Alert>
        )}

        {(campaign.status === 'completed' || campaign.result === 'success') && (
          <Alert severity="success" sx={{ mt: 2 }}>
            挑战成功！开发者已完成目标，感谢所有支持者的参与！
          </Alert>
        )}

        {(campaign.status === 'failed' || campaign.result === 'failed') && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            挑战失败，所有捐款已退回给捐赠者。感谢您的参与！
          </Alert>
        )}
      </Paper>

      {/* 捐赠者列表 */}
      {campaign.donations && campaign.donations.length > 0 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            <People sx={{ mr: 1, verticalAlign: 'middle' }} />
            捐赠者名单 ({campaign.donations.length}人)
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
                {campaign.donations.map((donation, index) => (
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
    </Container>
  );
};

export default BetCampaignPage;
