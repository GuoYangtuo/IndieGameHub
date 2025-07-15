import React, { createContext, useState, useEffect, useContext } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme, Theme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { GlobalStyles } from '@mui/material';

// 主题上下文接口
interface ThemeContextType {
  isDarkMode: boolean;
  toggleTheme: () => void;
}

// 创建主题上下文
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// 用于修复-ms-high-contrast警告的全局样式
const globalStyles = {
  '@media (forced-colors: active)': {
    // 这里添加在强制颜色模式下需要的样式，替代-ms-high-contrast
    '*': {
      // 保持基本的高对比度样式
      borderColor: 'currentColor',
      outlineColor: 'currentColor'
    }
  },
  // 覆盖任何使用-ms-high-contrast的样式
  '*': {
    msHighContrast: 'none !important'
  },
  // GitHub风格的全局样式
  body: {
    backgroundColor: (theme: Theme) => theme.palette.mode === 'dark' ? '#0d1117' : '#f6f8fa',
  }
};

// 主题提供者组件
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 从本地存储获取主题模式
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedMode = localStorage.getItem('darkMode');
    return savedMode !== null ? JSON.parse(savedMode) : true; // 默认使用深色主题
  });

  // 切换主题模式
  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  // 保存主题模式到本地存储并设置HTML data-theme属性
  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
    
    // 设置HTML data-theme属性
    if (isDarkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.body.classList.add('dark-theme');
    } else {
      document.documentElement.removeAttribute('data-theme');
      document.body.classList.remove('dark-theme');
    }
  }, [isDarkMode]);

  // 确保组件挂载时立即应用深色主题
  useEffect(() => {
    // 检查是否首次访问（localStorage中没有主题设置）
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode === null) {
      // 如果是首次访问，立即设置深色主题
      document.documentElement.setAttribute('data-theme', 'dark');
      document.body.classList.add('dark-theme');
    }
  }, []);

  // GitHub风格配色
  const githubLightPalette = {
    primary: { main: '#0969da' },  // GitHub蓝色
    secondary: { main: '#cf222e' }, // GitHub红色
    success: { main: '#2da44e' },   // GitHub绿色
    info: { main: '#0969da' },      // GitHub信息蓝
    warning: { main: '#bf8700' },   // GitHub警告色
    error: { main: '#cf222e' },     // GitHub错误色
    background: {
      default: '#f6f8fa',           // GitHub背景色
      paper: '#ffffff',             // GitHub卡片背景色
    },
    text: {
      primary: '#24292f',           // GitHub主文本色
      secondary: '#57606a',         // GitHub次要文本色
    },
    divider: '#d0d7de',             // GitHub分隔线颜色
  };

  const githubDarkPalette = {
    primary: { main: '#58a6ff' },   // GitHub深色模式蓝色
    secondary: { main: '#f85149' }, // GitHub深色模式红色
    success: { main: '#3fb950' },   // GitHub深色模式绿色
    info: { main: '#58a6ff' },      // GitHub深色模式信息蓝
    warning: { main: '#d29922' },   // GitHub深色模式警告色
    error: { main: '#f85149' },     // GitHub深色模式错误色
    background: {
      default: '#0d1117',           // GitHub深色模式背景色
      paper: '#161b22',             // GitHub深色模式卡片背景色
    },
    text: {
      primary: '#c9d1d9',           // GitHub深色模式主文本色
      secondary: '#8b949e',         // GitHub深色模式次要文本色
    },
    divider: '#30363d',             // GitHub深色模式分隔线颜色
  };

  // 创建主题
  const theme = createTheme({
    palette: {
      mode: isDarkMode ? 'dark' : 'light',
      ...(isDarkMode ? githubDarkPalette : githubLightPalette),
    },
    typography: {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"',
      h1: { fontWeight: 600 },
      h2: { fontWeight: 600 },
      h3: { fontWeight: 600 },
      h4: { fontWeight: 600 },
      h5: { fontWeight: 600 },
      h6: { fontWeight: 600 },
      button: { fontWeight: 500 },
    },
    shape: {
      borderRadius: 6, // GitHub风格的圆角
    },
    components: {
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 6,
            borderColor: isDarkMode ? '#30363d' : '#d0d7de',
            borderStyle: 'solid',
            borderWidth: 1,
            boxShadow: isDarkMode 
              ? 'none' 
              : '0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06)',
            transition: 'box-shadow 0.2s ease-in-out, border-color 0.2s ease-in-out',
            '&:hover': {
              boxShadow: isDarkMode 
                ? '0 3px 6px rgba(149, 157, 165, 0.1)' 
                : '0 3px 6px rgba(149, 157, 165, 0.2)',
              borderColor: isDarkMode ? '#30363d' : '#d0d7de',
            },
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 6,
            textTransform: 'none',
            fontWeight: 500,
            padding: '6px 16px',
            boxShadow: 'none',
            '&:hover': {
              boxShadow: 'none',
            },
          },
          containedPrimary: {
            backgroundColor: isDarkMode ? '#238636' : '#2da44e', // GitHub绿色按钮
            '&:hover': {
              backgroundColor: isDarkMode ? '#2ea043' : '#2c974b',
            },
          },
          outlinedPrimary: {
            borderColor: isDarkMode ? '#30363d' : '#d0d7de',
            '&:hover': {
              backgroundColor: isDarkMode ? 'rgba(56, 139, 253, 0.1)' : 'rgba(9, 105, 218, 0.1)',
              borderColor: isDarkMode ? '#58a6ff' : '#0969da',
            },
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: isDarkMode ? '#161b22' : '#ffffff',
            color: isDarkMode ? '#c9d1d9' : '#24292f',
            boxShadow: 'none',
            borderBottom: `1px solid ${isDarkMode ? '#30363d' : '#d0d7de'}`,
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            height: 24,
            fontSize: '0.75rem',
          },
          filled: {
            backgroundColor: isDarkMode ? '#21262d' : '#f6f8fa',
            color: isDarkMode ? '#c9d1d9' : '#24292f',
            '&.MuiChip-colorPrimary': {
              backgroundColor: isDarkMode ? 'rgba(56, 139, 253, 0.15)' : 'rgba(9, 105, 218, 0.1)',
              color: isDarkMode ? '#58a6ff' : '#0969da',
            },
            '&.MuiChip-colorSecondary': {
              backgroundColor: isDarkMode ? 'rgba(248, 81, 73, 0.15)' : 'rgba(207, 34, 46, 0.1)',
              color: isDarkMode ? '#f85149' : '#cf222e',
            },
            '&.MuiChip-colorSuccess': {
              backgroundColor: isDarkMode ? 'rgba(63, 185, 80, 0.15)' : 'rgba(45, 164, 78, 0.1)',
              color: isDarkMode ? '#3fb950' : '#2da44e',
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 6,
            borderColor: isDarkMode ? '#30363d' : '#d0d7de',
            borderStyle: 'solid',
            borderWidth: 1,
            boxShadow: isDarkMode 
              ? 'none' 
              : '0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06)',
            // 确保富文本编辑器在黑暗模式下正常显示
            '& .w-md-editor': {
              backgroundColor: isDarkMode ? '#161b22' : '#ffffff',
              color: isDarkMode ? '#c9d1d9' : '#24292f',
            },
            '& .w-md-editor-toolbar': {
              backgroundColor: isDarkMode ? '#21262d' : '#f6f8fa',
              color: isDarkMode ? '#8b949e' : '#57606a',
              borderBottom: `1px solid ${isDarkMode ? '#30363d' : '#d0d7de'}`,
            },
            '& .w-md-editor-text': {
              color: isDarkMode ? '#c9d1d9' : '#24292f',
            },
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 6,
              '& fieldset': {
                borderColor: isDarkMode ? '#30363d' : '#d0d7de',
              },
              '&:hover fieldset': {
                borderColor: isDarkMode ? '#58a6ff' : '#0969da',
              },
            },
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 6,
            boxShadow: '0 8px 24px rgba(149, 157, 165, 0.2)',
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            color: isDarkMode ? '#8b949e' : '#57606a',
            '&:hover': {
              backgroundColor: isDarkMode ? 'rgba(177, 186, 196, 0.12)' : 'rgba(208, 215, 222, 0.24)',
            },
          },
        },
      },
      MuiDivider: {
        styleOverrides: {
          root: {
            borderColor: isDarkMode ? '#30363d' : '#d0d7de',
          },
        },
      },
      MuiTabs: {
        styleOverrides: {
          root: {
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 500,
              minHeight: 48,
            },
            '& .MuiTabs-indicator': {
              height: 2,
            },
          },
        },
      },
      MuiTable: {
        styleOverrides: {
          root: {
            '& .MuiTableCell-root': {
              borderBottom: `1px solid ${isDarkMode ? '#30363d' : '#d0d7de'}`,
            },
          },
        },
      },
    },
  });

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        <GlobalStyles styles={globalStyles} />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

// 使用主题上下文的钩子
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}; 