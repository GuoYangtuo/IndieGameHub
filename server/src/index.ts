import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { userRouter } from './routes/userRoutes';
import projectRouter from './routes/projectRoutes';
import { proposalRouter } from './routes/proposalRoutes';
import { commentRouter } from './routes/commentRoutes';
import { initDatabase } from './utils/dbTools';
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

    // 启动服务器
    app.listen(PORT, () => {
      console.log(`服务器运行在端口: ${PORT}`);
    });
    
  } catch (error) {
    console.error('应用初始化失败:', error);
  }
};

// 启动应用
initApp(); 