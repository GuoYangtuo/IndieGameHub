import express from 'express';
import {
  getProposalCommentsAPI,
  getProjectCommentsAPI,
  createNewComment,
  createNewProjectComment,
  deleteCommentById,
  createCommentReply,
  getCommentReplies,
  createOrGetChatRoom,
  getChatRoomMessages,
  sendChatMessage
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

// 创建评论回复
commentRouter.post('/:commentId/replies', verifyToken, createCommentReply);

// 获取评论的回复
commentRouter.get('/:commentId/replies', getCommentReplies);

// 创建或获取在线讨论区
commentRouter.post('/:commentId/chat-room', verifyToken, createOrGetChatRoom);

// 获取讨论区消息
commentRouter.get('/chat-rooms/:chatRoomId/messages', getChatRoomMessages);

// 发送消息到讨论区
commentRouter.post('/chat-rooms/:chatRoomId/messages', verifyToken, sendChatMessage); 