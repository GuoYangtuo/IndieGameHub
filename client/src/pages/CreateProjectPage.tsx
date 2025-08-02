import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  TextField,
  Button,
  Paper,
  Alert,
  IconButton,
  CircularProgress
} from '@mui/material';
import MDEditor from '@uiw/react-md-editor';
import { projectAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Delete } from '@mui/icons-material';
import { useDebounce } from '../hooks/useDebounce';

const CreateProjectPage: React.FC = () => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
  const [githubRepoUrl, setGithubRepoUrl] = useState('');
  const [githubAccessToken, setGithubAccessToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [checkingName, setCheckingName] = useState(false);
  const [validatingGithub, setValidatingGithub] = useState(false);
  
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  
  // 使用防抖处理项目名称输入
  const debouncedName = useDebounce(name, 500);

  // 当防抖后的项目名称变化时，检查是否存在
  useEffect(() => {
    const checkProjectName = async () => {
      if (!debouncedName.trim()) {
        setNameError(null);
        return;
      }
      
      try {
        setCheckingName(true);
        const response = await projectAPI.checkProjectNameExists(debouncedName);
        if (response.data.exists) {
          setNameError('项目名称已存在，请使用其他名称');
        } else {
          setNameError(null);
        }
      } catch (err) {
        console.error('检查项目名称失败:', err);
      } finally {
        setCheckingName(false);
      }
    };
    
    checkProjectName();
  }, [debouncedName]);

  // 处理封面图片选择
  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      
      // 检查文件大小（限制为5MB）
      if (file.size > 5 * 1024 * 1024) {
        setError(`文件大小超过5MB`);
        return;
      }
      
      // 检查文件类型
      if (!file.type.match('image.*')) {
        setError(`请选择图片文件`);
        return;
      }
      
      setCoverImage(file);
      setError(null);
      
      // 创建预览
      const reader = new FileReader();
      reader.onload = () => {
        setCoverImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  // 移除封面图片
  const handleRemoveCoverImage = () => {
    setCoverImage(null);
    setCoverImagePreview(null);
  };
  
  // 验证GitHub仓库
  const validateGithubRepo = async (repoUrl: string, accessToken: string) => {
    if (!repoUrl.trim()) {
      return { isValid: true, message: '' }; // 空仓库地址认为有效
    }
    
    try {
      const response = await projectAPI.validateGithubRepository(repoUrl, accessToken);
      if (response.data.isValid && response.data.isAccessible) {
        return { isValid: true, message: '仓库验证成功' };
      } else {
        return { isValid: false, message: response.data.message };
      }
    } catch (err: any) {
      return { isValid: false, message: err.response?.data?.message || '验证失败' };
    }
  };

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('请先登录');
      return;
    }
    
    if (!name.trim()) {
      setError('项目名称不能为空');
      return;
    }
    
    if (nameError) {
      setError(nameError);
      return;
    }
    
    if (!description.trim()) {
      setError('项目描述不能为空');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // 如果填写了仓库地址，先验证仓库
      if (githubRepoUrl.trim()) {
        setValidatingGithub(true);
        const validationResult = await validateGithubRepo(githubRepoUrl, githubAccessToken);
        setValidatingGithub(false);
        
        if (!validationResult.isValid) {
          setError(`仓库验证失败：${validationResult.message}`);
          return;
        }
      }
      
      let projectResponse;
      
      // 如果有封面图片，使用带封面的创建API
      if (coverImage) {
        const formData = new FormData();
        formData.append('name', name);
        formData.append('description', description);
        formData.append('coverImage', coverImage);
        if (githubRepoUrl) formData.append('githubRepoUrl', githubRepoUrl);
        if (githubAccessToken) formData.append('githubAccessToken', githubAccessToken);
        
        projectResponse = await projectAPI.createProjectWithCover(formData);
      } else {
        // 否则使用基本API
        projectResponse = await projectAPI.createProject(name, description, undefined, githubRepoUrl, githubAccessToken);
      }
      
      const projectSlug = projectResponse.data.slug;
      
      // 跳转到项目详情页
      navigate(`/${encodeURIComponent(projectSlug)}`);
    } catch (err: any) {
      console.error('创建项目失败:', err);
      if (err.response && err.response.status === 409) {
        setError(err.response.data.message || '项目名称已存在，请使用其他名称');
      } else {
        setError('创建项目失败，请稍后再试');
      }
    } finally {
      setLoading(false);
      setValidatingGithub(false);
    }
  };

  // 如果用户未登录，重定向到登录页面
  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          创建新项目
        </Typography>
        
        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="name"
            label="项目名称"
            name="name"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={!!nameError}
            helperText={nameError || ''}
            InputProps={{
              endAdornment: checkingName && (
                <CircularProgress color="inherit" size={20} />
              )
            }}
          />
          
          <Box sx={{ mt: 2, mb: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              项目描述 (支持Markdown格式)
            </Typography>
            <Box data-color-mode={isDarkMode ? "dark" : "light"}>
              <MDEditor
                value={description}
                onChange={(value) => setDescription(value || '')}
                height={300}
              />
            </Box>
            <Typography variant="caption" color="text.secondary">
              详细描述您的项目，支持Markdown格式
            </Typography>
          </Box>
          
          <Box sx={{ mt: 2, mb: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              项目封面图片 (可选)
            </Typography>
            <input
              accept="image/*"
              style={{ display: 'none' }}
              id="project-cover-image"
              type="file"
              onChange={handleCoverImageChange}
            />
            <label htmlFor="project-cover-image">
              <Button variant="outlined" component="span">
                选择封面图片
              </Button>
            </label>
            <Typography variant="caption" sx={{ ml: 2 }}>
              选择一张项目封面图片，最大5MB
            </Typography>
            
            {coverImagePreview && (
              <Box sx={{ mt: 2, position: 'relative', display: 'inline-block' }}>
                <img 
                  src={coverImagePreview} 
                  alt="封面图片预览" 
                  style={{ 
                    width: '300px', 
                    height: '180px', 
                    objectFit: 'cover',
                    borderRadius: '4px',
                    border: '1px solid #eee'
                  }} 
                />
                <IconButton 
                  size="small" 
                  sx={{ 
                    position: 'absolute', 
                    top: -10, 
                    right: -10,
                    bgcolor: 'white',
                    '&:hover': { bgcolor: '#f5f5f5' }
                  }}
                  onClick={handleRemoveCoverImage}
                >
                  <Delete fontSize="small" />
                </IconButton>
              </Box>
            )}
          </Box>
          
          <Box sx={{ mt: 3, mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              GitHub 仓库关联 (可选)
            </Typography>
            
            <TextField
              margin="normal"
              fullWidth
              id="githubRepoUrl"
              label="GitHub 仓库 URL"
              name="githubRepoUrl"
              value={githubRepoUrl}
              onChange={(e) => setGithubRepoUrl(e.target.value)}
              placeholder="https://github.com/username/repository"
              helperText="项目关联的GitHub仓库地址，用于代码管理和协作"
            />
            
            <TextField
              margin="normal"
              fullWidth
              id="githubAccessToken"
              label="GitHub 访问令牌 (私有仓库需要)"
              name="githubAccessToken"
              type="password"
              value={githubAccessToken}
              onChange={(e) => setGithubAccessToken(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              helperText="访问私有仓库需要提供Personal Access Token（仓库地址会在创建项目时自动验证）"
            />

          </Box>
          
          {error && (
            <Alert severity="error" sx={{ mt: 3 }}>
              {error}
            </Alert>
          )}

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            sx={{ mt: 3 }}
            disabled={loading || !!nameError || checkingName || validatingGithub}
          >
            {validatingGithub ? '验证仓库中...' : loading ? '创建中...' : '创建项目'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default CreateProjectPage; 