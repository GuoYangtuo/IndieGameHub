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
        githubRepoUrl VARCHAR(500),
        githubAccessToken VARCHAR(500),
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
        parentId VARCHAR(36),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (proposalId) REFERENCES proposals(id) ON DELETE CASCADE,
        FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (userId) REFERENCES users(id),
        FOREIGN KEY (parentId) REFERENCES comments(id) ON DELETE CASCADE
      );
    `);
    
    // 在线讨论区（聊天房间）表
    await conn.query(`
      CREATE TABLE IF NOT EXISTS chat_rooms (
        id VARCHAR(36) PRIMARY KEY,
        commentId VARCHAR(36) NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (commentId) REFERENCES comments(id) ON DELETE CASCADE
      );
    `);
    
    // 聊天消息表
    await conn.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id VARCHAR(36) PRIMARY KEY,
        chatRoomId VARCHAR(36) NOT NULL,
        userId VARCHAR(36) NOT NULL,
        content TEXT NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (chatRoomId) REFERENCES chat_rooms(id) ON DELETE CASCADE,
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

    // 金币充值订单表
    await conn.query(`
      CREATE TABLE IF NOT EXISTS recharge_orders (
        id VARCHAR(36) PRIMARY KEY,
        userId VARCHAR(36) NOT NULL,
        out_trade_no VARCHAR(64) NOT NULL UNIQUE,
        trade_no VARCHAR(64),
        money DECIMAL(10,2) NOT NULL,
        coins INT NOT NULL,
        pay_type VARCHAR(32),
        status ENUM('pending', 'paid', 'closed', 'failed') DEFAULT 'pending',
        raw_notify TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
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

    // 意见征询表
    await conn.query(`
      CREATE TABLE IF NOT EXISTS project_surveys (
        id VARCHAR(36) PRIMARY KEY,
        projectId VARCHAR(36) NOT NULL,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        useVoting BOOLEAN DEFAULT FALSE,
        allowFreeResponse BOOLEAN DEFAULT FALSE,
        endTime TIMESTAMP NULL,
        isManualEnd BOOLEAN DEFAULT FALSE,
        isEnded BOOLEAN DEFAULT FALSE,
        endedAt TIMESTAMP NULL,
        createdBy VARCHAR(36) NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (createdBy) REFERENCES users(id)
      );
    `);

    // 征询图片表
    await conn.query(`
      CREATE TABLE IF NOT EXISTS survey_images (
        id VARCHAR(36) PRIMARY KEY,
        surveyId VARCHAR(36) NOT NULL,
        url VARCHAR(255) NOT NULL,
        image_order INT NOT NULL,
        FOREIGN KEY (surveyId) REFERENCES project_surveys(id) ON DELETE CASCADE
      );
    `);

    // 投票选项表
    await conn.query(`
      CREATE TABLE IF NOT EXISTS survey_options (
        id VARCHAR(36) PRIMARY KEY,
        surveyId VARCHAR(36) NOT NULL,
        optionText VARCHAR(200) NOT NULL,
        optionOrder INT NOT NULL,
        FOREIGN KEY (surveyId) REFERENCES project_surveys(id) ON DELETE CASCADE
      );
    `);

    // 用户投票记录表
    await conn.query(`
      CREATE TABLE IF NOT EXISTS survey_votes (
        id VARCHAR(36) PRIMARY KEY,
        surveyId VARCHAR(36) NOT NULL,
        optionId VARCHAR(36) NOT NULL,
        userId VARCHAR(36) NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_survey_user (surveyId, userId),
        FOREIGN KEY (surveyId) REFERENCES project_surveys(id) ON DELETE CASCADE,
        FOREIGN KEY (optionId) REFERENCES survey_options(id) ON DELETE CASCADE,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // 用户自由发言表
    await conn.query(`
      CREATE TABLE IF NOT EXISTS survey_responses (
        id VARCHAR(36) PRIMARY KEY,
        surveyId VARCHAR(36) NOT NULL,
        userId VARCHAR(36) NOT NULL,
        content TEXT NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (surveyId) REFERENCES project_surveys(id) ON DELETE CASCADE,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // 用户提交记录表（跟踪用户是否已提交）
    await conn.query(`
      CREATE TABLE IF NOT EXISTS survey_submissions (
        id VARCHAR(36) PRIMARY KEY,
        surveyId VARCHAR(36) NOT NULL,
        userId VARCHAR(36) NOT NULL,
        submittedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_survey_user_submission (surveyId, userId),
        FOREIGN KEY (surveyId) REFERENCES project_surveys(id) ON DELETE CASCADE,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // 标签表
    await conn.query(`
      CREATE TABLE IF NOT EXISTS project_tags (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE,
        color VARCHAR(20) DEFAULT '#1976d2',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 项目标签关联表
    await conn.query(`
      CREATE TABLE IF NOT EXISTS project_tag_map (
        projectId VARCHAR(36) NOT NULL,
        tagId VARCHAR(36) NOT NULL,
        PRIMARY KEY (projectId, tagId),
        FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (tagId) REFERENCES project_tags(id) ON DELETE CASCADE
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

// 数据库迁移函数 - 更新现有表结构
export const migrateDatabase = async (): Promise<void> => {
  try {
    const conn = await pool.getConnection();
    
    // 检查 comments 表是否有 parentId 字段
    const [columns] = await conn.query('SHOW COLUMNS FROM comments LIKE "parentId"');
    if (Array.isArray(columns) && columns.length === 0) {
      await conn.query('ALTER TABLE comments ADD COLUMN parentId VARCHAR(36) AFTER content');
      console.log('已添加 parentId 字段到 comments 表');
    }
    
    // 检查是否存在 chat_rooms 表
    const [tables] = await conn.query('SHOW TABLES LIKE "chat_rooms"');
    if (Array.isArray(tables) && tables.length === 0) {
      // 创建 chat_rooms 表
      await conn.query(`
        CREATE TABLE IF NOT EXISTS chat_rooms (
          id VARCHAR(36) PRIMARY KEY,
          commentId VARCHAR(36) NOT NULL,
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (commentId) REFERENCES comments(id) ON DELETE CASCADE
        )
      `);
      console.log('已创建 chat_rooms 表');
    }
    
    // 检查是否存在 chat_messages 表
    const [msgTables] = await conn.query('SHOW TABLES LIKE "chat_messages"');
    if (Array.isArray(msgTables) && msgTables.length === 0) {
      // 创建 chat_messages 表
      await conn.query(`
        CREATE TABLE IF NOT EXISTS chat_messages (
          id VARCHAR(36) PRIMARY KEY,
          chatRoomId VARCHAR(36) NOT NULL,
          userId VARCHAR(36) NOT NULL,
          content TEXT NOT NULL,
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (chatRoomId) REFERENCES chat_rooms(id) ON DELETE CASCADE,
          FOREIGN KEY (userId) REFERENCES users(id)
        )
      `);
      console.log('已创建 chat_messages 表');
    }
    
    conn.release();
    console.log('数据库迁移完成');
  } catch (error) {
    console.error('数据库迁移失败:', error);
  }
};



// 生成唯一ID
const generateId = (): string => {
  return Date.now().toString() + Math.floor(Math.random() * 1000).toString();
};

// 导出数据库连接池，以便在其他模块中使用
export default pool;
