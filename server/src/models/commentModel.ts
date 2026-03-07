import { query } from '../utils/dbTools';

// 评论接口
export interface Comment {
  id: string;
  proposalId?: string;
  projectId?: string;
  userId: string;
  content: string;
  createdAt: string;
  userNickname?: string;
  parentId?: string | null;
  replies?: Comment[];
  chatRoomId?: string | null;
}

// 创建评论数据接口
export interface CreateCommentData {
  proposalId?: string;
  projectId?: string;
  userId: string;
  content: string;
  parentId?: string | null;
}

// 生成唯一ID
const generateId = (): string => {
  return Date.now().toString() + Math.floor(Math.random() * 1000).toString();
};

// 根据ID查找评论
export const findCommentById = async (id: string): Promise<Comment | undefined> => {
  try {
    const comments = await query('SELECT * FROM comments WHERE id = ?', [id]);
    return comments.length > 0 ? comments[0] : undefined;
  } catch (error) {
    console.error('根据ID查找评论失败:', error);
    return undefined;
  }
};

// 根据提案ID查找评论
export const findCommentsByProposalId = async (proposalId: string): Promise<Comment[]> => {
  try {
    const comments = await query(
      `SELECT c.*, u.username as userNickname 
       FROM comments c
       LEFT JOIN users u ON c.userId = u.id
       WHERE c.proposalId = ?
       ORDER BY c.createdAt DESC`,
      [proposalId]
    );
    
    // 直接返回数据库中的原始时间，不进行转换
    return comments;
  } catch (error) {
    console.error('根据提案ID查找评论失败:', error);
    return [];
  }
};

// 根据项目ID查找评论
export const findCommentsByProjectId = async (projectId: string): Promise<Comment[]> => {
  try {
    const comments = await query(
      `SELECT c.*, u.username as userNickname 
       FROM comments c
       LEFT JOIN users u ON c.userId = u.id
       WHERE c.projectId = ?
       ORDER BY c.createdAt DESC`,
      [projectId]
    );
    
    // 直接返回数据库中的原始时间，不进行转换
    return comments;
  } catch (error) {
    console.error('根据项目ID查找评论失败:', error);
    return [];
  }
};

