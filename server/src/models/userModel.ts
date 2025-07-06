import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../utils/dbTools';
import { getAllProjects, deleteProject } from './projectModel';

// 用户接口
export interface User {
  id: string;
  username: string;
  email: string;
  password: string;
  coins: number;
  createdAt: string;
  bio?: string;
  avatarUrl?: string;
  favoriteProjects?: string[]; // 用户关注的项目ID列表
  createdProposals?: {[proposalId: string]: {title: string, status: string, projectId: string}}; // 用户创建的提案
  userBounties?: {[bountyId: string]: {
    proposalId: string,
    projectId: string,
    amount: number,
    status: 'active' | 'pending' | 'closed',
    createdAt: string,
    proposalTitle: string
  }}; // 用户创建的悬赏
}

// 临时用户接口，用于验证码验证
export interface TempUser {
  username: string;
  email: string;
  password: string;
  verificationCode: string;
  expiryTime: Date;
}

// 用户注册接口
export interface UserRegisterData {
  username: string;
  email: string;
  password: string;
}

// 用户登录接口
export interface UserLoginData {
  usernameOrEmail: string;
  password: string;
}

// 捐赠接口
export interface Donation {
  id: string;
  fromUserId: string;
  toUserId: string;
  projectId: string;
  amount: number;
  message?: string;
  createdAt: string;
  type: 'one-time' | 'subscription';
}

// 订阅捐赠接口
export interface Subscription {
  id: string;
  fromUserId: string;
  toUserId: string;
  projectId: string;
  amount: number;
  message?: string;
  createdAt: string;
  nextPaymentDate: string;
  isActive: boolean;
}

// 生成唯一ID
const generateId = (): string => {
  return Date.now().toString() + Math.floor(Math.random() * 1000).toString();
};

// 获取所有用户
export const getAllUsers = async (): Promise<User[]> => {
  try {
    return await query('SELECT * FROM users');
  } catch (error) {
    console.error('读取用户数据失败:', error);
    return [];
  }
};

// 根据用户名查找用户
export const findUserByUsername = async (username: string): Promise<User | undefined> => {
  try {
    const users = await query('SELECT * FROM users WHERE username = ?', [username]);
    return users[0];
  } catch (error) {
    console.error('根据用户名查找用户失败:', error);
    return undefined;
  }
};

// 根据邮箱查找用户
export const findUserByEmail = async (email: string): Promise<User | undefined> => {
  try {
    const users = await query('SELECT * FROM users WHERE email = ?', [email]);
    return users[0];
  } catch (error) {
    console.error('根据邮箱查找用户失败:', error);
    return undefined;
  }
};

// 根据用户名或邮箱查找用户
export const findUserByUsernameOrEmail = async (usernameOrEmail: string): Promise<User | undefined> => {
  try {
    const users = await query(
      'SELECT * FROM users WHERE username = ? OR email = ?', 
      [usernameOrEmail, usernameOrEmail]
    );
    return users[0];
  } catch (error) {
    console.error('根据用户名或邮箱查找用户失败:', error);
    return undefined;
  }
};

// 根据ID查找用户
export const findUserById = async (id: string): Promise<User | null> => {
  try {
    const users = await query('SELECT * FROM users WHERE id = ?', [id]);
    return users.length > 0 ? users[0] : null;
  } catch (error) {
    console.error('根据ID查找用户失败:', error);
    return null;
  }
};

// 根据用户名模糊搜索用户
export const searchUsersByUsername = async (usernameQuery: string): Promise<User[]> => {
  try {
    return await query('SELECT * FROM users WHERE username LIKE ?', [`%${usernameQuery}%`]);
  } catch (error) {
    console.error('搜索用户失败:', error);
    return [];
  }
};

