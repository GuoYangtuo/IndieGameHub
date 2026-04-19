import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  IconButton,
  CircularProgress,
  Chip,
  Autocomplete,
  createFilterOptions,
  Switch,
  FormControlLabel,
  Collapse,
  Slide,
  Popover,
  Link,
  Avatar,
  Popper,
  Grow,
  Paper,
  MenuList,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import MDEditor from '@uiw/react-md-editor';
import { projectAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Delete, ArrowBack, ArrowForward, Check, CloudDownload, ImportExport, Home, Add, Settings, MonetizationOn, Logout } from '@mui/icons-material';
import FeatureStepPanel from '../components/FeatureStepPanel';
import RechargeDialog from '../components/RechargeDialog';
import { useDebounce } from '../hooks/useDebounce';

interface Tag {
  id: string;
  name: string;
  color: string;
}

const filter = createFilterOptions<Tag>();

const CreateProjectPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('left');

  // 基础信息状态
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
  const [storeUrl, setStoreUrl] = useState('');
  const [fetchingFromUrl, setFetchingFromUrl] = useState(false);
  const [storeUrlAnchor, setStoreUrlAnchor] = useState<HTMLElement | null>(null);

  // 用户头像菜单状态
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const avatarAnchorRef = useRef<HTMLDivElement>(null);

  // 充值弹窗状态
  const [rechargeDialogOpen, setRechargeDialogOpen] = useState(false);

  // 标签相关状态
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [inputTagValue, setInputTagValue] = useState('');
  const [loadingTags, setLoadingTags] = useState(false);

  // 功能模块启用状态
  const [enableUpdates, setEnableUpdates] = useState(false);
  const [enableSurveys, setEnableSurveys] = useState(true);
  const [enableContributions, setEnableContributions] = useState(true);
  const [enableTaskQueue, setEnableTaskQueue] = useState(false);
  const [enableProposals, setEnableProposals] = useState(true);
  const [enableDiscussions, setEnableDiscussions] = useState(true);
  const [enableBetCampaign, setEnableBetCampaign] = useState(false);

  const { user, logout } = useAuth();
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();

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

  // 检查项目名称是否存在
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

      if (file.size > 10 * 1024 * 1024) {
        setError(`文件大小超过10MB`);
        return;
      }

      if (!file.type.match('image.*')) {
        setError(`请选择图片文件`);
        return;
      }

      setCoverImage(file);
      setError(null);

      const reader = new FileReader();
      reader.onload = () => {
        setCoverImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveCoverImage = () => {
    setCoverImage(null);
    setCoverImagePreview(null);
  };

  // 处理登出
  const handleLogout = () => {
    logout();
    setAvatarMenuOpen(false);
    navigate('/');
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

  // 从商店URL自动获取数据
  const handleFetchFromStoreUrl = async () => {
    const trimmedUrl = storeUrl.trim();
    if (!trimmedUrl) {
      setError('请先输入商店页面链接');
      return;
    }

    try {
      new URL(trimmedUrl);
    } catch {
      setError('链接格式无效，请检查后重试');
      return;
    }

    setFetchingFromUrl(true);
    setError(null);

    try {
      const response = await projectAPI.fetchFromStoreURL(trimmedUrl);
      const { data, platform } = response.data;

      if (data.name && !name.trim()) {
        setName(data.name);
      }
      if (data.description && !description.trim()) {
        setDescription(data.description);
      }
      if (data.tags && data.tags.length > 0 && selectedTags.length === 0) {
        const matchedTags = data.tags.map((tagName: string) => {
          const found = tags.find(t => t.name.toLowerCase() === tagName.toLowerCase());
          return found ? found : { id: '', name: tagName, color: '#1976d2' };
        });
        setSelectedTags(matchedTags);
      }

      const platformLabel = platform === 'steam' ? 'Steam' : 'itch.io';
      setError(`已从 ${platformLabel} 页面获取数据，请检查并整理`);
    } catch (err: any) {
      const msg = err.response?.data?.message || '获取数据失败，请稍后重试';
      setError(msg);
    } finally {
      setFetchingFromUrl(false);
    }
  };

  // 验证GitHub仓库
  const validateGithubRepo = async (repoUrl: string, accessToken: string) => {
    if (!repoUrl.trim()) {
      return { isValid: true, message: '' };
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

  // 切换步骤
  const handleNext = async () => {
    setError(null);
    setSlideDirection('left');

    if (currentStep === 0) {
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
    }

    setCurrentStep((prev) => Math.min(prev + 1, 4));
  };

  const handleBack = () => {
    setError(null);
    setSlideDirection('right');
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  // 提交创建项目
  const handleSubmit = async () => {
    if (!user) {
      setError('请先登录');
      return;
    }

    // 如果填写了仓库地址，先验证仓库
    if (githubRepoUrl.trim()) {
      setLoading(true);
      setError(null);
      const validationResult = await validateGithubRepo(githubRepoUrl, githubAccessToken);
      setLoading(false);

      if (!validationResult.isValid) {
        setError(`仓库验证失败：${validationResult.message}`);
        return;
      }
    }

    try {
      setLoading(true);
      setError(null);

      let projectResponse;

      if (coverImage) {
        const formData = new FormData();
        formData.append('name', name);
        formData.append('description', description);
        formData.append('coverImage', coverImage);
        if (githubRepoUrl) formData.append('githubRepoUrl', githubRepoUrl);
        if (githubAccessToken) formData.append('githubAccessToken', githubAccessToken);

        if (selectedTags.length > 0) {
          const tagNames = selectedTags.map(t => t.name);
          formData.append('tagNames', JSON.stringify(tagNames));
        }

        formData.append('enableUpdates', String(enableUpdates));
        formData.append('enableSurveys', String(enableSurveys));
        formData.append('enableBetCampaign', String(enableBetCampaign));
        formData.append('enableTaskQueue', String(enableTaskQueue));
        formData.append('enableProposals', String(enableProposals));
        formData.append('enableDiscussions', String(enableDiscussions));
        formData.append('enableContributions', String(enableContributions));

        projectResponse = await projectAPI.createProjectWithCover(formData);
      } else {
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
          enableDiscussions,
          enableBetCampaign
        );
      }

      const projectSlug = projectResponse.data.slug;
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
    }
  };

  if (!user) {
    navigate('/login');
    return null;
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <Box sx={{ maxWidth: 'md', width: '100%', mx: 'auto', pt: 0, display: 'flex', flexDirection: 'column', minHeight: 500 }}>
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="h5">
                  填写项目信息
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<ImportExport />}
                  onClick={(e) => setStoreUrlAnchor(e.currentTarget)}
                >
                  从其它平台导入
                </Button>
              </Box>

            <Popover
              open={Boolean(storeUrlAnchor)}
              anchorEl={storeUrlAnchor}
              onClose={() => setStoreUrlAnchor(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              sx={{
                mt: 1,
                '& .MuiPaper-root': {
                  bgcolor: 'grey.950',
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'grey.700',
                }
              }}
            >
              <Box sx={{ p: 2, width: 400, maxWidth: '90vw' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                  <CloudDownload color="primary" sx={{ mr: 1 }} />
                  <Typography variant="subtitle1" color="primary">
                    从其它平台一键导入
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                  目前支持 Steam 商店页面链接和 itch.io 页面链接
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="https://store.steampowered.com/..."
                    value={storeUrl}
                    onChange={(e) => setStoreUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleFetchFromStoreUrl();
                      }
                    }}
                    disabled={fetchingFromUrl}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        '& fieldset': {
                          borderColor: 'grey.700',
                        },
                        '&:hover fieldset': {
                          borderColor: 'primary.main',
                        },
                      },
                    }}
                  />
                  <Button
                    variant="contained"
                    onClick={handleFetchFromStoreUrl}
                    disabled={fetchingFromUrl || !storeUrl.trim()}
                    startIcon={fetchingFromUrl ? <CircularProgress size={16} color="inherit" /> : <CloudDownload />}
                    sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}
                  >
                    {fetchingFromUrl ? '获取中...' : '拉取'}
                  </Button>
                </Box>
              </Box>
            </Popover>

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

            <Box sx={{ mt: 1, mb: 2 }}>
              <Typography variant="subtitle1">
                描述（支持Markdown格式）
              </Typography>
              <Typography variant="caption" color="text.secondary">
                简单介绍这个项目，现在处在哪一步？你（们）对它的愿景是什么？
              </Typography>
              <Box data-color-mode={isDarkMode ? "dark" : "light"}>
                <MDEditor
                  value={description}
                  onChange={(value) => setDescription(value || '')}
                  height={300}
                />
              </Box>
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
                选择一张项目封面图片，最大10MB
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

            <Box sx={{ mb: 2 }}>
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
                  if (newValue.length <= 10) {
                    const processedValue = newValue.map(item => {
                      if (typeof item === 'string') {
                        return { id: '', name: item, color: '#1976d2' };
                      }
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
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                endIcon={<ArrowForward />}
                onClick={handleNext}
              >
                下一步
              </Button>
            </Box>
          </Box>
        );

      case 1:
        return (
          <FeatureStepPanel
            customContent={
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 600, mb: 1.5 }}>
                  是否启用 对赌众筹？
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 2, lineHeight: 1.6 }}>
                  开发者给自己设定一个短期开发目标（比如一周或一个月内做完xx）然后众筹，完成目标之后才能拿到筹得捐款，如果开发失败则退还捐款。
                </Typography>
                <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 0.5 }}>
                  不适合哪些开发者：
                </Typography>
                <Box component="ul" sx={{ mt: 0, mb: 8, pl: 3, color: 'text.secondary', '& li': { mb: 0.5, lineHeight: 1.6 } }}>
                  <li>开发游戏给自己玩，粉丝什么的无所谓，我不想给自己设定目标或deadline~</li>
                  <li>我暂时不缺钱</li>
                </Box>
              </Box>
            }
            images={[
              { dark: '/images/features/bet-campaign-introduction.png', light: '/images/features/bet-campaign-introduction.png', description: '介绍什么是"对赌众筹"' },
              { dark: '/images/features/bet-campaign-example.png', light: '/images/features/bet-campaign-example.png', description: '一个对赌众筹的例子' },
            ]}
            onEnable={() => { setEnableBetCampaign(true); handleNext(); }}
            onDisable={() => { setEnableBetCampaign(false); handleNext(); }}
            onBack={handleBack}
          />
        );

      case 2:
        return (
          <FeatureStepPanel
            customContent={
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 600, mb: 1.5 }}>
                  意见征询系统
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.6 }}>
                  用于在开发者面临选择时，征求粉丝的看法，支持投票或自由发言。
                </Typography>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                  适合场景：
                </Typography>
                <Box component="ul" sx={{ mt: 0, mb: 0, pl: 3, color: 'text.secondary', '& li': { mb: 0.5, lineHeight: 1.6 } }}>
                  <li>不知道新功能做成A还是B？发起投票</li>
                  <li>卡关需要灵感？让粉丝出主意</li>
                </Box>
              </Box>
            }
            images={[
              { dark: '/images/features/surveys-dark.png', light: '/images/features/surveys-light.png' },
            ]}
            onEnable={() => { setEnableSurveys(true); handleNext(); }}
            onDisable={() => { setEnableSurveys(false); handleNext(); }}
            onBack={handleBack}
          />
        );

      case 3:
        return (
          <FeatureStepPanel
            customContent={
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 600, mb: 1.5 }}>
                  提案系统
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.6 }}>
                  一个让开发者和粉丝共同记录想法或者bug的地方。
                </Typography>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                  适合场景：
                </Typography>
                <Box component="ul" sx={{ mt: 0, mb: 0, pl: 3, color: 'text.secondary', '& li': { mb: 0.5, lineHeight: 1.6 } }}>
                  <li>记录粉丝提出的游戏创意</li>
                  <li>收集并整理bug反馈</li>
                  <li>公开开发计划，接受审议</li>
                </Box>
              </Box>
            }
            images={[
              { dark: '/images/features/proposals-dark.png', light: '/images/features/proposals-light.png' },
              { dark: '/images/features/proposals-dark.png', light: '/images/features/proposals-light.png' },
            ]}
            onEnable={() => { setEnableProposals(true); handleNext(); }}
            onDisable={() => { setEnableProposals(false); handleNext(); }}
            onBack={handleBack}
          />
        );

      case 4:
        return (
          <Box>
            <Typography variant="h5" gutterBottom>
              其他系统设置
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              选择需要启用的其他功能模块
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 600 }}>
              <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={enableUpdates}
                      onChange={(e) => setEnableUpdates(e.target.checked)}
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <Typography variant="subtitle1">更新日志系统</Typography>
                      <Typography variant="caption" color="text.secondary">
                        用于发布更新日志，展示项目进展
                      </Typography>
                    </Box>
                  }
                  sx={{ m: 0, width: '100%', justifyContent: 'space-between' }}
                />
                <Collapse in={enableUpdates}>
                  <Box sx={{ p: 1, bgcolor: 'background.default', borderRadius: 1 }}>
                    <Typography variant="subtitle2" color="primary" sx={{ mb: 1 }}>
                      GitHub 仓库关联 (可选)
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                      关联GitHub仓库后可自动获取更新日志
                    </Typography>
                    <TextField
                      margin="dense"
                      fullWidth
                      id="githubRepoUrl"
                      label="GitHub 仓库 URL"
                      name="githubRepoUrl"
                      value={githubRepoUrl}
                      onChange={(e) => setGithubRepoUrl(e.target.value)}
                      placeholder="https://github.com/username/repository"
                      size="small"
                    />
                    <TextField
                      margin="dense"
                      fullWidth
                      id="githubAccessToken"
                      label="GitHub 访问令牌 (私有仓库需要)"
                      name="githubAccessToken"
                      type="password"
                      value={githubAccessToken}
                      onChange={(e) => setGithubAccessToken(e.target.value)}
                      placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                      helperText="访问私有仓库需要提供Personal Access Token"
                      size="small"
                      sx={{ mt: 1 }}
                    />
                  </Box>
                </Collapse>
              </Box>

              <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={enableTaskQueue}
                      onChange={(e) => setEnableTaskQueue(e.target.checked)}
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <Typography variant="subtitle1">任务队列</Typography>
                      <Typography variant="caption" color="text.secondary">
                        展示开发者的工作计划，待办清单
                      </Typography>
                    </Box>
                  }
                  sx={{ m: 0, width: '100%', justifyContent: 'space-between' }}
                />
              </Box>

              <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={enableDiscussions}
                      onChange={(e) => setEnableDiscussions(e.target.checked)}
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <Typography variant="subtitle1">讨论区</Typography>
                      <Typography variant="caption" color="text.secondary">
                        粉丝可以自由留言，从讨论区诞生的创意可以被创建为提案
                      </Typography>
                    </Box>
                  }
                  sx={{ m: 0, width: '100%', justifyContent: 'space-between' }}
                />
              </Box>

              <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={enableContributions}
                      onChange={(e) => setEnableContributions(e.target.checked)}
                      color="primary"
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <Typography variant="subtitle1">贡献度系统</Typography>
                      <Typography variant="caption" color="text.secondary">
                        粉丝通过提案、捐赠、悬赏等方式获得贡献度（实验性功能）
                      </Typography>
                    </Box>
                  }
                  sx={{ m: 0, width: '100%', justifyContent: 'space-between' }}
                />
              </Box>
            </Box>

            {/* 摘要 */}
            <Box sx={{ mt: 4, bgcolor: 'background.default', borderRadius: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                配置摘要
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {enableUpdates && <Chip label="更新日志" size="small" color="primary" />}
                {enableSurveys && <Chip label="意见征询" size="small" color="primary" />}
                {enableBetCampaign && <Chip label="对赌众筹" size="small" color="primary" />}
                {enableTaskQueue && <Chip label="任务队列" size="small" color="primary" />}
                {enableProposals && <Chip label="提案系统" size="small" color="primary" />}
                {enableDiscussions && <Chip label="讨论区" size="small" color="primary" />}
                {enableContributions && <Chip label="贡献度系统" size="small" color="primary" />}
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                共启用 {[
                  enableUpdates,
                  enableSurveys,
                  enableBetCampaign,
                  enableTaskQueue,
                  enableProposals,
                  enableDiscussions,
                  enableContributions
                ].filter(Boolean).length} 个功能模块
              </Typography>
            </Box>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Box sx={{ width: '100%', flex: 1, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', px: (currentStep === 0 || currentStep === 4) ? { xs: 4, md: 6 } : 0, pt: (currentStep === 0 || currentStep === 4) ? 6 : 0, pb: (currentStep === 0 || currentStep === 4) ? 5 : 0 }}>

        {/* 固定在右上角的用户头像 */}
        {user && (
          <Box
            ref={avatarAnchorRef}
            sx={{
              position: 'fixed',
              top: 16,
              right: 16,
              zIndex: 1300,
            }}
            onMouseEnter={() => setAvatarMenuOpen(true)}
            onMouseLeave={() => setAvatarMenuOpen(false)}
          >
            <IconButton onClick={handleAvatarClick} sx={{ p: 0.5 }}>
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
        )}
        <RechargeDialog
          open={rechargeDialogOpen}
          onClose={() => setRechargeDialogOpen(false)}
        />

        {error && (
          <Alert severity="error" sx={{ mb: 2, maxWidth: 'md', mx: 'auto', width: '100%' }}>
            {error}
          </Alert>
        )}

        <Slide in={true} direction={slideDirection === 'left' ? 'right' : 'left'}>
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {renderStepContent()}
          </Box>
        </Slide>

        {currentStep === 4 ? (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
            <Button
              variant="outlined"
              startIcon={<ArrowBack />}
              onClick={handleBack}
              disabled={loading}
            >
              上一步
            </Button>

            <Button
              variant="contained"
              color="success"
              startIcon={<Check />}
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? '创建中...' : '创建项目'}
            </Button>
          </Box>
        ) : null}
      </Box>
  );
};

export default CreateProjectPage;
