import { Request, Response } from 'express';
import {
  getAllProjects,
  createProject,
  findProjectById,
  findProjectBySlug,
  findProjectByName,
  addProjectUpdate,
  addProjectMember,
  removeProjectMember,
  deleteProject,
  findProjectsByUserId,
  updateProject,
  withdrawFromProject,
  getProjectWithdrawals,
  getUserContribution,
  updateContributionRates,
  addContribution,
  getProjectMembers,
  getProjectUpdates,
  addProjectImage,
  getProjectImages,
  deleteProjectImage,
  getContributionRates,
  Project,
  ProjectUpdate,
  ProjectImage
} from '../models/projectModel';
import { findUserByUsername } from '../models/userModel';
import { findProposalsByProjectId } from '../models/proposalModel';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import 'express';
import { query } from '../utils/dbTools';

// 扩展项目接口，包含提案
interface ProjectWithDetails extends Project {
  proposals?: any[];
  updates: ProjectUpdate[];
  displayImages: ProjectImage[];
  members: string[];
  comments?: any[];
}

// 完整的项目详情数据接口
interface CompleteProjectDetail {
  project: ProjectWithDetails;
  members: any[];
  isFavorite?: boolean;
  withdrawals?: any[];
}

// 配置multer中间件
const storage = multer.diskStorage({
  destination: (req: Express.Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    // 确保上传目录存在
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req: Express.Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    // 生成唯一文件名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'project-image-' + uniqueSuffix + ext);
  }
});

// 配置上传中间件
export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 限制5MB
  fileFilter: (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    // 只允许上传图片
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('只允许上传图片文件'));
    }
    cb(null, true);
  }
});