// 注册新用户
export const registerUser = async (userData: UserRegisterData): Promise<User | null> => {
  try {
  // 检查用户名是否已存在
    const existingUsername = await findUserByUsername(userData.username);
    if (existingUsername) {
    return null;
  }
  
  // 检查邮箱是否已存在
    const existingEmail = await findUserByEmail(userData.email);
    if (existingEmail) {
    return null;
  }

  // 哈希密码
  const hashedPassword = await bcrypt.hash(userData.password, 10);

  // 创建新用户
    const id = generateId();
    // 使用MySQL支持的格式创建日期
    const now = new Date();
    const createdAt = now.toISOString().slice(0, 19).replace('T', ' ');
    
    await query(
      `INSERT INTO users 
      (id, username, email, password, coins, createdAt) 
      VALUES (?, ?, ?, ?, ?, ?)`,
      [id, userData.username, userData.email, hashedPassword, 0, createdAt]
    );

  const newUser: User = {
    id,
    username: userData.username,
    email: userData.email,
    password: hashedPassword,
    coins: 0,
    createdAt: now.toISOString() // 客户端使用ISO格式
  };

  return newUser;
  } catch (error) {
    console.error('注册用户失败:', error);
    return null;
  }
};

// 用户登录
export const loginUser = async (loginData: UserLoginData): Promise<User | null> => {
  try {
    const user = await findUserByUsernameOrEmail(loginData.usernameOrEmail);
  
  if (!user) {
    return null;
  }

  // 验证密码
  const isPasswordValid = await bcrypt.compare(loginData.password, user.password);
  
  if (!isPasswordValid) {
    return null;
  }

  return user;
  } catch (error) {
    console.error('登录失败:', error);
    return null;
  }
};

// 更新用户金币
export const updateUserCoins = async (userId: string, amount: number): Promise<User | null> => {
  try {
    await query(
      'UPDATE users SET coins = coins + ? WHERE id = ?',
      [amount, userId]
    );
    
    // 返回更新后的用户
    return await findUserById(userId);
  } catch (error) {
    console.error('更新用户金币失败:', error);
    return null;
  }
};

// 更新用户简介
export const updateUserBio = async (userId: string, bio: string): Promise<User | null> => {
  try {
    await query(
      'UPDATE users SET bio = ? WHERE id = ?',
      [bio, userId]
    );
    
    // 返回更新后的用户
    return await findUserById(userId);
  } catch (error) {
    console.error('更新用户简介失败:', error);
    return null;
  }
};

// 更新用户头像
export const updateUserAvatar = async (userId: string, avatarUrl: string): Promise<User | null> => {
  try {
    await query(
      'UPDATE users SET avatar_url = ? WHERE id = ?',
      [avatarUrl, userId]
    );
    
    // 返回更新后的用户
    return await findUserById(userId);
  } catch (error) {
    console.error('更新用户头像失败:', error);
    return null;
  }
};

// 删除用户
export const deleteUserById = async (userId: string): Promise<boolean> => {
  try {
    const result = await query('DELETE FROM users WHERE id = ?', [userId]);
    return result.affectedRows > 0;
  } catch (error) {
    console.error('删除用户失败:', error);
    return false;
  }
};

// 添加收藏项目
export const addFavoriteProject = async (userId: string, projectId: string): Promise<boolean> => {
  try {
    await query(
      'INSERT IGNORE INTO favorite_projects (userId, projectId) VALUES (?, ?)',
      [userId, projectId]
    );
    return true;
  } catch (error) {
    console.error('添加收藏项目失败:', error);
    return false;
  }
};

// 移除收藏项目
export const removeFavoriteProject = async (userId: string, projectId: string): Promise<boolean> => {
  try {
    await query(
      'DELETE FROM favorite_projects WHERE userId = ? AND projectId = ?',
      [userId, projectId]
    );
    return true;
  } catch (error) {
    console.error('移除收藏项目失败:', error);
    return false;
  }
};

