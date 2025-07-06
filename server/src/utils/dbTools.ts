import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { DEFAULT_CONTRIBUTION_RATES } from '../models/dataInitializer';

// 加载环境变量
dotenv.config();

// 数据库配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'hh20061202',
  database: process.env.DB_NAME || 'indie_game_hub',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// 创建数据库连接池
const pool = mysql.createPool(dbConfig);

// 初始化数据库
export const initDatabase = async (): Promise<void> => {
  try {
    // 检查数据库是否存在，不存在则创建
    const connection = await mysql.createConnection({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password
    });
    
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\``);
    await connection.end();
    
    // 创建表
    await createTables();
    console.log('数据库初始化成功');
  } catch (error) {
    console.error('数据库初始化失败:', error);
    throw error;
  }
};

// 创建所需的所有表
const createTables = async (): Promise<void> => {
  try {
    const conn = await pool.getConnection();
    
    // 用户表
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        email VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(100) NOT NULL,
        coins INT DEFAULT 0,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        bio TEXT,
        avatar_url VARCHAR(255)
      );
    `);
    
    // 项目表
    await conn.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        slug VARCHAR(150) NOT NULL UNIQUE,
        description TEXT,
        demoLink VARCHAR(255),
        createdBy VARCHAR(36) NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        coverImage VARCHAR(255),
        projectBalance INT DEFAULT 0,
        FOREIGN KEY (createdBy) REFERENCES users(id)
      );
    `);
    
    // 项目成员表
    await conn.query(`
      CREATE TABLE IF NOT EXISTS project_members (
        projectId VARCHAR(36) NOT NULL,
        userId VARCHAR(36) NOT NULL,
        joinedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (projectId, userId),
        FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
    
    // 项目更新表
    await conn.query(`
      CREATE TABLE IF NOT EXISTS project_updates (
        id VARCHAR(36) PRIMARY KEY,
        projectId VARCHAR(36) NOT NULL,
        content TEXT NOT NULL,
        demoLink VARCHAR(255),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        createdBy VARCHAR(36),
        isVersion BOOLEAN DEFAULT FALSE,
        versionName VARCHAR(50),
        imageUrl VARCHAR(255),
        FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (createdBy) REFERENCES users(id)
      );
    `);
    
    // 项目图片表
    await conn.query(`
      CREATE TABLE IF NOT EXISTS project_images (
        id VARCHAR(36) PRIMARY KEY,
        projectId VARCHAR(36) NOT NULL,
        url VARCHAR(255) NOT NULL,
        image_order INT NOT NULL,
        FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
      );
    `);
    
    // 提案表
    await conn.query(`
      CREATE TABLE IF NOT EXISTS proposals (
        id VARCHAR(36) PRIMARY KEY,
        title VARCHAR(150) NOT NULL,
        description TEXT NOT NULL,
        projectId VARCHAR(36) NOT NULL,
        createdBy VARCHAR(36) NOT NULL,
        status ENUM('open', 'closed', 'queued', 'completed') DEFAULT 'open',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        category VARCHAR(50),
        queuedAt TIMESTAMP NULL,
        queuedBy VARCHAR(36),
        queuedByNickname VARCHAR(100),
        FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (createdBy) REFERENCES users(id),
        FOREIGN KEY (queuedBy) REFERENCES users(id)
      );
    `);
    
    // 提案附件表
    await conn.query(`
      CREATE TABLE IF NOT EXISTS proposal_attachments (
        id VARCHAR(36) PRIMARY KEY,
        proposalId VARCHAR(36) NOT NULL,
        name VARCHAR(255) NOT NULL,
        url VARCHAR(255) NOT NULL,
        size INT NOT NULL,
        FOREIGN KEY (proposalId) REFERENCES proposals(id) ON DELETE CASCADE
      );
    `);
    
    // 提案点赞表
    await conn.query(`
      CREATE TABLE IF NOT EXISTS proposal_likes (
        proposalId VARCHAR(36) NOT NULL,
        userId VARCHAR(36) NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (proposalId, userId),
        FOREIGN KEY (proposalId) REFERENCES proposals(id) ON DELETE CASCADE,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
    
    // 悬赏表
    await conn.query(`
      CREATE TABLE IF NOT EXISTS bounties (
        id VARCHAR(36) PRIMARY KEY,
        proposalId VARCHAR(36) NOT NULL,
        userId VARCHAR(36) NOT NULL,
        amount INT NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status ENUM('active', 'pending', 'closed') DEFAULT 'active',
        FOREIGN KEY (proposalId) REFERENCES proposals(id) ON DELETE CASCADE,
        FOREIGN KEY (userId) REFERENCES users(id)
      );
    `);
    
    // 评论表
    await conn.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id VARCHAR(36) PRIMARY KEY,
        proposalId VARCHAR(36),
        projectId VARCHAR(36),
        userId VARCHAR(36) NOT NULL,
        content TEXT NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (proposalId) REFERENCES proposals(id) ON DELETE CASCADE,
        FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (userId) REFERENCES users(id)
      );
    `);
    
    // 用户收藏项目表
    await conn.query(`
      CREATE TABLE IF NOT EXISTS favorite_projects (
        userId VARCHAR(36) NOT NULL,
        projectId VARCHAR(36) NOT NULL,
        added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (userId, projectId),
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
      );
    `);
    
    // 捐赠表
    await conn.query(`
      CREATE TABLE IF NOT EXISTS donations (
        id VARCHAR(36) PRIMARY KEY,
        from_userId VARCHAR(36) NOT NULL,
        to_userId VARCHAR(36) NOT NULL,
        projectId VARCHAR(36) NOT NULL,
        amount INT NOT NULL,
        message TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        type ENUM('one-time', 'subscription') NOT NULL,
        FOREIGN KEY (from_userId) REFERENCES users(id),
        FOREIGN KEY (to_userId) REFERENCES users(id),
        FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
      );
    `);
    
    // 订阅表
    await conn.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id VARCHAR(36) PRIMARY KEY,
        from_userId VARCHAR(36) NOT NULL,
        to_userId VARCHAR(36) NOT NULL,
        projectId VARCHAR(36) NOT NULL,
        amount INT NOT NULL,
        message TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        next_payment_date TIMESTAMP NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        FOREIGN KEY (from_userId) REFERENCES users(id),
        FOREIGN KEY (to_userId) REFERENCES users(id),
        FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
      );
    `);
    
    // 提现记录表
    await conn.query(`
      CREATE TABLE IF NOT EXISTS withdrawals (
        id VARCHAR(36) PRIMARY KEY,
        projectId VARCHAR(36) NOT NULL,
        userId VARCHAR(36) NOT NULL,
        amount INT NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (userId) REFERENCES users(id)
      );
    `);
    
    // 项目贡献度表
    await conn.query(`
      CREATE TABLE IF NOT EXISTS contributions (
        projectId VARCHAR(36) NOT NULL,
        userId VARCHAR(36) NOT NULL,
        contribution_value FLOAT DEFAULT 0,
        PRIMARY KEY (projectId, userId),
        FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
    
    // 项目贡献度配置表
    await conn.query(`
      CREATE TABLE IF NOT EXISTS contribution_rates (
        projectId VARCHAR(36) PRIMARY KEY,
        proposal_creation FLOAT DEFAULT ${DEFAULT_CONTRIBUTION_RATES.proposalCreation},
        bounty_creation FLOAT DEFAULT ${DEFAULT_CONTRIBUTION_RATES.bountyCreation},
        bounty_completion FLOAT DEFAULT ${DEFAULT_CONTRIBUTION_RATES.bountyCompletion},
        one_time_contribution FLOAT DEFAULT ${DEFAULT_CONTRIBUTION_RATES.oneTimeContribution},
        long_term_contribution FLOAT DEFAULT ${DEFAULT_CONTRIBUTION_RATES.longTermContribution},
        FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
      );
    `);

    conn.release();
    console.log('数据库表创建成功');
  } catch (error) {
    console.error('创建表失败:', error);
    throw error;
  }
};

// 执行SQL查询的辅助函数
export const query = async (sql: string, params?: any[]): Promise<any> => {
  try {
    const [results] = await pool.execute(sql, params);
    return results;
  } catch (error) {
    console.error('查询执行失败:', error);
    throw error;
  }
};



// 生成唯一ID
const generateId = (): string => {
  return Date.now().toString() + Math.floor(Math.random() * 1000).toString();
};

// 导出数据库连接池，以便在其他模块中使用
export default pool;
