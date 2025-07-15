import { query } from '../utils/dbTools';
import { addContribution } from './projectModel';

// 提案接口
export interface Proposal {
  id: string;
  title: string;
  description: string;
  projectId: string;
  createdBy: string;
  creatorNickname?: string;
  status: 'open' | 'closed' | 'queued' | 'completed';
  createdAt: string;
  category?: string;
  queuedAt?: string;
  queuedBy?: string;
  queuedByNickname?: string;
}

// 悬赏接口
export interface Bounty {
  id: string;
  proposalId: string;
  userId: string;
  amount: number;
  status?: 'active' | 'pending' | 'closed';
  createdAt: string;
}

// 创建提案接口
export interface CreateProposalData {
  title: string;
  description: string;
  projectId: string;
  createdBy: string;
  category?: string;
}

// 创建悬赏接口
export interface CreateBountyData {
  proposalId: string;
  userId: string;
  amount: number;
}

// 提案附件接口
export interface ProposalAttachment {
  id: string;
  proposalId: string;
  name: string;
  url: string;
  size: number;
}

// 生成唯一ID
const generateId = (): string => {
  return Date.now().toString() + Math.floor(Math.random() * 1000).toString();
};

// 根据ID查找提案
export const findProposalById = async (id: string): Promise<Proposal | null> => {
  try {
    const proposals = await query(
      `SELECT p.*, u.username as creatorNickname 
       FROM proposals p
       LEFT JOIN users u ON p.createdBy = u.id
       WHERE p.id = ?`,
      [id]
    );
    return proposals.length > 0 ? proposals[0] : null;
  } catch (error) {
    console.error('根据ID查找提案失败:', error);
    return null;
  }
};

// 根据项目ID查找提案
export const findProposalsByProjectId = async (projectId: string): Promise<Proposal[]> => {
  try {
    // 修改查询，联合users表获取用户昵称
    const proposals = await query(
      `SELECT p.*, u.username as creatorNickname 
       FROM proposals p
       LEFT JOIN users u ON p.createdBy = u.id
       WHERE p.projectId = ? 
       ORDER BY p.createdAt DESC`,
      [projectId]
    );
    
    // 确保日期格式正确
    return proposals.map((proposal: any) => {
      // 处理createdAt日期
      if (proposal.createdAt) {
        try {
          const date = new Date(proposal.createdAt);
          if (!isNaN(date.getTime())) {
            proposal.createdAt = date.toISOString();
          } else {
            proposal.createdAt = new Date().toISOString(); // 使用当前时间作为备用
          }
        } catch (error) {
          proposal.createdAt = new Date().toISOString(); // 如果转换失败，使用当前时间
        }
      } else {
        proposal.createdAt = new Date().toISOString(); // 如果没有createdAt，使用当前时间
      }
      
      // 处理queuedAt日期
      if (proposal.queuedAt) {
        try {
          const date = new Date(proposal.queuedAt);
          if (!isNaN(date.getTime())) {
            proposal.queuedAt = date.toISOString();
          } else {
            proposal.queuedAt = new Date().toISOString(); // 使用当前时间作为备用
          }
        } catch (error) {
          proposal.queuedAt = new Date().toISOString(); // 如果转换失败，使用当前时间
        }
      }
      
      return proposal;
    });
  } catch (error) {
    console.error('根据项目ID查找提案失败:', error);
    return [];
  }
};

// 获取提案点赞用户
export const getProposalLikes = async (proposalId: string): Promise<string[]> => {
  try {
    const likes = await query(
      'SELECT userId FROM proposal_likes WHERE proposalId = ?',
      [proposalId]
    );
    return likes.map((like: { userId: string }) => like.userId);
  } catch (error) {
    console.error('获取提案点赞失败:', error);
    return [];
  }
};