// 获取用户收藏的项目
export const getFavoriteProjects = async (userId: string): Promise<string[]> => {
  try {
    const favorites = await query(
      'SELECT projectId FROM favorite_projects WHERE userId = ?',
      [userId]
    );
    return favorites.map((favorite: {projectId: string}) => favorite.projectId);
  } catch (error) {
    console.error('获取收藏项目失败:', error);
    return [];
  }
};

// 捐赠到项目
export const donateToProject = async (
  fromUserId: string,
  projectId: string,
  amount: number,
  message?: string
): Promise<Donation | null> => {
  try {
    // 获取项目创建者
    const project = await query('SELECT createdBy FROM projects WHERE id = ?', [projectId]);
    if (!project || project.length === 0) {
      return null;
    }
    
    const toUserId = project[0].createdBy;
    
    // 检查用户金币是否足够
    const user = await findUserById(fromUserId);
    if (!user || user.coins < amount) {
      return null;
    }
    
    // 检查项目是否只有创建者一人（没有其他成员）
    const projectMembers = await query('SELECT COUNT(*) as memberCount FROM project_members WHERE projectId = ?', [projectId]);
    const isSingleMemberProject = projectMembers[0].memberCount <= 1;
    
    // 扣除捐赠者金币
    await updateUserCoins(fromUserId, -amount);
    
    // 增加接收者金币
    await updateUserCoins(toUserId, amount);
    
    // 如果项目有多个成员，则增加项目余额；否则金币已直接转给创建者
    if (!isSingleMemberProject) {
      await query(
        'UPDATE projects SET projectBalance = projectBalance + ? WHERE id = ?',
        [amount, projectId]
      );
    }
    
    // 记录捐赠
    const id = generateId();
    const now = new Date();
    const mysqlDateFormat = now.toISOString().slice(0, 19).replace('T', ' ');
    const createdAt = now.toISOString(); // 保留ISO格式用于返回的对象
    
    await query(
      `INSERT INTO donations 
      (id, from_userId, to_userId, projectId, amount, message, createdAt, type) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, fromUserId, toUserId, projectId, amount, message || '', mysqlDateFormat, 'one-time']
    );
    
    const donation: Donation = {
      id,
      fromUserId,
      toUserId,
      projectId,
      amount,
      message,
      createdAt,
      type: 'one-time'
    };
    
    return donation;
  } catch (error) {
    console.error('捐赠失败:', error);
    return null;
  }
};

// 创建订阅捐赠
export const createSubscription = async (
  fromUserId: string,
  projectId: string,
  amount: number,
  message?: string
): Promise<Subscription | null> => {
  try {
    // 检查项目是否存在
    const project = await query('SELECT createdBy FROM projects WHERE id = ?', [projectId]);
    if (!project || project.length === 0) {
      return null;
    }
    
    const toUserId = project[0].createdBy;
    
    // 检查用户金币是否足够
    const user = await findUserById(fromUserId);
    if (!user || user.coins < amount) {
      return null;
    }
    
    // 检查项目是否只有创建者一人（没有其他成员）
    const projectMembers = await query('SELECT COUNT(*) as memberCount FROM project_members WHERE projectId = ?', [projectId]);
    const isSingleMemberProject = projectMembers[0].memberCount <= 1;
    
    // 扣除捐赠者金币
    await updateUserCoins(fromUserId, -amount);
    
    // 增加接收者金币
    await updateUserCoins(toUserId, amount);
    
    // 如果项目有多个成员，则增加项目余额；否则金币已直接转给创建者
    if (!isSingleMemberProject) {
      await query(
        'UPDATE projects SET projectBalance = projectBalance + ? WHERE id = ?',
        [amount, projectId]
      );
    }
    
    // 创建订阅记录
    const id = generateId();
    const now = new Date();
    const mysqlDateFormat = now.toISOString().slice(0, 19).replace('T', ' ');
    const createdAt = now.toISOString(); // 保留ISO格式用于返回的对象
    
    // 计算下个月的日期
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const nextPaymentMysqlFormat = nextMonth.toISOString().slice(0, 19).replace('T', ' ');
    const nextPaymentDate = nextMonth.toISOString(); // 保留ISO格式用于返回的对象
    
    await query(
      `INSERT INTO subscriptions 
      (id, from_userId, to_userId, projectId, amount, message, createdAt, next_payment_date, is_active) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, fromUserId, toUserId, projectId, amount, message || '', mysqlDateFormat, nextPaymentMysqlFormat, true]
    );
    
    const subscription: Subscription = {
      id,
      fromUserId,
      toUserId,
      projectId,
      amount,
      message,
      createdAt,
      nextPaymentDate,
      isActive: true
    };
    
    return subscription;
  } catch (error) {
    console.error('创建订阅失败:', error);
    return null;
  }
};

