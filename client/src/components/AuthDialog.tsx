import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  TextField,
  Typography,
  Alert,
  Box,
  Tabs,
  Tab,
  Button,
  IconButton,
  InputAdornment,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  Close as CloseIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Lock as LockIcon,
  Visibility,
  VisibilityOff,
  Login as LoginIcon,
  HowToReg as RegisterIcon,
} from '@mui/icons-material';
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
  const [showPassword, setShowPassword] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleTabChange = (event: React.SyntheticEvent, newValue: 'login' | 'register') => {
    setTab(newValue);
    setError(null);
  };

  const handleSubmit = async () => {
    if (tab === 'login') {
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
      if (!username || !email || !password || !confirmPassword) {
        setError('请填写所有字段');
        return;
      }
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setError('邮箱格式不正确');
        return;
      }
      
      if (password !== confirmPassword) {
        setError('两次输入的密码不一致');
        return;
      }

      if (password.length < 6) {
        setError('密码长度至少为6位');
        return;
      }
      
      try {
        setError(null);
        setLoading(true);
        const response = await register(username, email, password);
        handleClose();
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
    setShowPassword(false);
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
        }
      }}
    >
      <DialogContent sx={{ pt: 4, pb: 3, px: 4 }}>
        {/* 关闭按钮 */}
        <IconButton
          onClick={handleClose}
          sx={{
            position: 'absolute',
            right: 12,
            top: 12,
            color: 'text.secondary',
          }}
        >
          <CloseIcon />
        </IconButton>

        {/* Tab 切换 */}
        <Tabs 
          value={tab} 
          onChange={handleTabChange} 
          variant="fullWidth"
          sx={{
            mb: 3,
            '& .MuiTabs-indicator': {
              background: 'linear-gradient(90deg, #1976d2 0%, #42a5f5 100%)',
              height: 3,
              borderRadius: 1.5,
            },
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '1rem',
              '&.Mui-selected': {
                color: '#1976d2',
              },
            },
          }}
        >
          <Tab label="登录" value="login" />
          <Tab label="注册" value="register" />
        </Tabs>

        {/* 错误提示 */}
        {error && (
          <Alert 
            severity="error" 
            sx={{ 
              mb: 3,
              borderRadius: 2,
            }}
          >
            {error}
          </Alert>
        )}
        
        {/* 用户名/邮箱输入框 */}
        <TextField
          margin="dense"
          label={tab === 'login' ? "用户名或邮箱" : "用户名"}
          type="text"
          fullWidth
          variant="outlined"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoFocus
          autoComplete={tab === 'login' ? 'username' : 'username'}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <PersonIcon color="action" />
              </InputAdornment>
            ),
          }}
          sx={{
            mb: 2,
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: '#1976d2',
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: '#1976d2',
              },
            },
          }}
        />
        
        {/* 邮箱输入框（仅注册） */}
        {tab === 'register' && (
          <TextField
            margin="dense"
            label="邮箱"
            type="email"
            fullWidth
            variant="outlined"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <EmailIcon color="action" />
                </InputAdornment>
              ),
            }}
            sx={{
              mb: 2,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#1976d2',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#1976d2',
                },
              },
            }}
          />
        )}
        
        {/* 密码输入框 */}
        <TextField
          margin="dense"
          label="密码"
          type={showPassword ? 'text' : 'password'}
          fullWidth
          variant="outlined"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <LockIcon color="action" />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => setShowPassword(!showPassword)}
                  edge="end"
                >
                  {showPassword ? <Visibility /> : <VisibilityOff />}
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{
            mb: 2,
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: '#1976d2',
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: '#1976d2',
              },
            },
          }}
        />
        
        {/* 确认密码输入框（仅注册） */}
        {tab === 'register' && (
          <TextField
            margin="dense"
            label="确认密码"
            type={showPassword ? 'text' : 'password'}
            fullWidth
            variant="outlined"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockIcon color="action" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                  >
                    {showPassword ? <Visibility /> : <VisibilityOff />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{
              mb: 2,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#1976d2',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#1976d2',
                },
              },
            }}
          />
        )}

        {/* 登录时的附加选项 */}
        {tab === 'login' && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Typography
              variant="body2"
              sx={{
                color: '#1976d2',
                cursor: 'pointer',
                '&:hover': { textDecoration: 'underline' },
              }}
              onClick={() => {
                // TODO: 实现忘记密码功能
              }}
            >
              忘记密码？
            </Typography>
          </Box>
        )}

        {/* 提交按钮 */}
        <Button
          onClick={handleSubmit}
          variant="contained"
          fullWidth
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : (tab === 'login' ? <LoginIcon /> : <RegisterIcon />)}
          sx={{
            py: 1.5,
            borderRadius: 2,
            textTransform: 'none',
            fontSize: '1rem',
            fontWeight: 600,
            background: 'linear-gradient(90deg, #1976d2 0%, #42a5f5 100%)',
            '&:hover': {
              background: 'linear-gradient(90deg, #1565c0 0%, #2196f3 100%)',
            },
            '&:disabled': {
              background: '#e0e0e0',
              color: '#9e9e9e',
            },
          }}
        >
          {loading ? '处理中...' : (tab === 'login' ? '登录' : '注册')}
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default AuthDialog;