// 创建新评论
export const createComment = async (commentData: CreateCommentData): Promise<Comment | null> => {
  try {
    const { userId, proposalId, projectId, content, parentId } = commentData;
    
    // 获取用户昵称
    const users = await query('SELECT username FROM users WHERE id = ?', [userId]);
    const userNickname = users.length > 0 ? users[0].username : '未知用户';
    
    // 创建评论
    const id = generateId();
    const now = new Date();
    const mysqlDateFormat = now.toISOString().slice(0, 19).replace('T', ' ');
    
    await query(
      `INSERT INTO comments (id, proposalId, projectId, userId, content, parentId, createdAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, proposalId || null, projectId || null, userId, content, parentId || null, mysqlDateFormat]
    );
    
    const newComment: Comment = {
      id,
      proposalId,
      projectId,
      userId,
      content,
      parentId: parentId || null,
      createdAt: mysqlDateFormat, // 使用MySQL格式时间
      userNickname
    };
    
    return newComment;
  } catch (error) {
    console.error('创建评论失败:', error);
    return null;
  }
};

// 删除评论
export const deleteComment = async (commentId: string, userId: string): Promise<boolean> => {
  try {
    // 检查评论是否存在且是否为该用户创建的
    const comments = await query('SELECT * FROM comments WHERE id = ? AND userId = ?', [commentId, userId]);
    
    if (comments.length === 0) {
      return false;
    }
    
    // 删除评论
    const result = await query('DELETE FROM comments WHERE id = ?', [commentId]);
    return result.affectedRows > 0;
  } catch (error) {
    console.error('删除评论失败:', error);
    return false;
  }
};

// 获取带用户昵称的评论
export const getCommentWithUserInfo = async (commentId: string): Promise<Comment | null> => {
  try {
    const comments = await query(
      `SELECT c.*, u.username as userNickname 
       FROM comments c
       LEFT JOIN users u ON c.userId = u.id
       WHERE c.id = ?`,
      [commentId]
    );
    
    return comments.length > 0 ? comments[0] : null;
  } catch (error) {
    console.error('获取评论用户信息失败:', error);
    return null;
  }
};

// 根据父评论ID获取回复
export const findRepliesByParentId = async (parentId: string): Promise<Comment[]> => {
  try {
    const comments = await query(
      `SELECT c.*, u.username as userNickname 
       FROM comments c
       LEFT JOIN users u ON c.userId = u.id
       WHERE c.parentId = ?
       ORDER BY c.createdAt ASC`,
      [parentId]
    );
    
    return comments;
  } catch (error) {
    console.error('根据父评论ID查找回复失败:', error);
    return [];
  }
};

// 获取评论及其回复
export const getCommentWithReplies = async (commentId: string): Promise<Comment | null> => {
  try {
    // 获取主评论
    const comments = await query(
      `SELECT c.*, u.username as userNickname 
       FROM comments c
       LEFT JOIN users u ON c.userId = u.id
       WHERE c.id = ?`,
      [commentId]
    );
    
    if (comments.length === 0) {
      return null;
    }
    
    const comment = comments[0];
    
    // 获取回复
    const replies = await findRepliesByParentId(commentId);
    
    // 获取chatRoomId
    const chatRooms = await query(
      'SELECT id FROM chat_rooms WHERE commentId = ?',
      [commentId]
    );
    
    if (chatRooms.length > 0) {
      comment.chatRoomId = chatRooms[0].id;
    }
    
    comment.replies = replies;
    
    return comment;
  } catch (error) {
    console.error('获取评论及回复失败:', error);
    return null;
  }
};

// 查找或创建聊天房间
export const findOrCreateChatRoom = async (commentId: string): Promise<{ id: string; commentId: string } | null> => {
  try {
    // 先查找是否已存在
    const existingRooms = await query(
      'SELECT * FROM chat_rooms WHERE commentId = ?',
      [commentId]
    );
    
    if (existingRooms.length > 0) {
      return existingRooms[0];
    }
    
    // 创建新的聊天房间
    const id = Date.now().toString() + Math.floor(Math.random() * 1000).toString();
    const now = new Date();
    const mysqlDateFormat = now.toISOString().slice(0, 19).replace('T', ' ');
    
    await query(
      `INSERT INTO chat_rooms (id, commentId, createdAt) VALUES (?, ?, ?)`,
      [id, commentId, mysqlDateFormat]
    );
    
    return { id, commentId };
  } catch (error) {
    console.error('查找或创建聊天房间失败:', error);
    return null;
  }
};

// 获取聊天房间信息
export const getChatRoomById = async (chatRoomId: string): Promise<any | null> => {
  try {
    const rooms = await query('SELECT * FROM chat_rooms WHERE id = ?', [chatRoomId]);
    return rooms.length > 0 ? rooms[0] : null;
  } catch (error) {
    console.error('获取聊天房间信息失败:', error);
    return null;
  }
};

// 聊天消息接口
export interface ChatMessage {
  id: string;
  chatRoomId: string;
  userId: string;
  content: string;
  createdAt: string;
  userNickname?: string;
}

// 发送聊天消息
export const createChatMessage = async (chatRoomId: string, userId: string, content: string): Promise<ChatMessage | null> => {
  try {
    // 获取用户昵称
    const users = await query('SELECT username FROM users WHERE id = ?', [userId]);
    const userNickname = users.length > 0 ? users[0].username : '未知用户';
    
    const id = Date.now().toString() + Math.floor(Math.random() * 1000).toString();
    const now = new Date();
    const mysqlDateFormat = now.toISOString().slice(0, 19).replace('T', ' ');
    
    await query(
      `INSERT INTO chat_messages (id, chatRoomId, userId, content, createdAt) VALUES (?, ?, ?, ?, ?)`,
      [id, chatRoomId, userId, content, mysqlDateFormat]
    );
    
    return {
      id,
      chatRoomId,
      userId,
      content,
      createdAt: mysqlDateFormat,
      userNickname
    };
  } catch (error) {
    console.error('发送聊天消息失败:', error);
    return null;
  }
};

// 获取聊天消息
export const getChatMessages = async (chatRoomId: string): Promise<ChatMessage[]> => {
  try {
    const messages = await query(
      `SELECT m.*, u.username as userNickname 
       FROM chat_messages m
       LEFT JOIN users u ON m.userId = u.id
       WHERE m.chatRoomId = ?
       ORDER BY m.createdAt ASC`,
      [chatRoomId]
    );
    
    return messages;
  } catch (error) {
    console.error('获取聊天消息失败:', error);
    return [];
  }
}; 