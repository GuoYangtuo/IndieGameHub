import axios from 'axios';

// 创建axios实例
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// 请求拦截器，添加认证令牌
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 用户API
export const userAPI = {
  // 注册
  register: (username: string, email: string, password: string) => 
    api.post('/users/register', { username, email, password }),
  
  // 登录
  login: (usernameOrEmail: string, password: string) => 
    api.post('/users/login', { usernameOrEmail, password }),
  
  // 验证邮箱验证码
  verifyEmail: (email: string, code: string) =>
    api.post('/users/verify-email', { email, code }),
  
  // 重新发送验证码
  resendVerificationCode: (email: string) =>
    api.post('/users/resend-verification-code', { email }),
  
  // 获取当前用户
  getCurrentUser: () => api.get('/users/me'),
  
  // 充值金币
  rechargeCoins: (amount: number) => api.post('/users/recharge', { amount }),
  
  // 更新金币
  updateCoins: (amount: number) => api.post('/users/coins', { amount }),
  
  // 获取用户信息
  getUserById: (id: string) => api.get(`/users/${id}`),
  
  // 获取个人资料
  getProfile: () => api.get('/users/me'),
  
  // 获取多个用户信息
  getUsersByIds: (ids: string[]) => api.post('/users/batch', { ids }),
  
  // 搜索用户
  searchUsersByUsername: (username: string) => api.get(`/users/search?username=${username}`),
  
  // 更新用户简介
  updateBio: (bio: string) => api.put('/users/me/bio', { bio }),
  
  // 上传头像
  uploadAvatar: (formData: FormData) => 
    api.post('/users/me/avatar', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
    }),
  
  // 删除账户
  deleteAccount: () => api.delete('/users/account'),
  
  // 关注项目
  addFavoriteProject: (projectId: string) => api.post(`/users/favorites/${projectId}`),
  
  // 取消关注项目
  removeFavoriteProject: (projectId: string) => api.delete(`/users/favorites/${projectId}`),
  
  // 获取关注的项目
  getFavoriteProjects: () => api.get('/users/favorites'),
  
  // 获取关注项目的更新
  getFavoriteProjectsUpdates: () => api.get('/users/favorites/updates'),
  
  // 获取用户创建的提案
  getCreatedProposals: () => api.get('/users/created-proposals'),
  
  // 一次性捐赠
  donate: (projectId: string, amount: number, message?: string) => {
    return api.post('/users/donate', { projectId, amount, message });
  },
  
  // 创建订阅捐赠
  subscribe: (projectId: string, amount: number, message?: string) => {
    return api.post('/users/subscribe', { projectId, amount, message });
  },
  
  // 取消订阅
  unsubscribe: (subscriptionId: string) => {
    return api.delete(`/users/subscriptions/${subscriptionId}`);
  },
  
  // 获取用户的捐赠记录
  getUserDonations: () => {
    return api.get('/users/donations');
  },
  
  // 获取用户接收的捐赠
  getUserReceivedDonations: () => {
    return api.get('/users/received-donations');
  },
  
  // 获取用户创建的悬赏
  getUserBounties: () => {
    return api.get('/users/bounties');
  },
  
  // 关闭悬赏并发放奖励
  closeBounty: (bountyId: string) => {
    return api.post(`/proposals/bounty/${bountyId}/close`);
  }
};

// 项目API
export const projectAPI = {
  // 获取所有项目
  getProjects: () => api.get('/projects'),
  
  // 获取用户的项目
  getUserProjects: () => api.get('/projects/user'),
  
  // 根据ID获取项目
  getProjectById: (id: string) => api.get(`/projects/id/${id}`),
  
  // 根据Slug获取项目
  getProjectBySlug: (slug: string) => api.get(`/projects/slug/${slug}`),
  
  // 检查项目名称是否存在
  checkProjectNameExists: (name: string) => api.get(`/projects/check-name?name=${encodeURIComponent(name)}`),
  
  // 获取项目详情页完整数据（一次性获取所有需要的数据）
  getProjectDetailComplete: (slug: string) => api.get(`/projects/detail/${slug}`),
  
  // 创建项目
  createProject: (name: string, description: string, demoLink?: string) => 
    api.post('/projects', { name, description, demoLink }),
  
  // 创建带封面图片的项目
  createProjectWithCover: (formData: FormData) => 
    api.post('/projects/with-cover', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    }),
  
  // 添加项目更新
  addUpdate: (projectId: string, content: string, demoLink?: string, isVersion?: boolean, versionName?: string) => 
    api.post(`/projects/${projectId}/updates`, { content, demoLink, isVersion, versionName }),
    
  // 添加带图片的项目更新
  addUpdateWithImage: (projectId: string, formData: FormData) => 
    api.post(`/projects/${projectId}/updates/image`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    }),
  
  // 更新项目信息
  updateProject: (projectId: string, name: string, description: string, demoLink?: string) => 
    api.put(`/projects/${projectId}`, { name, description, demoLink }),
  
  // 通过用户名添加项目成员
  addMemberByUsername: (projectId: string, username: string) => 
    api.post(`/projects/${projectId}/members/username`, { username }),
    
  // 移除项目成员
  removeMember: (projectId: string, memberId: string) => 
    api.delete(`/projects/${projectId}/members/${memberId}`),
  
  // 添加项目成员
  addMember: (projectId: string, memberId: string) => 
    api.post(`/projects/${projectId}/members`, { memberId }),
  
  // 删除项目
  deleteProject: (projectId: string) => api.delete(`/projects/${projectId}`),
  
  // 设置封面图片
  setCoverImage: (projectId: string, updateId: string) => 
    api.post(`/projects/${projectId}/set-cover`, { updateId }),
    
  // 创建项目评论
  createComment: (projectId: string, content: string) => 
    api.post(`/comments/projects/${projectId}/comments`, { content }),
    
  // 添加项目展示图片
  addProjectDisplayImage: (formData: FormData) => 
    api.post(`/projects/${formData.get('projectId')}/display-images`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    }),
  
  // 删除项目展示图片
  deleteProjectDisplayImage: (projectId: string, imageId: string) => 
    api.delete(`/projects/${projectId}/display-images/${imageId}`),
  
  // 更新项目展示图片顺序
  updateProjectImagesOrder: (projectId: string, orderData: Array<{id: string, order: number}>) => 
    api.put(`/projects/${projectId}/display-images/order`, { orderData }),
    
  // 从项目账户提取资金
  withdrawFromProject: (projectId: string, amount: number) => 
    api.post(`/projects/${projectId}/withdraw`, { amount }),
    
  // 获取项目提款记录
  getProjectWithdrawals: (projectId: string) => 
    api.get(`/projects/${projectId}/withdrawals`),
    
  // 获取用户在项目中的贡献度
  getUserProjectContribution: (projectId: string) => 
    api.get(`/projects/${projectId}/contributions`),
    
  // 更新项目贡献度获得率
  updateContributionRates: (projectId: string, rates: any) => 
    api.put(`/projects/${projectId}/contribution-rates`, rates),
    
  // 添加一次性贡献或长期贡献
  addContribution: (projectId: string, amount: number, isLongTerm: boolean) => 
    api.post(`/projects/${projectId}/contribute`, { amount, isLongTerm })
};

