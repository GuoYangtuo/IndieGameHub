import { Request, Response } from 'express';
import { query } from '../utils/dbTools';
import { 
  createComment, 
  findCommentsByProposalId,
  findCommentsByProjectId,
  deleteComment,
  getCommentWithUserInfo,
  findRepliesByParentId,
  getCommentWithReplies,
  findOrCreateChatRoom,
  getChatRoomById,
  createChatMessage,
  getChatMessages,
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
    // 获取项目评论（只获取顶级评论，不包含回复）
    const comments = await findCommentsByProjectId(projectId);
    
    // 为每个评论获取回复和chatRoomId
    for (const comment of comments) {
      const replies = await findRepliesByParentId(comment.id);
      comment.replies = replies;
      
      // 获取chatRoomId
      const chatRooms = await query(
        'SELECT id FROM chat_rooms WHERE commentId = ?',
        [comment.id]
      );
      if (chatRooms.length > 0) {
        comment.chatRoomId = chatRooms[0].id;
      }
    }
    
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

// 创建评论回复（单级回复）
export const createCommentReply = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: '未授权' });
      return;
    }
    
    const { commentId } = req.params;
    const { content } = req.body;
    
    // 验证请求数据
    if (!content) {
      res.status(400).json({ message: '回复内容是必填项' });
      return;
    }
    
    // 检查原评论是否存在
    const parentComment = await getCommentWithUserInfo(commentId);
    if (!parentComment) {
      res.status(404).json({ message: '原评论不存在' });
      return;
    }
    
    // 创建回复
    const reply = await createComment({
      userId,
      content,
      parentId: commentId,
      proposalId: parentComment.proposalId,
      projectId: parentComment.projectId
    });
    
    if (!reply) {
      res.status(500).json({ message: '创建回复失败' });
      return;
    }
    
    res.status(201).json(reply);
  } catch (error) {
    console.error('创建回复失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 获取评论的回复
export const getCommentReplies = async (req: Request, res: Response): Promise<void> => {
  try {
    const { commentId } = req.params;
    
    // 获取回复
    const replies = await findRepliesByParentId(commentId);
    
    res.status(200).json(replies);
  } catch (error) {
    console.error('获取回复失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 创建或获取在线讨论区
export const createOrGetChatRoom = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: '未授权' });
      return;
    }
    
    const { commentId } = req.params;
    
    // 检查评论是否存在
    const comment = await getCommentWithUserInfo(commentId);
    if (!comment) {
      res.status(404).json({ message: '评论不存在' });
      return;
    }
    
    // 查找或创建聊天房间
    const chatRoom = await findOrCreateChatRoom(commentId);
    
    if (!chatRoom) {
      res.status(500).json({ message: '创建讨论区失败' });
      return;
    }
    
    // 如果是新创建的房间，保存初始消息（原评论+回复）
    const existingMessages = await getChatMessages(chatRoom.id);
    if (existingMessages.length === 0) {
      // 获取原评论的所有回复
      const replies = await findRepliesByParentId(commentId);
      
      // 添加原评论作为第一条消息
      await createChatMessage(
        chatRoom.id,
        comment.userId,
        comment.content
      );
      
      // 添加回复作为后续消息
      for (const reply of replies) {
        await createChatMessage(
          chatRoom.id,
          reply.userId,
          reply.content
        );
      }
    }
    
    res.status(200).json({ chatRoomId: chatRoom.id, chatRoom });
  } catch (error) {
    console.error('创建讨论区失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 获取在线讨论区消息
export const getChatRoomMessages = async (req: Request, res: Response): Promise<void> => {
  try {
    const { chatRoomId } = req.params;
    
    // 检查聊天房间是否存在
    const chatRoom = await getChatRoomById(chatRoomId);
    if (!chatRoom) {
      res.status(404).json({ message: '讨论区不存在' });
      return;
    }
    
    // 获取消息
    const messages = await getChatMessages(chatRoomId);
    
    res.status(200).json({ chatRoom, messages });
  } catch (error) {
    console.error('获取讨论区消息失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 发送消息到讨论区
export const sendChatMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: '未授权' });
      return;
    }
    
    const { chatRoomId } = req.params;
    const { content } = req.body;
    
    // 验证请求数据
    if (!content) {
      res.status(400).json({ message: '消息内容是必填项' });
      return;
    }
    
    // 检查聊天房间是否存在
    const chatRoom = await getChatRoomById(chatRoomId);
    if (!chatRoom) {
      res.status(404).json({ message: '讨论区不存在' });
      return;
    }
    
    // 发送消息
    const message = await createChatMessage(chatRoomId, userId, content);
    
    if (!message) {
      res.status(500).json({ message: '发送消息失败' });
      return;
    }
    
    res.status(201).json(message);
  } catch (error) {
    console.error('发送消息失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
}; 