// 创建新提案
export const createProposal = async (proposalData: CreateProposalData): Promise<Proposal | null> => {
  try {
    // 检查项目是否存在
    const projects = await query('SELECT * FROM projects WHERE id = ?', [proposalData.projectId]);
    if (projects.length === 0) {
      return null;
    }
    
    // 创建提案
    const id = generateId();
    const now = new Date();
    const mysqlDateFormat = now.toISOString().slice(0, 19).replace('T', ' ');
    const createdAt = now.toISOString(); // 保留ISO格式用于返回的对象
    
    console.log(mysqlDateFormat);

    await query(
      `INSERT INTO proposals 
       (id, title, description, projectId, createdBy, status, createdAt, category) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, proposalData.title, proposalData.description, proposalData.projectId, proposalData.createdBy, 'open', mysqlDateFormat, proposalData.category || null]
    );
    
    // 添加提案到用户的创建的提案列表
    const { addUserCreatedProposal } = require('./userModel');
    await addUserCreatedProposal(
      proposalData.createdBy,
      id,
      proposalData.title,
      'open',
      proposalData.projectId
    );
    
    // 添加贡献度 - 创建提案
    const rates = await query(
      'SELECT proposal_creation FROM contribution_rates WHERE projectId = ?',
      [proposalData.projectId]
    );
    
    if (rates.length > 0 && rates[0].proposal_creation) {
      await addContribution(
        proposalData.projectId,
        proposalData.createdBy,
        rates[0].proposal_creation
      );
    }
    
    // 获取创建的提案
    const newProposal = await findProposalById(id);
    return newProposal || null;
  } catch (error) {
    console.error('创建提案失败:', error);
    return null;
  }
};

// 点赞提案
export const likeProposal = async (proposalId: string, userId: string, action?: string): Promise<boolean> => {
  try {
    // 查找提案
    const proposal = await findProposalById(proposalId);
    if (!proposal) {
      return false;
    }
    
    // 检查用户是否已点赞
    const likes = await query(
      'SELECT * FROM proposal_likes WHERE proposalId = ? AND userId = ?',
      [proposalId, userId]
    );
    const hasLiked = likes.length > 0;
    
    const now = new Date();
    const mysqlDateFormat = now.toISOString().slice(0, 19).replace('T', ' ');
    
    // 根据action参数和当前点赞状态决定行为
    if (action === 'like' && !hasLiked) {
      // 添加点赞
      await query(
        'INSERT INTO proposal_likes (proposalId, userId, createdAt) VALUES (?, ?, ?)',
        [proposalId, userId, mysqlDateFormat]
      );
      return true;
    } else if (action === 'unlike' && hasLiked) {
      // 取消点赞
      await query(
        'DELETE FROM proposal_likes WHERE proposalId = ? AND userId = ?',
        [proposalId, userId]
      );
      return true;
    } else if (!action) {
      // 切换状态
      if (hasLiked) {
        await query(
          'DELETE FROM proposal_likes WHERE proposalId = ? AND userId = ?',
          [proposalId, userId]
        );
      } else {
        await query(
          'INSERT INTO proposal_likes (proposalId, userId, createdAt) VALUES (?, ?, ?)',
          [proposalId, userId, mysqlDateFormat]
        );
      }
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('点赞提案失败:', error);
    return false;
  }
};

// 关闭提案
export const closeProposal = async (proposalId: string, userId: string): Promise<Proposal | null> => {
  try {
    // 查找提案
    const proposal = await findProposalById(proposalId);
    if (!proposal) {
      return null;
    }
    
    // 更新提案状态
    await query(
      'UPDATE proposals SET status = ? WHERE id = ?',
      ['closed', proposalId]
    );
    
    // 更新用户创建的提案状态
    const { updateUserCreatedProposalStatus } = require('./userModel');
    await updateUserCreatedProposalStatus(proposal.createdBy, proposalId, 'closed');
    
    // 获取更新后的提案
    const updatedProposal = await findProposalById(proposalId);
    return updatedProposal;
  } catch (error) {
    console.error('关闭提案失败:', error);
    return null;
  }
};

// 创建悬赏
export const createBounty = async (bountyData: CreateBountyData): Promise<Bounty | null> => {
  try {
    // 查找提案
    const proposal = await findProposalById(bountyData.proposalId);
    if (!proposal) {
      return null;
    }
    
    // 创建悬赏
    const id = generateId();
    const now = new Date();
    const mysqlDateFormat = now.toISOString().slice(0, 19).replace('T', ' ');
    const createdAt = now.toISOString(); // 保留ISO格式用于返回的对象
    
    await query(
      `INSERT INTO bounties (id, proposalId, userId, amount, status, createdAt) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, bountyData.proposalId, bountyData.userId, bountyData.amount, 'active', mysqlDateFormat]
    );
    
    // 添加用户悬赏记录
    const { addUserBounty } = require('./userModel');
    await addUserBounty(
      bountyData.userId,
      id,
      proposal.id,
      proposal.projectId,
      bountyData.amount,
      proposal.title
    );
    
    // 添加贡献度 - 创建悬赏
    const rates = await query(
      'SELECT bounty_creation FROM contribution_rates WHERE projectId = ?',
      [proposal.projectId]
    );
    
    if (rates.length > 0 && rates[0].bounty_creation) {
      await addContribution(
        proposal.projectId,
        bountyData.userId,
        rates[0].bounty_creation * bountyData.amount
      );
    }
    
    // 获取创建的悬赏
    const bounties = await query('SELECT * FROM bounties WHERE id = ?', [id]);
    return bounties.length > 0 ? bounties[0] : null;
  } catch (error) {
    console.error('创建悬赏失败:', error);
    return null;
  }
};

