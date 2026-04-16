// 单笔捐赠记录（捐赠时创建）
export interface BetDonation {
  id: string;
  campaignId: string;
  userId: string;
  amount: number;
  message?: string;
  createdAt: string;
  username?: string;
  avatar_url?: string;
  reviewStatus?: 'pending' | 'approved' | 'rejected';
  reviewComment?: string;
  reviewedAt?: string;
}

// 用户聚合捐赠信息（用于显示捐赠者列表）
export interface BetDonationAggregate {
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

export interface BetCampaign {
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
  donations?: BetDonationAggregate[];
  donorAggregates?: BetDonationAggregate[];
}
