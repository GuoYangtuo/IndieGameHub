import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  TextField,
  CircularProgress,
  Alert,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Divider,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Chip,
  Card,
  CardContent,
  CardActions
} from '@mui/material';
import {
  Delete,
  Edit,
  Block,
  CheckCircle,
  Refresh,
  Person,
  ArrowBack
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { userAPI, projectAPI, adminAPI } from '../services/api';

// TabPanel component for the tab system
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const AdminPage: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  // Tab state
  const [tabValue, setTabValue] = useState(0);

  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Data states
  const [users, setUsers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);

  // Filter states
  const [userFilter, setUserFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [transactionFilter, setTransactionFilter] = useState('');

  // Dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: 'user' | 'project', id: string, name: string } | null>(null);

  // Editing state
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editingCoins, setEditingCoins] = useState(0);
  const [editingReason, setEditingReason] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // 新用户表单状态
  const [newUserForm, setNewUserForm] = useState({
    username: '',
    email: '',
    password: '',
    coins: 0
  });
  const [createUserDialogOpen, setCreateUserDialogOpen] = useState(false);

  // Check if user is admin
  useEffect(() => {
    // 使用用户名判断是否为管理员
    if (!user || user.username !== 'admin') {
      //navigate('/');
    } else {
      fetchData();
    }
  }, [user, navigate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 使用新的管理API获取数据
      if (tabValue === 0) {
        try {
          const response = await adminAPI.getAllUsers();
          setUsers(response.data?.users || []);
        } catch (error) {
          console.error('获取用户列表失败:', error);
          setError('获取用户列表失败');
          setUsers([]);
        }
      } else if (tabValue === 1) {
        try {
          const response = await adminAPI.getAllProjects();
          setProjects(response.data?.projects || []);
        } catch (error) {
          console.error('获取项目列表失败:', error);
          setError('获取项目列表失败');
          setProjects([]);
        }
      } else if (tabValue === 2) {
        try {
          // 暂时使用捐赠记录作为交易记录
          const donationsResponse = await userAPI.getUserDonations();
          const receivedDonationsResponse = await userAPI.getUserReceivedDonations();
          
          const allTransactions = [
            ...(donationsResponse.data || []).map((d: any) => ({
              ...d,
              type: 'donation',
              status: 'completed'
            })),
            ...(receivedDonationsResponse.data || []).map((d: any) => ({
              ...d,
              type: 'received',
              status: 'completed'
            }))
          ];
          
          setTransactions(allTransactions);
        } catch (error) {
          console.error('获取交易记录失败:', error);
          setError('获取交易记录失败');
          setTransactions([]);
        }
      }
    } catch (err) {
      console.error('获取管理数据失败:', err);
      setError('获取管理数据失败，请稍后再试');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    fetchData();
  };

  // Filter functions
  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(userFilter.toLowerCase()) || 
    (user.email && user.email.toLowerCase().includes(userFilter.toLowerCase()))
  );

  const filteredProjects = projects.filter(project => 
    project.name.toLowerCase().includes(projectFilter.toLowerCase()) || 
    (project.slug && project.slug.toLowerCase().includes(projectFilter.toLowerCase()))
  );

  const filteredTransactions = transactions.filter(transaction => 
    (transaction.username && transaction.username.toLowerCase().includes(transactionFilter.toLowerCase())) || 
    (transaction.projectName && transaction.projectName.toLowerCase().includes(transactionFilter.toLowerCase()))
  );


  
  // 处理删除用户或项目
  const handleDelete = async () => {
    if (!itemToDelete) return;
    
    try {
      if (itemToDelete.type === 'user') {
        // 目前后端没有实现管理员删除用户的API，所以只在前端更新状态
        // 实际应用中应该调用后端API
        setUsers(users.filter(u => u.id !== itemToDelete.id));
      } else {
        // 删除项目
        await adminAPI.deleteProject(itemToDelete.id);
        setProjects(projects.filter(p => p.id !== itemToDelete.id));
      }
      
      setDeleteDialogOpen(false);
      setItemToDelete(null);
      setSuccessMessage(`${itemToDelete.type === 'user' ? '用户' : '项目'}已成功删除`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('删除失败:', error);
      setError('删除操作失败');
      setDeleteDialogOpen(false);
    }
  };
  
  // 打开删除确认对话框
  const openDeleteDialog = (type: 'user' | 'project', id: string, name: string) => {
    setItemToDelete({ type, id, name });
    setDeleteDialogOpen(true);
  };

  // 处理金币修改
  const handleEditCoins = (user: any) => {
    setEditingUser(user);
    setEditingCoins(0);
    setEditingReason('');
    setEditDialogOpen(true);
  };
  
  // 提交金币修改
  const handleSubmitCoinsEdit = async () => {
    if (!editingUser) return;
    
    try {
      await adminAPI.updateUserCoins(
        editingUser.id, 
        editingCoins,
        editingReason
      );
      
      // 更新用户列表中的金币数量
      setUsers(users.map(u => 
        u.id === editingUser.id 
          ? { ...u, coins: u.coins + editingCoins } 
          : u
      ));
      
      setEditDialogOpen(false);
      setSuccessMessage(`用户 ${editingUser.username} 的金币已更新`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('修改金币失败:', error);
      setError('修改金币失败');
    }
  };

  // 处理新用户表单变化
  const handleNewUserFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewUserForm({
      ...newUserForm,
      [name]: name === 'coins' ? parseInt(value) || 0 : value
    });
  };
  
  // 创建新用户
  const handleCreateUser = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 验证表单
      if (!newUserForm.username || !newUserForm.email || !newUserForm.password) {
        setError('用户名、邮箱和密码不能为空');
        setLoading(false);
        return;
      }
      
      // 调用管理员创建用户API（无需邮箱验证）
      await adminAPI.createUser(
        newUserForm.username, 
        newUserForm.email, 
        newUserForm.password,
        newUserForm.coins
      );
      
      // 刷新用户列表
      await fetchData();
      
      // 重置表单并关闭对话框
      setNewUserForm({
        username: '',
        email: '',
        password: '',
        coins: 0
      });
      setCreateUserDialogOpen(false);
      setSuccessMessage('用户创建成功');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('创建用户失败:', error);
      setError('创建用户失败，请检查用户名和邮箱是否已被使用');
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.username !== 'admin') {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">您没有权限访问此页面</Alert>
        <Button 
          variant="contained" 
          color="primary"
          onClick={() => navigate('/')}
          startIcon={<ArrowBack />}
          sx={{ mt: 2 }}
        >
          返回首页
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 8 }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          网站管理控制台
        </Typography>
        <Typography variant="body1" color="text.secondary" gutterBottom>
          欢迎，管理员 {user.username}。您可以在此页面管理网站数据。
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {successMessage && (
          <Alert severity="success" sx={{ mt: 2, mb: 2 }}>
            {successMessage}
          </Alert>
        )}

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mt: 3 }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="管理选项卡">
            <Tab label="用户管理" />
            <Tab label="项目管理" />
            <Tab label="交易记录" />
          </Tabs>
        </Box>

        {/* Users Tab */}
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <TextField
              label="搜索用户"
              variant="outlined"
              size="small"
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              sx={{ width: '300px' }}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button 
                variant="contained" 
                color="success"
                onClick={() => setCreateUserDialogOpen(true)}
              >
                创建用户
              </Button>
              <Button 
                variant="contained" 
                color="primary"
                onClick={() => fetchData()}
                startIcon={<Refresh />}
                disabled={loading}
              >
                刷新
              </Button>
            </Box>
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer component={Paper} sx={{ mt: 2 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>用户名</TableCell>
                    <TableCell>邮箱</TableCell>
                    <TableCell>注册时间</TableCell>
                    <TableCell>金币</TableCell>
                    <TableCell>状态</TableCell>
                    <TableCell>操作</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          {user.username}
                          {user.isAdmin && (
                            <Chip 
                              label="管理员" 
                              color="primary" 
                              size="small"
                              sx={{ ml: 1 }}
                            />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{new Date(user.createdAt).toLocaleString()}</TableCell>
                      <TableCell>{user.coins}</TableCell>
                      <TableCell>
                        <Chip label="正常" color="success" size="small" />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          <Button
                            variant="outlined"
                            size="small"
                            color="primary"
                            onClick={() => handleEditCoins(user)}
                            startIcon={<Edit />}
                            sx={{ mb: 1 }}
                          >
                            修改金币
                          </Button>
                          <Button
                            variant="outlined"
                            size="small"
                            color="error"
                            startIcon={<Delete />}
                            onClick={() => openDeleteDialog('user', user.id, user.username)}
                            sx={{ mb: 1 }}
                          >
                            删除
                          </Button>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>

        {/* Projects Tab */}
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <TextField
              label="搜索项目"
              variant="outlined"
              size="small"
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              sx={{ width: '300px' }}
            />
            <Button 
              variant="contained" 
              color="primary"
              onClick={() => fetchData()}
              startIcon={<Refresh />}
              disabled={loading}
            >
              刷新
            </Button>
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer component={Paper} sx={{ mt: 2 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>项目名称</TableCell>
                    <TableCell>创建者</TableCell>
                    <TableCell>创建时间</TableCell>
                    <TableCell>成员数</TableCell>
                    <TableCell>余额</TableCell>
                    <TableCell>操作</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredProjects.map((project) => (
                    <TableRow key={project.id}>
                      <TableCell>{project.name}</TableCell>
                      <TableCell>{project.creatorName || '未知'}</TableCell>
                      <TableCell>{new Date(project.createdAt).toLocaleString()}</TableCell>
                      <TableCell>{project.members}</TableCell>
                      <TableCell>{project.projectBalance} 金币</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          <Button
                            variant="outlined"
                            size="small"
                            color="primary"
                            onClick={() => navigate(`/${project.slug}`)}
                            sx={{ mb: 1 }}
                          >
                            查看
                          </Button>
                          <Button
                            variant="outlined"
                            size="small"
                            color="error"
                            startIcon={<Delete />}
                            onClick={() => openDeleteDialog('project', project.id, project.name)}
                            sx={{ mb: 1 }}
                          >
                            删除
                          </Button>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>

        {/* Transactions Tab */}
        <TabPanel value={tabValue} index={2}>
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <TextField
              label="搜索交易"
              variant="outlined"
              size="small"
              value={transactionFilter}
              onChange={(e) => setTransactionFilter(e.target.value)}
              sx={{ width: '300px' }}
            />
            <Button 
              variant="contained" 
              color="primary"
              onClick={() => fetchData()}
              startIcon={<Refresh />}
              disabled={loading}
            >
              刷新
            </Button>
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer component={Paper} sx={{ mt: 2 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>交易ID</TableCell>
                    <TableCell>类型</TableCell>
                    <TableCell>金额</TableCell>
                    <TableCell>用户</TableCell>
                    <TableCell>项目</TableCell>
                    <TableCell>时间</TableCell>
                    <TableCell>状态</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>{transaction.id}</TableCell>
                      <TableCell>
                        <Chip 
                          label={
                            transaction.type === 'charge' ? '充值' :
                            transaction.type === 'withdraw' ? '提款' :
                            transaction.type === 'donation' ? '捐赠' : '悬赏'
                          } 
                          color={
                            transaction.type === 'charge' ? 'success' :
                            transaction.type === 'withdraw' ? 'warning' :
                            transaction.type === 'donation' ? 'info' : 'secondary'
                          } 
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{transaction.amount} 金币</TableCell>
                      <TableCell>{transaction.username || '未知用户'}</TableCell>
                      <TableCell>{transaction.projectName || '无关联项目'}</TableCell>
                      <TableCell>{new Date(transaction.createdAt).toLocaleString()}</TableCell>
                      <TableCell>
                        <Chip 
                          label={
                            transaction.status === 'completed' ? '已完成' :
                            transaction.status === 'pending' ? '处理中' : '失败'
                          } 
                          color={
                            transaction.status === 'completed' ? 'success' :
                            transaction.status === 'pending' ? 'warning' : 'error'
                          } 
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>
      </Paper>

      {/* 删除确认对话框 */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>确认删除</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {itemToDelete && `您确定要删除${itemToDelete.type === 'user' ? '用户' : '项目'} "${itemToDelete.name}" 吗？此操作不可撤销。`}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>取消</Button>
          <Button onClick={handleDelete} color="error">确认删除</Button>
        </DialogActions>
      </Dialog>

      {/* 金币编辑对话框 */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
      >
        <DialogTitle>修改用户金币</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            {editingUser && `修改用户 "${editingUser.username}" 的金币数量。输入正数增加金币，输入负数减少金币。`}
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label="金币数量"
            type="number"
            fullWidth
            value={editingCoins}
            onChange={(e) => setEditingCoins(parseInt(e.target.value))}
          />
          <TextField
            margin="dense"
            label="修改原因"
            type="text"
            fullWidth
            value={editingReason}
            onChange={(e) => setEditingReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>取消</Button>
          <Button onClick={handleSubmitCoinsEdit} color="primary">确认修改</Button>
        </DialogActions>
      </Dialog>

      {/* 创建用户对话框 */}
      <Dialog
        open={createUserDialogOpen}
        onClose={() => setCreateUserDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>创建新用户</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            填写以下信息直接创建新用户，无需邮箱验证。
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label="用户名"
            name="username"
            value={newUserForm.username}
            onChange={handleNewUserFormChange}
            fullWidth
            required
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="邮箱"
            name="email"
            type="email"
            value={newUserForm.email}
            onChange={handleNewUserFormChange}
            fullWidth
            required
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="密码"
            name="password"
            type="password"
            value={newUserForm.password}
            onChange={handleNewUserFormChange}
            fullWidth
            required
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="初始金币"
            name="coins"
            type="number"
            value={newUserForm.coins}
            onChange={handleNewUserFormChange}
            fullWidth
            sx={{ mb: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateUserDialogOpen(false)}>取消</Button>
          <Button 
            onClick={handleCreateUser} 
            color="primary"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : '创建用户'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminPage; 