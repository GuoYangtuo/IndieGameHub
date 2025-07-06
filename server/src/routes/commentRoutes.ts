import express from 'express';
import {
  getProposalCommentsAPI,
  getProjectCommentsAPI,
  createNewComment,
  createNewProjectComment,
  deleteCommentById
} from '../controllers/commentController';
import { verifyToken } from '../middleware/authMiddleware';

export const commentRouter = express.Router();

// 获取提案评论
commentRouter.get('/proposals/:proposalId/comments', getProposalCommentsAPI);

// 获取项目评论
commentRouter.get('/projects/:projectId/comments', getProjectCommentsAPI);

// 创建提案评论
commentRouter.post('/proposals/:proposalId/comments', verifyToken, createNewComment);

// 创建项目评论
commentRouter.post('/projects/:projectId/comments', verifyToken, createNewProjectComment);

// 删除评论
commentRouter.delete('/:id', verifyToken, deleteCommentById); 