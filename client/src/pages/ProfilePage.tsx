import React, { useState, useEffect, useRef } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  Button, 
  TextField, 
  Avatar, 
  Divider,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  IconButton,
  Tooltip,
  Badge,
  Tabs,
  Tab,
  Chip
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { projectAPI, userAPI } from '../services/api';
import { PhotoCamera } from '@mui/icons-material';

interface Project {
  id: string;
  name: string;
  slug: string;
  description: string;
  createdAt: string;
}

interface UserProfile {
  id: string;
  username: string;
  coins?: number;
  bio?: string;
  avatarUrl?: string;
  createdAt?: string;
}

// 更新User接口以匹配AuthContext中的接口并添加createdAt字段
interface User extends UserProfile {
  email: string;
  coins: number;
  isAdmin?: boolean;
  createdAt?: string;
}

const ProfilePage: React.FC = () => {
  const { user, logout, updateUser, updateUserAvatar } = useAuth();
  const navigate = useNavigate();
  const { id: userId } = useParams<{ id: string }>();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bio, setBio] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [profileUser, setProfileUser] = useState<UserProfile | null>(null);
  const [isCurrentUser, setIsCurrentUser] = useState(true);
  
  // 增加用户活动和贡献度数据
  const [userActivities, setUserActivities] = useState<{
    date: string;
    type: 'proposal' | 'comment' | 'donation' | 'project';
    projectName?: string;
    projectSlug?: string;
    content?: string;
    amount?: number;
  }[]>([]);
  const [contributedProjects, setContributedProjects] = useState<{
    id: string;
    name: string;
    slug: string;
    contribution: number;
  }[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [activeTab, setActiveTab] = useState(0); // 用于切换不同的信息标签页
  
  // 头像上传引用
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    if (!user) return;
    
    // 检查是否查看当前用户或其他用户的资料
    const isViewingCurrentUser = !userId || userId === user.id;
    setIsCurrentUser(isViewingCurrentUser);
    
    const fetchUserData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        if (isViewingCurrentUser) {
          // 获取当前用户项目和资料
          const projectsResponse = await projectAPI.getUserProjects();
          setProjects(projectsResponse.data);
          
          // 获取用户资料
          const profileResponse = await userAPI.getProfile();
          setProfileUser(profileResponse.data);
          
          if (profileResponse.data.bio) {
            setBio(profileResponse.data.bio);
          }
          
          // 获取用户活动记录
          fetchUserActivities(user.id);
          
          // 获取用户贡献的项目
          fetchContributedProjects(user.id);
        } else {
          // 获取其他用户的信息
          try {
            // 调用API获取用户资料
            const usersResponse = await userAPI.getUsersByIds([userId]);
            if (usersResponse.data && usersResponse.data.length > 0) {
              setProfileUser(usersResponse.data[0]);
              if (usersResponse.data[0].bio) {
                setBio(usersResponse.data[0].bio);
              }
              
              // 获取用户活动记录
              fetchUserActivities(userId);
              
              // 获取用户贡献的项目
              fetchContributedProjects(userId);
            } else {
              setError('用户不存在');
            }
            
            // 获取该用户的公开项目
            try {
              // 创建新的API调用获取其他用户的公开项目
              const response = await fetch(`/api/users/${userId}/public-projects`, {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${localStorage.getItem('token')}`,
                  'Content-Type': 'application/json'
                }
              });
              
              if (!response.ok) {
                throw new Error('获取用户公开项目失败');
              }
              
              const data = await response.json();
              setProjects(data);
            } catch (err) {
              console.error('获取用户公开项目失败:', err);
              setProjects([]);
            }
          } catch (err) {
            console.error('获取用户资料失败:', err);
            setError('获取用户资料失败');
          }
        }
      } catch (err) {
        console.error('获取用户数据失败:', err);
        setError('获取用户数据失败，请稍后再试');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, [user, userId]);
  
  // 获取用户活动记录
  const fetchUserActivities = async (id: string) => {
    try {
      setLoadingActivities(true);
      // 创建新的API调用而不是使用模拟数据
      const response = await fetch(`/api/users/${id}/activities`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('获取用户活动失败');
      }
      
      const data = await response.json();
      setUserActivities(data);
    } catch (error) {
      console.error('获取用户活动记录失败:', error);
      setUserActivities([]);
    } finally {
      setLoadingActivities(false);
    }
  };
  
  // 获取用户贡献的项目
  const fetchContributedProjects = async (id: string) => {
    try {
      // 创建新的API调用而不是使用模拟数据
      const response = await fetch(`/api/users/${id}/contributed-projects`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('获取贡献项目失败');
      }
      
      const data = await response.json();
      setContributedProjects(data);
    } catch (error) {
      console.error('获取用户贡献项目失败:', error);
      setContributedProjects([]);
    }
  };
  
  const handleBioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBio(e.target.value);
  };
  
  const handleSaveBio = async () => {
    if (!user) return;
    
    try {
      setIsSaving(true);
      await userAPI.updateBio(bio);
      setSaveSuccess(true);
      
      // 3秒后隐藏成功提示
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('保存简介失败:', err);
      setError('保存简介失败，请稍后再试');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleLogout = () => {
    logout();
    navigate('/');
  };
  
  const handleDeleteAccount = async () => {
    if (!user) return;
    
    try {
      await userAPI.deleteAccount();
      logout();
      navigate('/');
    } catch (err) {
      console.error('删除账户失败:', err);
      setError('删除账户失败，请稍后再试');
      setDeleteDialogOpen(false);
    }
  };
  
  // 处理头像点击事件
  const handleAvatarClick = () => {
    if (isCurrentUser) {
      fileInputRef.current?.click();
    }
  };
  
  // 处理头像上传
  const handleAvatarUpload = async (file: File) => {
    try {
      setAvatarLoading(true);
      setAvatarError(null);
      
      // 创建表单数据
      const formData = new FormData();
      formData.append('avatar', file);
      
      const response = await userAPI.uploadAvatar(formData);
      
      // 更新用户信息
      if (response.data.user) {
        updateUser(response.data.user);
        setProfileUser(response.data.user);
        
        // 创建临时URL并立即更新界面显示
        const tempUrl = URL.createObjectURL(file);
        if (profileUser) {
          setProfileUser({
            ...profileUser,
            avatarUrl: tempUrl
          });
        }
        if (user) {
          updateUser({
            ...user,
            avatarUrl: tempUrl
          });
        }
      } else if (response.data.avatarUrl) {
        updateUserAvatar(response.data.avatarUrl);
      }
      
      // 重置文件输入
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('上传头像失败:', error);
      setAvatarError('上传头像失败，请稍后再试');
    } finally {
      setAvatarLoading(false);
    }
  };
  
  if (!user) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="warning">请先登录</Alert>
      </Container>
    );
  }
  
  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }
  
  if (error && !profileUser) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }
  
  const displayUser = profileUser || user;
  
  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 8 }}>
      <Paper sx={{ p: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <input
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            ref={fileInputRef}
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleAvatarUpload(e.target.files[0]);
              }
            }}
          />
          <Tooltip title={isCurrentUser ? "点击更换头像" : displayUser.username}>
            {isCurrentUser ? (
              <Badge
                overlap="circular"
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                badgeContent={
                  <IconButton 
                    sx={{ 
                      bgcolor: 'background.paper', 
                      width: 30, 
                      height: 30,
                      border: '1px solid #ccc' 
                    }}
                    onClick={handleAvatarClick}
                    disabled={avatarLoading}
                  >
                    {avatarLoading ? (
                      <CircularProgress size={16} />
                    ) : (
                      <PhotoCamera fontSize="small" />
                    )}
                  </IconButton>
                }
              >
                <Avatar 
                  sx={{ width: 100, height: 100, cursor: 'pointer' }}
                  onClick={handleAvatarClick}
                  src={displayUser.avatarUrl}
                >
                  {displayUser.username.charAt(0).toUpperCase()}
                </Avatar>
              </Badge>
            ) : (
              <Avatar 
                sx={{ width: 100, height: 100 }}
                src={displayUser.avatarUrl}
              >
                {displayUser.username.charAt(0).toUpperCase()}
              </Avatar>
            )}
          </Tooltip>
          <Box sx={{ ml: 3 }}>
            <Typography variant="h5">{displayUser.username}</Typography>
            {displayUser.coins !== undefined && (
              <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                金币: {displayUser.coins}
              </Typography>
            )}
            
            {/* 添加用户统计数据 */}
            <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
              <Box>
                <Typography variant="body2" color="textSecondary">
                  项目数
                </Typography>
                <Typography variant="body1">
                  {projects.length}
                </Typography>
              </Box>
              <Divider orientation="vertical" flexItem />
              <Box>
                <Typography variant="body2" color="textSecondary">
                  贡献项目
                </Typography>
                <Typography variant="body1">
                  {contributedProjects.length}
                </Typography>
              </Box>
              <Divider orientation="vertical" flexItem />
              <Box>
                <Typography variant="body2" color="textSecondary">
                  注册时间
                </Typography>
                <Typography variant="body1">
                  {displayUser.createdAt ? new Date(displayUser.createdAt).toLocaleDateString() : '未知'}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
        
        {avatarError && isCurrentUser && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {avatarError}
          </Alert>
        )}
        
        <Divider sx={{ mb: 3 }} />
        
        <Typography variant="h6" gutterBottom>
          个人资料
        </Typography>
        
        <Box component="form" sx={{ mt: 2 }}>
          <TextField
            label="用户名"
            value={displayUser.username}
            fullWidth
            disabled
            sx={{ mb: 2 }}
          />
          
          {isCurrentUser ? (
            <>
              <TextField
                label="个人简介"
                value={bio}
                onChange={handleBioChange}
                fullWidth
                multiline
                rows={4}
                sx={{ mb: 2 }}
                placeholder="请输入个人简介..."
              />
              
              {saveSuccess && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  简介保存成功
                </Alert>
              )}
              
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Box>
                  <Button 
                    variant="contained" 
                    color="primary"
                    onClick={handleSaveBio}
                    disabled={isSaving}
                    sx={{ mr: 2 }}
                  >
                    {isSaving ? '保存中...' : '保存资料'}
                  </Button>
                  
                  <Button 
                    variant="outlined"
                    color="primary"
                    onClick={handleLogout}
                  >
                    退出登录
                  </Button>
                </Box>
                
                <Button 
                  variant="outlined"
                  color="error"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  删除账户
                </Button>
              </Box>
            </>
          ) : (
            <TextField
              label="个人简介"
              value={bio || '这个人很懒，什么都没留下...'}
              fullWidth
              multiline
              rows={4}
              sx={{ mb: 2 }}
              disabled
            />
          )}
        </Box>
      </Paper>
      
      {/* 用户项目和活动标签页 */}
      <Paper sx={{ p: 4 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={activeTab} 
            onChange={(e, newValue) => setActiveTab(newValue)} 
            aria-label="用户数据标签页"
          >
            <Tab label="我的项目" />
            <Tab label="近期活动" />
            <Tab label="贡献项目" />
          </Tabs>
        </Box>
        
        {/* 我的项目标签页 */}
        <Box role="tabpanel" hidden={activeTab !== 0} id="tabpanel-projects" sx={{ mt: 2 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error">{error}</Alert>
          ) : projects.length === 0 ? (
            <Alert severity="info">{isCurrentUser ? '您还没有创建任何项目' : '该用户暂无公开项目'}</Alert>
          ) : (
            <List>
              {projects.map((project) => (
                <ListItem 
                  key={project.id}
                  component="a"
                  href={`/${project.slug}?showInfo=true`}
                  target="_blank"
                  divider
                >
                  <ListItemText 
                    primary={project.name} 
                    secondary={project.description.length > 100 
                      ? `${project.description.substring(0, 100)}...` 
                      : project.description
                    } 
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Box>
        
        {/* 近期活动标签页 */}
        <Box role="tabpanel" hidden={activeTab !== 1} id="tabpanel-activities" sx={{ mt: 2 }}>
          {loadingActivities ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress />
            </Box>
          ) : userActivities.length === 0 ? (
            <Alert severity="info">暂无活动记录</Alert>
          ) : (
            <List>
              {userActivities.map((activity, index) => (
                <ListItem 
                  key={index}
                  divider
                >
                  <ListItemText 
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Chip
                          label={
                            activity.type === 'comment' ? '评论' :
                            activity.type === 'proposal' ? '提案' :
                            activity.type === 'donation' ? '捐赠' : '项目'
                          }
                          color={
                            activity.type === 'comment' ? 'primary' :
                            activity.type === 'proposal' ? 'secondary' :
                            activity.type === 'donation' ? 'success' : 'default'
                          }
                          size="small"
                          sx={{ mr: 1 }}
                        />
                        {activity.projectName && (
                          <Typography 
                            variant="body2" 
                            component="a"
                            href={`/${activity.projectSlug}`}
                            target="_blank"
                            sx={{ color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                          >
                            {activity.projectName}
                          </Typography>
                        )}
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.primary">
                          {activity.type === 'donation'
                            ? `捐赠了 ${activity.amount} 金币`
                            : activity.content
                          }
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(activity.date).toLocaleString()}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Box>
        
        {/* 贡献项目标签页 */}
        <Box role="tabpanel" hidden={activeTab !== 2} id="tabpanel-contributions" sx={{ mt: 2 }}>
          {loadingActivities ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress />
            </Box>
          ) : contributedProjects.length === 0 ? (
            <Alert severity="info">暂无贡献项目记录</Alert>
          ) : (
            <List>
              {contributedProjects.map((project) => (
                <ListItem 
                  key={project.id}
                  divider
                >
                  <ListItemText 
                    primary={
                      <Typography 
                        variant="body1" 
                        component="a"
                        href={`/${project.slug}`}
                        target="_blank"
                        sx={{ color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                      >
                        {project.name}
                      </Typography>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                          贡献度:
                        </Typography>
                        <Typography variant="body2" color="primary" fontWeight="medium">
                          {project.contribution}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      </Paper>
      
      {/* 删除账户确认对话框 */}
      {isCurrentUser && (
        <Dialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
        >
          <DialogTitle>删除账户</DialogTitle>
          <DialogContent>
            <DialogContentText>
              您确定要删除账户吗？此操作不可逆，您的所有数据将被永久删除。
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>取消</Button>
            <Button onClick={handleDeleteAccount} color="error">
              确认删除
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Container>
  );
};

export default ProfilePage; 