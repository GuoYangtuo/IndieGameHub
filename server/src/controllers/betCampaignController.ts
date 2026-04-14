import { Request, Response } from 'express';
import { query } from '../utils/dbTools';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import { rsaSign, rsaVerify } from '../utils/zblPay';
import { refundViaPayment, refundAllDonations } from '../services/betCampaignService';

// 生成唯一ID
const generateId = (): string => {
  return Date.now().toString() + Math.floor(Math.random() * 1000).toString();
};

// 配置multer中间件用于开发目标图片上传
const storage = multer.diskStorage({
  destination: (req: Express.Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    const uploadDir = path.join(__dirname, '../../uploads/bet-campaign-goals');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req: Express.Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'goal-image-' + uniqueSuffix + ext);
  }
});

// 配置multer中间件用于交付图片上传
const deliveryStorage = multer.diskStorage({
  destination: (req: Express.Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    const uploadDir = path.join(__dirname, '../../uploads/bet-campaign-delivery');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req: Express.Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'delivery-image-' + uniqueSuffix + ext);
  }
});

export const uploadGoalImages = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('只允许上传图片文件'));
    }
    cb(null, true);
  }
});

export const uploadDeliveryImages = multer({
  storage: deliveryStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('只允许上传图片文件'));
    }
    cb(null, true);
  }
});

