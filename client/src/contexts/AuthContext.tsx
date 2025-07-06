import React, { createContext, useState, useEffect, useContext } from 'react';
import { userAPI } from '../services/api';

// 用户接口
interface User {
  id: string;
  username: string;
  email: string;
  coins: number;
  avatarUrl?: string;
  createdAt?: string;
}

// 认证上下文接口
interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (usernameOrEmail: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<any>;
  verifyEmail: (email: string, code: string) => Promise<void>;
  resendVerificationCode: (email: string) => Promise<void>;
  logout: () => void;
  updateUserCoins: (newCoins: number) => void;
  updateUser: (userData: User) => void;
  updateUserAvatar: (avatarUrl: string) => void;
  isAdmin: () => boolean;
}

// 创建认证上下文
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 认证提供者组件
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 检查用户是否已登录
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setUser(null);
          return;
        }
        
        const response = await userAPI.getCurrentUser();
        
        // 确保头像URL也包含在用户信息中
        setUser({
          id: response.data.id,
          username: response.data.username,
          email: response.data.email,
          coins: response.data.coins,
          avatarUrl: response.data.avatarUrl,
          createdAt: response.data.createdAt
        });
      } catch (err) {
        console.error('获取用户信息失败:', err);
        setUser(null);
        // 如果令牌过期或无效，清除本地存储
        localStorage.removeItem('token');
      }
      setLoading(false);
    };

    getCurrentUser();
  }, []);

  // 登录
  const login = async (usernameOrEmail: string, password: string) => {
    try {
      setError(null);
      const response = await userAPI.login(usernameOrEmail, password);
      const { token, ...userData } = response.data;
      localStorage.setItem('token', token);
      // 设置用户信息
      setUser(userData);
    } catch (err: any) {
      setError(err.response?.data?.message || '登录失败');
      throw err;
    }
  };

  // 注册
  const register = async (username: string, email: string, password: string) => {
    try {
      setError(null);
      const response = await userAPI.register(username, email, password);
      // 不再设置token和user，只返回响应数据
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || '注册失败');
      throw err;
    }
  };
  
  // 验证邮箱
  const verifyEmail = async (email: string, code: string) => {
    try {
      setError(null);
      const response = await userAPI.verifyEmail(email, code);
      const { token, ...userData } = response.data;
      localStorage.setItem('token', token);
      setUser(userData);
    } catch (err: any) {
      setError(err.response?.data?.message || '验证码验证失败');
      throw err;
    }
  };
  
  // 重新发送验证码
  const resendVerificationCode = async (email: string) => {
    try {
      setError(null);
      await userAPI.resendVerificationCode(email);
    } catch (err: any) {
      setError(err.response?.data?.message || '发送验证码失败');
      throw err;
    }
  };

  // 登出
  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  // 更新用户金币
  const updateUserCoins = (newCoins: number) => {
    if (user) {
      setUser({ ...user, coins: newCoins });
    }
  };
  
  // 更新用户信息
  const updateUser = (userData: User) => {
    setUser(userData);
  };
  
  // 更新用户头像
  const updateUserAvatar = (avatarUrl: string) => {
    if (user) {
      setUser({ ...user, avatarUrl });
    }
  };

  // 判断是否为管理员（用户名为admin）
  const isAdmin = () => {
    return user?.username === 'admin';
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      error, 
      login, 
      register,
      verifyEmail,
      resendVerificationCode,
      logout, 
      updateUserCoins,
      updateUser,
      updateUserAvatar,
      isAdmin
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// 使用认证上下文的钩子
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 