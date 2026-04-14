import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Alert,
  CircularProgress,
  Button,
  Paper,
  Typography,
  Box,
  TextField,
  Avatar,
  Chip,
  Stack,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  ArrowBack,
  ThumbUp,
  ThumbDown,
  HelpOutline,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { betCampaignAPI, projectAPI } from '../services/api';
import BetCampaignGuide from '../components/BetCampaignGuide';
import BetCampaignCard from '../components/BetCampaignCard';

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

  const [project, setProject] = useState<Project | null>(null);
  const [campaign, setCampaign] = useState<BetCampaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 捐赠相关状态
  const [donationState, setDonationState] = useState({
    selectedAmount: null as number | null,
    isCustomSelected: false,
    customAmount: '',
    donationMessage: '',
    donating: false,
    donationSuccess: false,
  });

  // 审核相关状态
  const [reviewState, setReviewState] = useState({
    comment: '',
    submitting: false,
  });

  const [guideHidden, setGuideHidden] = useState(() => {
    return localStorage.getItem('bet_campaign_guide_hidden') === 'true';
  });
  const [guideForceShow, setGuideForceShow] = useState(0);

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

  // 处理捐赠
  const handleDonate = async (amount: number, message: string) => {
    if (!campaign || !user) {
      alert('请先登录');
      return;
    }

    try {
      setDonationState(prev => ({ ...prev, donating: true, donationSuccess: false }));
      const response = await betCampaignAPI.donateToBetCampaign(campaign.id, amount, message, {
        payType: /MicroMessenger/i.test(window.navigator.userAgent) ? 'wxpay' : 'alipay',
        device: /MicroMessenger/i.test(window.navigator.userAgent) ? 'wechat' : 'pc',
        method: 'jump'
      });

      const data = response.data;

      // 处理支付跳转（与金币充值相同的逻辑）
      const payTypeResult = data.pay_type;
      const payInfo = data.pay_info as string;

      if (payTypeResult === 'jump') {
        window.location.href = payInfo;
      } else if (payTypeResult === 'html') {
        const win = window.open('', '_blank');
        if (win) {
          win.document.write(payInfo);
          win.document.close();
        }
      } else if (payTypeResult === 'qrcode' || payTypeResult === 'urlscheme') {
        window.open(payInfo, '_blank');
      } else {
        window.open(payInfo, '_blank');
      }

      setDonationState(prev => ({ ...prev, donationSuccess: true, donating: false }));
    } catch (err: any) {
      console.error('创建捐赠订单失败:', err);
      alert(err.response?.data?.error || '创建订单失败，请稍后再试');
      setDonationState(prev => ({ ...prev, donating: false }));
    }
  };

  // 检查支付结果（从支付页面返回后调用）
  useEffect(() => {
    const checkPaymentResult = async () => {
      if (!campaign || campaign.status !== 'funding') return;

      try {
        const response = await betCampaignAPI.getBetCampaignById(campaign.id);
        setCampaign(response.data);
      } catch (err) {
        console.error('检查支付结果失败:', err);
      }
    };

    // 如果 URL 中有支付相关的参数（返回页面会携带），尝试刷新数据
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('out_trade_no') || urlParams.has('trade_no') || urlParams.has('trade_status')) {
      // 有支付相关参数，说明是从支付页面返回的，等待 2 秒后刷新数据
      setTimeout(checkPaymentResult, 2000);
    }
  }, [campaign?.id]);

  // 处理审核提交
  const handleReview = async (approved: boolean) => {
    if (!campaign || !user) return;

    try {
      setReviewState(prev => ({ ...prev, submitting: true }));
      await betCampaignAPI.reviewDonation(campaign.id, user.id, approved, reviewState.comment.trim() || undefined);

      // 刷新数据
      const campaignResponse = await betCampaignAPI.getBetCampaignById(campaign.id);
      setCampaign(campaignResponse.data);
    } catch (err: any) {
      console.error('审核失败:', err);
      alert(err.response?.data?.error || '审核失败，请稍后再试');
    } finally {
      setReviewState(prev => ({ ...prev, submitting: false }));
    }
  };

  // 派生状态
  const myDonation = campaign?.donations?.find(d => user && d.userId === user.id);
  const isSuccessCampaign = campaign?.status === 'completed' && campaign?.result === 'success';
  const showReviewArea = isSuccessCampaign && user && myDonation && myDonation.reviewStatus === 'pending';

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

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* 返回按钮 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate(`/projects/${slug}`)}
        >
          返回项目
        </Button>
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
      </Box>

      {/* 对赌众筹说明 */}
      <BetCampaignGuide forceShow={guideForceShow} onNeverShow={() => setGuideHidden(true)} />

      {/* 对赌众筹卡片 */}
      <BetCampaignCard
        campaign={campaign}
        mode="view"
        donationState={campaign.status === 'funding' ? donationState : undefined}
        onDonate={handleDonate}
        onDonationStateChange={(state) => setDonationState(prev => ({ ...prev, ...state }))}
      />

      {/* 审核区域 - 仅在挑战成功且当前用户有捐赠且未审核时显示 */}
      {showReviewArea && (
        <Paper sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            请审核开发者交付结果
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            您在此众筹中累计捐赠了 <strong>¥{myDonation?.totalAmount}</strong>（共{myDonation?.donatedCount}笔订单），请评估开发者是否完成了承诺的开发目标。
          </Typography>

          <TextField
            label="评论（可选）"
            value={reviewState.comment}
            onChange={(e) => setReviewState(prev => ({ ...prev, comment: e.target.value }))}
            multiline
            rows={3}
            fullWidth
            placeholder="分享您的评价或意见..."
            sx={{ mb: 2 }}
            disabled={reviewState.submitting}
          />

          <Stack direction="row" spacing={2}>
            <Button
              variant="contained"
              color="success"
              startIcon={reviewState.submitting ? undefined : <ThumbUp />}
              onClick={() => handleReview(true)}
              disabled={reviewState.submitting}
            >
              {reviewState.submitting ? '提交中...' : '认可通过'}
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={reviewState.submitting ? undefined : <ThumbDown />}
              onClick={() => handleReview(false)}
              disabled={reviewState.submitting}
            >
              拒绝（退回捐款）
            </Button>
          </Stack>

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
            认可通过 = 确认开发者完成任务，捐款将转给开发者；拒绝 = 退回您的捐款。操作不可撤销。
          </Typography>
        </Paper>
      )}

      {/* 已审核状态提示 - 用户已审核后显示 */}
      {isSuccessCampaign && user && myDonation && myDonation.reviewStatus !== 'pending' && (
        <Paper sx={{ p: 3, mt: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {myDonation.reviewStatus === 'approved' ? (
              <Chip icon={<ThumbUp />} label="您已认可通过" color="success" />
            ) : (
              <Chip icon={<ThumbDown />} label="您已拒绝" color="error" />
            )}
          </Box>
          {myDonation.reviewComment && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                您的评论：
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                {myDonation.reviewComment}
              </Typography>
            </Box>
          )}
        </Paper>
      )}
    </Container>
  );
};

export default BetCampaignPage;
