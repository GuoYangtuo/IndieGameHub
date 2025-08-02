import { query } from '../utils/dbTools';
import { DEFAULT_CONTRIBUTION_RATES } from './dataInitializer';
import { pinyin } from 'pinyin-pro';

// 项目接口
export interface Project {
  id: string;
  name: string;
  slug: string;
  description: string;
  demoLink?: string;
  createdBy: string;
  createdAt: string;
  coverImage?: string;
  projectBalance: number; // 项目账户存款额
  githubRepoUrl?: string; // GitHub仓库地址
  githubAccessToken?: string; // GitHub访问密钥
}

// 项目成员接口
export interface ProjectMember {
  projectId: string;
  userId: string;
  joinedAt: string;
}

// 项目更新接口
export interface ProjectUpdate {
  id: string;
  projectId: string;
  content: string;
  demoLink?: string;
  createdAt: string;
  createdBy?: string;
  isVersion?: boolean;
  versionName?: string;
  imageUrl?: string;
}

// 创建项目接口
export interface CreateProjectData {
  name: string;
  description: string;
  demoLink?: string;
  createdBy: string;
  githubRepoUrl?: string;
  githubAccessToken?: string;
}

// 更新项目接口
export interface UpdateProjectData {
  content: string;
  demoLink?: string;
  imageUrl?: string;
  isVersion?: boolean;
  versionName?: string;
}

// 更新项目信息接口
export interface UpdateProjectInfoData {
  name: string;
  description: string;
  demoLink?: string;
  githubRepoUrl?: string;
  githubAccessToken?: string;
}

// 项目图片接口
export interface ProjectImage {
  id: string;
  projectId: string;
  url: string;
  order: number;
}

// 项目提款记录接口
export interface WithdrawalRecord {
  id: string;
  projectId: string;
  userId: string;
  amount: number;
  createdAt: string;
}

// 贡献度获得率接口
export interface ContributionRates {
  projectId: string;
  proposalCreation: number; // 创建提案
  bountyCreation: number; // 在提案上悬赏（立即获得）
  bountyCompletion: number; // 提案完成后悬赏者获得
  oneTimeContribution: number; // 一次性贡献
  longTermContribution: number; // 长期贡献
}

// 生成唯一ID
const generateId = (): string => {
  return Date.now().toString() + Math.floor(Math.random() * 1000).toString();
};

// 生成项目slug
const generateSlug = (name: string): string => {
  // 使用pinyin-pro将中文转换为拼音，并用下划线连接
  const pinyinStr = pinyin(name, { 
    toneType: 'none', // 不带声调
    type: 'array',    // 返回数组
    nonZh: 'consecutive' // 非中文连续返回
  }).join('_');
  
  // 处理非法字符，只保留字母、数字和下划线
  return pinyinStr
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // 移除非单词字符
    .replace(/\s+/g, '_')     // 替换空格为下划线
    .replace(/-+/g, '_');     // 替换连字符为下划线
};

// 获取所有项目
export const getAllProjects = async (): Promise<Project[]> => {
  try {
    return await query('SELECT * FROM projects');
  } catch (error) {
    console.error('读取项目数据失败:', error);
    return [];
  }
};

// 根据ID查找项目
export const findProjectById = async (id: string): Promise<Project | null> => {
  try {
    const projects = await query('SELECT * FROM projects WHERE id = ?', [id]);
    return projects.length > 0 ? projects[0] : null;
  } catch (error) {
    console.error('根据ID查找项目失败:', error);
    return null;
  }
};
  
// 根据Slug查找项目
export const findProjectBySlug = async (slug: string): Promise<Project | null> => {
  try {
    console.log('slug', slug);
    const projects = await query('SELECT * FROM projects WHERE slug = ?', [slug]);
    return projects.length > 0 ? projects[0] : null;
  } catch (error) {
    console.error('根据Slug查找项目失败:', error);
    return null;
  }
};

// 根据用户ID查找项目
export const findProjectsByUserId = async (userId: string): Promise<Project[]> => {
  try {
    const projects = await query(
      `SELECT p.* FROM projects p 
       LEFT JOIN project_members pm ON p.id = pm.projectId 
       WHERE p.createdBy = ? OR pm.userId = ?`,
      [userId, userId]
    );
    return projects;
  } catch (error) {
    console.error('根据用户ID查找项目失败:', error);
    return [];
  }
};

// 根据名称查找项目
export const findProjectByName = async (name: string): Promise<Project | null> => {
  try {
    const projects = await query('SELECT * FROM projects WHERE name = ?', [name]);
    return projects.length > 0 ? projects[0] : null;
  } catch (error) {
    console.error('根据名称查找项目失败:', error);
    return null;
  }
};

