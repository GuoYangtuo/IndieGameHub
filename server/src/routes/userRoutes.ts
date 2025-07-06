import express from 'express';
import { register, login, getCurrentUser, getBatchUsers, searchUsers, updateCoins, deleteUser, updateUserBio, uploadAvatar, getUserById, addFavoriteProjectController, removeFavoriteProjectController, getFavoriteProjectsController, getFavoriteProjectsUpdatesController, verifyEmail, resendVerificationCode, donate, subscribe, unsubscribe, getUserDonationsController, getUserReceivedDonationsController, getCreatedProposalsController, getUserBountiesController, adminGetAllUsers, adminGetAllProjects, adminUpdateUserCoins, adminDeleteProject, getUserActivities, getUserContributedProjects, getUserPublicProjects, adminCreateUser } from '../controllers/userController';
import { verifyToken } from '../middleware/authMiddleware';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import * as userModel from '../models/userModel';

// 确保上传目录存在
const avatarUploadDir = path.join(__dirname, '../../uploads/avatars');
if (!fs.existsSync(avatarUploadDir)) {
  fs.mkdirSync(avatarUploadDir, { recursive: true });
}

// 配置存储
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, avatarUploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

const upload = multer({ storage: storage });

export const userRouter = express.Router();

// 注册
userRouter.post('/register', register);

// 登录
userRouter.post('/login', login);

// 验证邮箱验证码
userRouter.post('/verify-email', verifyEmail);

// 重新发送验证码
userRouter.post('/resend-verification-code', resendVerificationCode);

// 获取当前用户信息
userRouter.get('/me', verifyToken, getCurrentUser);

// 批量获取用户信息
userRouter.post('/batch', getBatchUsers);

// 搜索用户
userRouter.get('/search', searchUsers);

// 更新用户金币
userRouter.post('/coins', verifyToken, updateCoins);

// 删除用户
userRouter.delete('/account', verifyToken, deleteUser);

// 更新用户简介
userRouter.put('/me/bio', verifyToken, updateUserBio);

// 更新用户头像
userRouter.post('/me/avatar', verifyToken, upload.single('avatar'), uploadAvatar);

// 关注项目
userRouter.post('/favorites/:projectId', verifyToken, addFavoriteProjectController);

// 取消关注项目
userRouter.delete('/favorites/:projectId', verifyToken, removeFavoriteProjectController);

// 获取关注的项目
userRouter.get('/favorites', verifyToken, getFavoriteProjectsController);

// 获取关注的项目的更新
userRouter.get('/favorites/updates', verifyToken, getFavoriteProjectsUpdatesController);

// 获取用户创建的提案
userRouter.get('/created-proposals', verifyToken, getCreatedProposalsController);

// 捐赠相关
userRouter.post('/donate', verifyToken, donate);
userRouter.post('/subscribe', verifyToken, subscribe);
userRouter.delete('/subscriptions/:subscriptionId', verifyToken, unsubscribe);
userRouter.get('/donations', verifyToken, getUserDonationsController);
userRouter.get('/received-donations', verifyToken, getUserReceivedDonationsController); 

// 获取用户创建的悬赏
userRouter.get('/bounties', verifyToken, getUserBountiesController);

// 获取指定ID的用户信息 - 放在最后，避免与其他路由冲突
userRouter.get('/:id', getUserById);

// 管理员API
userRouter.get('/admin/users', verifyToken, adminGetAllUsers);
userRouter.get('/admin/projects', verifyToken, adminGetAllProjects);
userRouter.post('/admin/users/coins', verifyToken, adminUpdateUserCoins);
userRouter.delete('/admin/projects/:projectId', verifyToken, adminDeleteProject);
userRouter.post('/admin/users/create', verifyToken, adminCreateUser);

// 用户活动和贡献
userRouter.get('/:id/activities', getUserActivities);
userRouter.get('/:id/contributed-projects', getUserContributedProjects);
userRouter.get('/:id/public-projects', getUserPublicProjects);