import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { StyledEngineProvider } from '@mui/material/styles';
import { AuthProvider } from './contexts/AuthContext';
import { ProjectTitleProvider } from './contexts/ProjectTitleContext';
import Navbar from './components/Navbar';
import { Box, GlobalStyles } from '@mui/material';
import { ThemeProvider as CustomThemeProvider, useTheme } from './contexts/ThemeContext';
import withLoadable from './utils/loadable';
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
const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      <Navbar />
      <Box 
        sx={{ 
          minHeight: 'calc(100vh - 64px)', 
          py: 3, 
          px: { xs: 2, sm: 3, md: 4 },
          bgcolor: theme => theme.palette.background.default
        }}
      >
        {children}
      </Box>
    </>
  );
};

// 应用路由组件
const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Layout><HomePage /></Layout>} />
      <Route path="/create-project" element={<Layout><CreateProjectPage /></Layout>} />
      <Route path="/profile" element={<Layout><ProfilePage /></Layout>} />
      <Route path="/user/:id" element={<Layout><ProfilePage /></Layout>} />
      <Route path="/projects/:slug/donate" element={<Layout><DonatePage /></Layout>} />
      <Route path="/projects/:slug" element={<Layout><ProjectDetailPage /></Layout>} />
      <Route path="/projects/:slug/settings" element={<Layout><ProjectSettingsPage /></Layout>} />
      <Route path="/verify-email" element={<Layout><EmailVerificationPage /></Layout>} />
      <Route path="/admin" element={<Layout><AdminPage /></Layout>} />
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
          <ProjectTitleProvider>
            <Router>
              <AppRoutes />
            </Router>
          </ProjectTitleProvider>
        </AuthProvider>
      </CustomThemeProvider>
    </StyledEngineProvider>
  );
};

export default App;