// 获取所有项目
export const getProjects = async (req: Request, res: Response): Promise<void> => {
  try {
    const projects = await getAllProjects();
    res.status(200).json(projects);
  } catch (error) {
    console.error('获取项目列表失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 获取用户的项目
export const getUserProjects = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: '未授权' });
      return;
    }

    const projects = await findProjectsByUserId(userId);
    res.status(200).json(projects);
  } catch (error) {
    console.error('获取用户项目失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 通过ID获取项目
export const getProjectById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const project = await findProjectById(id);

    if (!project) {
      res.status(404).json({ message: '项目不存在' });
      return;
    }

    // 获取项目成员列表
    const members = await getProjectMembers(project.id);
    
    // 获取项目更新
    const updates = await getProjectUpdates(project.id);
    
    // 获取项目图片
    const images = await getProjectImages(project.id);
    
    // 合并数据
    const projectWithData: ProjectWithDetails = {
      ...project,
      members: members.map(member => member.userId),
      updates: updates || [],
      displayImages: images || []
    };
    
    // 加载提案数据
    try {
      const proposals = await findProposalsByProjectId(project.id);
      // 确保proposals是数组
      projectWithData.proposals = proposals || [];
    } catch (err) {
      console.error('获取项目提案失败:', err);
      // 确保即使出错也返回一个空数组
      projectWithData.proposals = [];
    }

    res.status(200).json(projectWithData);
  } catch (error) {
    console.error('获取项目详情失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 通过Slug获取项目
export const getProjectBySlug = async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;
    const project = await findProjectBySlug(slug);

    if (!project) {
      res.status(404).json({ message: '项目不存在' });
      return;
    }

    // 获取项目成员列表
    const members = await getProjectMembers(project.id);
    
    // 获取项目更新
    const updates = await getProjectUpdates(project.id);
    
    // 获取项目图片
    const images = await getProjectImages(project.id);
    
    // 合并数据
    const projectWithData: ProjectWithDetails = {
      ...project,
      members: members.map(member => member.userId),
      updates: updates || [],
      displayImages: images || []
    };
    
    // 加载提案数据
    try {
      const proposals = await findProposalsByProjectId(project.id);
      // 确保proposals是数组
      projectWithData.proposals = proposals || [];
    } catch (err) {
      console.error('获取项目提案失败:', err);
      // 确保即使出错也返回一个空数组
      projectWithData.proposals = [];
    }

    res.status(200).json(projectWithData);
  } catch (error) {
    console.error('获取项目详情失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 创建项目
export const createNewProject = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: '未授权' });
      return;
    }

    const { name, description, demoLink } = req.body;

    // 验证请求数据
    if (!name || !description) {
      res.status(400).json({ message: '项目名称和描述是必填项' });
      return;
    }

    // 检查项目名称是否已存在
    const existingProject = await findProjectByName(name);
    if (existingProject) {
      res.status(409).json({ message: '项目名称已存在，请使用其他名称' });
      return;
    }

    // 创建项目
    const project = await createProject({
      name,
      description,
      demoLink,
      createdBy: userId
    });

    if (!project) {
      res.status(500).json({ message: '创建项目失败' });
      return;
    }

    // 如果提供了demoLink，自动创建一个初始版本更新
    if (demoLink) {
      await addProjectUpdate(
        project.id,
        "初始版本",
        demoLink,
        true,
        "v1.0"
      );
    }

    res.status(201).json(project);
  } catch (error) {
    console.error('创建项目失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 添加项目更新
export const addUpdate = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: '未授权' });
      return;
    }

    const { projectId } = req.params;
    const { content, demoLink, isVersion, versionTag } = req.body;

    // 验证请求数据
    if (!content) {
      res.status(400).json({ message: '更新内容是必填项' });
      return;
    }

    // 添加更新
    const update = await addProjectUpdate(projectId, content, demoLink, isVersion, versionTag);

    if (!update) {
      res.status(404).json({ message: '项目不存在或您不是项目成员' });
      return;
    }

    res.status(200).json(update);
  } catch (error) {
    console.error('添加项目更新失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 添加项目成员
export const addMember = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: '未授权' });
      return;
    }

    const { projectId } = req.params;
    const { memberId } = req.body;

    // 验证请求数据
    if (!memberId) {
      res.status(400).json({ message: '成员ID不能为空' });
      return;
    }

    // 检查项目
    const project = await findProjectById(projectId);
    if (!project) {
      res.status(404).json({ message: '项目不存在' });
      return;
    }

    // 检查当前用户是否为项目创建者
    if (project.createdBy !== userId) {
      res.status(403).json({ message: '只有项目创建者可以添加成员' });
      return;
    }

    // 添加成员
    const success = await addProjectMember(projectId, memberId);

    if (!success) {
      res.status(404).json({ message: '添加成员失败' });
      return;
    }

    // 获取更新后的成员列表
    const members = await getProjectMembers(projectId);
    res.status(200).json({ message: '成员已添加', members });
  } catch (error) {
    console.error('添加项目成员失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 移除项目成员
export const removeMember = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: '未授权' });
      return;
    }

    const { projectId, memberId } = req.params;

    // 验证请求数据
    if (!memberId) {
      res.status(400).json({ message: '成员ID不能为空' });
      return;
    }

    // 获取项目
    const project = await findProjectById(projectId);
    if (!project) {
      res.status(404).json({ message: '项目不存在' });
      return;
    }

    // 检查当前用户是否为项目创建者
    if (project.createdBy !== userId) {
      res.status(403).json({ message: '只有项目创建者可以移除成员' });
      return;
    }

    // 移除成员
    const success = await removeProjectMember(projectId, memberId);

    if (!success) {
      res.status(404).json({ message: '无法移除成员，可能是项目创建者或成员不存在' });
      return;
    }

    // 获取更新后的成员列表
    const members = await getProjectMembers(projectId);
    res.status(200).json({ message: '成员已移除', members });
  } catch (error) {
    console.error('移除项目成员失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 通过用户名添加项目成员
export const addMemberByUsername = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: '未授权' });
      return;
    }

    const { projectId } = req.params;
    const { username } = req.body;

    // 验证请求数据
    if (!username) {
      res.status(400).json({ message: '用户名不能为空' });
      return;
    }

    // 查找用户
    const user = await findUserByUsername(username);
    if (!user) {
      res.status(404).json({ message: '用户不存在' });
      return;
    }

    // 获取项目
    const project = await findProjectById(projectId);
    if (!project) {
      res.status(404).json({ message: '项目不存在' });
      return;
    }

    // 检查当前用户是否为项目创建者
    if (project.createdBy !== userId) {
      res.status(403).json({ message: '只有项目创建者可以添加成员' });
      return;
    }

    // 添加成员
    const success = await addProjectMember(projectId, user.id);

    if (!success) {
      res.status(404).json({ message: '添加成员失败' });
      return;
    }

    // 获取更新后的成员列表
    const members = await getProjectMembers(projectId);
    res.status(200).json({ message: '成员已添加', members });
  } catch (error) {
    console.error('通过用户名添加项目成员失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 删除项目
export const removeProject = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: '未授权' });
      return;
    }

    const { projectId } = req.params;

    // 获取项目
    const project = await findProjectById(projectId);
    if (!project) {
      res.status(404).json({ message: '项目不存在' });
      return;
    }

    // 检查当前用户是否为项目创建者
    if (project.createdBy !== userId) {
      res.status(403).json({ message: '只有项目创建者可以删除项目' });
      return;
    }

    // 删除项目
    const success = await deleteProject(projectId);

    if (!success) {
      res.status(500).json({ message: '删除项目失败' });
      return;
    }

    res.status(200).json({ message: '项目已删除' });
  } catch (error) {
    console.error('删除项目失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 更新项目信息
export const updateProjectInfo = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: '未授权' });
      return;
    }

    const { projectId } = req.params;
    const { name, description, demoLink } = req.body;

    // 验证请求数据
    if (!name || !description) {
      res.status(400).json({ message: '项目名称和描述是必填项' });
      return;
    }

    // 获取项目
    const project = await findProjectById(projectId);
    if (!project) {
      res.status(404).json({ message: '项目不存在' });
      return;
    }

    // 检查当前用户是否为项目创建者
    if (project.createdBy !== userId) {
      res.status(403).json({ message: '只有项目创建者可以更新项目信息' });
      return;
    }

    // 更新项目
    const updatedProject = await updateProject(projectId, name, description, demoLink);

    if (!updatedProject) {
      res.status(500).json({ message: '更新项目信息失败' });
      return;
    }

    res.status(200).json(updatedProject);
  } catch (error) {
    console.error('更新项目信息失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 添加带图片的项目更新
export const addUpdateWithImage = (req: Request & { file?: Express.Multer.File }, res: Response): void => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ message: '未授权' });
      return;
    }

    const { projectId } = req.params;
    const { content } = req.body;
    const image = req.file;

    // 验证请求数据
    if (!content) {
      res.status(400).json({ message: '更新内容是必填项' });
      return;
    }

    if (!image) {
      res.status(400).json({ message: '图片是必填项' });
      return;
    }

    // 获取图片的路径（相对路径）
    const imageUrl = `/uploads/${path.basename(image.path)}`;

    // 添加更新
    const project = addProjectUpdate(projectId, content, undefined, undefined, undefined, imageUrl);

    if (!project) {
      res.status(404).json({ message: '项目不存在或您不是项目成员' });
      return;
    }

    res.status(200).json(project);
  } catch (error) {
    console.error('添加带图片的项目更新失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 添加项目展示图片
export const addProjectDisplayImage = async (req: Request & { file?: Express.Multer.File }, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: '未授权' });
      return;
    }

    const { projectId } = req.params;
    const { order } = req.body;
    const image = req.file;

    if (!image) {
      res.status(400).json({ message: '请选择要上传的图片' });
      return;
    }

    // 获取项目
    const project = await findProjectById(projectId);
    if (!project) {
      res.status(404).json({ message: '项目不存在' });
      return;
    }

    // 检查用户是否有权限
    const projectMembers = await getProjectMembers(projectId);
    const isMember = projectMembers.some(member => member.userId === userId);
    const isOwner = project.createdBy === userId;
    
    if (!isMember && !isOwner) {
      res.status(403).json({ message: '您没有权限执行此操作' });
      return;
    }

    // 获取图片的路径（相对路径）
    const imageUrl = `/uploads/${path.basename(image.path)}`;

    // 创建并添加项目图片
    const displayImage = await addProjectImage(
      projectId,
      imageUrl,
      parseInt(order) || 0
    );

    if (!displayImage) {
      res.status(500).json({ message: '添加图片失败' });
      return;
    }

    res.status(201).json(displayImage);
  } catch (error) {
    console.error('添加项目展示图片失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 删除项目展示图片
export const deleteProjectDisplayImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: '未授权' });
      return;
    }

    const { projectId, imageId } = req.params;

    // 获取项目
    const project = await findProjectById(projectId);
    if (!project) {
      res.status(404).json({ message: '项目不存在' });
      return;
    }

    // 检查用户是否有权限
    const projectMembers = await getProjectMembers(projectId);
    const isMember = projectMembers.some(member => member.userId === userId);
    const isOwner = project.createdBy === userId;
    
    if (!isMember && !isOwner) {
      res.status(403).json({ message: '您没有权限执行此操作' });
      return;
    }

    // 检查图片是否存在
    const projectImages = await getProjectImages(projectId);
    const imageExists = projectImages.some(img => img.id === imageId);
    
    if (!imageExists) {
      res.status(404).json({ message: '图片不存在' });
      return;
    }

    // 删除图片
    const success = await deleteProjectImage(imageId);
    
    if (!success) {
      res.status(500).json({ message: '删除图片失败' });
      return;
    }

    res.status(200).json({ message: '图片已删除' });
  } catch (error) {
    console.error('删除项目展示图片失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 更新项目展示图片顺序
export const updateProjectImagesOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: '未授权' });
      return;
    }

    const { projectId } = req.params;
    const { orderData } = req.body;

    // 验证请求数据
    if (!Array.isArray(orderData)) {
      res.status(400).json({ message: '无效的顺序数据' });
      return;
    }

    // 获取项目
    const project = await findProjectById(projectId);
    if (!project) {
      res.status(404).json({ message: '项目不存在' });
      return;
    }

    // 检查用户是否有权限
    const projectMembers = await getProjectMembers(projectId);
    const isMember = projectMembers.some(member => member.userId === userId);
    const isOwner = project.createdBy === userId;
    
    if (!isMember && !isOwner) {
      res.status(403).json({ message: '您没有权限执行此操作' });
      return;
    }

    // 检查项目是否有展示图片
    const projectImages = await getProjectImages(projectId);
    if (projectImages.length === 0) {
      res.status(400).json({ message: '项目没有展示图片' });
      return;
    }

    // 更新顺序
    let success = true;
    for (const item of orderData) {
      const image = projectImages.find(img => img.id === item.id);
      if (image) {
        // 更新图片顺序
        const updated = await query(
          'UPDATE project_images SET image_order = ? WHERE id = ?',
          [item.order, item.id]
        );
        
        if (!updated.affectedRows) {
          success = false;
        }
      }
    }

    if (!success) {
      res.status(500).json({ message: '更新图片顺序失败' });
      return;
    }

    res.status(200).json({ message: '图片顺序已更新' });
  } catch (error) {
    console.error('更新项目展示图片顺序失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 从项目账户提取资金
export const withdrawFromProjectAccount = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: '未授权' });
      return;
    }

    const { projectId } = req.params;
    const { amount } = req.body;

    // 验证请求数据
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      res.status(400).json({ message: '请输入有效的提取金额' });
      return;
    }

    // 提取资金
    const result = await withdrawFromProject(projectId, userId, Number(amount));

    if (!result.success) {
      res.status(400).json({ message: '提取失败，请检查余额或权限' });
      return;
    }

    res.status(200).json({ 
      message: '提取成功',
      withdrawal: result.withdrawal,
      projectBalance: result.project?.projectBalance
    });
  } catch (error) {
    console.error('提取项目资金失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 获取项目提款记录
export const getProjectWithdrawalRecords = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: '未授权' });
      return;
    }

    const { projectId } = req.params;

    // 获取项目
    const project = await findProjectById(projectId);
    if (!project) {
      res.status(404).json({ message: '项目不存在' });
      return;
    }

    // 检查用户是否有权限
    const projectMembers = await getProjectMembers(projectId);
    const isMember = projectMembers.some(member => member.userId === userId);
    
    if (!isMember && project.createdBy !== userId) {
      res.status(403).json({ message: '您没有权限查看此项目的提款记录' });
      return;
    }

    // 获取提款记录
    const withdrawals = await getProjectWithdrawals(projectId);
    
    res.status(200).json(withdrawals);
  } catch (error) {
    console.error('获取项目提款记录失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 获取用户在项目中的贡献度
export const getUserProjectContribution = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: '未授权' });
      return;
    }

    const { projectId } = req.params;

    // 获取用户在项目中的贡献度
    const contribution = await getUserContribution(projectId, userId);
    
    res.status(200).json({ contribution });
  } catch (error) {
    console.error('获取用户项目贡献度失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 更新项目贡献度获得率
export const updateProjectContributionRates = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: '未授权' });
      return;
    }

    const { projectId } = req.params;
    const { 
      proposalCreation, 
      bountyCreation, 
      bountyCompletion, 
      oneTimeContribution, 
      longTermContribution 
    } = req.body;

    // 获取项目
    const project = await findProjectById(projectId);
    if (!project) {
      res.status(404).json({ message: '项目不存在' });
      return;
    }

    // 检查用户是否为项目创建者
    if (project.createdBy !== userId) {
      res.status(403).json({ message: '只有项目创建者可以更新贡献度获得率' });
      return;
    }

    // 更新贡献度获得率
    const updatedRates = await updateContributionRates(projectId, {
      proposalCreation: proposalCreation !== undefined ? Number(proposalCreation) : undefined,
      bountyCreation: bountyCreation !== undefined ? Number(bountyCreation) : undefined,
      bountyCompletion: bountyCompletion !== undefined ? Number(bountyCompletion) : undefined,
      oneTimeContribution: oneTimeContribution !== undefined ? Number(oneTimeContribution) : undefined,
      longTermContribution: longTermContribution !== undefined ? Number(longTermContribution) : undefined
    });

    if (!updatedRates) {
      res.status(500).json({ message: '更新贡献度获得率失败' });
      return;
    }

    res.status(200).json({
      message: '贡献度获得率已更新',
      contributionRates: updatedRates
    });
  } catch (error) {
    console.error('更新项目贡献度获得率失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 添加项目贡献
export const addProjectContribution = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: '未授权' });
      return;
    }

    const { projectId } = req.params;
    const { amount, type } = req.body;

    // 验证请求数据
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      res.status(400).json({ message: '贡献金额必须是正数' });
      return;
    }

    if (!type || (type !== 'oneTime' && type !== 'longTerm')) {
      res.status(400).json({ message: '贡献类型必须是oneTime或longTerm' });
      return;
    }

    // 获取项目
    const project = await findProjectById(projectId);
    if (!project) {
      res.status(404).json({ message: '项目不存在' });
      return;
    }

    // 获取项目贡献度获得率
    const rates = await getContributionRates(projectId);
    if (!rates) {
      res.status(500).json({ message: '获取贡献度获得率失败' });
      return;
    }

    // 根据类型选择贡献度获得率
    const rate = type === 'longTerm' ? 
      rates.longTermContribution : 
      rates.oneTimeContribution;

    // 添加贡献
    const success = await addContribution(projectId, userId, Number(amount) * rate);
    
    if (!success) {
      res.status(500).json({ message: '添加贡献失败' });
      return;
    }

    // 更新项目余额
    await query(
      'UPDATE projects SET projectBalance = projectBalance + ? WHERE id = ?',
      [Number(amount), projectId]
    );

    // 获取更新后的项目余额
    const updatedProject = await findProjectById(projectId);
    
    res.status(200).json({
      message: '贡献已添加',
      contributionAmount: Number(amount) * rate,
      projectBalance: updatedProject?.projectBalance || 0
    });
  } catch (error) {
    console.error('添加项目贡献失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 获取项目详情页完整数据
export const getProjectDetailComplete = async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;
    const userId = req.user?.id; // 可能为空，用户可以未登录状态查看
    
    // 获取项目基本信息
    const project = await findProjectBySlug(slug);
    if (!project) {
      res.status(404).json({ message: '项目不存在' });
      return;
    }

    // 获取项目成员列表
    const members = await getProjectMembers(project.id);
    
    // 获取项目更新
    const updates = await getProjectUpdates(project.id);
    
    // 获取项目图片
    const images = await getProjectImages(project.id);
    
    // 合并基础数据
    const projectWithData: ProjectWithDetails = {
      ...project,
      members: members.map(member => member.userId),
      updates: updates || [],
      displayImages: images || [],
      comments: []
    };

    // 加载提案数据和提案的评论
    try {
      const { findProposalsByProjectId } = require('../models/proposalModel');
      const proposals = await findProposalsByProjectId(project.id);
      
      if (proposals && proposals.length > 0) {
        // 为每个提案加载评论和点赞信息
        const { getProposalComments } = require('../controllers/commentController');
        const { getProposalLikes } = require('../models/proposalModel');
        const { findBountiesByProposalId } = require('../models/proposalModel');
        
        // 处理每个提案的评论和点赞
        for (let i = 0; i < proposals.length; i++) {
          const proposal = proposals[i];
          // 获取提案评论
          const comments = await getProposalComments(proposal.id);
          proposal.comments = comments || [];
          
          // 获取提案点赞
          const likes = await getProposalLikes(proposal.id);
          proposal.likes = likes || [];
          
          // 获取提案悬赏
          const bounties = await findBountiesByProposalId(proposal.id);
          proposal.bounties = bounties || [];
          
          // 计算总悬赏金额
          if (bounties && bounties.length > 0) {
            proposal.bountyTotal = bounties.reduce((sum: number, bounty: any) => sum + bounty.amount, 0);
          } else {
            proposal.bountyTotal = 0;
          }
        }
      }
      
      // 添加提案数据到项目
      projectWithData.proposals = proposals || [];
    } catch (err) {
      console.error('获取项目提案详情失败:', err);
      projectWithData.proposals = [];
    }

    // 获取项目评论
    try {
      const { getProjectComments } = require('../controllers/commentController');
      const comments = await getProjectComments(project.id);
      projectWithData.comments = comments || [];
    } catch (err) {
      console.error('获取项目评论失败:', err);
      projectWithData.comments = [];
    }

    // 获取成员详情数据
    let membersData = [];
    if (members && members.length > 0) {
      try {
        // 使用getAllUsers而不是findUsersByIds
        const { getAllUsers } = require('../models/userModel');
        const memberIds = members.map(member => member.userId);
        
        // 获取所有用户，然后过滤出成员
        const allUsers = await getAllUsers();
        membersData = allUsers
          .filter((user: any) => memberIds.includes(user.id))
          .map((user: any) => ({
            id: user.id,
            username: user.username,
            avatarUrl: user.avatarUrl || ''
          }));
      } catch (err) {
        console.error('获取项目成员详情失败:', err);
        // 创建基本成员信息，添加安全检查防止substring错误
        membersData = members.map(member => ({ 
          id: member.userId, 
          username: member.userId ? `成员${member.userId.substring(0, 4)}` : '未知成员'
        }));
      }
    }

    // 获取收藏状态（如果用户已登录）
    let isFavorite = false;
    if (userId) {
      try {
        // 直接查询favorite_projects表检查收藏状态
        const favorites = await query(
          'SELECT * FROM favorite_projects WHERE userId = ? AND projectId = ?',
          [userId, project.id]
        );
        isFavorite = favorites.length > 0;
      } catch (err) {
        console.error('获取项目收藏状态失败:', err);
      }
    }

    // 获取提款记录（仅对项目成员/创建者）
    let withdrawals: any[] = [];
    const isMember = userId && projectWithData.members.includes(userId);
    const isCreator = userId && project.createdBy === userId;
    if ((isMember || isCreator) && userId) {
      try {
        const projectWithdrawals = await getProjectWithdrawals(project.id);
        withdrawals = projectWithdrawals || [];
      } catch (err) {
        console.error('获取提款记录失败:', err);
      }
    }

    // 构建完整响应
    const completeData: CompleteProjectDetail = {
      project: projectWithData,
      members: membersData,
      isFavorite: isFavorite,
      withdrawals: (isMember || isCreator) ? withdrawals : undefined
    };

    res.status(200).json(completeData);
  } catch (error) {
    console.error('获取项目详情完整数据失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

/**
 * 获取项目贡献者列表
 */
export const getProjectContributors = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    
    // 查询项目
    const projectQuery = `SELECT * FROM projects WHERE id = ?`;
    const projects = await query(projectQuery, [projectId]);
    
    if (projects.length === 0) {
      return res.status(404).json({ message: '项目不存在' });
    }
    
    // 查询项目的贡献者及其贡献度
    const contributorsQuery = `
      SELECT 
        u.id,
        u.username,
        u.avatar_url as avatarUrl,
        c.contribution_value as contribution
      FROM contributions c
      JOIN users u ON c.userId = u.id
      WHERE c.projectId = ?
      AND c.contribution_value > 0
      ORDER BY c.contribution_value DESC
    `;
    
    const contributors = await query(contributorsQuery, [projectId]);
    
    // 处理结果
    const result = contributors.map((contributor: any) => ({
      id: contributor.id,
      username: contributor.username,
      avatarUrl: contributor.avatarUrl,
      contribution: contributor.contribution
    }));
    
    res.status(200).json(result);
  } catch (error) {
    console.error('获取项目贡献者失败:', error);
    res.status(500).json({ message: '获取项目贡献者失败' });
  }
};

// 检查项目名称是否存在
export const checkProjectName = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name } = req.query;
    
    if (!name || typeof name !== 'string') {
      res.status(400).json({ message: '请提供有效的项目名称' });
      return;
    }
    
    const existingProject = await findProjectByName(name);
    
    res.status(200).json({
      exists: !!existingProject,
      message: existingProject ? '项目名称已存在' : '项目名称可用'
    });
  } catch (error) {
    console.error('检查项目名称失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
}; 