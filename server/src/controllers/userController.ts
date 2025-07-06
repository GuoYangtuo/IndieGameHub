// 在文件顶部添加全局类型声明
declare global {
  var tempUsers: Record<string, {
    username: string;
    email: string;
    password: string;
    verificationCode: string;
    expiryTime: Date;
  }>;
}

import { Request, Response } from 'express';
import {
  registerUser,
  loginUser,
  findUserById,
  getAllUsers,
  updateUserCoins,
  deleteUserById,
  updateUserBio as updateBio,
  updateUserAvatar as updateAvatar,
  searchUsersByUsername,
  addFavoriteProject,
  removeFavoriteProject,
  getFavoriteProjects,
  getProjectUpdates,
  findUserByEmail,
  findUserByUsername,
  donateToProject,
  createSubscription,
  cancelSubscription,
  getUserDonations,
  getUserSubscriptions,
  getUserReceivedDonations,
  getUserCreatedProposals,
  getUserBounties
} from '../models/userModel';
import { findProjectById } from '../models/projectModel';
import { generateToken } from '../middleware/authMiddleware';
import path from 'path';
import fs from 'fs';
import { generateVerificationCode, sendVerificationCode } from '../utils/emailService';
import { query } from '../utils/dbTools';
import bcrypt from 'bcryptjs';

// 初始化全局变量
global.tempUsers = global.tempUsers || {};

// 定期清理过期的临时用户数据
setInterval(() => {
  const now = new Date();
  const tempUsers = global.tempUsers;
  
  Object.keys(tempUsers).forEach(email => {
    if (tempUsers[email].expiryTime < now) {
      delete tempUsers[email];
    }
  });
}, 60 * 60 * 1000); // 每小时执行一次

