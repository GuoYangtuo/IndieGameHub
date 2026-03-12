import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import http from 'http';
import { userRouter } from './routes/userRoutes';
import projectRouter from './routes/projectRoutes';
import { proposalRouter } from './routes/proposalRoutes';
import { commentRouter } from './routes/commentRoutes';
import { surveyRouter } from './routes/surveyRoutes';
import notificationRouter from './routes/notificationRoutes';
import betCampaignRouter from './routes/betCampaignRoutes';
import { initDatabase, migrateDatabase, migrateProjectFeatures } from './utils/dbTools';
import { initializeWebSocket } from './websocket';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// 初始化数据库
const initApp = async () => {
  try {
    // 初始化MySQL数据库
    await initDatabase();
    
    // 执行数据库迁移（添加新字段和新表）
    await migrateDatabase();
    
    // 执行项目功能模块字段迁移
    await migrateProjectFeatures();
    
    // 中间件
    app.use(cors());
    app.use(morgan('dev'));
    app.use(express.json());

    // 配置静态文件服务
    app.use(express.static(path.join(__dirname, '../../public')));
    app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

    // 路由
    app.use('/api/users', userRouter);
    app.use('/api/projects', projectRouter);
    app.use('/api/proposals', proposalRouter);
    app.use('/api/comments', commentRouter);
    app.use('/api/surveys', surveyRouter);
    app.use('/api/notifications', notificationRouter);
    app.use('/api/bet-campaigns', betCampaignRouter);

    // 创建 HTTP 服务器
    const server = http.createServer(app);
    
    // 初始化 WebSocket
    const ws = initializeWebSocket(server);
    
    // 将 ws 实例挂载到 app 上，供其他模块使用
    (app as any).ws = ws;

    // 启动服务器
    server.listen(PORT, () => {
      console.log(`服务器运行在端口: ${PORT}`);
    });
    
  } catch (error) {
    console.error('应用初始化失败:', error);
  }
};

// 启动应用
initApp();
