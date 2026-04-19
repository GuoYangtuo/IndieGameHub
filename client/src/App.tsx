import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { StyledEngineProvider } from '@mui/material/styles';
import { AuthProvider } from './contexts/AuthContext';
import { ProjectTitleProvider } from './contexts/ProjectTitleContext';
import { WebSocketProvider, useWebSocketContext } from './contexts/WebSocketContext';
import Navbar from './components/Navbar';
import { Box, GlobalStyles } from '@mui/material';
import { ThemeProvider as CustomThemeProvider, useTheme } from './contexts/ThemeContext';
import withLoadable from './utils/loadable';
import { NotificationManager, Notification } from './components/NotificationPopup';
import './App.css';
import './styles/github-styles.css'; // 导入GitHub风格样式表

// 使用按需加载导入页面组件
const HomePage = withLoadable(() => import('./pages/HomePage'));
const ProjectDetailPage = withLoadable(() => import('./pages/ProjectDetailPage'));
const ProjectSettingsPage = withLoadable(() => import('./pages/ProjectSettingsPage'));
const CreateProjectPage = withLoadable(() => import('./pages/CreateProjectPage'));
const ProfilePage = withLoadable(() => import('./pages/ProfilePage'));
const DonatePage = withLoadable(() => import('./pages/DonatePage'));
const EmailVerificationPage = withLoadable(() => import('./pages/EmailVerifiedPage'));
const AdminPage = withLoadable(() => import('./pages/AdminPage'));
const SurveyHistoryPage = withLoadable(() => import('./pages/SurveyHistoryPage'));
const ChatRoomPage = withLoadable(() => import('./pages/ChatRoomPage'));
const BetCampaignPage = withLoadable(() => import('./pages/BetCampaignPage'));
const BetCampaignManagePage = withLoadable(() => import('./pages/BetCampaignManagePage'));
const InboxPage = withLoadable(() => import('./pages/InboxPage'));

// 自定义滚动条全局样式
const ScrollbarStyles = () => {
  const { isDarkMode } = useTheme();
  
  return (
    <GlobalStyles 
      styles={(theme) => ({
        '*::-webkit-scrollbar': {
          width: '10px',
          height: '10px',
        },
        '*::-webkit-scrollbar-track': {
          background: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
          borderRadius: '10px',
        },
        '*::-webkit-scrollbar-thumb': {
          backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
          borderRadius: '10px',
          border: '2px solid transparent',
          backgroundClip: 'padding-box',
        },
        '*::-webkit-scrollbar-thumb:hover': {
          backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)',
        }
      })}
    />
  );
};

// 创建布局组件，包含Navbar和子组件
interface LayoutProps {
  children: React.ReactNode;
  disablePadding?: boolean;
}

const Layout = ({ children, disablePadding = false }: LayoutProps) => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <Box
        sx={{
          minHeight: 0,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          py: disablePadding ? 0 : 3,
          px: disablePadding ? 0 : { xs: 2, sm: 3, md: 4 },
          bgcolor: theme => theme.palette.background.default
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

// 聊天页面专用布局（不带导航栏）
const ChatLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: theme => theme.palette.background.default
      }}
    >
      {children}
    </Box>
  );
};

// 创建项目页专用布局（无导航栏）
const CreateProjectLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Box
        sx={{
          minHeight: 0,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          bgcolor: theme => theme.palette.background.default
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

// 应用路由组件
const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Layout><HomePage /></Layout>} />
      <Route path="/create-project" element={<CreateProjectLayout><CreateProjectPage /></CreateProjectLayout>} />
      <Route path="/profile" element={<Layout><ProfilePage /></Layout>} />
      <Route path="/user/:id" element={<Layout><ProfilePage /></Layout>} />
      <Route path="/projects/:slug/donate" element={<Layout><DonatePage /></Layout>} />
      <Route path="/projects/:slug/bet-campaign" element={<Layout><BetCampaignPage /></Layout>} />
      <Route path="/projects/:slug/bet-campaign/:campaignId" element={<Layout><BetCampaignPage /></Layout>} />
      <Route path="/projects/:slug/bet-campaign/manage" element={<Layout><BetCampaignManagePage /></Layout>} />
      <Route path="/projects/:slug" element={<Layout><ProjectDetailPage /></Layout>} />
      <Route path="/projects/:slug/settings" element={<Layout><ProjectSettingsPage /></Layout>} />
      <Route path="/projects/:slug/surveys" element={<Layout disablePadding><SurveyHistoryPage /></Layout>} />
      <Route path="/project/:projectId/surveys" element={<Layout disablePadding><SurveyHistoryPage /></Layout>} />
      <Route path="/verify-email" element={<Layout><EmailVerificationPage /></Layout>} />
      <Route path="/admin" element={<Layout><AdminPage /></Layout>} />
      <Route path="/chat/:chatRoomId" element={<ChatLayout><ChatRoomPage /></ChatLayout>} />
      <Route path="/inbox" element={<Layout><InboxPage /></Layout>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <StyledEngineProvider injectFirst>
      <CustomThemeProvider>
        <ScrollbarStyles />
        <AuthProvider>
          <WebSocketProvider>
            <ProjectTitleProvider>
              <Router>
                <AppRoutes />
                <NotificationManagerWithContext />
              </Router>
            </ProjectTitleProvider>
          </WebSocketProvider>
        </AuthProvider>
      </CustomThemeProvider>
    </StyledEngineProvider>
  );
};

// 通知管理器组件 - 使用 WebSocket Context
const NotificationManagerWithContext: React.FC = () => {
  const { notifications, clearNotification } = useWebSocketContext();
  const [currentNotification, setCurrentNotification] = useState<Notification | null>(null);

  // 监听新通知
  useEffect(() => {
    const unread = notifications.find(n => !n.read);
    if (unread && unread.id !== currentNotification?.id) {
      setCurrentNotification(unread);
    }
  }, [notifications, currentNotification]);

  const handleClose = (id: string) => {
    clearNotification(id);
    setCurrentNotification(null);
  };

  return (
    <NotificationManager
      notifications={notifications}
      currentNotification={currentNotification}
      onNotificationClose={handleClose}
    />
  );
};

export default App;