// 创建项目
export const createProject = async (projectData: CreateProjectData): Promise<Project | null> => {
  try {
    // 创建项目slug
    let slug = generateSlug(projectData.name);
    
    // 检查slug是否已存在
    let existingProject = await findProjectBySlug(slug);
    let counter = 1;
    let uniqueSlug = slug;
    
    while (existingProject) {
      uniqueSlug = `${slug}-${counter}`;
      existingProject = await findProjectBySlug(uniqueSlug);
      counter++;
    }
    
    // 创建新项目
    const id = generateId();
    const now = new Date();
    const mysqlDateFormat = now.toISOString().slice(0, 19).replace('T', ' ');
    const createdAt = now.toISOString(); // 保留ISO格式用于返回的项目对象
    
    await query(
      `INSERT INTO projects 
       (id, name, slug, description, demoLink, createdBy, createdAt, projectBalance, githubRepoUrl, githubAccessToken) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, projectData.name, uniqueSlug, projectData.description, projectData.demoLink || '', projectData.createdBy, mysqlDateFormat, 0, projectData.githubRepoUrl || null, projectData.githubAccessToken || null]
    );
    
    // 添加创建者为成员
    await query(
      `INSERT INTO project_members (projectId, userId, joinedAt) VALUES (?, ?, ?)`,
      [id, projectData.createdBy, mysqlDateFormat]
    );
      
    // 创建初始更新（v1.0）
    const updateId = generateId();
    await query(
      `INSERT INTO project_updates 
       (id, projectId, content, demoLink, isVersion, versionName, createdAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [updateId, id, '初始版本', projectData.demoLink || '', true, 'v1.0', mysqlDateFormat]
    );
    
    // 创建贡献度配置
    await query(
      `INSERT INTO contribution_rates 
       (projectId, proposal_creation, bounty_creation, bounty_completion, one_time_contribution, long_term_contribution) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        DEFAULT_CONTRIBUTION_RATES.proposalCreation,
        DEFAULT_CONTRIBUTION_RATES.bountyCreation,
        DEFAULT_CONTRIBUTION_RATES.bountyCompletion,
        DEFAULT_CONTRIBUTION_RATES.oneTimeContribution,
        DEFAULT_CONTRIBUTION_RATES.longTermContribution
      ]
    );
    
    // 获取创建的项目
    return await findProjectById(id);
    } catch (error) {
    console.error('创建项目失败:', error);
    return null;
    }
};

// 获取项目成员
export const getProjectMembers = async (projectId: string): Promise<ProjectMember[]> => {
  try {
    return await query('SELECT * FROM project_members WHERE projectId = ?', [projectId]);
  } catch (error) {
    console.error('获取项目成员失败:', error);
    return [];
  }
};

// 添加项目成员
export const addProjectMember = async (projectId: string, memberId: string): Promise<boolean> => {
  try {
    const now = new Date();
    const mysqlDateFormat = now.toISOString().slice(0, 19).replace('T', ' ');

    // 检查成员是否已存在
    const existingMembers = await query(
      'SELECT * FROM project_members WHERE projectId = ? AND userId = ?',
      [projectId, memberId]
    );
    
    if (existingMembers.length > 0) {
      return true; // 成员已存在
    }
    
    // 添加新成员
    await query(
      'INSERT INTO project_members (projectId, userId, joinedAt) VALUES (?, ?, ?)',
      [projectId, memberId, mysqlDateFormat]
    );
    
    return true;
  } catch (error) {
    console.error('添加项目成员失败:', error);
    return false;
  }
};

// 移除项目成员
export const removeProjectMember = async (projectId: string, memberId: string): Promise<boolean> => {
  try {
    // 检查是否为项目创建者
    const project = await findProjectById(projectId);
    if (!project || project.createdBy === memberId) {
      return false; // 不能移除项目创建者
  }
  
    // 移除成员
    await query(
      'DELETE FROM project_members WHERE projectId = ? AND userId = ?',
      [projectId, memberId]
    );
    
    return true;
  } catch (error) {
    console.error('移除项目成员失败:', error);
    return false;
  }
  };
  
// 获取项目更新
export const getProjectUpdates = async (projectId: string): Promise<ProjectUpdate[]> => {
  try {
    const updates = await query(
      'SELECT * FROM project_updates WHERE projectId = ? ORDER BY createdAt DESC',
      [projectId]
    );
    
    // 确保日期格式正确
    return updates.map((update: any) => {
      // 如果createdAt是Date对象或MySQL日期字符串，转换为ISO格式
      if (update.createdAt) {
        try {
          const date = new Date(update.createdAt);
          if (!isNaN(date.getTime())) {
            update.createdAt = date.toISOString();
          } else {
            update.createdAt = new Date().toISOString(); // 使用当前时间作为备用
          }
        } catch (error) {
          update.createdAt = new Date().toISOString(); // 如果转换失败，使用当前时间
        }
      } else {
        update.createdAt = new Date().toISOString(); // 如果没有createdAt，使用当前时间
      }
      
      return update;
    });
  } catch (error) {
    console.error('获取项目更新失败:', error);
    return [];
  }
};

// 添加项目更新
export const addProjectUpdate = async (
  projectId: string,
  content: string,
  demoLink?: string,
  isVersion?: boolean,
  versionName?: string,
  imageUrl?: string
): Promise<ProjectUpdate | null> => {
  try {
    const id = generateId();
    const now = new Date();
    const mysqlDateFormat = now.toISOString().slice(0, 19).replace('T', ' ');
    const createdAt = now.toISOString(); // 保留ISO格式用于返回的对象
    
    await query(
      `INSERT INTO project_updates 
       (id, projectId, content, demoLink, isVersion, versionName, imageUrl, createdAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, projectId, content, demoLink || null, isVersion || false, versionName || null, imageUrl || null, mysqlDateFormat]
    );
    
    const updates = await query('SELECT * FROM project_updates WHERE id = ?', [id]);
    return updates.length > 0 ? updates[0] : null;
  } catch (error) {
    console.error('添加项目更新失败:', error);
    return null;
  }
};

// 更新项目信息
export const updateProject = async (
  id: string,
  name: string,
  description: string,
  demoLink?: string,
  githubRepoUrl?: string,
  githubAccessToken?: string
): Promise<Project | null> => {
  try {
    await query(
      'UPDATE projects SET name = ?, description = ?, demoLink = ?, githubRepoUrl = ?, githubAccessToken = ? WHERE id = ?',
      [name, description, demoLink || null, githubRepoUrl || null, githubAccessToken || null, id]
    );
    
    return await findProjectById(id);
  } catch (error) {
    console.error('更新项目信息失败:', error);
    return null;
  }
};

// 删除项目
export const deleteProject = async (id: string): Promise<boolean> => {
  try {
    const result = await query('DELETE FROM projects WHERE id = ?', [id]);
    return result.affectedRows > 0;
  } catch (error) {
    console.error('删除项目失败:', error);
    return false;
  }
};

// 从项目中提款
export const withdrawFromProject = async (
  projectId: string,
  userId: string,
  amount: number
): Promise<{ success: boolean; withdrawal?: WithdrawalRecord; project?: Project }> => {
  try {
    // 检查项目是否存在
    const project = await findProjectById(projectId);
    if (!project) {
      return { success: false };
    }
  
    // 检查用户是否为项目创建者
    if (project.createdBy !== userId) {
      return { success: false };
    }
  
    // 检查项目余额是否足够
    if (project.projectBalance < amount) {
      return { success: false };
    }
  
    // 扣除项目余额
    await query(
      'UPDATE projects SET projectBalance = projectBalance - ? WHERE id = ?',
      [amount, projectId]
    );
  
    // 增加用户金币
    const userModel = require('./userModel');
    await userModel.updateUserCoins(userId, amount);
  
    // 记录提款
    const id = generateId();
    const now = new Date();
    const mysqlDateFormat = now.toISOString().slice(0, 19).replace('T', ' ');
    const createdAt = now.toISOString(); // 保留ISO格式用于返回的对象
    
    await query(
      'INSERT INTO withdrawals (id, projectId, userId, amount, createdAt) VALUES (?, ?, ?, ?, ?)',
      [id, projectId, userId, amount, mysqlDateFormat]
    );
    
    const updatedProject = await findProjectById(projectId);
    
    const withdrawal: WithdrawalRecord = {
      id,
      projectId,
      userId,
      amount,
      createdAt
    };
  
    return { 
      success: true, 
      withdrawal,
      project: updatedProject || undefined 
    };
  } catch (error) {
    console.error('从项目提款失败:', error);
    return { success: false };
  }
};

// 获取项目提款记录
export const getProjectWithdrawals = async (projectId: string): Promise<WithdrawalRecord[]> => {
  try {
    const withdrawals = await query(
      'SELECT * FROM withdrawals WHERE projectId = ? ORDER BY createdAt DESC',
      [projectId]
    );
    
    // 确保日期格式正确
    return withdrawals.map((withdrawal: any) => {
      // 如果createdAt是Date对象或MySQL日期字符串，转换为ISO格式
      if (withdrawal.createdAt) {
        try {
          const date = new Date(withdrawal.createdAt);
          if (!isNaN(date.getTime())) {
            withdrawal.createdAt = date.toISOString();
          } else {
            withdrawal.createdAt = new Date().toISOString(); // 使用当前时间作为备用
          }
        } catch (error) {
          withdrawal.createdAt = new Date().toISOString(); // 如果转换失败，使用当前时间
        }
      } else {
        withdrawal.createdAt = new Date().toISOString(); // 如果没有createdAt，使用当前时间
      }
      
      return withdrawal;
    });
  } catch (error) {
    console.error('获取项目提款记录失败:', error);
    return [];
  }
};

// 添加贡献度
export const addContribution = async (projectId: string, userId: string, amount: number): Promise<boolean> => {
  try {
    // 检查是否已有贡献度记录
    const existing = await query(
      'SELECT * FROM contributions WHERE projectId = ? AND userId = ?',
      [projectId, userId]
    );
    
    if (existing.length > 0) {
      // 更新现有贡献度
      await query(
        'UPDATE contributions SET contribution_value = contribution_value + ? WHERE projectId = ? AND userId = ?',
        [amount, projectId, userId]
      );
    } else {
      // 创建新的贡献度记录
      await query(
        'INSERT INTO contributions (projectId, userId, contribution_value) VALUES (?, ?, ?)',
        [projectId, userId, amount]
      );
    }

    return true;
  } catch (error) {
    console.error('添加贡献度失败:', error);
    return false;
  }
};

// 更新贡献度配置
export const updateContributionRates = async (
  projectId: string, 
  rates: Partial<ContributionRates>
): Promise<ContributionRates | null> => {
  try {
    // 获取当前配置
    const current = await query(
      'SELECT * FROM contribution_rates WHERE projectId = ?',
      [projectId]
    );
    
    if (current.length === 0) {
      return null;
    }

    // 准备更新字段
    const updateFields = [];
    const params = [];
    
    if (rates.proposalCreation !== undefined) {
      updateFields.push('proposal_creation = ?');
      params.push(rates.proposalCreation);
    }
    
    if (rates.bountyCreation !== undefined) {
      updateFields.push('bounty_creation = ?');
      params.push(rates.bountyCreation);
    }
    
    if (rates.bountyCompletion !== undefined) {
      updateFields.push('bounty_completion = ?');
      params.push(rates.bountyCompletion);
    }

    if (rates.oneTimeContribution !== undefined) {
      updateFields.push('one_time_contribution = ?');
      params.push(rates.oneTimeContribution);
    }
    
    if (rates.longTermContribution !== undefined) {
      updateFields.push('long_term_contribution = ?');
      params.push(rates.longTermContribution);
    }
    
    if (updateFields.length === 0) {
      return current[0];
    }
    
    // 添加projectId作为WHERE条件的参数
    params.push(projectId);
    
    // 执行更新
    await query(
      `UPDATE contribution_rates SET ${updateFields.join(', ')} WHERE projectId = ?`,
      params
    );
    
    // 获取更新后的配置
    const updated = await query(
      'SELECT * FROM contribution_rates WHERE projectId = ?',
      [projectId]
    );
    
    return updated[0];
  } catch (error) {
    console.error('更新贡献度配置失败:', error);
    return null;
  }
};

// 获取用户贡献度
export const getUserContribution = async (projectId: string, userId: string): Promise<number> => {
  try {
    const contributions = await query(
      'SELECT contribution_value FROM contributions WHERE projectId = ? AND userId = ?',
      [projectId, userId]
    );
    
    return contributions.length > 0 ? contributions[0].contribution_value : 0;
  } catch (error) {
    console.error('获取用户贡献度失败:', error);
    return 0;
  }
};

// 获取项目贡献度配置
export const getContributionRates = async (projectId: string): Promise<ContributionRates | null> => {
  try {
    const rates = await query(
      'SELECT * FROM contribution_rates WHERE projectId = ?',
      [projectId]
    );
    
    return rates.length > 0 ? rates[0] : null;
  } catch (error) {
    console.error('获取贡献度配置失败:', error);
    return null;
  }
};

// 获取项目图片
export const getProjectImages = async (projectId: string): Promise<ProjectImage[]> => {
  try {
    return await query(
      'SELECT * FROM project_images WHERE projectId = ? ORDER BY image_order',
      [projectId]
    );
  } catch (error) {
    console.error('获取项目图片失败:', error);
    return [];
  }
};

// 添加项目图片
export const addProjectImage = async (
  projectId: string,
  url: string,
  order: number
): Promise<ProjectImage | null> => {
  try {
    const id = generateId();
    
    await query(
      'INSERT INTO project_images (id, projectId, url, image_order) VALUES (?, ?, ?, ?)',
      [id, projectId, url, order]
    );
    
    const images = await query('SELECT * FROM project_images WHERE id = ?', [id]);
    return images.length > 0 ? images[0] : null;
  } catch (error) {
    console.error('添加项目图片失败:', error);
    return null;
  }
};

// 删除项目图片
export const deleteProjectImage = async (imageId: string): Promise<boolean> => {
  try {
    const result = await query('DELETE FROM project_images WHERE id = ?', [imageId]);
    return result.affectedRows > 0;
  } catch (error) {
    console.error('删除项目图片失败:', error);
    return false;
  }
}; 