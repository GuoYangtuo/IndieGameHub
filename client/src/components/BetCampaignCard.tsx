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
  Tooltip,
  useTheme
} from '@mui/material';
import {
  FlagOutlined,
  MonetizationOn,
  People,
  ArrowBack,
  EmojiEvents,
  CheckCircle,
  ThumbUp,
  ThumbDown,
  HourglassEmpty,
} from '@mui/icons-material';

interface BetDonation {
  userId: string;
  totalAmount: number;
  donatedCount: number;
  lastMessage?: string;
  firstDonationAt: string;
  username?: string;
  avatar_url?: string;
  reviewStatus?: 'pending' | 'approved' | 'rejected';
  reviewComment?: string;
  reviewedAt?: string;
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
  onBack
}) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  // 计算进度（进度条最大100%，但显示真实百分比）
  const rawPercent = (campaign.totalRaised / campaign.targetAmount) * 100;
  const progress = mode === 'preview' && mockProgress
    ? mockProgress.percent
    : Math.min(rawPercent, 100);

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

  const isSuccessCampaign = currentStatus === 'completed' && currentResult === 'success';

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
      {/* 时间线进度条 */}
      <TimelineProgress campaign={campaign} />

      {/* 对赌众筹信息卡片 */}
      <Paper sx={{ p: 3, mb: 4 }}>
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
          <Typography variant="body1" sx={{ mb: 4 }}>
            {campaign.description}
          </Typography>
        )}

        {/* 开发目标 */}
        {campaign.developmentGoals && (
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              <FlagOutlined sx={{ mr: 1, verticalAlign: 'middle', fontSize: 28, color: 'primary.main' }} />
              计划在开发阶段完成的目标（承诺你将会得到什么）
            </Typography>
            <Paper variant="outlined" sx={{ p: 0 }}>
              <Box sx={{ '& img': { maxWidth: '100%', height: 'auto' } }}>
                <ReactMarkdown>{campaign.developmentGoals}</ReactMarkdown>
              </Box>
            </Paper>
          </Box>
        )}

        {/* 开发目标图片 */}
        {campaign.developmentGoalImages && campaign.developmentGoalImages.length > 0 && (
          <Box sx={{ mb: 4 }}>
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
              sx={{
                height: 10,
                borderRadius: 5,
                mb: 0.5,
                bgcolor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 5,
                  background: progress >= 100
                    ? theme.palette.success.main
                    : `linear-gradient(90deg, ${theme.palette.success.main}, ${isDarkMode ? '#a3e635' : '#65a30d'})`,
                },
              }}
            />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2">
                已筹到：<strong style={{ color: theme.palette.primary.main }}>¥{raised}</strong>
              </Typography>
              <Typography variant="body2">
                目标：¥{campaign.targetAmount} ({rawPercent.toFixed(1)}%)
              </Typography>
            </Box>
          </Box>
        )}


        {/* 捐赠档位 - 仅在众筹阶段显示 */}
        {currentStatus === 'funding' && mode === 'view' && (
          <Box sx={{ mb: 1 }}>
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
              sx={{ mb: 1 }}
            >
              {donationState?.donating ? '处理中...' : '确认捐赠'}
            </Button>

            {donationState?.donationSuccess && (
              <Alert severity="info" sx={{ mt: 0.5 }}>
                已发起支付，请在打开的页面完成支付。支付成功后，稍等几秒刷新页面即可查看捐赠结果。
              </Alert>
            )}

            <Box sx={{ mt: 0.5, mb: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                - 众筹结束时，若未达目标金额，将退回所有捐款
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                - 众筹成功后，进入开发阶段；开发结束后，若对目标完成情况不满意，将退回你的捐款
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                - 众筹目标达到后也可以继续捐赠哦，开发者动力会更强哦！
              </Typography>
            </Box>
          </Box>
        )}

        {/* 预览模式下的捐赠档位（静态展示） */}
        {currentStatus === 'funding' && mode === 'preview' && (
          <Box sx={{ mb: 4 }}>
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
              sx={{ mb: 1 }}
            >
              确认捐赠
            </Button>
            <Box sx={{ mt: 0.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                - 众筹结束时，若未达目标金额，将退回所有捐款
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                - 众筹成功后，进入开发阶段；开发结束后，若对目标完成情况不满意，将退回你的捐款
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                - 众筹目标达到后也可以继续捐赠哦，开发者动力会更强哦！
              </Typography>
            </Box>
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
            <Paper variant="outlined" sx={{ px: 2, bgcolor: currentStatus === 'completed' ? 'rgba(63, 185, 80, 0.08)' : 'rgba(244, 67, 54, 0.08)' }}>
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

      {/* 捐赠者名单 */}
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
                  <TableCell align="right">累计金额</TableCell>
                  {isSuccessCampaign && <TableCell>审核状态</TableCell>}
                  <TableCell>首次捐赠</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {campaign.donations.map((donation, index) => {
                  const reviewStatus = donation.reviewStatus || 'pending';
                  const isApproved = reviewStatus === 'approved';
                  const isRejected = reviewStatus === 'rejected';

                  return (
                    <TableRow key={donation.userId}>
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
                          <Box>
                            <Typography variant="body2">{donation.username}</Typography>
                            {donation.donatedCount > 1 && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                {donation.donatedCount}笔订单
                              </Typography>
                            )}
                            {donation.lastMessage && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {donation.lastMessage}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <strong>¥{donation.totalAmount}</strong>
                      </TableCell>
                      {isSuccessCampaign && (
                        <TableCell>
                          {reviewStatus === 'pending' && (
                            <Chip
                              icon={<HourglassEmpty sx={{ fontSize: 16 }} />}
                              label="待审核"
                              size="small"
                              variant="outlined"
                              color="default"
                            />
                          )}
                          {isApproved && (
                            <Box>
                              <Chip
                                icon={<ThumbUp sx={{ fontSize: 16 }} />}
                                label="已通过"
                                size="small"
                                color="success"
                              />
                              {donation.reviewComment && (
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  &quot;{donation.reviewComment}&quot;
                                </Typography>
                              )}
                            </Box>
                          )}
                          {isRejected && (
                            <Box>
                              <Chip
                                icon={<ThumbDown sx={{ fontSize: 16 }} />}
                                label="已退款"
                                size="small"
                                color="error"
                              />
                              {donation.reviewComment && (
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  &quot;{donation.reviewComment}&quot;
                                </Typography>
                              )}
                            </Box>
                          )}
                        </TableCell>
                      )}
                      <TableCell>
                        {formatRelativeTime(donation.firstDonationAt)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Box>
  );
};

export default BetCampaignCard;

// 时间线进度条组件
interface TimelineProgressProps {
  campaign: BetCampaign;
}

const TimelineProgress: React.FC<TimelineProgressProps> = ({ campaign }) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  // 审核终止时间 = 开发结束时间 + 3天
  const reviewDeadline = new Date(campaign.developmentEndTime);
  reviewDeadline.setDate(reviewDeadline.getDate() + 3);

  // 格式化相对时间（可显示"X天X小时前/后"，最多到小时，不显示分钟）
  const formatRelativeTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const absDays = Math.floor(Math.abs(diff) / 86400000);
    const absHours = Math.floor((Math.abs(diff) % 86400000) / 3600000);

    const isPast = diff > 0;
    const suffix = isPast ? '前' : '后';

    if (Math.abs(diff) < 60000) return '刚刚';
    if (absDays > 0) return `${absDays}天${absHours > 0 ? `${absHours}小时` : ''}${suffix}`;
    if (absHours > 0) return `${absHours}小时${suffix}`;
    return `1小时${suffix}`;
  };

  // 格式化绝对时间
  const formatAbsoluteTime = (dateStr: string): string => {
    return new Date(dateStr).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  // 计算总时间跨度
  const totalStart = new Date(campaign.createdAt).getTime();
  const totalEnd = reviewDeadline.getTime();
  const totalDuration = totalEnd - totalStart;

  // 计算当前进度百分比
  const now = new Date();
  const currentProgress = Math.min(Math.max(((now.getTime() - totalStart) / totalDuration) * 100, 0), 100);

  // 计算各时间点在进度条上的位置（按比例）
  const getPosition = (time: string): number => {
    const timeMs = new Date(time).getTime();
    return Math.min(Math.max(((timeMs - totalStart) / totalDuration) * 100, 0), 100);
  };

  // 时间点数据（按实际时间比例分布位置）
  const milestones = [
    { key: 'created', label: '众筹创建', time: campaign.createdAt },
    { key: 'fundingEnd', label: '众筹结束', time: campaign.fundingEndTime },
    { key: 'devEnd', label: '开发结束', time: campaign.developmentEndTime },
    { key: 'reviewEnd', label: '审核终止', time: reviewDeadline.toISOString() },
  ].map(m => ({ ...m, position: getPosition(m.time) }));

  return (
    <Box sx={{ mb: 8 }}>
      <Box sx={{ position: 'relative', px: 1 }}>
        {/* 背景进度条 */}
        <Box
          sx={{
            height: 8,
            borderRadius: 4,
            bgcolor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* 已过时间（深色部分） */}
          <Box
            sx={{
              position: 'absolute',
              left: 0,
              top: 0,
              height: '100%',
              width: `${currentProgress}%`,
              borderRadius: 4,
              bgcolor: 'primary.main',
              transition: 'width 0.3s ease',
            }}
          />
          {/* 当前时间指示器（小三角） */}
          <Box
            sx={{
              position: 'absolute',
              left: `${currentProgress}%`,
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: 0,
              height: 0,
              borderLeft: '8px solid',
              borderLeftColor: 'primary.main',
              borderTop: '6px solid transparent',
              borderBottom: '6px solid transparent',
            }}
          />
        </Box>

        {/* 节点标签 */}
        <Box sx={{ position: 'relative', mt: -1.2 }}>
          {milestones.map((m, index) => {
            const isPast = new Date(m.time).getTime() <= now.getTime();
            return (
              <Tooltip
                key={m.key}
                title={<Box sx={{ textAlign: 'center' }}>{formatAbsoluteTime(m.time)}</Box>}
                arrow
                placement="top"
              >
                <Box
                  sx={{
                    position: 'absolute',
                    left: `${m.position}%`,
                    transform: 'translateX(-50%)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    cursor: 'default',
                    minWidth: 70,
                  }}
                >
                  {/* 节点圆点 */}
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      bgcolor: isPast ? 'primary.main' : (isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'),
                      border: `2px solid ${isPast ? 'primary.main' : (isDarkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)')}`,
                    }}
                  />
                  {/* 标签文字 */}
                  <Typography
                    variant="caption"
                    sx={{
                      mt: 0.25,
                      fontWeight: 500,
                      color: isPast ? 'primary.main' : 'text.secondary',
                      textAlign: 'center',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {m.label}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color: isPast ? 'text.primary' : 'text.secondary',
                      textAlign: 'center',
                      fontSize: '0.7rem',
                      lineHeight: 1.2,
                    }}
                  >
                    {formatRelativeTime(m.time)}
                  </Typography>
                </Box>
              </Tooltip>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
};