// 取消订阅
export const cancelSubscription = async (
  userId: string,
  subscriptionId: string
): Promise<boolean> => {
  try {
    const result = await query(
      'UPDATE subscriptions SET is_active = ? WHERE id = ? AND from_userId = ?',
      [false, subscriptionId, userId]
    );
    return result.affectedRows > 0;
  } catch (error) {
    console.error('取消订阅失败:', error);
    return false;
  }
};

// 获取用户捐赠记录
export const getUserDonations = async (userId: string): Promise<Donation[]> => {
  try {
    return await query(
      'SELECT * FROM donations WHERE from_userId = ? ORDER BY createdAt DESC',
      [userId]
    );
  } catch (error) {
    console.error('获取用户捐赠记录失败:', error);
    return [];
  }
};

// 获取用户订阅记录
export const getUserSubscriptions = async (userId: string): Promise<Subscription[]> => {
  try {
    return await query(
      'SELECT * FROM subscriptions WHERE from_userId = ? ORDER BY createdAt DESC',
      [userId]
    );
  } catch (error) {
    console.error('获取用户订阅记录失败:', error);
    return [];
  }
};

// 获取用户收到的捐赠
export const getUserReceivedDonations = async (userId: string): Promise<Donation[]> => {
  try {
    return await query(
      'SELECT * FROM donations WHERE to_userId = ? ORDER BY createdAt DESC',
      [userId]
    );
  } catch (error) {
    console.error('获取用户收到的捐赠失败:', error);
    return [];
  }
};

// 获取用户创建的提案
export const getUserCreatedProposals = async (userId: string): Promise<{[proposalId: string]: {title: string, status: string, projectId: string}}> => {
  try {
    const proposals = await query(
      'SELECT id, title, status, projectId FROM proposals WHERE createdBy = ?',
      [userId]
    );
    
    const result: {[proposalId: string]: {title: string, status: string, projectId: string}} = {};
    proposals.forEach((proposal: any) => {
      result[proposal.id] = {
        title: proposal.title,
        status: proposal.status,
        projectId: proposal.projectId
      };
    });
  
    return result;
  } catch (error) {
    console.error('获取用户创建的提案失败:', error);
    return {};
  }
};

// 获取用户悬赏
export const getUserBounties = async (userId: string): Promise<{[bountyId: string]: {
  proposalId: string,
  projectId: string,
  amount: number,
  status: 'active' | 'pending' | 'closed',
  createdAt: string,
  proposalTitle: string
}}> => {
  try {
    const bounties = await query(
      `SELECT b.id, b.proposalId, p.projectId, b.amount, b.status, b.createdAt, p.title
       FROM bounties b
       JOIN proposals p ON b.proposalId = p.id
       WHERE b.userId = ?`,
      [userId]
    );
    
    const result: {[bountyId: string]: {
      proposalId: string,
      projectId: string,
      amount: number,
      status: 'active' | 'pending' | 'closed',
      createdAt: string,
      proposalTitle: string
    }} = {};
    
    bounties.forEach((bounty: any) => {
      result[bounty.id] = {
        proposalId: bounty.proposalId,
        projectId: bounty.projectId,
        amount: bounty.amount,
        status: bounty.status,
        createdAt: bounty.createdAt,
        proposalTitle: bounty.title
      };
    });
    
    return result;
  } catch (error) {
    console.error('获取用户悬赏失败:', error);
    return {};
  }
};

