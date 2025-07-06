import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { findUserById } from '../models/userModel';

// JWT密钥
const JWT_SECRET = 'gamehub-secret-key';

// 扩展Request接口以包含用户ID
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      user?: {
        id: string;
        username: string;
        email: string;
      };
    }
  }
}

// 生成JWT令牌
export const generateToken = (userId: string): string => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};

// 验证令牌中间件
export const verifyToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // 获取请求头中的令牌
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ message: '未提供身份验证令牌' });
      return;
    }

    // 提取令牌
    const token = authHeader.split(' ')[1];
    
    // 验证令牌
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    
    // 检查用户是否存在
    const user = await findUserById(decoded.userId);
    if (!user) {
      res.status(401).json({ message: '无效的用户' });
      return;
    }
    
    // 将用户信息添加到请求对象
    req.userId = decoded.userId;
    req.user = {
      id: user.id,
      username: user.username,
      email: user.email
    };
    
    next();
  } catch (error) {
    res.status(401).json({ message: '无效的令牌' });
  }
}; 