// 提案API
export const proposalAPI = {
  // 获取项目的所有提案
  getProjectProposals: (projectId: string) => 
    api.get(`/proposals/project/${projectId}`),
  
  // 获取提案详情
  getProposalById: (id: string) => api.get(`/proposals/${id}`),
  
  // 创建提案
  createProposal: (title: string, description: string, projectId: string, category?: string) => 
    api.post('/proposals', { title, description, projectId, category }),
    
  // 创建带附件的提案
  createProposalWithAttachments: (formData: FormData) => 
    api.post('/proposals/attachments', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    }),
  
  // 点赞提案
  likeProposal: (id: string) => api.post(`/proposals/${id}/like`, { action: 'like' }),
  
  // 取消点赞提案
  unlikeProposal: (id: string) => api.post(`/proposals/${id}/like`, { action: 'unlike' }),
  
  // 关闭提案
  closeProposal: (id: string) => api.post(`/proposals/${id}/close`),
  
  // 创建悬赏
  createBounty: (proposalId: string, amount: number, deadline?: string) => 
    api.post(`/proposals/${proposalId}/bounty`, { amount, deadline }),
  
  // 删除提案
  deleteProposal: (id: string) => api.delete(`/proposals/delete/${id}`),
  
  // 添加提案到任务队列
  addToTaskQueue: (proposalId: string) => api.post(`/proposals/${proposalId}/task-queue`),
  
  // 从任务队列移除提案
  removeFromTaskQueue: (proposalId: string) => api.post(`/proposals/${proposalId}/remove-from-queue`),
  
  // 更新提案
  updateProposal: (id: string, title: string, description: string) => 
    api.put(`/proposals/${id}`, { title, description }),
    
  // 完成提案
  completeTask: (proposalId: string) => api.post(`/proposals/${proposalId}/complete`)
};

// 评论API
export const commentAPI = {
  // 创建提案评论
  createComment: (proposalId: string, content: string) => 
    api.post(`/comments/proposals/${proposalId}/comments`, { content }),
  
  // 删除评论
  deleteComment: (id: string) => api.delete(`/comments/${id}`),
  
  // 创建项目评论
  createProjectComment: (projectId: string, content: string) => 
    api.post(`/comments/projects/${projectId}/comments`, { content }),
    
  // 获取提案评论
  getProposalComments: (proposalId: string) =>
    api.get(`/comments/proposals/${proposalId}/comments`)
};

// 管理员API
export const adminAPI = {
  // 获取所有用户（分页）
  getAllUsers: (page: number = 1, limit: number = 20) => 
    api.get(`/users/admin/users?page=${page}&limit=${limit}`),
  
  // 获取所有项目（分页）
  getAllProjects: (page: number = 1, limit: number = 20) => 
    api.get(`/users/admin/projects?page=${page}&limit=${limit}`),
  
  // 修改用户金币
  updateUserCoins: (userId: string, coins: number, reason?: string) => 
    api.post('/users/admin/users/coins', { userId, coins, reason }),
  
  // 删除项目
  deleteProject: (projectId: string) => 
    api.delete(`/users/admin/projects/${projectId}`),
    
  // 直接创建用户（无需邮箱验证）
  createUser: (username: string, email: string, password: string, coins: number = 0) => 
    api.post('/users/admin/users/create', { username, email, password, coins })
};

// 用户活动和贡献API
export const activityAPI = {
  // 获取用户活动记录
  getUserActivities: (userId: string) => 
    api.get(`/users/${userId}/activities`),
  
  // 获取用户贡献的项目
  getUserContributedProjects: (userId: string) => 
    api.get(`/users/${userId}/contributed-projects`),
  
  // 获取用户的公开项目
  getUserPublicProjects: (userId: string) => 
    api.get(`/users/${userId}/public-projects`),
    
  // 获取项目贡献者列表
  getProjectContributors: (projectId: string) => 
    api.get(`/projects/${projectId}/contributors`)
}; 