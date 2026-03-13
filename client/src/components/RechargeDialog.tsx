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
  CardContent,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { userAPI } from '../services/api';
import { MonetizationOn, Payment } from '@mui/icons-material';

interface RechargeDialogProps {
  open: boolean;
  onClose: () => void;
}

const RechargeDialog: React.FC<RechargeDialogProps> = ({ open, onClose }) => {
  const { user, updateUserCoins } = useAuth();
  const [amount, setAmount] = useState<number>(10);
  const [payType, setPayType] = useState<string>('alipay');
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

    // 调用后端创建支付订单
    // 注意：前端显示的是金额，后端期望的是金币数量，需要转换
    const coins = amount * 100; // 1元 = 100金币
    const response = await userAPI.createCoinRechargeOrder(coins, {
        payType: payType,
        device: /MicroMessenger/i.test(window.navigator.userAgent) ? 'wechat' : 'pc',
        method: 'jump'
      });

      const data = response.data;

      // 根据 pay_type 处理跳转或二维码等
      const payTypeResult = data.pay_type;
      const payInfo = data.pay_info as string;

      if (payTypeResult === 'jump') {
        window.location.href = payInfo;
      } else if (payTypeResult === 'html') {
        const win = window.open('', '_blank');
        if (win) {
          win.document.write(payInfo);
          win.document.close();
        }
      } else if (payTypeResult === 'qrcode' || payTypeResult === 'urlscheme') {
        window.open(payInfo, '_blank');
      } else {
        // 其它类型（jsapi、app等）暂时统一当作跳转链接处理
        window.open(payInfo, '_blank');
      }

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
    setPayType('alipay');
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
            已发起支付，请在新打开的页面完成支付。支付成功后，稍等几秒刷新页面即可看到最新金币余额。
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

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            选择支付方式
          </Typography>
          <ToggleButtonGroup
            value={payType}
            exclusive
            onChange={(e, newPayType) => {
              if (newPayType !== null) {
                setPayType(newPayType);
              }
            }}
            fullWidth
          >
            <ToggleButton value="alipay" sx={{ py: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Payment />
                <Typography>支付宝</Typography>
              </Box>
            </ToggleButton>
            <ToggleButton value="wechat" sx={{ py: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography>微信支付</Typography>
              </Box>
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <Typography variant="body2" color="text.secondary">
          支付说明：点击“充值”后系统会跳转到第三方支付页面。请在支付完成后返回本网站，系统会在收到支付平台回调后自动为您增加金币。
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