// 注册用户
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, email, password } = req.body;

    // 验证请求数据
    if (!username || !email || !password) {
      res.status(400).json({ message: '用户名、邮箱和密码是必填项' });
      return;
    }
    
    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ message: '邮箱格式不正确' });
      return;
    }
    
    // 检查用户名是否已存在
    const existingUsername = await findUserByUsername(username);
    if (existingUsername) {
      res.status(400).json({ message: '用户名已存在' });
      return;
    }
    
    // 检查邮箱是否已存在
    const existingEmail = await findUserByEmail(email);
    if (existingEmail) {
      res.status(400).json({ message: '邮箱已被注册' });
      return;
    }

    // 生成验证码
    const verificationCode = generateVerificationCode();
    
    // 创建临时用户数据，但不保存到数据库
    const tempUser = {
      username,
      email,
      password,
      verificationCode,
      expiryTime: new Date(Date.now() + 10 * 60 * 1000) // 10分钟过期
    };
    
    // 发送验证码邮件
    const emailSent = await sendVerificationCode(email, username, verificationCode);
    
    if (!emailSent) {
      res.status(500).json({ message: '发送验证码邮件失败，请稍后再试' });
      return;
    }

    // 将临时用户数据存储在会话中
    // 这里简化处理，将临时用户数据存储在内存中
    global.tempUsers[email] = tempUser;

    // 返回成功信息，但不返回token（因为用户尚未完成注册）
    res.status(200).json({
      message: '验证码已发送，请查收邮件完成注册',
      email: email,
      username: username
    });
  } catch (error) {
    console.error('注册用户失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 验证邮箱验证码
export const verifyEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, code } = req.body;
    
    if (!email || !code) {
      res.status(400).json({ message: '邮箱和验证码不能为空' });
      return;
    }
    
    // 检查临时用户数据
    const tempUsers = global.tempUsers || {};
    const tempUser = tempUsers[email];
    
    if (!tempUser) {
      res.status(400).json({ message: '验证码已过期或邮箱不正确，请重新注册' });
      return;
    }
    
    // 验证码过期检查
    const now = new Date();
    if (tempUser.expiryTime < now) {
      delete tempUsers[email];
      res.status(400).json({ message: '验证码已过期，请重新注册' });
      return;
    }
    
    // 验证码错误
    if (tempUser.verificationCode !== code) {
      res.status(400).json({ message: '验证码错误，请重新输入' });
      return;
    }
    
    // 验证通过，正式注册用户
    const user = await registerUser({
      username: tempUser.username,
      email: tempUser.email,
      password: tempUser.password
    });
    
    if (!user) {
      res.status(400).json({ message: '注册失败，请重新注册' });
      return;
    }
    
    // 清理临时用户数据
    delete tempUsers[email];
    
    // 生成令牌
    const token = generateToken(user.id);
    
    // 返回用户信息和令牌
    res.status(200).json({
      id: user.id,
      username: user.username,
      email: user.email,
      coins: user.coins,
      token
    });
  } catch (error) {
    console.error('验证邮箱失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 重新发送验证码
export const resendVerificationCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    
    if (!email) {
      res.status(400).json({ message: '邮箱不能为空' });
      return;
    }
    
    // 检查临时用户数据
    const tempUsers = global.tempUsers || {};
    const tempUser = tempUsers[email];
    
    if (!tempUser) {
      res.status(404).json({ message: '未找到相关注册信息，请重新注册' });
      return;
    }
    
    // 生成新的验证码
    const verificationCode = generateVerificationCode();
    
    // 更新临时用户数据
    tempUser.verificationCode = verificationCode;
    tempUser.expiryTime = new Date(Date.now() + 10 * 60 * 1000); // 10分钟过期
    
    // 发送验证码邮件
    const emailSent = await sendVerificationCode(tempUser.email, tempUser.username, verificationCode);
    
    if (!emailSent) {
      res.status(500).json({ message: '发送验证码邮件失败，请稍后再试' });
      return;
    }
    
    res.status(200).json({ message: '验证码已发送，请查收' });
  } catch (error) {
    console.error('重新发送验证码失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 用户登录
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { usernameOrEmail, password } = req.body;

    // 验证请求数据
    if (!usernameOrEmail || !password) {
      res.status(400).json({ message: '用户名/邮箱和密码是必填项' });
      return;
    }

    // 登录用户
    const user = await loginUser({ usernameOrEmail, password });

    if (!user) {
      res.status(401).json({ message: '用户名/邮箱或密码不正确' });
      return;
    }

    // 生成令牌
    const token = generateToken(user.id);

    // 返回用户信息和令牌
    res.status(200).json({
      id: user.id,
      username: user.username,
      email: user.email,
      coins: user.coins,
      token
    });
  } catch (error) {
    console.error('用户登录失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 获取当前登录用户信息
export const getCurrentUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: '未授权' });
      return;
    }

    // 获取用户信息
    const user = await findUserById(userId);

    if (!user) {
      res.status(404).json({ message: '用户不存在' });
      return;
    }

    // 获取用户收藏的项目
    const favoriteProjects = await getFavoriteProjects(userId);

    // 返回用户信息
    res.status(200).json({
      id: user.id,
      username: user.username,
      email: user.email,
      coins: user.coins,
      bio: user.bio || '',
      avatarUrl: user.avatarUrl || '',
      favoriteProjects
    });
  } catch (error) {
    console.error('获取当前用户信息失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 更新用户金币
export const updateCoins = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { amount } = req.body;

    if (!userId) {
      res.status(401).json({ message: '未授权' });
      return;
    }

    // 验证金币数量
    if (!amount || isNaN(Number(amount))) {
      res.status(400).json({ message: '无效的金币数量' });
      return;
    }

    // 更新用户金币
    const user = await updateUserCoins(userId, Number(amount));

    if (!user) {
      res.status(404).json({ message: '用户不存在' });
      return;
    }

    // 返回更新后的用户信息
    res.status(200).json({
      id: user.id,
      username: user.username,
      coins: user.coins
    });
  } catch (error) {
    console.error('更新用户金币失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 批量获取用户信息
export const getBatchUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ids } = req.body; // 修正参数名称为ids，与前端一致
    
    // 如果ids不存在或不是数组，返回空数组而不是错误
    if (!ids || !Array.isArray(ids)) {
      res.status(200).json([]);
      return;
    }
    
    // 获取所有用户
    const allUsers = await getAllUsers();
    
    // 如果是空数组，直接返回所有结果
    if (ids.length === 0) {
      res.status(200).json(allUsers);
      return;
    }

    // 过滤出请求的用户
    const users = allUsers.filter(user => ids.includes(user.id));
    
    // 返回用户信息（不包括密码等敏感信息）
    const safeUsers = users.map(user => ({
      id: user.id,
      username: user.username,
      avatarUrl: user.avatarUrl || ''
    }));
    
    res.status(200).json(safeUsers);
  } catch (error) {
    console.error('批量获取用户信息失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 搜索用户
export const searchUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { query } = req.query;
    
    if (!query || typeof query !== 'string') {
      res.status(400).json({ message: '无效的搜索查询' });
      return;
    }
    
    // 搜索用户
    const users = await searchUsersByUsername(query);
    
    // 返回用户信息（不包括密码等敏感信息）
    const safeUsers = users.map(user => ({
      id: user.id,
      username: user.username,
      avatarUrl: user.avatarUrl || ''
    }));
    
    res.status(200).json(safeUsers);
  } catch (error) {
    console.error('搜索用户失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 更新用户简介
export const updateUserBio = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { bio } = req.body;

    if (!userId) {
      res.status(401).json({ message: '未授权' });
      return;
    }

    // 验证简介
    if (bio === undefined || bio === null) {
      res.status(400).json({ message: '简介不能为空' });
      return;
    }

    // 更新用户简介
    const user = await updateBio(userId, bio);

    if (!user) {
      res.status(404).json({ message: '用户不存在' });
      return;
    }

    // 返回更新后的用户信息
    res.status(200).json({
      id: user.id,
      bio: user.bio || ''
    });
  } catch (error) {
    console.error('更新用户简介失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 上传头像
export const uploadAvatar = async (req: Request & { file?: Express.Multer.File }, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const file = req.file;

    if (!userId) {
      res.status(401).json({ message: '未授权' });
      return;
    }

    if (!file) {
      res.status(400).json({ message: '请选择要上传的头像' });
      return;
    }

    // 创建头像URL
    const avatarUrl = `/uploads/avatars/${file.filename}`;
    
    // 更新用户头像
    const user = await updateAvatar(userId, avatarUrl);

    if (!user) {
      // 如果更新失败，删除上传的文件
      const filePath = path.join(__dirname, '../../uploads/avatars/', file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      res.status(404).json({ message: '用户不存在' });
      return;
    }

    // 返回头像URL
    res.status(200).json({
      avatarUrl
    });
  } catch (error) {
    console.error('上传头像失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 获取指定用户信息
export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    if (!id) {
      res.status(400).json({ message: '用户ID不能为空' });
      return;
    }
    
    // 获取用户信息
    const user = await findUserById(id);
    
    if (!user) {
      res.status(404).json({ message: '用户不存在' });
      return;
    }
    
    // 返回用户信息（不包括密码等敏感信息）
    res.status(200).json({
      id: user.id,
      username: user.username,
      bio: user.bio || '',
      avatarUrl: user.avatarUrl || ''
    });
  } catch (error) {
    console.error('获取用户信息失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 删除用户
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: '未授权' });
      return;
    }
    
    // 删除用户
    const success = await deleteUserById(userId);
    
    if (!success) {
      res.status(404).json({ message: '用户不存在或删除失败' });
      return;
    }
    
    res.status(200).json({ message: '用户已删除' });
  } catch (error) {
    console.error('删除用户失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 添加收藏项目
export const addFavoriteProjectController = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { projectId } = req.params;
    
    if (!userId) {
      res.status(401).json({ message: '未授权' });
      return;
    }
    
    if (!projectId) {
      res.status(400).json({ message: '项目ID不能为空' });
      return;
    }
    
    // 检查项目是否存在
    const project = await findProjectById(projectId);
    if (!project) {
      res.status(404).json({ message: '项目不存在' });
      return;
    }
    
    // 添加项目到收藏列表
    const success = await addFavoriteProject(userId, projectId);
    
    if (!success) {
      res.status(404).json({ message: '用户不存在或添加收藏失败' });
      return;
    }
    
    // 获取更新后的收藏项目列表
    const favoriteProjects = await getFavoriteProjects(userId);

    res.status(200).json({
      message: '添加收藏成功',
      favoriteProjects
    });
  } catch (error) {
    console.error('添加收藏项目失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 移除收藏项目
export const removeFavoriteProjectController = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { projectId } = req.params;
    
    if (!userId) {
      res.status(401).json({ message: '未授权' });
      return;
    }
    
    if (!projectId) {
      res.status(400).json({ message: '项目ID不能为空' });
      return;
    }
    
    // 从收藏列表中移除项目
    const success = await removeFavoriteProject(userId, projectId);
    
    if (!success) {
      res.status(404).json({ message: '用户不存在、项目不在收藏列表中或移除失败' });
      return;
    }
    
    // 获取更新后的收藏项目列表
    const favoriteProjects = await getFavoriteProjects(userId);

    res.status(200).json({
      message: '取消收藏成功',
      favoriteProjects
    });
  } catch (error) {
    console.error('移除收藏项目失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 获取收藏项目列表
export const getFavoriteProjectsController = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({ message: '未授权' });
      return;
    }
    
    // 获取用户收藏的项目ID列表
    const favoriteProjects = await getFavoriteProjects(userId);
    
    res.status(200).json(favoriteProjects);
  } catch (error) {
    console.error('获取收藏项目列表失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 获取收藏项目更新
export const getFavoriteProjectsUpdatesController = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({ message: '未授权' });
      return;
    }
    
    // 获取收藏项目的更新
    const updates = await getProjectUpdates(userId);
    
    res.status(200).json(updates);
  } catch (error) {
    console.error('获取收藏项目更新失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 捐赠到项目
export const donate = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { projectId, amount, message } = req.body;

    if (!userId) {
      res.status(401).json({ message: '未授权' });
      return;
    }
    
    if (!projectId || !amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      res.status(400).json({ message: '项目ID和金额（大于0）是必填项' });
      return;
    }
    
    // 捐赠到项目
    const donation = await donateToProject(userId, projectId, Number(amount), message);
    
    if (!donation) {
      res.status(400).json({ message: '捐赠失败，可能是金币不足或项目不存在' });
      return;
    }
    
    res.status(200).json({
      message: '捐赠成功',
      donation
    });
  } catch (error) {
    console.error('捐赠失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 订阅项目
export const subscribe = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { projectId, amount, message } = req.body;

    if (!userId) {
      res.status(401).json({ message: '未授权' });
      return;
    }
    
    if (!projectId || !amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      res.status(400).json({ message: '项目ID和金额（大于0）是必填项' });
      return;
    }
    
    // 创建订阅
    const subscription = await createSubscription(userId, projectId, Number(amount), message);
    
    if (!subscription) {
      res.status(400).json({ message: '订阅失败，可能是金币不足或项目不存在' });
      return;
    }
    
    res.status(200).json({
      message: '订阅成功',
      subscription
    });
  } catch (error) {
    console.error('订阅失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 取消订阅
export const unsubscribe = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { subscriptionId } = req.params;

    if (!userId) {
      res.status(401).json({ message: '未授权' });
      return;
    }
    
    if (!subscriptionId) {
      res.status(400).json({ message: '订阅ID不能为空' });
      return;
    }
    
    // 取消订阅
    const success = await cancelSubscription(userId, subscriptionId);
    
    if (!success) {
      res.status(400).json({ message: '取消订阅失败，可能是订阅不存在或不属于该用户' });
      return;
    }
    
    res.status(200).json({
      message: '订阅已取消'
    });
  } catch (error) {
    console.error('取消订阅失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 获取用户捐赠记录
export const getUserDonationsController = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: '未授权' });
      return;
    }
    
    // 获取用户的捐赠记录
    const donations = await getUserDonations(userId);
    const subscriptions = await getUserSubscriptions(userId);
    
    res.status(200).json({
      donations,
      subscriptions
    });
  } catch (error) {
    console.error('获取用户捐赠记录失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 获取用户收到的捐赠记录
export const getUserReceivedDonationsController = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: '未授权' });
      return;
    }
    
    // 获取用户收到的捐赠记录
    const donations = await getUserReceivedDonations(userId);
    
    res.status(200).json(donations);
  } catch (error) {
    console.error('获取用户收到的捐赠记录失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 获取用户创建的提案
export const getCreatedProposalsController = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({ message: '未授权' });
      return;
    }
    
    // 获取用户创建的提案
    const createdProposals = await getUserCreatedProposals(userId);
    
    res.json(createdProposals);
  } catch (error) {
    console.error('获取用户创建的提案失败:', error);
    res.status(500).json({ message: '获取用户创建的提案失败' });
  }
};

// 获取用户创建的悬赏
export const getUserBountiesController = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({ message: '未授权' });
      return;
    }
    
    // 获取用户创建的悬赏
    const userBounties = await getUserBounties(userId);
    
    res.json(userBounties);
  } catch (error) {
    console.error('获取用户创建的悬赏失败:', error);
    res.status(500).json({ message: '获取用户创建的悬赏失败' });
  }
};

/**
 * 获取用户活动记录
 */
export const getUserActivities = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // 获取用户评论活动
    const commentsQuery = `
      SELECT 
        c.id, 
        c.content, 
        c.createdAt, 
        'comment' as type,
        p.name as projectName,
        p.slug as projectSlug
      FROM comments c
      JOIN projects p ON c.projectId = p.id
      WHERE c.userId = ?
      ORDER BY c.createdAt DESC
      LIMIT 10
    `;
    
    // 获取用户提案活动
    const proposalsQuery = `
      SELECT 
        pr.id, 
        pr.title as content, 
        pr.createdAt, 
        'proposal' as type,
        p.name as projectName,
        p.slug as projectSlug
      FROM proposals pr
      JOIN projects p ON pr.projectId = p.id
      WHERE pr.createdBy = ?
      ORDER BY pr.createdAt DESC
      LIMIT 10
    `;
    
    // 获取用户捐赠活动
    const donationsQuery = `
      SELECT 
        d.id, 
        d.amount, 
        d.createdAt, 
        'donation' as type,
        p.name as projectName,
        p.slug as projectSlug
      FROM donations d
      JOIN projects p ON d.projectId = p.id
      WHERE d.userId = ?
      ORDER BY d.createdAt DESC
      LIMIT 10
    `;
    
    const comments = await query(commentsQuery, [id]);
    const proposals = await query(proposalsQuery, [id]);
    const donations = await query(donationsQuery, [id]);
    
    // 合并所有活动并按时间排序
    const allActivities = [
      ...comments.map((c: any) => ({
        id: c.id,
        date: c.createdAt,
        type: c.type,
        content: c.content,
        projectName: c.projectName,
        projectSlug: c.projectSlug
      })),
      ...proposals.map((p: any) => ({
        id: p.id,
        date: p.createdAt,
        type: p.type,
        content: p.content,
        projectName: p.projectName,
        projectSlug: p.projectSlug
      })),
      ...donations.map((d: any) => ({
        id: d.id,
        date: d.createdAt,
        type: d.type,
        amount: d.amount,
        projectName: d.projectName,
        projectSlug: d.projectSlug
      }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    res.status(200).json(allActivities.slice(0, 20)); // 限制返回最近20条活动
  } catch (error) {
    console.error('获取用户活动失败:', error);
    res.status(500).json({ message: '获取用户活动记录失败' });
  }
};

/**
 * 获取用户贡献的项目列表
 */
export const getUserContributedProjects = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // 查询用户有贡献度的项目
    const contributionQuery = `
      SELECT 
        p.id, 
        p.name, 
        p.slug, 
        SUM(c.contribution_value) as contribution
      FROM contributions c
      JOIN projects p ON c.projectId = p.id
      WHERE c.userId = ?
      GROUP BY p.id, p.name, p.slug
      HAVING SUM(c.contribution_value) > 0
      ORDER BY contribution DESC
    `;
    
    const results = await query(contributionQuery, [id]);
    
    res.status(200).json(results);
  } catch (error) {
    console.error('获取用户贡献项目失败:', error);
    res.status(500).json({ message: '获取用户贡献项目失败' });
  }
};

/**
 * 获取用户公开项目
 */
export const getUserPublicProjects = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // 查询用户的公开项目（这里简单实现为所有该用户创建的项目）
    const projectQuery = `
      SELECT 
        id, 
        name, 
        slug, 
        description, 
        createdAt
      FROM projects
      WHERE createdBy = ?
      ORDER BY createdAt DESC
    `;
    
    const results = await query(projectQuery, [id]);
    
    res.status(200).json(results);
  } catch (error) {
    console.error('获取用户公开项目失败:', error);
    res.status(500).json({ message: '获取用户公开项目失败' });
  }
};

