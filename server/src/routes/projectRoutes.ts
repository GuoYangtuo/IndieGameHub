import express from 'express';
import {
  getProjects,
  getUserProjects,
  getProjectById,
  getProjectBySlug,
  createNewProject,
  addUpdate,
  addMember,
  removeMember,
  removeProject,
  updateProjectInfo,
  addMemberByUsername,
  addUpdateWithImage,
  upload,
  addProjectDisplayImage,
  deleteProjectDisplayImage,
  updateProjectImagesOrder,
  withdrawFromProjectAccount,
  getProjectWithdrawalRecords,
  getUserProjectContribution,
  updateProjectContributionRates,
  addProjectContribution,
  getProjectDetailComplete,
  getProjectContributors,
  checkProjectName
} from '../controllers/projectController';
import { verifyToken } from '../middleware/authMiddleware';
import { createNewProjectComment } from '../controllers/commentController';

const projectRouter = express.Router();

// 获取所有项目
projectRouter.get('/', getProjects);

// 获取用户的项目
projectRouter.get('/user', verifyToken, getUserProjects);

// 通过ID获取项目
projectRouter.get('/id/:id', getProjectById);

// 通过Slug获取项目
projectRouter.get('/slug/:slug', getProjectBySlug);

// 检查项目名称是否存在
projectRouter.get('/check-name', checkProjectName);

// 获取项目详情页完整数据
projectRouter.get('/detail/:slug', getProjectDetailComplete);

// 创建项目
projectRouter.post('/', verifyToken, createNewProject);

// 创建带封面图片的项目
projectRouter.post('/with-cover', verifyToken, upload.single('coverImage'), createNewProject);

// 更新项目信息
projectRouter.put('/:projectId', verifyToken, updateProjectInfo);

// 添加项目更新
projectRouter.post('/:projectId/updates', verifyToken, addUpdate);

// 添加带图片的项目更新
projectRouter.post('/:projectId/updates/image', verifyToken, upload.single('image'), addUpdateWithImage);

// 添加项目成员
projectRouter.post('/:projectId/members', verifyToken, addMember);

// 通过用户名添加项目成员
projectRouter.post('/:projectId/members/username', verifyToken, addMemberByUsername);

// 移除项目成员
projectRouter.delete('/:projectId/members/:memberId', verifyToken, removeMember);

// 删除项目
projectRouter.delete('/:projectId', verifyToken, removeProject);

// 创建项目评论
projectRouter.post('/:projectId/comments', verifyToken, createNewProjectComment);

// 添加项目展示图片
projectRouter.post('/:projectId/display-images', verifyToken, upload.single('image'), addProjectDisplayImage);

// 删除项目展示图片
projectRouter.delete('/:projectId/display-images/:imageId', verifyToken, deleteProjectDisplayImage);

// 更新项目展示图片顺序
projectRouter.put('/:projectId/display-images/order', verifyToken, updateProjectImagesOrder);

// 项目资金提取
projectRouter.post('/:projectId/withdraw', verifyToken, withdrawFromProjectAccount);

// 获取项目提款记录
projectRouter.get('/:projectId/withdrawals', verifyToken, getProjectWithdrawalRecords);

// 获取用户在项目中的贡献度
projectRouter.get('/:projectId/contributions', verifyToken, getUserProjectContribution);

// 更新项目贡献度获得率
projectRouter.put('/:projectId/contribution-rates', verifyToken, updateProjectContributionRates);

// 添加一次性贡献或长期贡献
projectRouter.post('/:projectId/contribute', verifyToken, addProjectContribution);

// 获取项目贡献者列表
projectRouter.get('/:projectId/contributors', getProjectContributors);

export default projectRouter; 