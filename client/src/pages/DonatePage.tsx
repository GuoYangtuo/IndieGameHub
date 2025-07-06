import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Paper,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Divider,
  Avatar,
  Tab,
  Tabs,
  Switch,
  FormControlLabel,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Link
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { userAPI, projectAPI } from '../services/api';
import { 
  FavoriteBorder, 
  Favorite, 
  MonetizationOn, 
  ArrowBack,
  Repeat,
  CalendarMonth,
  SubscriptionsOutlined
} from '@mui/icons-material';
import { formatDate } from '../utils/dateUtils';

// 捐赠金额选项
const donationOptions = [5, 10, 20, 50, 100, 200];

// 订阅类型接口
interface Subscription {
  id: string;
  projectId: string;
  amount: number;
  nextPaymentDate: string;
  isActive: boolean;
}

const DonatePage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user, updateUserCoins } = useAuth();
  
  const [project, setProject] = useState<any>(null);
  const [creator, setCreator] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [donationType, setDonationType] = useState<'one-time' | 'subscription'>('one-time');
  const [amount, setAmount] = useState<number>(10);
  const [message, setMessage] = useState('');
  const [donating, setDonating] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // 用户的订阅状态
  const [userSubscriptions, setUserSubscriptions] = useState<Subscription[]>([]);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [activeSubscription, setActiveSubscription] = useState<Subscription | null>(null);
  
  // 订阅取消确认对话框
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  
  // 获取项目和创建者信息
  useEffect(() => {
    const fetchData = async () => {
      if (!slug) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // 获取项目详情
        const projectResponse = await projectAPI.getProjectBySlug(slug);
        setProject(projectResponse.data);
        
        // 获取创建者信息
        if (projectResponse.data.createdBy) {
          try {
            const creatorsResponse = await userAPI.getUsersByIds([projectResponse.data.createdBy]);
            if (creatorsResponse.data && creatorsResponse.data.length > 0) {
              setCreator(creatorsResponse.data[0]);
            }
          } catch (err) {
            console.error('获取创建者信息失败:', err);
          }
        }
        
        // 如果用户已登录，获取订阅信息
        if (user) {
          try {
            const donationsResponse = await userAPI.getUserDonations();
            const subscriptions = donationsResponse.data.subscriptions || [];
            setUserSubscriptions(subscriptions);
            
            // 检查是否有对当前项目的活跃订阅
            const projectSubscription = subscriptions.find(
              (sub: Subscription) => sub.projectId === projectResponse.data.id && sub.isActive
            );
            
            if (projectSubscription) {
              setHasActiveSubscription(true);
              setActiveSubscription(projectSubscription);
            }
          } catch (err) {
            console.error('获取用户订阅信息失败:', err);
          }
        }
      } catch (err: any) {
        console.error('获取项目详情失败:', err);
        setError(err.response?.data?.message || '获取项目详情失败，请稍后再试');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [slug, user]);
  
  // 处理捐赠类型切换
  const handleDonationTypeChange = (event: React.SyntheticEvent, newValue: 'one-time' | 'subscription') => {
    setDonationType(newValue);
  };
  
  // 处理捐赠
  const handleDonate = async () => {
    if (!user || !project || amount <= 0) return;
    
    try {
      setDonating(true);
      setError(null);
      
      // 根据捐赠类型选择不同的API
      let response;
      if (donationType === 'one-time') {
        // 一次性捐赠
        response = await userAPI.donate(project.id, amount, message);
        setSuccessMessage(`感谢您的捐赠！您已成功向开发者捐赠了 ${amount} 金币。`);
      } else {
        // 订阅捐赠
        response = await userAPI.subscribe(project.id, amount, message);
        setSuccessMessage(`感谢您的支持！您已成功设置了每月 ${amount} 金币的捐赠订阅，第一笔付款已完成。`);
      }
      
      // 更新用户金币
      updateUserCoins(response.data.userCoins);
      
      // 如果是订阅，更新订阅状态
      if (donationType === 'subscription') {
        setHasActiveSubscription(true);
        setActiveSubscription(response.data.subscription);
        setUserSubscriptions([...userSubscriptions, response.data.subscription]);
      }
      
      setSuccess(true);
      setMessage('');
    } catch (err: any) {
      console.error('捐赠失败:', err);
      setError(err.response?.data?.message || '捐赠失败，请稍后再试');
    } finally {
      setDonating(false);
    }
  };
  
  // 处理取消订阅
  const handleCancelSubscription = async () => {
    if (!activeSubscription) return;
    
    try {
      setDonating(true);
      setError(null);
      
      await userAPI.unsubscribe(activeSubscription.id);
      
      setHasActiveSubscription(false);
      setActiveSubscription(null);
      
      // 更新用户订阅列表
      setUserSubscriptions(
        userSubscriptions.map(sub => 
          sub.id === activeSubscription.id ? { ...sub, isActive: false } : sub
        )
      );
      
      setCancelDialogOpen(false);
      setSuccessMessage('您的订阅已成功取消，不会再收取后续费用。');
      setSuccess(true);
    } catch (err: any) {
      console.error('取消订阅失败:', err);
      setError(err.response?.data?.message || '取消订阅失败，请稍后再试');
    } finally {
      setDonating(false);
    }
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (error || !project) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">{error || '项目不存在'}</Alert>
        <Button 
          startIcon={<ArrowBack />}
          sx={{ mt: 2 }} 
          onClick={() => navigate('/')}
        >
          返回首页
        </Button>
      </Container>
    );
  }
  
  // 渲染活跃订阅信息
  const renderActiveSubscription = () => {
    if (!hasActiveSubscription || !activeSubscription) {
      return null;
    }
    
    return (
      <Paper sx={{ p: 3, mb: 3, bgcolor: 'primary.light', color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <SubscriptionsOutlined sx={{ mr: 1, fontSize: 28 }} />
          <Typography variant="h6">您已订阅支持该项目</Typography>
        </Box>
        
        <Typography variant="body1" paragraph>
          您当前设置的每月捐赠金额: <strong>{activeSubscription.amount} 金币</strong>
        </Typography>
        
        <Typography variant="body1" paragraph>
          下次付款日期: {formatDate(activeSubscription.nextPaymentDate)}
        </Typography>
        
        <Button 
          variant="outlined" 
          color="inherit"
          onClick={() => setCancelDialogOpen(true)}
          sx={{ mt: 1 }}
        >
          取消订阅
        </Button>
      </Paper>
    );
  };
  
  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 8 }}>
      <Button 
        startIcon={<ArrowBack />}
        sx={{ mb: 3 }} 
        onClick={() => navigate(`/${slug}`)}
      >
        返回项目
      </Button>
      
      <Typography variant="h4" gutterBottom>
        支持 {project.name} 的开发
      </Typography>
      
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
        {/* 左侧：项目和创建者信息 */}
        <Box sx={{ flex: { xs: '1', md: '0.4' } }}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              关于项目
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Typography variant="body1">
                {project.description.length > 150 
                  ? `${project.description.substring(0, 150)}...` 
                  : project.description}
              </Typography>
            </Box>
            
            <Divider sx={{ my: 2 }} />
            
            <Typography variant="h6" gutterBottom>
              开发者
            </Typography>
            
            {creator ? (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar 
                  src={creator.avatarUrl} 
                  alt={creator.username}
                  sx={{ mr: 2, width: 48, height: 48 }}
                >
                  {creator.username.charAt(0).toUpperCase()}
                </Avatar>
                <Box>
                  <Typography variant="subtitle1">
                    {creator.username}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {creator.bio || '这位开发者比较神秘，没有留下个人介绍'}
                  </Typography>
                </Box>
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                无法获取开发者信息
              </Typography>
            )}
          </Paper>
          
          <Alert severity="info">
            您的支持将直接帮助开发者继续完善这个项目。非常感谢您的慷慨捐助！
          </Alert>
        </Box>
        
        {/* 右侧：捐赠表单 */}
        <Box sx={{ flex: { xs: '1', md: '0.6' } }}>
          {!user ? (
            <Paper sx={{ p: 3 }}>
              <Alert severity="warning" sx={{ mb: 2 }}>
                请先登录后再进行捐赠
              </Alert>
            </Paper>
          ) : (
            <>
              {/* 显示当前的订阅状态 */}
              {renderActiveSubscription()}
              
              {success ? (
                <Paper sx={{ p: 3 }}>
                  <Box sx={{ textAlign: 'center', py: 3 }}>
                    <Favorite color="error" sx={{ fontSize: 60, mb: 2 }} />
                    <Typography variant="h5" gutterBottom>
                      感谢您的支持！
                    </Typography>
                    <Typography variant="body1" paragraph>
                      {successMessage}
                    </Typography>
                    <Button 
                      variant="contained" 
                      onClick={() => setSuccess(false)}
                      sx={{ mt: 2 }}
                    >
                      继续捐赠
                    </Button>
                  </Box>
                </Paper>
              ) : (
                <Paper sx={{ p: 3 }}>
                  {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                      {error}
                    </Alert>
                  )}
                  
                  {hasActiveSubscription ? (
                    <Alert severity="info" sx={{ mb: 3 }}>
                      您已经设置了订阅支持，但您仍然可以进行额外的一次性捐赠。
                    </Alert>
                  ) : (
                    <Tabs 
                      value={donationType} 
                      onChange={handleDonationTypeChange}
                      sx={{ mb: 3 }}
                      centered
                    >
                      <Tab 
                        label="一次性捐赠" 
                        value="one-time" 
                        icon={<MonetizationOn />} 
                        iconPosition="start"
                      />
                      <Tab 
                        label="每月订阅" 
                        value="subscription" 
                        icon={<Repeat />} 
                        iconPosition="start"
                      />
                    </Tabs>
                  )}
                  
                  <Typography variant="h6" gutterBottom>
                    {donationType === 'one-time' ? '选择捐赠金额' : '选择每月订阅金额'}
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    当前金币余额: {user?.coins || 0}
                  </Typography>
                  
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, mb: 3 }}>
                    {donationOptions.map((option) => (
                      <Card 
                        key={option}
                        sx={{ 
                          textAlign: 'center',
                          cursor: 'pointer',
                          bgcolor: amount === option ? 'primary.light' : 'background.paper',
                          color: amount === option ? 'white' : 'inherit'
                        }}
                        onClick={() => setAmount(option)}
                      >
                        <CardContent>
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
                    sx={{ mb: 3 }}
                  />
                  
                  {donationType === 'subscription' && (
                    <Alert severity="info" sx={{ mb: 3 }} icon={<CalendarMonth />}>
                      设置订阅后将立即收取第一笔费用，以后将每月自动扣除相同金额，直到您取消订阅。
                    </Alert>
                  )}
                  
                  <TextField
                    fullWidth
                    label="留言（可选）"
                    multiline
                    rows={3}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    sx={{ mb: 3 }}
                  />
                  
                  <Button
                    fullWidth
                    variant="contained"
                    color="primary"
                    size="large"
                    startIcon={donationType === 'one-time' ? <MonetizationOn /> : <Repeat />}
                    onClick={handleDonate}
                    disabled={donating || amount <= 0 || (user ? amount > user.coins : true)}
                  >
                    {donating ? '处理中...' : donationType === 'one-time' 
                      ? `捐赠 ${amount} 金币` 
                      : `设置每月 ${amount} 金币的订阅`}
                  </Button>
                </Paper>
              )}
            </>
          )}
        </Box>
      </Box>
      
      {/* 取消订阅确认对话框 */}
      <Dialog open={cancelDialogOpen} onClose={() => setCancelDialogOpen(false)}>
        <DialogTitle>确认取消订阅</DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph>
            您确定要取消对 {project.name} 的订阅支持吗？
          </Typography>
          <Typography variant="body2" color="text.secondary">
            取消后将不再从您的账户中自动扣除金币，但已支付的金额不会退还。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelDialogOpen(false)}>
            返回
          </Button>
          <Button 
            onClick={handleCancelSubscription} 
            color="error" 
            variant="contained"
            disabled={donating}
          >
            {donating ? '处理中...' : '确认取消'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default DonatePage; 