// 更新用户悬赏状态
export const updateUserBountyStatus = async (
  userId: string,
  bountyId: string,
  status: 'active' | 'pending' | 'closed'
): Promise<boolean> => {
  try {
    const result = await query(
      'UPDATE bounties SET status = ? WHERE id = ? AND userId = ?',
      [status, bountyId, userId]
    );
    return result.affectedRows > 0;
  } catch (error) {
    console.error('更新悬赏状态失败:', error);
    return false;
  }
};

// 添加获取用户关注项目更新的函数
export const getProjectUpdates = async (userId: string): Promise<{ projectId: string, updates: any[] }[]> => {
  try {
    // 获取用户关注的项目ID列表
    const favoriteProjectIds = await getFavoriteProjects(userId);
    
    // 获取项目更新
    const updates: { projectId: string, updates: any[] }[] = [];
    
    for (const projectId of favoriteProjectIds) {
      // 获取项目更新
      const projectUpdates = await query(
        'SELECT * FROM project_updates WHERE projectId = ? ORDER BY createdAt DESC LIMIT 10',
        [projectId]
      );
      
      if (projectUpdates.length > 0) {
        updates.push({
          projectId,
          updates: projectUpdates
        });
      }
    }
    
    return updates;
  } catch (error) {
    console.error('获取项目更新失败:', error);
    return [];
  }
};

// 添加用户创建的提案
export const addUserCreatedProposal = async (
  userId: string, 
  proposalId: string, 
  title: string, 
  status: string, 
  projectId: string
): Promise<boolean> => {
  try {
    // 检查用户是否存在
    const user = await findUserById(userId);
    if (!user) {
      return false;
    }
    
    // 在数据库中已经有proposals表，这个函数实际上不需要额外存储
    // 因为我们可以通过查询proposals表获取用户创建的提案
    return true;
  } catch (error) {
    console.error('添加用户创建的提案失败:', error);
    return false;
  }
};

// 更新用户创建的提案状态
export const updateUserCreatedProposalStatus = async (
  userId: string, 
  proposalId: string, 
  status: string
): Promise<boolean> => {
  try {
    // 更新提案状态
    const result = await query(
      'UPDATE proposals SET status = ? WHERE id = ? AND createdBy = ?',
      [status, proposalId, userId]
    );
    return result.affectedRows > 0;
  } catch (error) {
    console.error('更新用户创建的提案状态失败:', error);
    return false;
  }
};

// 添加用户创建的悬赏
export const addUserBounty = async (
  userId: string,
  bountyId: string,
  proposalId: string,
  projectId: string,
  amount: number,
  proposalTitle: string
): Promise<boolean> => {
  try {
    // 检查用户是否存在
    const user = await findUserById(userId);
    if (!user) {
      return false;
    }
    
    // 在数据库中已经有bounties表，这个函数实际上不需要额外存储
    // 因为我们可以通过查询bounties表获取用户创建的悬赏
    return true;
  } catch (error) {
    console.error('添加用户创建的悬赏失败:', error);
    return false;
  }
};

// 更新用户创建的提案标题
export const updateUserCreatedProposalTitle = async (
  userId: string, 
  proposalId: string, 
  title: string
): Promise<boolean> => {
  try {
    // 更新提案标题
    const result = await query(
      'UPDATE proposals SET title = ? WHERE id = ? AND createdBy = ?',
      [title, proposalId, userId]
    );
    return result.affectedRows > 0;
  } catch (error) {
    console.error('更新用户创建的提案标题失败:', error);
    return false;
  }
}; 