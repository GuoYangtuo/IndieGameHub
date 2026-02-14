import React, { useState, useEffect, useRef } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Box,
  Tooltip,
  Container,
  Popper,
  Paper,
  ClickAwayListener,
  MenuList,
  Grow,
  ListItemIcon,
  ListItemText,
  Stack
} from '@mui/material';
import {
  Menu as MenuIcon,
  Brightness4,
  Brightness7,
  Add,
  KeyboardArrowDown,
  MonetizationOn,
  Download,
  Settings,
  Favorite,
  FavoriteBorder,
  Logout,
  Home,
  Person,
  Share
} from '@mui/icons-material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useProjectTitle } from '../contexts/ProjectTitleContext';
import { projectAPI, userAPI } from '../services/api'; // userAPI still needed for handleToggleFavorite
import { Description, Update, AccountTree } from '@mui/icons-material';
import AuthDialog from './AuthDialog';
import RechargeDialog from './RechargeDialog';

// 用户项目接口
interface UserProject {
  id: string;
  name: string;
  slug: string;
  createdBy?: string;
}

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const { projectTitle, demoLink, sharedProjectData, updateFavoriteStatus } = useProjectTitle();
  const navigate = useNavigate();
  const { slug } = useParams<{ slug?: string }>();
  
  // 用户项目状态（仅保留这一个需要独立请求的数据）
  const [userProjects, setUserProjects] = useState<UserProject[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  
  // 从 sharedProjectData 派生的状态（不再单独请求）
  const isCreator = !!(user && sharedProjectData && sharedProjectData.createdBy === user.id);
  const isMember = !!(user && sharedProjectData && sharedProjectData.members.includes(user.id));
  const isFavorite = sharedProjectData?.isFavorite ?? false;
  const userContribution = sharedProjectData?.userContribution ?? null;
  const dataLoaded = !slug || !!sharedProjectData; // 非项目页直接算已加载；项目页等 sharedProjectData 就绪
  
  const [currentSlug, setCurrentSlug] = useState<string | undefined>(slug);
  
  // 项目下拉菜单
  const [projectsMenuOpen, setProjectsMenuOpen] = useState(false);
  const projectsAnchorRef = useRef<HTMLButtonElement>(null);

  // 用户头像菜单
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const avatarAnchorRef = useRef<HTMLButtonElement>(null);

  // 登录对话框
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [authDialogTab, setAuthDialogTab] = useState<'login' | 'register'>('login');
  
  // 添加状态管理充值弹窗
  const [rechargeDialogOpen, setRechargeDialogOpen] = useState(false);

  // 当路由参数slug变化时更新currentSlug
  useEffect(() => {
    if (slug) {
      setCurrentSlug(slug);
    }
  }, [slug]);
  
  // 获取用户项目列表（Navbar 唯一需要独立请求的数据）
  useEffect(() => {
    if (user) {
      const fetchUserProjects = async () => {
        try {
          setProjectsLoading(true);
          const response = await projectAPI.getUserProjects();
          setUserProjects(response.data);
        } catch (error) {
          console.error('获取用户项目失败', error);
        } finally {
          setProjectsLoading(false);
        }
      };

      fetchUserProjects();
    }
  }, [user]);

  // 处理登出
  const handleLogout = () => {
    logout();
    setAvatarMenuOpen(false);
    navigate('/');
  };

  // 处理头像菜单打开/关闭
  const handleAvatarMenuToggle = () => {
    setAvatarMenuOpen((prev) => !prev);
  };

  // 鼠标离开头像菜单区域时关闭
  const handleAvatarMenuClose = (event: Event | React.SyntheticEvent) => {
    if (
      avatarAnchorRef.current &&
      avatarAnchorRef.current.contains(event.target as HTMLElement)
    ) {
      return;
    }
    setAvatarMenuOpen(false);
  };

  // 处理点击头像进入个人资料页
  const handleAvatarClick = () => {
    navigate('/profile');
  };

  // 处理项目菜单打开
  const handleProjectsMenuToggle = () => {
    setProjectsMenuOpen((prev) => !prev);
  };

  // 处理项目菜单关闭
  const handleProjectsMenuClose = (event: Event | React.SyntheticEvent) => {
    if (
      projectsAnchorRef.current &&
      projectsAnchorRef.current.contains(event.target as HTMLElement)
    ) {
      return;
    }

    setProjectsMenuOpen(false);
  };

  // 处理项目点击
  const handleProjectClick = (slug: string) => {
    navigate(`/${slug}`);
    setProjectsMenuOpen(false);
  };

  // 根据用户项目数量决定显示按钮还是下拉菜单
  const renderProjectsButton = () => {
    // 如果没有项目，不显示
    if (userProjects.length === 0) {
      return null;
    }
    
    // 检查当前是否正在查看自己的项目
    if (projectTitle) {
      const currentProject = userProjects.find(p => p.name === projectTitle);
      if (currentProject) {
        // 如果当前正在查看自己的项目，不显示"我的项目"按钮
        return null;
      }
    }
    
    // 如果只有一个项目，显示直接链接
    if (userProjects.length === 1) {
      return (
        <Button
          component={RouterLink}
          to={`/${userProjects[0].slug}`}
          sx={{ my: 2, color: 'white', display: 'block' }}
        >
          我的项目
        </Button>
      );
    }
    
    // 多个项目，显示下拉菜单
    return (
      <>
        <Button
          ref={projectsAnchorRef}
          onClick={handleProjectsMenuToggle}
          sx={{ my: 2, color: 'white', display: 'flex', alignItems: 'center' }}
          endIcon={<KeyboardArrowDown />}
        >
          我的项目
        </Button>
        <Popper
          open={projectsMenuOpen}
          anchorEl={projectsAnchorRef.current}
          placement="bottom-start"
          transition
          disablePortal
          sx={{ zIndex: 1300 }}
        >
          {({ TransitionProps, placement }) => (
            <Grow
              {...TransitionProps}
              style={{
                transformOrigin: placement === 'bottom-start' ? 'left top' : 'left bottom',
              }}
            >
              <Paper sx={{ mt: 1, minWidth: 180 }}>
                <ClickAwayListener onClickAway={handleProjectsMenuClose}>
                  <MenuList autoFocusItem={projectsMenuOpen}>
                    {userProjects.map((project) => (
                      <MenuItem 
                        key={project.id}
                        onClick={() => handleProjectClick(project.slug)}
                      >
                        {project.name}
                      </MenuItem>
                    ))}
                  </MenuList>
                </ClickAwayListener>
              </Paper>
            </Grow>
          )}
        </Popper>
      </>
    );
  };

  // 打开登录对话框
  const handleOpenLoginDialog = () => {
    setAuthDialogTab('login');
    setAuthDialogOpen(true);
  };

  // 打开注册对话框
  const handleOpenRegisterDialog = () => {
    setAuthDialogTab('register');
    setAuthDialogOpen(true);
  };

  // 处理关注/取消关注项目
  const handleToggleFavorite = async () => {
    if (!user || !slug || !sharedProjectData) return;
    
    try {
      const projectId = sharedProjectData.id;
      const newFavoriteStatus = !isFavorite;
      
      if (isFavorite) {
        await userAPI.removeFavoriteProject(projectId);
      } else {
        await userAPI.addFavoriteProject(projectId);
      }
      
      // 通过 context 更新收藏状态（同步给 Navbar 和 ProjectDetailPage）
      updateFavoriteStatus(newFavoriteStatus);
      
      // 发出自定义事件通知其他组件收藏状态已改变
      const event = new CustomEvent('favoriteStatusChanged', {
        detail: { 
          projectId: projectId,
          isFavorite: newFavoriteStatus 
        }
      });
      window.dispatchEvent(event);
    } catch (err) {
      console.error('切换关注状态失败:', err);
    }
  };

  // 添加处理分享链接的函数
  const handleShareLink = () => {
    if (slug) {
      const url = `${window.location.origin}/${slug}`;
      navigator.clipboard.writeText(url)
        .then(() => {
          alert('项目链接已复制到剪贴板');
        })
        .catch((err) => {
          console.error('复制链接失败:', err);
          alert('复制链接失败，请手动复制：' + url);
        });
    }
  };

  return (
    <AppBar position="static" sx={{ py: 0 }}>
      <Container maxWidth="xl">
        <Toolbar disableGutters sx={{ minHeight: '64px' }}>
          <Typography
            variant="h6"
            noWrap
            component={RouterLink}
            to={slug ? `/${slug}` : '#'} 
            sx={{
              mr: 2,
              display: { xs: 'none', md: 'flex' },
              fontWeight: 700,
              color: 'inherit',
              textDecoration: 'none',
            }}
          >
            {projectTitle || 'IndieGameHub'}
          </Typography>
          
          {projectTitle && demoLink && dataLoaded && (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Tooltip title="下载最新Demo">
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<Download />}
                  href={demoLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ 
                    ml: 1, 
                    fontWeight: 'bold', 
                    boxShadow: 3,
                    color: 'white'
                  }}
                >
                  下载Demo
                </Button>
              </Tooltip>
              
              {currentSlug && (
              <Tooltip title="支持开发者">
                <Button
                  variant="contained"
                  color="secondary"
                  startIcon={<FavoriteIcon />}
                  component={RouterLink}
                  to={`/${currentSlug}/donate`}
                  sx={{ ml: 1, fontWeight: 'bold', boxShadow: 3 }}
                >
                  捐赠
                </Button>
              </Tooltip>
              )}
            </Box>
          )}

          <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' } }}>
            {user && renderProjectsButton()}
          </Box>

          <Box sx={{ flexGrow: 0, display: 'flex', alignItems: 'center' }}>
            {/* 显示用户在当前项目的贡献度 - 确保只在项目详情页显示 */}
            {user && sharedProjectData && slug && userContribution !== null && userContribution > 0 && (
              <Tooltip title="您在该项目的贡献度">
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  mr: 1, 
                  border: 1, 
                  borderColor: 'divider', 
                  borderRadius: 1,
                  px: 1,
                  py: 0.5
                }}>
                  <MonetizationOn fontSize="small" sx={{ mr: 0.5, color: 'primary.main' }} />
                  <Typography variant="body2" color="text.secondary" fontWeight="medium">
                    {userContribution.toFixed(1)}
                  </Typography>
                </Box>
              </Tooltip>
            )}
            
            {/* 添加分享按钮 - 只在项目页面显示 */}
            {projectTitle && slug && (
              <Tooltip title="分享项目链接，邀请其他人参与项目">
                <IconButton 
                  onClick={handleShareLink}
                  color="inherit"
                >
                  <Share />
                </IconButton>
              </Tooltip>
            )}
            
            {/* 添加关注按钮 - 只在项目页面显示 */}
            {user && projectTitle && slug && (
              <Tooltip title={isFavorite ? "取消关注" : "关注项目"}>
                <IconButton 
                  onClick={handleToggleFavorite}
                  color={isFavorite ? "primary" : "default"}
                >
                  {isFavorite ? <Favorite /> : <FavoriteBorder />}
                </IconButton>
              </Tooltip>
            )}
            
            <Tooltip title={isDarkMode ? '切换到亮色模式' : '切换到暗色模式'}>
              <IconButton onClick={toggleTheme} color="inherit">
                {isDarkMode ? <Brightness7 /> : <Brightness4 />}
              </IconButton>
            </Tooltip>

            {dataLoaded && (isMember || isCreator) && currentSlug && (
              <Tooltip title="项目设置">
                <IconButton 
                  component={RouterLink}
                  to={`/projects/${currentSlug}/settings`}
                  color="inherit"
                  sx={{ mr: 1 }}
                >
                  <Settings />
                </IconButton>
              </Tooltip>
            )}

            {user ? (
              <>
                <Box 
                  ref={avatarAnchorRef}
                  sx={{ position: 'relative' }}
                  onMouseEnter={() => setAvatarMenuOpen(true)}
                  onMouseLeave={() => setAvatarMenuOpen(false)}
                >
                  <IconButton 
                    onClick={handleAvatarClick}
                    sx={{ p: 0.5 }}
                  >
                    <Avatar 
                      alt={user.username}
                      src={user.avatarUrl || undefined}
                      sx={{ width: 40, height: 40 }}
                    >
                      {user.username.charAt(0).toUpperCase()}
                    </Avatar>
                  </IconButton>
                  
                  <Popper
                    open={avatarMenuOpen}
                    anchorEl={avatarAnchorRef.current}
                    placement="bottom-end"
                    transition
                    disablePortal
                    sx={{ zIndex: 1300 }}
                  >
                    {({ TransitionProps }) => (
                      <Grow
                        {...TransitionProps}
                        style={{ transformOrigin: 'top right' }}
                      >
                        <Paper 
                          elevation={3}
                          sx={{ 
                            mt: 1.5,
                            minWidth: 180,
                            overflow: 'visible',
                            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
                            '&:before': {
                              content: '""',
                              display: 'block',
                              position: 'absolute',
                              top: 0,
                              right: 14,
                              width: 10,
                              height: 10,
                              bgcolor: 'background.paper',
                              transform: 'translateY(-50%) rotate(45deg)',
                              zIndex: 0,
                            },
                          }}
                        >
                          <MenuList autoFocusItem={false}>
                            <MenuItem component={RouterLink} to="/">
                              <ListItemIcon>
                                <Home fontSize="small" />
                              </ListItemIcon>
                              <ListItemText>关注的/发现项目</ListItemText>
                            </MenuItem>
                            <MenuItem component={RouterLink} to="/create-project">
                              <ListItemIcon>
                                <Add fontSize="small" />
                              </ListItemIcon>
                              <ListItemText>创建新项目</ListItemText>
                            </MenuItem>
                            {/* 管理员菜单项 */}
                            {user.username === 'admin' && (
                              <MenuItem component={RouterLink} to="/admin">
                                <ListItemIcon>
                                  <Settings fontSize="small" />
                                </ListItemIcon>
                                <ListItemText>管理控制台</ListItemText>
                              </MenuItem>
                            )}
                            <MenuItem onClick={() => setRechargeDialogOpen(true)}>
                              <ListItemIcon>
                                <MonetizationOn fontSize="small" />
                              </ListItemIcon>
                              <ListItemText>金币余额: {user.coins}</ListItemText>
                            </MenuItem>
                            <MenuItem onClick={handleLogout}>
                              <ListItemIcon>
                                <Logout fontSize="small" />
                              </ListItemIcon>
                              <ListItemText>退出登录</ListItemText>
                            </MenuItem>
                          </MenuList>
                        </Paper>
                      </Grow>
                    )}
                  </Popper>
                </Box>
                <RechargeDialog 
                  open={rechargeDialogOpen} 
                  onClose={() => setRechargeDialogOpen(false)} 
                />
              </>
            ) : (
              <>
                <Button
                  onClick={handleOpenLoginDialog}
                  variant="contained"
                  color="secondary"
                  sx={{ color: 'white' }}
                >
                  登录
                </Button>
                <AuthDialog 
                  open={authDialogOpen} 
                  onClose={() => setAuthDialogOpen(false)} 
                  initialTab={authDialogTab} 
                />
              </>
            )}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default Navbar; 