/**
 * 管理员API - 获取所有用户（分页）
 */
export const adminGetAllUsers = async (req: Request, res: Response) => {
  try {
    // 验证用户是否为管理员
    const authUser = req.user;
    if (!authUser || authUser.username !== 'admin') {
      return res.status(403).json({ message: '无权限执行此操作' });
    }

    // 获取查询参数
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    
    // 获取用户总数
    const totalCountQuery = `SELECT COUNT(*) as total FROM users`;
    const totalResults = await query(totalCountQuery);
    const total = totalResults[0].total;
    
    // 获取分页用户列表 - 直接在SQL中插入数值而不是使用参数
    const usersQuery = `
      SELECT 
        id, 
        username, 
        email, 
        coins, 
        createdAt, 
        bio, 
        avatar_url as avatarUrl
      FROM users
      ORDER BY createdAt DESC
      LIMIT ${parseInt(limit.toString())} OFFSET ${parseInt(offset.toString())}
    `;
    
    // 不使用参数化查询处理LIMIT和OFFSET
    const users = await query(usersQuery);
    
    res.status(200).json({
      users,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('获取所有用户失败:', error);
    res.status(500).json({ message: '获取用户列表失败' });
  }
};

/**
 * 管理员API - 获取所有项目（分页）
 */
export const adminGetAllProjects = async (req: Request, res: Response) => {
  try {
    // 验证用户是否为管理员
    const authUser = req.user;
    if (!authUser || authUser.username !== 'admin') {
      return res.status(403).json({ message: '无权限执行此操作' });
    }

    // 获取查询参数
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    
    // 获取项目总数
    const totalCountQuery = `SELECT COUNT(*) as total FROM projects`;
    const totalResults = await query(totalCountQuery);
    const total = totalResults[0].total;
    
    // 获取分页项目列表 - 直接在SQL中插入数值而不是使用参数
    const projectsQuery = `
      SELECT 
        p.id, 
        p.name, 
        p.slug, 
        p.description,
        p.demoLink, 
        p.createdAt,
        p.coverImage,
        p.projectBalance,
        u.username as creatorName
      FROM projects p
      JOIN users u ON p.createdBy = u.id
      ORDER BY p.createdAt DESC
      LIMIT ${parseInt(limit.toString())} OFFSET ${parseInt(offset.toString())}
    `;
    
    // 不使用参数化查询处理LIMIT和OFFSET
    const projects = await query(projectsQuery);
    
    res.status(200).json({
      projects,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('获取所有项目失败:', error);
    res.status(500).json({ message: '获取项目列表失败' });
  }
};

/**
 * 管理员API - 修改用户金币
 */
export const adminUpdateUserCoins = async (req: Request, res: Response) => {
  try {
    // 验证用户是否为管理员
    const authUser = req.user;
    if (!authUser || authUser.username !== 'admin') {
      return res.status(403).json({ message: '无权限执行此操作' });
    }

    const { userId, coins, reason } = req.body;
    
    // 验证请求体
    if (!userId || isNaN(coins)) {
      return res.status(400).json({ message: '缺少必要参数' });
    }
    
    // 更新用户金币
    const updateQuery = `
      UPDATE users
      SET coins = coins + ?
      WHERE id = ?
    `;
    
    await query(updateQuery, [coins, userId]);
    
    // 获取更新后的用户信息
    const userQuery = `
      SELECT id, username, email, coins
      FROM users
      WHERE id = ?
    `;
    
    const updatedUser = await query(userQuery, [userId]);
    
    if (updatedUser.length === 0) {
      return res.status(404).json({ message: '用户不存在' });
    }
    
    // 记录操作日志（可以在这里添加日志记录逻辑）
    console.log(`管理员 ${authUser.username} 修改用户 ${updatedUser[0].username} 的金币: ${coins} 枚，原因: ${reason || '无'}`);
    
    res.status(200).json({
      message: '金币更新成功',
      user: updatedUser[0]
    });
  } catch (error) {
    console.error('管理员修改用户金币失败:', error);
    res.status(500).json({ message: '修改用户金币失败' });
  }
};

/**
 * 管理员API - 删除项目
 */
export const adminDeleteProject = async (req: Request, res: Response) => {
  try {
    // 验证用户是否为管理员
    const authUser = req.user;
    if (!authUser || authUser.username !== 'admin') {
      return res.status(403).json({ message: '无权限执行此操作' });
    }

    const { projectId } = req.params;
    
    // 验证项目是否存在
    const projectQuery = `
      SELECT id, name
      FROM projects
      WHERE id = ?
    `;
    
    const project = await query(projectQuery, [projectId]);
    
    if (project.length === 0) {
      return res.status(404).json({ message: '项目不存在' });
    }
    
    // 删除项目
    const deleteQuery = `
      DELETE FROM projects
      WHERE id = ?
    `;
    
    await query(deleteQuery, [projectId]);
    
    // 记录操作日志（可以在这里添加日志记录逻辑）
    console.log(`管理员 ${authUser.username} 删除了项目 ${project[0].name}(${projectId})`);
    
    res.status(200).json({ message: '项目删除成功' });
  } catch (error) {
    console.error('管理员删除项目失败:', error);
    res.status(500).json({ message: '删除项目失败' });
  }
};

/**
 * 管理员API - 直接创建用户（无需邮箱验证）
 */
export const adminCreateUser = async (req: Request, res: Response) => {
  try {
    // 验证用户是否为管理员
    const authUser = req.user;
    if (!authUser || authUser.username !== 'admin') {
      return res.status(403).json({ message: '无权限执行此操作' });
    }

    const { username, email, password, coins = 0 } = req.body;
    
    // 验证请求体
    if (!username || !email || !password) {
      return res.status(400).json({ message: '用户名、邮箱和密码不能为空' });
    }
    
    // 检查用户名是否已存在
    const existingUsername = await findUserByUsername(username);
    if (existingUsername) {
      return res.status(400).json({ message: '用户名已存在' });
    }
    
    // 检查邮箱是否已存在
    const existingEmail = await findUserByEmail(email);
    if (existingEmail) {
      return res.status(400).json({ message: '邮箱已被注册' });
    }
    
    // 创建用户 - 直接注册，无需验证邮箱
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // 生成用户ID
    const id = Date.now().toString() + Math.floor(Math.random() * 1000).toString();
    
    // 创建用户
    const now = new Date();
    const createdAt = now.toISOString().slice(0, 19).replace('T', ' ');
    
    // 插入用户记录 - 不使用email_verified字段
    await query(
      `INSERT INTO users 
       (id, username, email, password, coins, createdAt) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, username, email, hashedPassword, coins, createdAt]
    );
    
    // 返回成功信息
    res.status(201).json({
      message: '用户创建成功',
      user: {
        id,
        username,
        email,
        coins
      }
    });
  } catch (error) {
    console.error('管理员创建用户失败:', error);
    res.status(500).json({ message: '创建用户失败' });
  }
}; 