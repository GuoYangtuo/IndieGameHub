import { Request, Response } from 'express';
import {
  createProposal,
  findProposalById,
  findProposalsByProjectId,
  likeProposal,
  closeProposal,
  createBounty,
  findBountiesByProposalId,
  deleteProposal,
  addProposalToQueue,
  removeProposalFromQueue,
  completeProposal,
  CreateProposalData,
  updateProposal
} from '../models/proposalModel';
import { findProjectById } from '../models/projectModel';
import { updateUserCoins, getUserBounties, updateUserBountyStatus } from '../models/userModel';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import 'express';

// 配置multer中间件
const storage = multer.diskStorage({
  destination: (req: Express.Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    const uploadDir = path.join(__dirname, '../../uploads/proposals');
    // 确保上传目录存在
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req: Express.Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    // 生成唯一文件名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'proposal-attachment-' + uniqueSuffix + ext);
  }
});

// 配置上传中间件
export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 限制5MB
});

// 获取项目的所有提案
export const getProjectProposals = async (req: Request, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;
    
    // 检查项目是否存在
    const project = await findProjectById(projectId);
    if (!project) {
      res.status(404).json({ message: '项目不存在' });
      return;
    }
    
    const proposals = await findProposalsByProjectId(projectId);
    res.status(200).json(proposals);
  } catch (error) {
    console.error('获取项目提案失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 获取提案详情
export const getProposalById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const proposal = await findProposalById(id);
    
    if (!proposal) {
      res.status(404).json({ message: '提案不存在' });
      return;
    }
    
    // 获取提案的悬赏
    const bounties = await findBountiesByProposalId(id);
    
    res.status(200).json({ proposal, bounties });
  } catch (error) {
    console.error('获取提案详情失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 创建提案
export const createNewProposal = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: '未授权' });
      return;
    }
    
    const { title, description, projectId, category } = req.body;
    let descriptionText = description;
    if (!descriptionText) {
      descriptionText = '无描述';
    }
    
    // 验证请求数据
    if (!title || !projectId) {
      res.status(400).json({ message: '标题、描述和项目ID是必填项' });
      return;
    }
    
    // 检查项目是否存在
    const project = await findProjectById(projectId);
    if (!project) {
      res.status(404).json({ message: '项目不存在' });
      return;
    }
    
    // 创建提案
    const proposal = await createProposal({
      title,
      description: descriptionText,
      projectId,
      createdBy: userId,
      category
    });
    
    if (!proposal) {
      res.status(500).json({ message: '创建提案失败' });
      return;
    }
    
    res.status(201).json(proposal);
  } catch (error) {
    console.error('创建提案失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 创建带附件的提案
export const createProposalWithAttachments = async (req: Request & { files?: any }, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: '未授权' });
      return;
    }
    
    const { title, description, projectId, category } = req.body;
    
    // 验证请求数据
    if (!title || !description || !projectId) {
      res.status(400).json({ message: '标题、描述和项目ID是必填项' });
      return;
    }
    
    // 检查项目是否存在
    const project = await findProjectById(projectId);
    if (!project) {
      res.status(404).json({ message: '项目不存在' });
      return;
    }
    
    // 处理附件
    const files = req.files;
    const attachments = files ? (Array.isArray(files) 
      ? files.map((file: any) => ({
          name: file.originalname,
          url: `/uploads/proposals/${file.filename}`,
          size: file.size
        }))
      : Object.values(files).flat().map((file: any) => ({
          name: file.originalname,
          url: `/uploads/proposals/${file.filename}`,
          size: file.size
        }))
    ) : [];
    
    // 创建提案数据
    const proposalData: CreateProposalData = {
      title,
      description,
      projectId,
      createdBy: userId,
      category
    };
    
    // 创建提案
    const proposal = await createProposal(proposalData);
    
    if (!proposal) {
      res.status(500).json({ message: '创建提案失败' });
      return;
    }
    
    res.status(201).json(proposal);
  } catch (error) {
    console.error('创建带附件的提案失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 点赞提案
export const likeProposalById = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: '未授权' });
      return;
    }
    
    const { id } = req.params;
    const proposal = await findProposalById(id);
    
    if (!proposal) {
      res.status(404).json({ message: '提案不存在' });
      return;
    }
    
    const updatedProposal = await likeProposal(id, userId);
    
    res.status(200).json(updatedProposal);
  } catch (error) {
    console.error('点赞提案失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 关闭提案
export const closeProposalById = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: '未授权' });
      return;
    }
    
    const { id } = req.params;
    
    // 关闭提案
    const proposal = await closeProposal(id, userId);
    
    if (!proposal) {
      res.status(404).json({ message: '提案不存在或您不是提案创建者' });
      return;
    }
    
    res.status(200).json(proposal);
  } catch (error) {
    console.error('关闭提案失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 创建悬赏
export const createNewBounty = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: '未授权' });
      return;
    }
    
    const { proposalId } = req.params;
    const { amount, deadline } = req.body;
    
    // 验证请求数据
    if (!proposalId || !amount || amount <= 0) {
      res.status(400).json({ message: '提案ID和金额是必填项，且金额必须大于0' });
      return;
    }
    
    // 检查提案是否存在
    const proposal = await findProposalById(proposalId);
    if (!proposal) {
      res.status(404).json({ message: '提案不存在' });
      return;
    }
    
    // 检查提案是否开放
    if (proposal.status !== 'open') {
      res.status(400).json({ message: '只能为开放状态的提案添加悬赏' });
      return;
    }
    
    // 更新用户金币
    const userCoins = await updateUserCoins(userId, -amount);
    if (userCoins === null) {
      res.status(400).json({ message: '金币不足' });
      return;
    }
    
    // 创建悬赏
    const bounty = await createBounty({
      proposalId,
      userId,
      amount
    });
    
    if (!bounty) {
      // 恢复用户金币
      await updateUserCoins(userId, amount);
      res.status(500).json({ message: '创建悬赏失败' });
      return;
    }
    
    res.status(201).json({ bounty, userCoins });
  } catch (error) {
    console.error('创建悬赏失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 删除提案
export const deleteProposalById = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: '未授权' });
      return;
    }
    
    const { id } = req.params;
    
    // 获取提案
    const proposal = await findProposalById(id);
    if (!proposal) {
      res.status(404).json({ message: '提案不存在' });
      return;
    }
    
    // 检查用户是否是提案创建者
    if (proposal.createdBy !== userId) {
      res.status(403).json({ message: '只有提案创建者可以删除提案' });
      return;
    }
    
    // 删除提案
    const success = await deleteProposal(id);
    
    if (!success) {
      res.status(500).json({ message: '删除提案失败' });
      return;
    }
    
    res.status(200).json({ message: '提案已删除' });
  } catch (error) {
    console.error('删除提案失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 添加提案到任务队列
export const addToTaskQueue = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: '未授权' });
      return;
    }
    
    const { proposalId } = req.params;
    
    // 添加提案到任务队列
    const proposal = await addProposalToQueue(proposalId, userId);
    
    if (!proposal) {
      res.status(404).json({ message: '提案不存在或不是开放状态' });
      return;
    }
    
    res.status(200).json(proposal);
  } catch (error) {
    console.error('添加提案到任务队列失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 从任务队列移除提案
export const removeFromTaskQueue = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: '未授权' });
      return;
    }
    
    const { proposalId } = req.params;
    
    // 从任务队列移除提案
    const proposal = await removeProposalFromQueue(proposalId, userId);
    
    if (!proposal) {
      res.status(404).json({ message: '提案不存在或不是队列状态' });
      return;
    }
    
    res.status(200).json(proposal);
  } catch (error) {
    console.error('从任务队列移除提案失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 完成提案
export const markProposalComplete = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: '未授权' });
      return;
    }
    
    const { id } = req.params;
    
    // 调用模型层完成提案
    const completedProposal = await completeProposal(id, userId);
    
    if (!completedProposal) {
      res.status(404).json({ message: '提案不存在或不能被标记为完成' });
      return;
    }
    
    res.status(200).json({ 
      message: '提案已标记为完成',
      proposal: completedProposal
    });
  } catch (error) {
    console.error('完成提案失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 更新提案
export const updateProposalById = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: '未授权' });
      return;
    }
    
    const { id } = req.params;
    const { title, description } = req.body;
    
    // 验证请求数据
    if (!title || !description) {
      res.status(400).json({ message: '标题和描述是必填项' });
      return;
    }
    
    // 查找提案
    const proposal = await findProposalById(id);
    if (!proposal) {
      res.status(404).json({ message: '提案不存在' });
      return;
    }
    
    // 检查用户是否为提案创建者
    if (proposal.createdBy !== userId) {
      res.status(403).json({ message: '只有提案创建者可以更新提案' });
      return;
    }
    
    // 检查提案是否为开放状态
    if (proposal.status !== 'open') {
      res.status(400).json({ message: '只能更新开放状态的提案' });
      return;
    }
    
    // 更新提案
    const updatedProposal = await updateProposal(id, title, description);
    
    if (!updatedProposal) {
      res.status(500).json({ message: '更新提案失败' });
      return;
    }
    
    res.status(200).json(updatedProposal);
  } catch (error) {
    console.error('更新提案失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 关闭悬赏（用户确认后）
export const closeBounty = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: '未授权' });
      return;
    }
    
    const { bountyId } = req.params;
    
    // 获取用户悬赏
    const userBounties = await getUserBounties(userId);
    
    // 检查悬赏是否存在且状态是否为pending
    if (!userBounties[bountyId] || userBounties[bountyId].status !== 'pending') {
      res.status(400).json({ message: '悬赏不存在或状态不正确' });
      return;
    }
    
    // 获取提案信息
    const proposal = await findProposalById(userBounties[bountyId].proposalId);
    
    if (!proposal || proposal.status !== 'completed') {
      res.status(400).json({ message: '提案不存在或未完成' });
      return;
    }
    
    // 更新悬赏状态为已关闭
    const success = await updateUserBountyStatus(userId, bountyId, 'closed');
    
    // 将金币转给完成提案的用户（使用queuedBy或createdBy，确保安全）
    const amount = userBounties[bountyId].amount;
    const recipientId = proposal.queuedBy || proposal.createdBy;
    if (recipientId) {
      const updatedUser = await updateUserCoins(recipientId, amount);
    }
    
    res.status(200).json({ 
      message: '悬赏已关闭，奖励已发放'
    });
  } catch (error) {
    console.error('关闭悬赏失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
}; 