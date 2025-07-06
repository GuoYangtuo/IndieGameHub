import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Alert,
  Box,
  Tabs,
  Tab
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface AuthDialogProps {
  open: boolean;
  onClose: () => void;
  initialTab?: 'login' | 'register';
}

const AuthDialog: React.FC<AuthDialogProps> = ({ open, onClose, initialTab = 'login' }) => {
  const [tab, setTab] = useState<'login' | 'register'>(initialTab);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleTabChange = (event: React.SyntheticEvent, newValue: 'login' | 'register') => {
    setTab(newValue);
    setError(null);
  };

  const handleSubmit = async () => {
    if (tab === 'login') {
      // 登录逻辑
      if (!username || !password) {
        setError('请填写用户名/邮箱和密码');
        return;
      }
      
      try {
        setError(null);
        setLoading(true);
        await login(username, password);
        onClose();
      } catch (err: any) {
        setError(err.response?.data?.message || '登录失败，请检查用户名/邮箱和密码');
      } finally {
        setLoading(false);
      }
    } else {
      // 注册逻辑
      if (!username || !email || !password || !confirmPassword) {
        setError('请填写所有字段');
        return;
      }
      
      // 验证邮箱格式
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setError('邮箱格式不正确');
        return;
      }
      
      if (password !== confirmPassword) {
        setError('两次输入的密码不一致');
        return;
      }
      
      try {
        setError(null);
        setLoading(true);
        const response = await register(username, email, password);
        // 关闭对话框
        handleClose();
        // 跳转到验证码验证页面
        navigate(`/verify-email?email=${email}&username=${username}`);
      } catch (err: any) {
        setError(err.response?.data?.message || '注册失败，请稍后再试');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleClose = () => {
    setUsername('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Tabs value={tab} onChange={handleTabChange} centered>
          <Tab label="登录" value="login" />
          <Tab label="注册" value="register" />
        </Tabs>
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <TextField
          margin="dense"
          label={tab === 'login' ? "用户名或邮箱" : "用户名"}
          type="text"
          fullWidth
          variant="outlined"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoFocus
        />
        
        {tab === 'register' && (
          <TextField
            margin="dense"
            label="邮箱"
            type="email"
            fullWidth
            variant="outlined"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        )}
        
        <TextField
          margin="dense"
          label="密码"
          type="password"
          fullWidth
          variant="outlined"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        
        {tab === 'register' && (
          <TextField
            margin="dense"
            label="确认密码"
            type="password"
            fullWidth
            variant="outlined"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>取消</Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={loading}
        >
          {loading ? '处理中...' : tab === 'login' ? '登录' : '注册'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AuthDialog; 