import { Router } from 'express';
import {
  getProjectProposals,
  getProposalById,
  createNewProposal,
  createProposalWithAttachments,
  likeProposalById,
  closeProposalById,
  createNewBounty,
  deleteProposalById,
  addToTaskQueue,
  removeFromTaskQueue,
  markProposalComplete,
  closeBounty,
  upload,
  updateProposalById
} from '../controllers/proposalController';
import {
  getProposalComments,
  createNewComment,
  deleteCommentById
} from '../controllers/commentController';
import { verifyToken } from '../middleware/authMiddleware';
import { findBountiesByProposalId, findProposalById, addProposalToQueue, removeProposalFromQueue } from '../models/proposalModel';
import { Request, Response } from 'express';

export const proposalRouter = Router();

// 获取项目的所有提案
proposalRouter.get('/project/:projectId', getProjectProposals);

// 获取提案详情
proposalRouter.get('/:id', getProposalById);

// 创建提案
proposalRouter.post('/', verifyToken, createNewProposal);

// 创建带附件的提案
proposalRouter.post('/attachments', verifyToken, upload.array('attachments', 5), createProposalWithAttachments);

// 点赞提案
proposalRouter.post('/:id/like', verifyToken, likeProposalById);

// 关闭提案
proposalRouter.post('/:id/close', verifyToken, closeProposalById);

// 创建悬赏
proposalRouter.post('/:proposalId/bounty', verifyToken, createNewBounty);

// 获取提案的悬赏列表
proposalRouter.get('/:proposalId/bounty', (req, res) => {
    const { proposalId } = req.params;
  
  try {
    const proposal = getProposalById({ params: { id: proposalId } } as any, {
      status: (code: number) => ({
        json: (data: any) => {
          if (code === 200) {
            // 只返回悬赏列表
            res.status(200).json(data.bounties || []);
          } else {
            res.status(code).json(data);
          }
          return res;
        }
      })
    } as any);
  } catch (error) {
    console.error('获取提案悬赏列表失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 删除提案
proposalRouter.delete('/delete/:id', verifyToken, deleteProposalById);

// 获取提案评论
proposalRouter.get('/:proposalId/comments', getProposalComments);

// 创建评论
proposalRouter.post('/:proposalId/comments', verifyToken, createNewComment);

// 删除评论
proposalRouter.delete('/comments/:id', verifyToken, deleteCommentById);

// 添加提案到任务队列
proposalRouter.post('/:proposalId/task-queue', verifyToken, addToTaskQueue);

// 从任务队列移除提案
proposalRouter.post('/:proposalId/remove-from-queue', verifyToken, removeFromTaskQueue); 

// 完成提案
proposalRouter.post('/:id/complete', verifyToken, markProposalComplete);

// 关闭悬赏并发放奖励
proposalRouter.post('/bounty/:bountyId/close', verifyToken, closeBounty); 

// 更新提案
proposalRouter.put('/:id', verifyToken, updateProposalById); 