// 创建对赌众筹（支持多图上传）
export const createBetCampaign = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    let { projectId, title, description, targetAmount, fundingDays, developmentDays, developmentGoals, tierAmounts, allowCustomAmount } = req.body;

    // 解析从 FormData 发送的 JSON 字符串
    if (typeof tierAmounts === 'string') {
      try {
        tierAmounts = JSON.parse(tierAmounts);
      } catch (e) {
        tierAmounts = [];
      }
    }

    // 处理上传的图片
    const files = req.files as Express.Multer.File[];
    const developmentGoalImages = files && files.length > 0
      ? files.map(file => `/uploads/bet-campaign-goals/${file.filename}`)
      : [];

    if (!userId) {
      res.status(401).json({ error: '未登录' });
      return;
    }

    if (!projectId || !title || !targetAmount || !fundingDays || !developmentDays || !tierAmounts) {
      res.status(400).json({ error: '缺少必要参数' });
      return;
    }

    // 检查项目是否存在
    const projectResult = await query('SELECT id FROM projects WHERE id = ?', [projectId]);
    if (!projectResult || (projectResult as any[]).length === 0) {
      res.status(404).json({ error: '项目不存在' });
      return;
    }

    // 检查用户是否是项目成员
    const memberResult = await query(
      'SELECT * FROM project_members WHERE projectId = ? AND userId = ?',
      [projectId, userId]
    );
    const isCreator = (projectResult as any[])[0].createdBy === userId;
    if ((!memberResult || (memberResult as any[]).length === 0) && !isCreator) {
      res.status(403).json({ error: '只有项目成员才能创建对赌众筹' });
      return;
    }

    // 检查是否有进行中的对赌众筹
    const existingCampaign = await query(
      "SELECT id FROM bet_campaigns WHERE projectId = ? AND status IN ('funding', 'development')",
      [projectId]
    );
    if (existingCampaign && (existingCampaign as any[]).length > 0) {
      res.status(400).json({ error: '该项目已有进行中的对赌众筹' });
      return;
    }

    const campaignId = generateId();
    const now = new Date();
    const fundingEndTime = new Date(now.getTime() + fundingDays * 24 * 60 * 60 * 1000);
    const developmentEndTime = new Date(fundingEndTime.getTime() + developmentDays * 24 * 60 * 60 * 1000);

    await query(
      `INSERT INTO bet_campaigns (id, projectId, createdBy, title, description, targetAmount, fundingDays, developmentDays, fundingEndTime, developmentEndTime, developmentGoals, developmentGoalImages, tierAmounts, allowCustomAmount, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'funding')`,
      [campaignId, projectId, userId, title, description || null, targetAmount, fundingDays, developmentDays, fundingEndTime, developmentEndTime, developmentGoals || null, JSON.stringify(developmentGoalImages), JSON.stringify(tierAmounts), allowCustomAmount !== false]
    );

    const newCampaign = await query('SELECT * FROM bet_campaigns WHERE id = ?', [campaignId]);
    res.status(201).json((newCampaign as any[])[0]);
  } catch (error) {
    console.error('创建对赌众筹失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
};

// 获取项目的对赌众筹列表
export const getBetCampaigns = async (req: Request, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;
    const { status } = req.query;

    let sql = 'SELECT * FROM bet_campaigns WHERE projectId = ?';
    const params: any[] = [projectId];

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    sql += ' ORDER BY createdAt DESC';

    const campaigns = await query(sql, params);

    // 解析 tierAmounts 字段
    const parsedCampaigns = (campaigns as any[]).map(campaign => {
      let parsedTierAmounts = [];
      let parsedDevelopmentGoals = null;
      let parsedDevelopmentGoalImages: string[] = [];
      let parsedDeliveryContent = null;
      let parsedDeliveryImages: string[] = [];

      try {
        parsedTierAmounts = JSON.parse(campaign.tierAmounts || '[]');
      } catch (e) {
        console.warn(`解析 tierAmounts 失败，campaignId: ${campaign.id}, 值: ${campaign.tierAmounts}`);
        parsedTierAmounts = [];
      }

      try {
        parsedDevelopmentGoals = campaign.developmentGoals ? campaign.developmentGoals : null;
      } catch (e) {
        console.warn(`解析 developmentGoals 失败，campaignId: ${campaign.id}, 值: ${campaign.developmentGoals}`);
        parsedDevelopmentGoals = null;
      }

      try {
        parsedDevelopmentGoalImages = campaign.developmentGoalImages ? JSON.parse(campaign.developmentGoalImages) : [];
      } catch (e) {
        console.warn(`解析 developmentGoalImages 失败，campaignId: ${campaign.id}, 值: ${campaign.developmentGoalImages}`);
        parsedDevelopmentGoalImages = [];
      }

      try {
        parsedDeliveryContent = campaign.deliveryContent ? campaign.deliveryContent : null;
      } catch (e) {
        parsedDeliveryContent = null;
      }

      try {
        parsedDeliveryImages = campaign.deliveryImages ? JSON.parse(campaign.deliveryImages) : [];
      } catch (e) {
        parsedDeliveryImages = [];
      }

      return {
        ...campaign,
        tierAmounts: parsedTierAmounts,
        developmentGoals: parsedDevelopmentGoals,
        developmentGoalImages: parsedDevelopmentGoalImages,
        deliveryContent: parsedDeliveryContent,
        deliveryImages: parsedDeliveryImages
      };
    });

    res.json(parsedCampaigns);
  } catch (error) {
    console.error('获取对赌众筹列表失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
};

// 获取单个对赌众筹详情
export const getBetCampaignById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { campaignId } = req.params;

    const campaign = await query('SELECT * FROM bet_campaigns WHERE id = ?', [campaignId]);

    if (!campaign || (campaign as any[]).length === 0) {
      res.status(404).json({ error: '对赌众筹不存在' });
      return;
    }

    const campaignData = (campaign as any[])[0];

    // 解析 JSON 字段
    let parsedTierAmounts = [];
    let parsedDevelopmentGoals = null;
    let parsedDevelopmentGoalImages: string[] = [];
    let parsedDeliveryContent = null;
    let parsedDeliveryImages: string[] = [];

    try {
      parsedTierAmounts = JSON.parse(campaignData.tierAmounts || '[]');
    } catch (e) {
      console.warn(`解析 tierAmounts 失败，campaignId: ${campaignData.id}, 值: ${campaignData.tierAmounts}`);
      parsedTierAmounts = [];
    }

    try {
      parsedDevelopmentGoals = campaignData.developmentGoals ? campaignData.developmentGoals : null;
    } catch (e) {
      console.warn(`解析 developmentGoals 失败，campaignId: ${campaignData.id}, 值: ${campaignData.developmentGoals}`);
      parsedDevelopmentGoals = null;
    }

    try {
      parsedDevelopmentGoalImages = campaignData.developmentGoalImages ? JSON.parse(campaignData.developmentGoalImages) : [];
    } catch (e) {
      console.warn(`解析 developmentGoalImages 失败，campaignId: ${campaignData.id}, 值: ${campaignData.developmentGoalImages}`);
      parsedDevelopmentGoalImages = [];
    }

    try {
      parsedDeliveryContent = campaignData.deliveryContent ? campaignData.deliveryContent : null;
    } catch (e) {
      parsedDeliveryContent = null;
    }

    try {
      parsedDeliveryImages = campaignData.deliveryImages ? JSON.parse(campaignData.deliveryImages) : [];
    } catch (e) {
      console.warn(`解析 deliveryImages 失败，campaignId: ${campaignData.id}, 值: ${campaignData.deliveryImages}`);
      parsedDeliveryImages = [];
    }

    // 获取捐赠列表（排除 pending 状态，按用户合并，返回用户总捐赠金额和统一的审核状态）
    // donatedCount: 该用户在当前众筹中已支付捐赠的订单数
    const donations = await query(
      `SELECT
         bd.userId,
         SUM(bd.amount) as totalAmount,
         COUNT(bd.id) as donatedCount,
         MAX(bd.message) as lastMessage,
         MIN(bd.createdAt) as firstDonationAt,
         u.username,
         u.avatar_url,
         CASE
           WHEN MAX(bd.reviewStatus) = MAX(bd.reviewStatus) AND MAX(bd.reviewStatus) = 'approved' THEN 'approved'
           WHEN MAX(bd.reviewStatus) = MAX(bd.reviewStatus) AND MAX(bd.reviewStatus) = 'rejected' THEN 'rejected'
           WHEN MAX(bd.reviewStatus) = 'pending' AND COUNT(*) = SUM(CASE WHEN bd.reviewStatus = 'pending' THEN 1 ELSE 0 END) THEN 'pending'
           ELSE 'pending'
         END as reviewStatus,
         MAX(bd.reviewComment) as reviewComment,
         MAX(bd.reviewedAt) as reviewedAt
       FROM bet_donations bd
       LEFT JOIN users u ON bd.userId = u.id
       WHERE bd.campaignId = ? AND bd.status != 'pending'
       GROUP BY bd.userId, u.username, u.avatar_url
       ORDER BY totalAmount DESC`,
      [campaignId]
    );
    console.log(donations);

    res.json({
      ...campaignData,
      tierAmounts: parsedTierAmounts,
      developmentGoals: parsedDevelopmentGoals,
      developmentGoalImages: parsedDevelopmentGoalImages,
      deliveryContent: parsedDeliveryContent,
      deliveryImages: parsedDeliveryImages,
      donations
    });
  } catch (error) {
    console.error('获取对赌众筹详情失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
};

// 获取项目当前进行中的对赌众筹
export const getActiveBetCampaign = async (req: Request, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;

    const campaign = await query(
      "SELECT * FROM bet_campaigns WHERE projectId = ? AND status IN ('funding', 'development') ORDER BY createdAt DESC LIMIT 1",
      [projectId]
    );

    if (!campaign || (campaign as any[]).length === 0) {
      res.json(null);
      return;
    }

    const campaignData = (campaign as any[])[0];

    // 解析 JSON 字段
    let parsedTierAmounts = [];
    let parsedDevelopmentGoals = null;
    let parsedDevelopmentGoalImages: string[] = [];
    let parsedDeliveryContent = null;
    let parsedDeliveryImages: string[] = [];

    try {
      parsedTierAmounts = JSON.parse(campaignData.tierAmounts || '[]');
    } catch (e) {
      console.warn(`解析 tierAmounts 失败，campaignId: ${campaignData.id}, 值: ${campaignData.tierAmounts}`);
      parsedTierAmounts = [];
    }

    try {
      parsedDevelopmentGoals = campaignData.developmentGoals ? campaignData.developmentGoals : null;
    } catch (e) {
      console.warn(`解析 developmentGoals 失败，campaignId: ${campaignData.id}, 值: ${campaignData.developmentGoals}`);
      parsedDevelopmentGoals = null;
    }

    try {
      parsedDevelopmentGoalImages = campaignData.developmentGoalImages ? JSON.parse(campaignData.developmentGoalImages) : [];
    } catch (e) {
      console.warn(`解析 developmentGoalImages 失败，campaignId: ${campaignData.id}, 值: ${campaignData.developmentGoalImages}`);
      parsedDevelopmentGoalImages = [];
    }

    try {
      parsedDeliveryContent = campaignData.deliveryContent ? campaignData.deliveryContent : null;
    } catch (e) {
      parsedDeliveryContent = null;
    }

    try {
      parsedDeliveryImages = campaignData.deliveryImages ? JSON.parse(campaignData.deliveryImages) : [];
    } catch (e) {
      parsedDeliveryImages = [];
    }

    // 获取捐赠列表（排除 pending 状态，按用户合并，返回用户总捐赠金额和统一的审核状态）
    // donatedCount: 该用户在当前众筹中已支付捐赠的订单数
    const donations = await query(
      `SELECT
         bd.userId,
         SUM(bd.amount) as totalAmount,
         COUNT(bd.id) as donatedCount,
         MAX(bd.message) as lastMessage,
         MIN(bd.createdAt) as firstDonationAt,
         u.username,
         u.avatar_url,
         CASE
           WHEN MAX(bd.reviewStatus) = MAX(bd.reviewStatus) AND MAX(bd.reviewStatus) = 'approved' THEN 'approved'
           WHEN MAX(bd.reviewStatus) = MAX(bd.reviewStatus) AND MAX(bd.reviewStatus) = 'rejected' THEN 'rejected'
           WHEN MAX(bd.reviewStatus) = 'pending' AND COUNT(*) = SUM(CASE WHEN bd.reviewStatus = 'pending' THEN 1 ELSE 0 END) THEN 'pending'
           ELSE 'pending'
         END as reviewStatus,
         MAX(bd.reviewComment) as reviewComment,
         MAX(bd.reviewedAt) as reviewedAt
       FROM bet_donations bd
       LEFT JOIN users u ON bd.userId = u.id
       WHERE bd.campaignId = ? AND bd.status != 'pending'
       GROUP BY bd.userId, u.username, u.avatar_url
       ORDER BY totalAmount DESC`,
      [campaignData.id]
    );

    res.json({
      ...campaignData,
      tierAmounts: parsedTierAmounts,
      developmentGoals: parsedDevelopmentGoals,
      developmentGoalImages: parsedDevelopmentGoalImages,
      deliveryContent: parsedDeliveryContent,
      deliveryImages: parsedDeliveryImages,
      donations
    });
  } catch (error) {
    console.error('获取进行中的对赌众筹失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
};

// 捐赠对赌众筹（接入支付系统）
export const donateToBetCampaign = async (req: Request, res: Response): Promise<void> => {
  try {
    const { campaignId } = req.params;
    const { amount, message, payType = 'alipay', device = 'pc', method = 'web' } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: '请先登录' });
      return;
    }

    const amountNumber = Number(amount);
    if (!amountNumber || amountNumber <= 0) {
      res.status(400).json({ error: '捐赠金额必须大于0' });
      return;
    }

    // 检查众筹是否存在且在众筹阶段
    const campaign = await query('SELECT * FROM bet_campaigns WHERE id = ?', [campaignId]);

    if (!campaign || (campaign as any[]).length === 0) {
      res.status(404).json({ error: '对赌众筹不存在' });
      return;
    }

    const campaignData = (campaign as any[])[0];

    if (campaignData.status !== 'funding') {
      res.status(400).json({ error: '当前不在众筹阶段，无法捐赠' });
      return;
    }

    // 检查众筹是否已结束
    const now = new Date();
    const fundingEndTime = new Date(campaignData.fundingEndTime);

    if (now >= fundingEndTime) {
      // 众筹时间已到，检查是否达成目标
      const { checkAndUpdateCampaignStatus } = await import('../services/betCampaignService');
      await checkAndUpdateCampaignStatus(campaignId);
      res.status(400).json({ error: '众筹时间已结束' });
      return;
    }

    // 获取支付配置
    const pid = process.env.ZBL_PAY_PID;
    const privateKey = process.env.ZBL_PAY_PRIVATE_KEY;
    const publicKey = process.env.ZBL_PAY_PUBLIC_KEY;
    const notifyUrl = process.env.ZBL_PAY_BET_DONATION_NOTIFY_URL;
    const baseReturnUrl = process.env.ZBL_PAY_BET_DONATION_RETURN_URL;

    if (!pid || !privateKey || !publicKey || !notifyUrl || !baseReturnUrl) {
      res.status(500).json({ error: '支付配置未完成，请联系管理员配置环境变量' });
      return;
    }

    // 获取项目的 slug，用于构建 return_url
    const projectResult = await query('SELECT slug FROM projects WHERE id = ?', [campaignData.projectId]);
    const projectSlug = projectResult && (projectResult as any[]).length > 0
      ? (projectResult as any[])[0].slug
      : 'unknown';

    // 生成订单号
    const outTradeNo = 'BD' + Date.now().toString() + Math.floor(Math.random() * 1000).toString();
    const timestamp = Math.floor(Date.now() / 1000).toString();

    // 获取众筹标题作为商品名称
    const campaignTitle = campaignData.title || '对赌众筹捐赠';

    // 构建 return_url，替换占位符
    const returnUrl = baseReturnUrl
      .replace('{slug}', encodeURIComponent(projectSlug))
      .replace('{campaignId}', encodeURIComponent(campaignId));

    // 构建支付请求参数
    const requestParams: Record<string, any> = {
      pid,
      method,
      device,
      type: payType,
      out_trade_no: outTradeNo,
      notify_url: notifyUrl,
      return_url: returnUrl,
      name: `众筹捐赠: ${campaignTitle}`,
      money: amountNumber.toFixed(2),
      clientip: (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
        (req.socket.remoteAddress ?? ''),
      param: `${userId}:${campaignId}`,
      timestamp,
      sign_type: 'RSA',
    };

    // 添加签名
    const sign = rsaSign(requestParams, privateKey);
    requestParams.sign = sign;

    // 创建本地捐赠订单记录（初始状态为 pending）
    const donationId = Date.now().toString() + Math.floor(Math.random() * 1000).toString();
    await query(
      `INSERT INTO bet_donations (id, campaignId, userId, amount, message, out_trade_no, pay_type, status, reviewStatus)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 'pending')`,
      [donationId, campaignId, userId, amountNumber, message || null, outTradeNo, payType]
    );

    // 调用支付平台创建订单
    const response = await axios.post(
      'https://pay.zhenbianli.cn/api/pay/create',
      new URLSearchParams(requestParams as Record<string, string>).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 10000,
      }
    );

    const data = response.data;

    if (!data || typeof data !== 'object') {
      res.status(502).json({ error: '支付平台响应异常' });
      return;
    }

    if (data.code !== 0) {
      res.status(400).json({ error: data.msg || '创建支付订单失败', detail: data });
      return;
    }

    // 校验平台返回签名
    if (data.sign) {
      const verifyParams = { ...data };
      const valid = rsaVerify(verifyParams, data.sign, publicKey);
      if (!valid) {
        res.status(502).json({ error: '支付平台返回签名校验失败' });
        return;
      }
    }

    // 返回支付信息给前端
    res.status(200).json({
      out_trade_no: outTradeNo,
      donationId: donationId,
      trade_no: data.trade_no,
      pay_type: data.pay_type,
      pay_info: data.pay_info,
      timestamp: data.timestamp,
      sign: data.sign,
      sign_type: data.sign_type,
    });
  } catch (error) {
    console.error('创建捐赠订单失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
};

// 检查开发阶段是否结束
export const checkDevelopmentStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { campaignId } = req.params;

    const campaign = await query('SELECT * FROM bet_campaigns WHERE id = ?', [campaignId]);

    if (!campaign || (campaign as any[]).length === 0) {
      res.status(404).json({ error: '对赌众筹不存在' });
      return;
    }

    const campaignData = (campaign as any[])[0];

    // 如果不在开发阶段，返回当前状态
    if (campaignData.status !== 'development') {
      res.json({ status: campaignData.status, result: campaignData.result });
      return;
    }

    const now = new Date();
    const developmentEndTime = new Date(campaignData.developmentEndTime);

    // 开发阶段已结束
    if (now >= developmentEndTime) {
      // 开发者成功完成目标（这里暂时简单处理，实际需要开发者确认完成）
      // 暂时标记为成功，开发者可以手动标记
      res.json({ status: 'development', result: 'pending', message: '开发阶段已结束，请等待开发者确认结果' });
      return;
    }

    // 计算剩余时间
    const remainingTime = developmentEndTime.getTime() - now.getTime();
    const remainingDays = Math.ceil(remainingTime / (1000 * 60 * 60 * 24));

    res.json({
      status: campaignData.status,
      result: campaignData.result,
      remainingDays
    });
  } catch (error) {
    console.error('检查开发状态失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
};

// 删除对赌众筹（仅在众筹阶段且未达成目标时）
export const deleteBetCampaign = async (req: Request, res: Response): Promise<void> => {
  try {
    const { campaignId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: '请先登录' });
      return;
    }

    const campaign = await query('SELECT * FROM bet_campaigns WHERE id = ?', [campaignId]);

    if (!campaign || (campaign as any[]).length === 0) {
      res.status(404).json({ error: '对赌众筹不存在' });
      return;
    }

    const campaignData = (campaign as any[])[0];

    // 检查是否是创建者
    if (campaignData.createdBy !== userId) {
      res.status(403).json({ error: '只有创建者才能删除' });
      return;
    }

    // 检查是否在众筹阶段（只要还没进入开发阶段都可以取消）
    if (campaignData.status !== 'funding') {
      res.status(400).json({ error: '只能在众筹阶段取消对赌众筹' });
      return;
    }

    // 取消众筹时，退款所有已支付的捐赠
    const refundResults = await refundAllDonations(campaignId);

    // 标记为已取消（不直接删除，保留记录）
    await query(
      "UPDATE bet_campaigns SET status = 'cancelled' WHERE id = ?",
      [campaignId]
    );

    console.log(`取消众筹 ${campaignId}，退款结果:`, refundResults);
    res.json({
      success: true,
      message: refundResults.length > 0 ? `对赌众筹已取消，已退款 ${refundResults.length} 笔捐赠` : '对赌众筹已取消',
      refundResults,
    });
  } catch (error) {
    console.error('删除对赌众筹失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
};

// 标记开发结果（开发者操作）
export const setDevelopmentResult = async (req: Request, res: Response): Promise<void> => {
  try {
    const { campaignId } = req.params;
    const { result } = req.body; // 'success' or 'failed'
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: '请先登录' });
      return;
    }

    if (!result || !['success', 'failed'].includes(result)) {
      res.status(400).json({ error: '无效的结果' });
      return;
    }

    const campaign = await query('SELECT * FROM bet_campaigns WHERE id = ?', [campaignId]);

    if (!campaign || (campaign as any[]).length === 0) {
      res.status(404).json({ error: '对赌众筹不存在' });
      return;
    }

    const campaignData = (campaign as any[])[0];

    // 检查是否是项目成员
    const memberResult = await query(
      'SELECT * FROM project_members WHERE projectId = ? AND userId = ?',
      [campaignData.projectId, userId]
    );
    const projectResult = await query('SELECT createdBy FROM projects WHERE id = ?', [campaignData.projectId]);
    const isCreator = projectResult && (projectResult as any[]).length > 0 && (projectResult as any[])[0].createdBy === userId;

    if ((!memberResult || (memberResult as any[]).length === 0) && !isCreator) {
      res.status(403).json({ error: '只有项目成员才能设置结果' });
      return;
    }

    // 检查是否在开发阶段
    if (campaignData.status !== 'development') {
      res.status(400).json({ error: '当前不在开发阶段' });
      return;
    }

    // 处理交付图片
    const files = req.files as Express.Multer.File[];
    const deliveryImages = files && files.length > 0
      ? files.map(file => `/uploads/bet-campaign-delivery/${file.filename}`)
      : [];

    let refundResults: { donationId: string; success: boolean; message: string }[] = [];

    // 如果开发者放弃（result === 'failed'），通过支付接口退款所有已支付的捐款
    if (result === 'failed') {
      refundResults = await refundAllDonations(campaignId);
      console.log(`开发者放弃众筹 ${campaignId}，退款结果:`, refundResults);
    }

    // 构建更新 SQL：根据是否有新内容决定是否更新 deliveryContent
    // 如果请求中没有 deliveryContent（或为空），则保留原值
    const hasDeliveryContent = req.body.deliveryContent && req.body.deliveryContent.trim() !== '';
    const hasDeliveryImages = deliveryImages.length > 0;

    if (hasDeliveryContent || hasDeliveryImages) {
      const deliveryContentValue = hasDeliveryContent ? req.body.deliveryContent : campaignData.deliveryContent;
      const deliveryImagesValue = hasDeliveryImages
        ? JSON.stringify([...(campaignData.deliveryImages ? JSON.parse(campaignData.deliveryImages) : []), ...deliveryImages])
        : campaignData.deliveryImages;

      await query(
        'UPDATE bet_campaigns SET result = ?, status = ?, deliveryContent = ?, deliveryImages = ? WHERE id = ?',
        [result, result === 'success' ? 'completed' : 'failed', deliveryContentValue, deliveryImagesValue, campaignId]
      );
    } else {
      await query(
        'UPDATE bet_campaigns SET result = ?, status = ? WHERE id = ?',
        [result, result === 'success' ? 'completed' : 'failed', campaignId]
      );
    }

    res.json({
      success: true,
      message: result === 'success' ? '挑战成功！' : '挑战失败，已退回所有捐款',
      refundResults: result === 'failed' ? refundResults : []
    });
  } catch (error) {
    console.error('设置开发结果失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
};

// 处理对赌众筹捐赠支付回调
export const handleBetDonationNotify = async (req: Request, res: Response): Promise<void> => {
  try {
    const publicKey = process.env.ZBL_PAY_PUBLIC_KEY;
    if (!publicKey) {
      res.status(500).send('配置错误');
      return;
    }

    // 通知参数可能在 query（同步回调）或 body（异步通知）中
    const params: Record<string, any> = {};
    const source = Object.keys(req.query).length > 0 ? req.query : req.body;
    Object.keys(source).forEach((key) => {
      const value = source[key as keyof typeof source];
      params[key] = Array.isArray(value) ? value[0] : value;
    });

    const sign = params.sign as string | undefined;
    if (!sign) {
      res.status(400).send('missing sign');
      return;
    }

    const isValid = rsaVerify(params, sign, publicKey);
    if (!isValid) {
      res.status(400).send('invalid sign');
      return;
    }

    const tradeStatus = params.trade_status;
    const outTradeNo = params.out_trade_no as string | undefined;
    const tradeNo = params.trade_no as string | undefined;

    if (!outTradeNo) {
      res.status(400).send('missing out_trade_no');
      return;
    }

    // 查询捐赠订单
    const rows = await query(
      `SELECT * FROM bet_donations WHERE out_trade_no = ?`,
      [outTradeNo]
    );

    if (!rows || (rows as any[]).length === 0) {
      res.status(404).send('donation not found');
      return;
    }

    const donation = (rows as any[])[0];

    // 幂等处理：只有首次成功支付需要更新状态并增加众筹金额
    if (donation.status !== 'paid' && tradeStatus === 'TRADE_SUCCESS') {
      // 更新捐赠订单状态
      await query(
        `UPDATE bet_donations
         SET trade_no = ?, status = 'paid', raw_notify = ?
         WHERE out_trade_no = ?`,
        [tradeNo || '', JSON.stringify(params), outTradeNo]
      );

      // 更新众筹总金额
      await query(
        'UPDATE bet_campaigns SET totalRaised = totalRaised + ? WHERE id = ?',
        [donation.amount, donation.campaignId]
      );
    }

    // 按文档要求返回 success 表示已接收通知
    res.send('success');
  } catch (error) {
    console.error('处理众筹捐赠支付通知失败:', error);
    res.status(500).send('error');
  }
};

// 审核对赌众筹捐赠（按用户维度，一次审核变更该用户所有捐赠订单）
export const reviewDonation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { campaignId, userId: donorUserId } = req.params;
    const { approved, comment } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: '请先登录' });
      return;
    }

    if (typeof approved !== 'boolean') {
      res.status(400).json({ error: '缺少 approved 参数' });
      return;
    }

    // 检查众筹是否存在
    const campaign = await query('SELECT * FROM bet_campaigns WHERE id = ?', [campaignId]);
    if (!campaign || (campaign as any[]).length === 0) {
      res.status(404).json({ error: '对赌众筹不存在' });
      return;
    }

    const campaignData = (campaign as any[])[0];

    // 只有挑战成功的众筹才能审核
    if (campaignData.status !== 'completed' || campaignData.result !== 'success') {
      res.status(400).json({ error: '当前众筹尚未成功，无法审核' });
      return;
    }

    // 查询该用户在该众筹中所有已支付的捐赠
    const userDonations = await query(
      `SELECT * FROM bet_donations WHERE campaignId = ? AND userId = ? AND status = 'paid'`,
      [campaignId, donorUserId]
    ) as any[];

    if (!userDonations || userDonations.length === 0) {
      res.status(404).json({ error: '该用户没有已支付的捐赠记录' });
      return;
    }

    // 只有捐赠者本人才能审核
    if (userDonations[0].userId !== userId) {
      res.status(403).json({ error: '只有捐赠者本人才能审核' });
      return;
    }

    // 检查是否已审核（防止重复操作）
    const allReviewed = userDonations.every(d => d.reviewStatus !== 'pending');
    if (allReviewed) {
      res.status(400).json({ error: '该用户的所有捐赠已审核，请勿重复操作' });
      return;
    }

    const now = new Date();

    if (approved) {
      // 认可通过：批量更新该用户所有待审核订单的状态
      await query(
        `UPDATE bet_donations
         SET reviewStatus = 'approved', reviewComment = ?, reviewedAt = ?
         WHERE campaignId = ? AND userId = ? AND status = 'paid' AND reviewStatus = 'pending'`,
        [comment || null, now, campaignId, donorUserId]
      );

      // 计算本次实际通过审核的订单总金额
      const pendingDonations = userDonations.filter(d => d.reviewStatus === 'pending');
      const totalAmount = pendingDonations.reduce((sum, d) => sum + d.amount, 0);

      // 将金币转给项目创建者（加到项目余额）
      if (totalAmount > 0) {
        await query(
          'UPDATE projects SET projectBalance = projectBalance + ? WHERE id = ?',
          [totalAmount, campaignData.projectId]
        );
      }

      res.json({
        success: true,
        message: `审核通过，金币已转给开发者（${pendingDonations.length}笔，共¥${totalAmount}）`
      });
    } else {
      // 拒绝通过：退还该用户在此众筹上的所有已支付捐赠（仅退还未审核的）
      const pendingDonations = userDonations.filter(d => d.reviewStatus === 'pending');
      const refundResults: { donationId: string; success: boolean; message: string }[] = [];

      for (const d of pendingDonations) {
        const refundRes = await refundViaPayment(d.trade_no, d.amount);
        if (refundRes.success) {
          await query(
            `UPDATE bet_donations SET status = 'refunded', reviewStatus = 'rejected', reviewComment = ?, reviewedAt = ? WHERE id = ?`,
            [comment || null, now, d.id]
          );
        } else {
          // 退款失败也标记为拒绝
          await query(
            `UPDATE bet_donations SET reviewStatus = 'rejected', reviewComment = ?, reviewedAt = ? WHERE id = ?`,
            [comment || null, now, d.id]
          );
        }
        refundResults.push({
          donationId: d.id,
          success: refundRes.success,
          message: refundRes.message,
        });
      }

      console.log(`粉丝 ${donorUserId} 拒绝众筹 ${campaignId} 审核，退款结果:`, refundResults);
      res.json({
        success: true,
        message: refundResults.length > 0
          ? `已拒绝，已退款您的 ${refundResults.filter(r => r.success).length} 笔捐赠`
          : '已拒绝（无有效退款）',
        refundResults,
      });
    }
  } catch (error) {
    console.error('审核失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
};
