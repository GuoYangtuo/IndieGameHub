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
}

// 创建评论数据接口
export interface CreateCommentData {
  proposalId?: string;
  projectId?: string;
  userId: string;
  content: string;
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
    
    // 确保日期格式正确
    return comments.map((comment: any) => {
      // 处理日期格式
      if (comment.createdAt) {
        try {
          const date = new Date(comment.createdAt);
          if (!isNaN(date.getTime())) {
            comment.createdAt = date.toISOString();
          } else {
            comment.createdAt = new Date().toISOString(); // 使用当前时间作为备用
          }
        } catch (error) {
          comment.createdAt = new Date().toISOString(); // 如果转换失败，使用当前时间
        }
      } else {
        comment.createdAt = new Date().toISOString(); // 如果没有createdAt，使用当前时间
      }
      
      return comment;
    });
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
    
    // 确保日期格式正确
    return comments.map((comment: any) => {
      // 处理日期格式
      if (comment.createdAt) {
        try {
          const date = new Date(comment.createdAt);
          if (!isNaN(date.getTime())) {
            comment.createdAt = date.toISOString();
          } else {
            comment.createdAt = new Date().toISOString(); // 使用当前时间作为备用
          }
        } catch (error) {
          comment.createdAt = new Date().toISOString(); // 如果转换失败，使用当前时间
        }
      } else {
        comment.createdAt = new Date().toISOString(); // 如果没有createdAt，使用当前时间
      }
      
      return comment;
    });
  } catch (error) {
    console.error('根据项目ID查找评论失败:', error);
    return [];
  }
};

// 创建新评论
export const createComment = async (commentData: CreateCommentData): Promise<Comment | null> => {
  try {
    const { userId, proposalId, projectId, content } = commentData;
    
    // 获取用户昵称
    const users = await query('SELECT username FROM users WHERE id = ?', [userId]);
    const userNickname = users.length > 0 ? users[0].username : '未知用户';
    
    // 创建评论
    const id = generateId();
    const now = new Date();
    const mysqlDateFormat = now.toISOString().slice(0, 19).replace('T', ' ');
    const createdAt = now.toISOString(); // 保留ISO格式用于返回的对象
    
    await query(
      `INSERT INTO comments (id, proposalId, projectId, userId, content, createdAt) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, proposalId || null, projectId || null, userId, content, mysqlDateFormat]
    );
    
    const newComment: Comment = {
      id,
      proposalId,
      projectId,
      userId,
      content,
      createdAt,
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