// 删除提案
export const deleteProposal = async (id: string): Promise<boolean> => {
  try {
    const result = await query('DELETE FROM proposals WHERE id = ?', [id]);
    return result.affectedRows > 0;
  } catch (error) {
    console.error('删除提案失败:', error);
    return false;
  }
};

// 添加提案到队列
export const addProposalToQueue = async (proposalId: string, userId: string): Promise<Proposal | null> => {
  try {
    // 查找提案
    const proposal = await findProposalById(proposalId);
    if (!proposal || proposal.status !== 'open') {
      return null;
    }
    
    // 获取用户信息
    const users = await query('SELECT username FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return null;
    }
    
    // 将日期格式化为MySQL兼容的格式: YYYY-MM-DD HH:MM:SS
    const now = new Date();
    const queuedAt = now.toISOString().slice(0, 19).replace('T', ' ');
    const queuedByNickname = users[0].username;
    
    // 更新提案状态
    await query(
      `UPDATE proposals 
       SET status = ?, queuedAt = ?, queuedBy = ?, queuedByNickname = ? 
       WHERE id = ?`,
      ['queued', queuedAt, userId, queuedByNickname, proposalId]
    );
    
    // 更新用户创建的提案状态
    const { updateUserCreatedProposalStatus } = require('./userModel');
    await updateUserCreatedProposalStatus(proposal.createdBy, proposalId, 'queued');
    
    // 获取更新后的提案
    const updatedProposal = await findProposalById(proposalId);
    return updatedProposal;
  } catch (error) {
    console.error('添加提案到队列失败:', error);
    return null;
  }
};

// 从队列中移除提案
export const removeProposalFromQueue = async (proposalId: string, userId: string): Promise<Proposal | null> => {
  try {
    // 查找提案
    const proposal = await findProposalById(proposalId);
    if (!proposal || proposal.status !== 'queued') {
      return null;
    }
    
    // 检查用户是否有权限移除（创建者或队列者）
    if (proposal.createdBy !== userId && proposal.queuedBy !== userId) {
      return null;
    }
    
    // 更新提案状态
    await query(
      'UPDATE proposals SET status = ?, queuedAt = NULL, queuedBy = NULL, queuedByNickname = NULL WHERE id = ?',
      ['open', proposalId]
    );
    
    // 更新用户创建的提案状态
    const { updateUserCreatedProposalStatus } = require('./userModel');
    await updateUserCreatedProposalStatus(proposal.createdBy, proposalId, 'open');
    
    // 获取更新后的提案
    const updatedProposal = await findProposalById(proposalId);
    return updatedProposal;
  } catch (error) {
    console.error('从队列中移除提案失败:', error);
    return null;
  }
};

// 查找提案的悬赏
export const findBountiesByProposalId = async (proposalId: string): Promise<Bounty[]> => {
  try {
    const bounties = await query('SELECT * FROM bounties WHERE proposalId = ?', [proposalId]);
    
    // 确保日期格式正确
    return bounties.map((bounty: any) => {
      // 处理日期格式
      if (bounty.createdAt) {
        try {
          const date = new Date(bounty.createdAt);
          if (!isNaN(date.getTime())) {
            bounty.createdAt = date.toISOString();
          } else {
            bounty.createdAt = new Date().toISOString(); // 使用当前时间作为备用
          }
        } catch (error) {
          bounty.createdAt = new Date().toISOString(); // 如果转换失败，使用当前时间
        }
      } else {
        bounty.createdAt = new Date().toISOString(); // 如果没有createdAt，使用当前时间
      }
      
      return bounty;
    });
  } catch (error) {
    console.error('查找提案悬赏失败:', error);
    return [];
  }
};

