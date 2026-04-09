import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Alert,
  CircularProgress,
  Button,
} from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { betCampaignAPI, projectAPI } from '../services/api';
import BetCampaignGuide from '../components/BetCampaignGuide';
import BetCampaignCard from '../components/BetCampaignCard';

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
      setDonationState(prev => ({ ...prev, donating: true }));
      await betCampaignAPI.donateToBetCampaign(campaign.id, amount, message);
      setDonationState(prev => ({ ...prev, donationSuccess: true, donating: false }));

      // 刷新数据
      const campaignResponse = await betCampaignAPI.getBetCampaignById(campaign.id);
      setCampaign(campaignResponse.data);
    } catch (err: any) {
      console.error('捐赠失败:', err);
      alert(err.response?.data?.error || '捐赠失败，请稍后再试');
      setDonationState(prev => ({ ...prev, donating: false }));
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

      {/* 对赌众筹卡片 */}
      <BetCampaignCard
        campaign={campaign}
        mode="view"
        donationState={campaign.status === 'funding' ? donationState : undefined}
        onDonate={handleDonate}
        onDonationStateChange={(state) => setDonationState(prev => ({ ...prev, ...state }))}
      />
    </Container>
  );
};

export default BetCampaignPage;
