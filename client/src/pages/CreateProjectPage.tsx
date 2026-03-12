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
  CircularProgress,
  Chip,
  Autocomplete,
  createFilterOptions,
  Collapse,
} from '@mui/material';
import MDEditor from '@uiw/react-md-editor';
import { projectAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Delete } from '@mui/icons-material';
import { useDebounce } from '../hooks/useDebounce';
import FeaturePreview from '../components/FeaturePreview';

interface Tag {
  id: string;
  name: string;
  color: string;
}

const filter = createFilterOptions<Tag>();

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
  
  // 标签相关状态
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [inputTagValue, setInputTagValue] = useState('');
  const [loadingTags, setLoadingTags] = useState(false);
  
  // 功能模块启用状态（默认全部启用）
  const [enableUpdates, setEnableUpdates] = useState(true);
  const [enableSurveys, setEnableSurveys] = useState(true);
  const [enableContributions, setEnableContributions] = useState(false);
  const [enableTaskQueue, setEnableTaskQueue] = useState(true);
  const [enableProposals, setEnableProposals] = useState(true);
  const [enableDiscussions, setEnableDiscussions] = useState(true);
  
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  
  // 使用防抖处理项目名称输入
  const debouncedName = useDebounce(name, 500);

  // 加载所有标签
  useEffect(() => {
    const loadTags = async () => {
      try {
        setLoadingTags(true);
        const response = await projectAPI.getAllTags();
        setTags(response.data || []);
      } catch (err) {
        console.error('加载标签失败:', err);
      } finally {
        setLoadingTags(false);
      }
    };
    loadTags();
  }, []);

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
      
      // 检查文件大小（限制为10MB）
      if (file.size > 10 * 1024 * 1024) {
        setError(`文件大小超过10MB`);
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
        
        // 添加标签名称
        if (selectedTags.length > 0) {
          const tagNames = selectedTags.map(t => t.name);
          formData.append('tagNames', JSON.stringify(tagNames));
        }
        
        // 添加功能模块启用设置
        formData.append('enableUpdates', String(enableUpdates));
        formData.append('enableSurveys', String(enableSurveys));
        formData.append('enableContributions', String(enableContributions));
        formData.append('enableTaskQueue', String(enableTaskQueue));
        formData.append('enableProposals', String(enableProposals));
        formData.append('enableDiscussions', String(enableDiscussions));
        
        projectResponse = await projectAPI.createProjectWithCover(formData);
      } else {
        // 否则使用基本API
        // 分离已存在的标签ID和新标签名称
        const existingTagIds = selectedTags.filter(t => t.id).map(t => t.id);
        const newTagNames = selectedTags.filter(t => !t.id).map(t => t.name);
        
        projectResponse = await projectAPI.createProject(
          name, 
          description, 
          undefined, 
          githubRepoUrl, 
          githubAccessToken, 
          newTagNames, 
          existingTagIds,
          enableUpdates,
          enableSurveys,
          enableContributions,
          enableTaskQueue,
          enableProposals,
          enableDiscussions
        );
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
              详细描述这个项目，它现在处在哪一步？你（们）对它的愿景是什么？（支持Markdown格式）
            </Typography>
          </Box>
          
          <Box sx={{ mt: 2, mb: 2 }}>
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
              选择一张项目封面图片，最大10MB，之后在项目详情页可以上传更多图片
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
            <Typography variant="subtitle1" gutterBottom>
              项目标签 (可选)
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              为项目添加标签，最多10个标签，便于分类和搜索
            </Typography>
            <Autocomplete
              multiple
              freeSolo
              options={tags}
              value={selectedTags}
              onChange={(_, newValue) => {
                // 限制最多10个标签
                if (newValue.length <= 10) {
                  // 处理新输入的标签
                  const processedValue = newValue.map(item => {
                    if (typeof item === 'string') {
                      // 新输入的字符串标签
                      return { id: '', name: item, color: '#1976d2' };
                    }
                    // 处理新创建的标签（id以new-开头），提取标签名称本身
                    if (item.id && item.id.startsWith('new-')) {
                      const tagName = item.name.replace(/^创建\s*"?([^"]*)"?$/, '$1');
                      return { id: '', name: tagName, color: item.color };
                    }
                    return item;
                  });
                  setSelectedTags(processedValue);
                }
              }}
              inputValue={inputTagValue}
              onInputChange={(_, newInputValue) => {
                setInputTagValue(newInputValue);
              }}
              filterOptions={(options, params) => {
                const filtered = filter(options, params);
                // 如果输入的值不存在于选项中，添加"创建"选项
                if (params.inputValue !== '' && !options.find(t => t.name.toLowerCase() === params.inputValue.toLowerCase())) {
                  filtered.push({
                    id: `new-${params.inputValue}`,
                    name: `创建 "${params.inputValue}"`,
                    color: '#1976d2'
                  });
                }
                return filtered;
              }}
              getOptionLabel={(option) => {
                if (typeof option === 'string') return option;
                // 如果是新建的标签选项（id以new-开头），只显示标签名称本身
                if (option.id && option.id.startsWith('new-')) {
                  return option.name.replace(/^创建\s*"?([^"]*)"?$/, '$1');
                }
                return option.name;
              }}
              loading={loadingTags}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => {
                  const { key, ...tagProps } = getTagProps({ index });
                  return (
                    <Chip
                      key={key}
                      variant="outlined"
                      label={typeof option === 'string' ? option : option.name}
                      size="small"
                      {...tagProps}
                      sx={{
                        bgcolor: typeof option === 'string' ? '#1976d2' : option.color,
                        color: '#fff',
                        '& .MuiChip-deleteIcon': {
                          color: 'rgba(255,255,255,0.7)',
                          '&:hover': {
                            color: '#fff'
                          }
                        }
                      }}
                    />
                  );
                })
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder={selectedTags.length >= 10 ? "已达最大标签数量(10)" : "输入标签名称"}
                  disabled={selectedTags.length >= 10}
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {loadingTags ? <CircularProgress color="inherit" size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    )
                  }}
                />
              )}
            />
          </Box>
          
          {/* 功能模块启用设置 */}
          <Box sx={{ mt: 4, mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              选择你想要启用的功能模块
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
              选择项目需要启用的功能模块，默认全部启用
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <FeaturePreview
                featureKey="updates"
                label="更新日志系统"
                description="(用于让开发者发布更新日志，并向粉丝展示自己的更新频率，可以连接git/svn获取)"
                checked={enableUpdates}
                onChange={setEnableUpdates}
                darkImage="/images/features/updates-dark.png"
                lightImage="/images/features/updates-light.png"
              />
              
              <Collapse in={enableUpdates}>
                <Box sx={{ mt: 1, mb: 1, ml: 0, pl: 0, borderLeft: '3px solid', borderColor: 'primary.main' }}>
                  <Typography variant="subtitle2" color="primary" sx={{ mb: 0.2, ml: 2 }}>
                    GitHub 仓库关联 (可选)
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0, ml: 2 }}>
                    关联GitHub仓库后可自动获取更新日志
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
                    size="small"
                    sx={{ ml: 2, mt: 1 }}
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
                    size="small"
                    sx={{ ml: 2, mt: 1 }}
                  />
                </Box>
              </Collapse>
              
              <FeaturePreview
                featureKey="surveys"
                label="意见征询系统"
                description="(用于在开发者面临选择时，征求粉丝的看法，支持投票或自由发言)"
                checked={enableSurveys}
                onChange={setEnableSurveys}
                darkImage="/images/features/surveys-dark.png"
                lightImage="/images/features/surveys-light.png"
              />
              
              <FeaturePreview
                featureKey="taskQueue"
                label="任务队列"
                description="(一个待办清单Todo List，展示了开发者的工作计划或开发重心，同时也会展示给玩家)"
                checked={enableTaskQueue}
                onChange={setEnableTaskQueue}
                darkImage="/images/features/taskqueue-dark.png"
                lightImage="/images/features/taskqueue-light.png"
              />
              
              <FeaturePreview
                featureKey="proposals"
                label="提案系统"
                description="(一个让开发者和粉丝共同记录想法或者bug的地方)"
                checked={enableProposals}
                onChange={setEnableProposals}
                darkImage="/images/features/proposals-dark.png"
                lightImage="/images/features/proposals-light.png"
              />
              
              <FeaturePreview
                featureKey="discussions"
                label="讨论区"
                description="(粉丝可以自由留言，表达赞扬或否定，从讨论区诞生的创意，可以被创建为提案)"
                checked={enableDiscussions}
                onChange={setEnableDiscussions}
                darkImage="/images/features/discussions-dark.png"
                lightImage="/images/features/discussions-light.png"
              />
              
              <FeaturePreview
                featureKey="contributions"
                label="贡献度系统"
                description="(粉丝通过提案，捐赠，悬赏等方式获得贡献度，通过贡献度限制，开发者可以发布特殊版本。实验性功能，不建议启用)"
                checked={enableContributions}
                onChange={setEnableContributions}
                darkImage="/images/features/contributions-dark.png"
                lightImage="/images/features/contributions-light.png"
              />
            </Box>
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