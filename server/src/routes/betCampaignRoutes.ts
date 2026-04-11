import express from 'express';
import {
  createBetCampaign,
  getBetCampaigns,
  getBetCampaignById,
  getActiveBetCampaign,
  donateToBetCampaign,
  checkDevelopmentStatus,
  deleteBetCampaign,
  setDevelopmentResult,
  reviewDonation,
  handleBetDonationNotify,
  uploadGoalImages,
  uploadDeliveryImages
} from '../controllers/betCampaignController';
import { verifyToken } from '../middleware/authMiddleware';

const router = express.Router();

// 支付回调（无需登录，通用接口 - 支付平台只配置这一个地址）
// 必须放在 /:campaignId 等动态路由之前，避免被误匹配
router.get('/notify', handleBetDonationNotify);
router.post('/notify', handleBetDonationNotify);

// 获取项目的对赌众筹列表
router.get('/project/:projectId', getBetCampaigns);

// 获取项目当前进行中的对赌众筹
router.get('/project/:projectId/active', getActiveBetCampaign);

// 获取单个对赌众筹详情
router.get('/:campaignId', getBetCampaignById);

// 创建对赌众筹（需要登录，支持多图上传）
router.post('/', verifyToken, uploadGoalImages.array('goalImages', 10), createBetCampaign);

// 捐赠对赌众筹（需要登录）
router.post('/:campaignId/donate', verifyToken, donateToBetCampaign);

// 检查开发阶段状态
router.get('/:campaignId/status', checkDevelopmentStatus);

// 删除对赌众筹（需要登录）
router.delete('/:campaignId', verifyToken, deleteBetCampaign);

// 标记开发结果（需要登录，支持上传交付图片）
router.put('/:campaignId/result', verifyToken, uploadDeliveryImages.array('deliveryImages', 10), setDevelopmentResult);

// 审核捐赠（需要登录，捐赠者本人操作）
router.put('/:campaignId/donations/:donationId/review', verifyToken, reviewDonation);

export default router;
