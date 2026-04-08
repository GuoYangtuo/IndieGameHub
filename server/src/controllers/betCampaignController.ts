import { Request, Response } from 'express';
import { query } from '../utils/dbTools';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

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

      return {
        ...campaign,
        tierAmounts: parsedTierAmounts,
        developmentGoals: parsedDevelopmentGoals,
        developmentGoalImages: parsedDevelopmentGoalImages
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

    // 获取捐赠列表
    const donations = await query(
      'SELECT bd.*, u.username, u.avatar_url FROM bet_donations bd LEFT JOIN users u ON bd.userId = u.id WHERE bd.campaignId = ? ORDER BY bd.amount DESC',
      [campaignId]
    );

    res.json({
      ...campaignData,
      tierAmounts: parsedTierAmounts,
      developmentGoals: parsedDevelopmentGoals,
      developmentGoalImages: parsedDevelopmentGoalImages,
      donations: donations || []
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

    // 获取捐赠列表
    const donations = await query(
      'SELECT bd.*, u.username, u.avatar_url FROM bet_donations bd LEFT JOIN users u ON bd.userId = u.id WHERE bd.campaignId = ? ORDER BY bd.amount DESC',
      [campaignData.id]
    );

    res.json({
      ...campaignData,
      tierAmounts: parsedTierAmounts,
      developmentGoals: parsedDevelopmentGoals,
      developmentGoalImages: parsedDevelopmentGoalImages,
      donations: donations || []
    });
  } catch (error) {
    console.error('获取进行中的对赌众筹失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
};

// 捐赠对赌众筹
export const donateToBetCampaign = async (req: Request, res: Response): Promise<void> => {
  try {
    const { campaignId } = req.params;
    const { amount, message } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: '请先登录' });
      return;
    }

    if (!amount || amount <= 0) {
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
      await checkAndUpdateCampaignStatus(campaignId);
      res.status(400).json({ error: '众筹时间已结束' });
      return;
    }

    const donationId = generateId();

    await query(
      'INSERT INTO bet_donations (id, campaignId, userId, amount, message) VALUES (?, ?, ?, ?, ?)',
      [donationId, campaignId, userId, amount, message || null]
    );

    // 更新众筹总金额
    await query(
      'UPDATE bet_campaigns SET totalRaised = totalRaised + ? WHERE id = ?',
      [amount, campaignId]
    );

    res.status(201).json({ success: true, message: '捐赠成功' });
  } catch (error) {
    console.error('捐赠失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
};

// 检查并更新众筹状态
const checkAndUpdateCampaignStatus = async (campaignId: string): Promise<void> => {
  try {
    const campaign = await query('SELECT * FROM bet_campaigns WHERE id = ?', [campaignId]);

    if (!campaign || (campaign as any[]).length === 0) {
      return;
    }

    const campaignData = (campaign as any[])[0];

    // 如果已经在开发阶段或已完成，不再处理
    if (campaignData.status !== 'funding') {
      return;
    }

    const now = new Date();
    const fundingEndTime = new Date(campaignData.fundingEndTime);

    // 众筹阶段结束
    if (now >= fundingEndTime) {
      if (campaignData.totalRaised >= campaignData.targetAmount) {
        // 达成目标，进入开发阶段
        await query(
          "UPDATE bet_campaigns SET status = 'development' WHERE id = ?",
          [campaignId]
        );
      } else {
        // 未达成目标，标记失败
        await query(
          "UPDATE bet_campaigns SET status = 'failed', result = 'failed' WHERE id = ?",
          [campaignId]
        );
      }
    }
  } catch (error) {
    console.error('检查众筹状态失败:', error);
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

    // 标记为已取消（不直接删除，保留记录）
    await query(
      "UPDATE bet_campaigns SET status = 'cancelled' WHERE id = ?",
      [campaignId]
    );

    res.json({ success: true, message: '对赌众筹已取消' });
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

    // 更新结果
    await query(
      'UPDATE bet_campaigns SET result = ?, status = ? WHERE id = ?',
      [result, result === 'success' ? 'completed' : 'failed', campaignId]
    );

    res.json({ success: true, message: result === 'success' ? '挑战成功！' : '挑战失败，已退回所有捐款' });
  } catch (error) {
    console.error('设置开发结果失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
};
