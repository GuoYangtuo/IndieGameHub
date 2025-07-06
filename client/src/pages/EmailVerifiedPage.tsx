import React, { useState, useEffect } from 'react';
import { Box, Typography, Container, Paper, Button, TextField, CircularProgress } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

const EmailVerificationPage: React.FC = () => {
  const [verificationCode, setVerificationCode] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const { verifyEmail, resendVerificationCode } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  useEffect(() => {
    // 从URL参数获取email和username
    const searchParams = new URLSearchParams(location.search);
    const emailParam = searchParams.get('email');
    const usernameParam = searchParams.get('username');
    
    if (emailParam) {
      setEmail(emailParam);
    }
    if (usernameParam) {
      setUsername(usernameParam);
    }
  }, [location]);
  
  // 倒计时逻辑
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);
  
  const handleVerify = async () => {
    if (!email || !verificationCode) {
      return;
    }
    
    try {
      setLoading(true);
      setErrorMessage('');
      await verifyEmail(email, verificationCode);
      // 验证成功后跳转到主页
      navigate('/');
    } catch (error: any) {
      console.error('验证失败:', error);
      setErrorMessage(error.response?.data?.message || '验证失败，请检查验证码');
    } finally {
      setLoading(false);
    }
  };
  
  const handleResend = async () => {
    if (!email) {
      return;
    }
    
    try {
      setLoading(true);
      setErrorMessage('');
      await resendVerificationCode(email);
      // 设置60秒倒计时
      setCountdown(60);
    } catch (error: any) {
      console.error('重新发送验证码失败:', error);
      setErrorMessage(error.response?.data?.message || '重新发送验证码失败');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8, mb: 4 }}>
        <Paper 
          elevation={3} 
          sx={{ 
            p: 4, 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            textAlign: 'center'
          }}
        >
          <Typography variant="h4" gutterBottom>
            验证您的邮箱
          </Typography>
          <Typography variant="body1" paragraph>
            {username ? `${username}，` : ''}我们已向 {email} 发送了一封包含验证码的邮件，请输入验证码完成注册。
          </Typography>
          
          <TextField
            margin="normal"
            fullWidth
            label="验证码"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
            placeholder="请输入6位验证码"
            inputProps={{ maxLength: 6 }}
            sx={{ mb: 2 }}
          />
          
          {errorMessage && (
            <Typography color="error" variant="body2" sx={{ mb: 2 }}>
              {errorMessage}
            </Typography>
          )}
          
          <Button 
            variant="contained" 
            color="primary" 
            fullWidth 
            onClick={handleVerify}
            disabled={loading || !verificationCode || !email}
            sx={{ mb: 2 }}
          >
            {loading ? <CircularProgress size={24} /> : '验证并完成注册'}
          </Button>
          
          <Button 
            variant="text" 
            color="primary" 
            onClick={handleResend}
            disabled={loading || countdown > 0 || !email}
          >
            {countdown > 0 ? `重新发送(${countdown}s)` : '重新发送验证码'}
          </Button>
        </Paper>
      </Box>
    </Container>
  );
};

export default EmailVerificationPage; 