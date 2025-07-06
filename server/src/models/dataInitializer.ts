import fs from 'fs';
import path from 'path';

// 默认贡献度获得率配置
export const DEFAULT_CONTRIBUTION_RATES = {
  proposalCreation: 0.1, // 创建提案获得0.1贡献度/个
  bountyCreation: 0.2, // 悬赏创建后立即获得悬赏额x0.2
  bountyCompletion: 0.8, // 提案完成后获得悬赏额剩下的0.8
  oneTimeContribution: 0.9, // 一次性贡献额x0.9
  longTermContribution: 1.0 // 长期贡献额x1
};

// 数据文件路径
export const DATA_DIR = path.join(__dirname, '../../src/data');
export const USERS_FILE = path.join(DATA_DIR, 'users.json');
export const PROJECTS_DIR = path.join(DATA_DIR, 'projects');
export const PROJECTS_FILE = path.join(DATA_DIR, 'projects.json');
