import { Request, Response } from 'express';
import { 
  createComment, 
  findCommentsByProposalId,
  findCommentsByProjectId,
  deleteComment,
  getCommentWithUserInfo,
  Comment
} from '../models/commentModel';
import { findProposalById } from '../models/proposalModel';
import { findProjectById } from '../models/projectModel';

// 内部使用：直接获取提案评论
export const getProposalComments = async (proposalId: string): Promise<any[]> => {
  try {
    // 获取提案评论
    const comments = await findCommentsByProposalId(proposalId);
    return comments || [];
  } catch (error) {
    console.error('获取提案评论失败:', error);
    return [];
  }
};

// 内部使用：直接获取项目评论
export const getProjectComments = async (projectId: string): Promise<any[]> => {
  try {
    // 获取项目评论
    const comments = await findCommentsByProjectId(projectId);
    return comments || [];
  } catch (error) {
    console.error('获取项目评论失败:', error);
    return [];
  }
};

// HTTP接口：获取提案评论
export const getProposalCommentsAPI = async (req: Request, res: Response): Promise<void> => {
  try {
    const { proposalId } = req.params
    // 检查提案是否存在
    const proposal = await findProposalById(proposalId);
    if (!proposal) {
      res.status(404).json({ message: '提案不存在' });
      return;
    }
    
    // 获取提案评论
    const comments = await getProposalComments(proposalId);
    
    // 添加用户昵称 - comments已经包含用户信息，直接返回
    res.status(200).json(comments);
  } catch (error) {
    console.error('获取提案评论失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// HTTP接口：获取项目评论
export const getProjectCommentsAPI = async (req: Request, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params
    // 检查项目是否存在
    const project = await findProjectById(projectId);
    if (!project) {
      res.status(404).json({ message: '项目不存在' });
      return;
    }
    
    // 获取项目评论
    const comments = await getProjectComments(projectId);
    
    // 添加用户昵称 - comments已经包含用户信息，直接返回
    res.status(200).json(comments);
  } catch (error) {
    console.error('获取项目评论失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 创建提案评论
export const createNewComment = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: '未授权' });
      return;
    }
    
    const { proposalId } = req.params;
    const { content } = req.body;
    
    // 验证请求数据
    if (!content) {
      res.status(400).json({ message: '评论内容是必填项' });
      return;
    }
    
    // 创建评论
    const comment = await createComment({
      proposalId,
      userId,
      content
    });
    
    if (!comment) {
      res.status(500).json({ message: '创建评论失败' });
      return;
    }
    
    res.status(201).json(comment);
  } catch (error) {
    console.error('创建评论失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 创建项目评论
export const createNewProjectComment = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: '未授权' });
      return;
    }
    
    const { projectId } = req.params;
    const { content } = req.body;
    
    // 验证请求数据
    if (!content) {
      res.status(400).json({ message: '评论内容是必填项' });
      return;
    }
    
    // 创建评论
    const comment = await createComment({
      projectId,
      userId,
      content
    });
    
    if (!comment) {
      res.status(500).json({ message: '创建项目评论失败' });
      return;
    }
    
    res.status(201).json(comment);
  } catch (error) {
    console.error('创建项目评论失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 删除评论
export const deleteCommentById = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: '未授权' });
      return;
    }
    
    const { id } = req.params;
    
    // 删除评论
    const success = await deleteComment(id, userId);
    
    if (!success) {
      res.status(404).json({ message: '评论不存在或您无权删除此评论' });
      return;
    }
    
    res.status(200).json({ message: '评论删除成功' });
  } catch (error) {
    console.error('删除评论失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
}; 