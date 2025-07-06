import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
  TextField,
  Button,
  Alert,
  Card,
  CardContent
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { userAPI } from '../services/api';
import { MonetizationOn } from '@mui/icons-material';

interface RechargeDialogProps {
  open: boolean;
  onClose: () => void;
}

const RechargeDialog: React.FC<RechargeDialogProps> = ({ open, onClose }) => {
  const { user, updateUserCoins } = useAuth();
  const [amount, setAmount] = useState<number>(10);
  const [recharging, setRecharging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // 处理充值
  const handleRecharge = async () => {
    if (!amount || amount <= 0) {
      setError('请输入有效的充值金额');
      return;
    }

    try {
      setRecharging(true);
      setError(null);
      setSuccess(false);

      const response = await userAPI.updateCoins(amount);
      
      // 更新用户金币
      updateUserCoins(response.data.coins);
      
      setSuccess(true);
      setAmount(10); // 重置金额
    } catch (err: any) {
      console.error('充值失败:', err);
      setError(err.response?.data?.message || '充值失败，请稍后再试');
    } finally {
      setRecharging(false);
    }
  };

  // 预设金额选项
  const amountOptions = [10, 50, 100, 200, 500, 1000];

  // 处理对话框关闭
  const handleClose = () => {
    setError(null);
    setSuccess(false);
    onClose();
  };

  if (!user) {
    return (
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>金币充值</DialogTitle>
        <DialogContent>
          <Alert severity="warning">请先登录后再进行充值操作</Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>关闭</Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <MonetizationOn color="primary" sx={{ mr: 1 }} />
          金币充值
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Typography variant="h6" gutterBottom>
          当前金币余额: {user?.coins || 0}
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            充值成功！您的金币已更新。
          </Alert>
        )}
        
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            选择充值金额
          </Typography>
          
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
            {amountOptions.map((option) => (
              <Card 
                key={option}
                sx={{ 
                  width: { xs: 'calc(50% - 8px)', sm: 'calc(33.33% - 11px)' },
                  textAlign: 'center',
                  cursor: 'pointer',
                  bgcolor: amount === option ? 'primary.light' : 'background.paper',
                  color: amount === option ? 'white' : 'inherit'
                }}
                onClick={() => setAmount(option)}
              >
                <CardContent sx={{ py: 2 }}>
                  <Typography variant="h6">{option}</Typography>
                  <Typography variant="body2">金币</Typography>
                </CardContent>
              </Card>
            ))}
          </Box>
          
          <TextField
            fullWidth
            label="自定义金额"
            type="number"
            value={amount}
            onChange={(e) => setAmount(Math.max(1, parseInt(e.target.value) || 0))}
            inputProps={{ min: 1 }}
            sx={{ mb: 2 }}
          />
        </Box>
        
        <Typography variant="body2" color="text.secondary">
          注意：当前为演示系统，充值不会产生实际费用。在实际应用中，这里将接入支付系统。
        </Typography>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={handleClose}>取消</Button>
        <Button 
          variant="contained" 
          color="primary"
          onClick={handleRecharge}
          disabled={recharging || !amount || amount <= 0}
          startIcon={<MonetizationOn />}
        >
          {recharging ? '充值中...' : `充值 ${amount} 金币`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RechargeDialog; 