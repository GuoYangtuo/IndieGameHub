import React from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Box,
  Paper,
  Typography,
  Button,
  Chip,
  LinearProgress,
  Alert,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Stack,
  TextField,
  InputAdornment,
  useTheme
} from '@mui/material';
import {
  FlagOutlined,
  MonetizationOn,
  Timer,
  People,
  ArrowBack,
  EmojiEvents,
  CheckCircle
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
  deliveryContent?: string;
  deliveryImages?: string[];
  donations?: BetDonation[];
}

interface MockProgress {
  raised: number;
  percent: number;
}

interface DonationState {
  selectedAmount: number | null;
  isCustomSelected: boolean;
  customAmount: string;
  donationMessage: string;
  donating: boolean;
  donationSuccess: boolean;
}

interface BetCampaignCardProps {
  campaign: BetCampaign;
  mode: 'view' | 'preview';
  previewPhase?: 'funding' | 'development' | 'completed';
  mockProgress?: MockProgress;
  donationState?: DonationState;
  onDonate?: (amount: number, message: string) => void;
  onDonationStateChange?: (state: Partial<DonationState>) => void;
  showBackButton?: boolean;
  onBack?: () => void;
}

const BetCampaignCard: React.FC<BetCampaignCardProps> = ({
  campaign,
  mode,
  previewPhase,
  mockProgress,
  donationState,
  onDonate,
  onDonationStateChange,
  showBackButton = false,
  onBack
}) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

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

  // 计算进度
  const progress = mode === 'preview' && mockProgress
    ? mockProgress.percent
    : Math.min((campaign.totalRaised / campaign.targetAmount) * 100, 100);

  const raised = mode === 'preview' && mockProgress
    ? mockProgress.raised
    : campaign.totalRaised;

  // 确定当前状态
  const currentStatus = mode === 'preview' && previewPhase
    ? (previewPhase === 'completed' ? 'completed' : previewPhase)
    : campaign.status;

  const currentResult = mode === 'preview' && previewPhase === 'completed'
    ? 'success'
    : campaign.result;

  // 获取状态颜色和文字
  const getStatusInfo = () => {
    switch (currentStatus) {
      case 'funding':
        return { color: 'primary', text: '正在众筹中' };
      case 'development':
        return { color: 'info', text: '正在开发中' };
      case 'completed':
        return { color: 'success', text: '挑战成功' };
      case 'failed':
        return { color: 'error', text: '挑战失败' };
      case 'cancelled':
        return { color: 'default', text: '已取消' };
      default:
        return { color: 'default', text: currentStatus };
    }
  };

  const statusInfo = getStatusInfo();

  // 剩余时间
  const remainingTime = currentStatus === 'funding'
    ? getRemainingTime(campaign.fundingEndTime)
    : currentStatus === 'development'
      ? getRemainingTime(campaign.developmentEndTime)
      : null;

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

  // 处理捐赠
  const handleDonate = () => {
    if (!onDonate || !donationState) return;
    let amount = 0;
    if (donationState.isCustomSelected && campaign.allowCustomAmount) {
      amount = donationState.customAmount ? parseInt(donationState.customAmount) : 0;
    } else if (donationState.selectedAmount !== null) {
      amount = donationState.selectedAmount;
    }
    if (!amount || amount <= 0) return;
    onDonate(amount, donationState.donationMessage);
  };

  const statusInfoSx = statusInfo.color === 'info' ? {
    backgroundColor: isDarkMode ? 'rgba(88, 166, 255, 0.2)' : 'rgba(9, 105, 218, 0.12)',
    color: isDarkMode ? '#79b8ff' : '#0550ae',
    fontWeight: 600,
  } : undefined;

  return (
    <Box>
      {showBackButton && (
        <Button startIcon={<ArrowBack />} sx={{ mb: 2 }} onClick={onBack}>
          返回项目
        </Button>
      )}

      {/* 对赌众筹信息卡片 */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5" component="h1">
            {campaign.title}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip
              label={`众筹${campaign.fundingDays}天`}
              size="small"
              variant="outlined"
            />
            <Chip
              label={`开发${campaign.developmentDays}天`}
              size="small"
              variant="outlined"
            />
            <Chip
              label={statusInfo.text}
              color={statusInfo.color as any}
              size="small"
              sx={statusInfoSx}
            />
          </Box>
        </Box>

        {campaign.description && (
          <Typography variant="body1" sx={{ mb: 3 }}>
            {campaign.description}
          </Typography>
        )}

        {/* 开发目标 */}
        {campaign.developmentGoals && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              <FlagOutlined sx={{ mr: 1, verticalAlign: 'middle', fontSize: 28, color: 'primary.main' }} />
              计划在开发阶段完成的目标（承诺你将会得到什么）
            </Typography>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Box sx={{ '& img': { maxWidth: '100%', height: 'auto' } }}>
                <ReactMarkdown>{campaign.developmentGoals}</ReactMarkdown>
              </Box>
            </Paper>
          </Box>
        )}

        {/* 开发目标图片 */}
        {campaign.developmentGoalImages && campaign.developmentGoalImages.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              {campaign.developmentGoalImages.map((image, index) => (
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
        {currentStatus === 'funding' && (
          <Box sx={{ mb: 2 }}>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{ height: 10, borderRadius: 5, mb: 0.5 }}
              color={progress >= 100 ? 'success' : 'primary'}
            />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2">
                已筹到：<strong style={{ color: theme.palette.primary.main }}>¥{raised}</strong>
              </Typography>
              <Typography variant="body2">
                目标：¥{campaign.targetAmount} ({progress.toFixed(1)}%)
              </Typography>
            </Box>
          </Box>
        )}

        {/* 剩余时间 */}
        {remainingTime && currentStatus !== 'completed' && currentStatus !== 'failed' && currentStatus !== 'cancelled' && (
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
              {currentStatus === 'funding'
                ? <>众筹将在 <strong>{remainingTime.days > 0 ? `${remainingTime.days}天 ` : ''}{remainingTime.hours > 0 ? `${remainingTime.hours}小时 ` : ''}{remainingTime.minutes > 0 ? `${remainingTime.minutes}分钟` : ''}</strong> 内结束，若达到目标金额则进入开发阶段，否则众筹失败退回已筹捐款</>
                : <>开发将在 <strong>{remainingTime.days > 0 ? `${remainingTime.days}天 ` : ''}{remainingTime.hours > 0 ? `${remainingTime.hours}小时 ` : ''}{remainingTime.minutes > 0 ? `${remainingTime.minutes}分钟` : ''}</strong> 内结束，若未达成开发目标，将退回所有捐款</>
              }
            </Typography>
          </Box>
        )}

        {/* 捐赠档位 - 仅在众筹阶段显示 */}
        {currentStatus === 'funding' && mode === 'view' && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              <MonetizationOn sx={{ mr: 1, verticalAlign: 'middle', fontSize: 28, color: 'primary.main' }} />
              选择捐赠档位
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
              {campaign.tierAmounts.map((amount) => (
                <Button
                  key={amount}
                  variant={donationState?.selectedAmount === amount && !donationState?.isCustomSelected ? 'contained' : 'outlined'}
                  onClick={() => onDonationStateChange?.({
                    selectedAmount: amount,
                    isCustomSelected: false,
                    customAmount: ''
                  })}
                  sx={{ minWidth: 80 }}
                >
                  ¥{amount}
                </Button>
              ))}
              {campaign.allowCustomAmount && (
                <Button
                  variant={donationState?.isCustomSelected ? 'contained' : 'outlined'}
                  onClick={() => onDonationStateChange?.({
                    isCustomSelected: true,
                    selectedAmount: null
                  })}
                  sx={{ minWidth: 80 }}
                >
                  自定义
                </Button>
              )}
            </Stack>

            {donationState?.isCustomSelected && campaign.allowCustomAmount && (
              <TextField
                label="请输入自定义金额"
                type="number"
                value={donationState.customAmount}
                onChange={(e) => onDonationStateChange?.({ customAmount: e.target.value })}
                InputProps={{
                  startAdornment: <InputAdornment position="start">¥</InputAdornment>,
                }}
                sx={{ mb: 2 }}
                fullWidth
                autoFocus
              />
            )}

            <TextField
              label="给开发者的留言（可选）"
              value={donationState?.donationMessage || ''}
              onChange={(e) => onDonationStateChange?.({ donationMessage: e.target.value })}
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
              disabled={donationState?.donating}
              startIcon={<MonetizationOn />}
            >
              {donationState?.donating ? '处理中...' : '确认捐赠'}
            </Button>

            {donationState?.donationSuccess && (
              <Alert severity="success" sx={{ mt: 2 }}>
                捐赠成功！感谢您的支持！
              </Alert>
            )}
          </Box>
        )}

        {/* 预览模式下的捐赠档位（静态展示） */}
        {currentStatus === 'funding' && mode === 'preview' && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              <MonetizationOn sx={{ mr: 1, verticalAlign: 'middle', fontSize: 28, color: 'primary.main' }} />
              选择捐赠档位
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
              {campaign.tierAmounts.map((amount) => (
                <Button
                  key={amount}
                  variant="outlined"
                  sx={{ minWidth: 80 }}
                >
                  ¥{amount}
                </Button>
              ))}
              {campaign.allowCustomAmount && (
                <Button variant="outlined" sx={{ minWidth: 80 }}>
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
        {currentStatus === 'development' && (
          <Alert severity="info" sx={{ mt: 2 }}>
            开发阶段进行中，请耐心等待开发者完成目标。开发完成后，结果将在这里公布。
          </Alert>
        )}

        {(currentStatus === 'completed' || currentResult === 'success') && (
          <Alert severity="success" sx={{ mt: 2 }}>
            挑战成功！开发者已完成目标，感谢所有支持者的参与！
          </Alert>
        )}

        {(currentStatus === 'failed' || currentResult === 'failed') && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            挑战失败，所有捐款已退回给捐赠者。感谢您的参与！
          </Alert>
        )}

        {/* 交付结果/失败原因 */}
        {(currentStatus === 'completed' || currentStatus === 'failed') && campaign.deliveryContent && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              <CheckCircle sx={{ mr: 1, verticalAlign: 'middle', fontSize: 24, color: currentStatus === 'completed' ? 'success.main' : 'error.main' }} />
              {currentStatus === 'completed' ? '交付成果' : '放弃说明'}
            </Typography>
            <Paper variant="outlined" sx={{ p: 2, bgcolor: currentStatus === 'completed' ? 'rgba(63, 185, 80, 0.08)' : 'rgba(244, 67, 54, 0.08)' }}>
              <Box sx={{ '& img': { maxWidth: '100%', height: 'auto' } }}>
                <ReactMarkdown>{campaign.deliveryContent}</ReactMarkdown>
              </Box>
            </Paper>
          </Box>
        )}

        {/* 交付图片 */}
        {campaign.deliveryImages && campaign.deliveryImages.length > 0 && (currentStatus === 'completed' || currentStatus === 'failed') && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              相关截图
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              {campaign.deliveryImages.map((image, index) => (
                <Box
                  key={index}
                  component="img"
                  src={image}
                  alt={`交付截图 ${index + 1}`}
                  sx={{
                    maxWidth: '100%',
                    maxHeight: 300,
                    objectFit: 'contain',
                    borderRadius: 2,
                    boxShadow: 1
                  }}
                />
              ))}
            </Box>
          </Box>
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
    </Box>
  );
};

export default BetCampaignCard;