// 完成提案
export const completeProposal = async (proposalId: string, userId: string): Promise<Proposal | null> => {
  try {
    // 查找提案
    const proposal = await findProposalById(proposalId);
    if (!proposal || (proposal.status !== 'queued' && proposal.status !== 'open')) {
      return null;
    }
    
    // 获取项目创建者
    const projects = await query('SELECT createdBy FROM projects WHERE id = ?', [proposal.projectId]);
    if (projects.length === 0) {
      return null;
    }
    
    const projectCreator = projects[0].createdBy;
    
    // 检查用户是否有权限完成提案（项目创建者）
    if (projectCreator !== userId) {
      return null;
    }
    
    // 更新提案状态
    await query('UPDATE proposals SET status = ? WHERE id = ?', ['completed', proposalId]);
    
    // 添加项目更新 - 使用MySQL兼容的日期格式
    const now = new Date();
    const createdAt = now.toISOString().slice(0, 19).replace('T', ' ');
    
    await query(
      `INSERT INTO project_updates (id, projectId, content, createdAt) VALUES (?, ?, ?, ?)`,
      [generateId(), proposal.projectId, `完成了提案「${proposal.title}」`, createdAt]
    );
    
    // 更新用户创建的提案状态
    const { updateUserCreatedProposalStatus } = require('./userModel');
    await updateUserCreatedProposalStatus(proposal.createdBy, proposalId, 'completed');
    
    // 处理悬赏
    const bounties = await findBountiesByProposalId(proposalId);
    const rates = await query(
      'SELECT bounty_completion FROM contribution_rates WHERE projectId = ?',
      [proposal.projectId]
    );
    
    for (const bounty of bounties) {
      // 更新悬赏状态
      await query('UPDATE bounties SET status = ? WHERE id = ?', ['closed', bounty.id]);
      
      // 更新用户悬赏状态
      const { updateUserBountyStatus } = require('./userModel');
      await updateUserBountyStatus(bounty.userId, bounty.id, 'closed');
      
      // 添加贡献度 - 悬赏完成
      if (rates.length > 0 && rates[0].bounty_completion) {
        await addContribution(
          proposal.projectId,
          bounty.userId,
          rates[0].bounty_completion * bounty.amount
        );
      }
    }
    
    // 获取更新后的提案
    const updatedProposal = await findProposalById(proposalId);
    return updatedProposal;
  } catch (error) {
    console.error('完成提案失败:', error);
    return null;
  }
};

// 获取提案附件
export const getProposalAttachments = async (proposalId: string): Promise<ProposalAttachment[]> => {
  try {
    return await query('SELECT * FROM proposal_attachments WHERE proposalId = ?', [proposalId]);
  } catch (error) {
    console.error('获取提案附件失败:', error);
    return [];
  }
};

// 添加提案附件
export const addProposalAttachment = async (
  proposalId: string,
  name: string,
  url: string,
  size: number
): Promise<ProposalAttachment | null> => {
  try {
    const id = generateId();
    
    await query(
      'INSERT INTO proposal_attachments (id, proposalId, name, url, size) VALUES (?, ?, ?, ?, ?)',
      [id, proposalId, name, url, size]
    );
    
    const attachments = await query('SELECT * FROM proposal_attachments WHERE id = ?', [id]);
    return attachments.length > 0 ? attachments[0] : null;
  } catch (error) {
    console.error('添加提案附件失败:', error);
    return null;
  }
};

// 删除提案附件
export const deleteProposalAttachment = async (attachmentId: string): Promise<boolean> => {
  try {
    const result = await query('DELETE FROM proposal_attachments WHERE id = ?', [attachmentId]);
    return result.affectedRows > 0;
  } catch (error) {
    console.error('删除提案附件失败:', error);
    return false;
  }
};

// 更新提案
export const updateProposal = async (proposalId: string, title: string, description: string): Promise<Proposal | null> => {
  try {
    // 查找提案
    const proposal = await findProposalById(proposalId);
    if (!proposal) {
      return null;
    }
    
    // 更新提案
    await query(
      'UPDATE proposals SET title = ?, description = ? WHERE id = ?',
      [title, description, proposalId]
    );
    
    // 更新用户创建的提案标题
    const { updateUserCreatedProposalTitle } = require('./userModel');
    await updateUserCreatedProposalTitle(proposal.createdBy, proposalId, title);
    
    // 获取更新后的提案
    const updatedProposal = await findProposalById(proposalId);
    return updatedProposal;
  } catch (error) {
    console.error('更新提案失败:', error);
    return null;
  }
}; 