import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Button,
  TextField,
  Paper,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  useTheme,
  FormControl,
  Stack,
  Tabs,
  Tab,
  Collapse
} from '@mui/material';
import {
  Save,
  Delete,
  PersonAdd,
  PersonRemove,
  ArrowBack,
  ExpandMore,
  ExpandLess
} from '@mui/icons-material';
import { projectAPI, userAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useProjectTitle } from '../contexts/ProjectTitleContext';
import { formatRelativeTime } from '../utils/dateUtils';

interface User {
  id: string;
  username: string;
  email: string;
}

interface Project {
  id: string;
  name: string;
  slug: string;
  description: string;
  demoLink?: string;
  createdBy: string;
  members: string[];
  createdAt: string;
  githubRepoUrl?: string;
  githubAccessToken?: string;
  projectBalance?: number;
  contributionRates?: {
    proposalCreation: number;
    bountyCreation: number;
    bountyCompletion: number;
    oneTimeContribution: number;
    longTermContribution: number;
  };
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

const ProjectSettingsPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setProjectTitle, setDemoLink } = useProjectTitle();
  
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [projectDemoLink, setProjectDemoLink] = useState('');
  const [githubRepoUrl, setGithubRepoUrl] = useState('');
  const [githubAccessToken, setGithubAccessToken] = useState('');
  const [validatingGithub, setValidatingGithub] = useState(false);
  const [githubValidationResult, setGithubValidationResult] = useState<string | null>(null);
  
  const [savingProject, setSavingProject] = useState(false);
  const [deletingProject, setDeletingProject] = useState(false);
  
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  
  const [members, setMembers] = useState<User[]>([]);
  const [newMemberName, setNewMemberName] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [memberError, setMemberError] = useState<string | null>(null);
  
  const [contributionRates, setContributionRates] = useState({
    proposalCreation: 0.1,
    bountyCreation: 0.2,
    bountyCompletion: 0.8,
    oneTimeContribution: 0.9,
    longTermContribution: 1.0
  });
  const [savingRates, setSavingRates] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState(0);

  // 项目账户管理相关状态
  const [withdrawAmount, setWithdrawAmount] = useState<number>(0);
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [expandWithdrawals, setExpandWithdrawals] = useState(false);
  
  const isCreator = project && user ? project.createdBy === user.id : false;
  const isMember = project && user ? project.members.includes(user.id) || project.createdBy === user.id : false;
  
  const theme = useTheme();
  
  useEffect(() => {
    const fetchData = async () => {
      if (!slug) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const projectResponse = await projectAPI.getProjectBySlug(slug);
        const projectData = projectResponse.data;
        setProject(projectData);
        
        setProjectName(projectData.name);
        setProjectDescription(projectData.description);
        setProjectDemoLink(projectData.demoLink || '');
        setGithubRepoUrl(projectData.githubRepoUrl || '');
        setGithubAccessToken(projectData.githubAccessToken || '');
        
        if (projectData.contributionRates) {
          setContributionRates(projectData.contributionRates);
        }
        
        setProjectTitle(projectData.name);
        
        const latestVersionUpdate = projectData.updates?.find((update: any) => update.isVersion);
        
        if (latestVersionUpdate && latestVersionUpdate.demoLink) {
          setDemoLink(latestVersionUpdate.demoLink);
        } else if (projectData.demoLink) {
          setDemoLink(projectData.demoLink);
        } else {
          setDemoLink(null);
        }
        
        if (projectData.members && projectData.members.length > 0) {
          const membersResponse = await userAPI.getUsersByIds(projectData.members);
          setMembers(membersResponse.data);
        }

        // 获取提款记录
        try {
          const detailResponse = await projectAPI.getProjectDetailComplete(slug);
          if (detailResponse.data.withdrawals) {
            setWithdrawals(detailResponse.data.withdrawals);
          }
        } catch {
          // 忽略提款记录加载失败
        }
      } catch (err) {
        console.error('获取项目详情失败:', err);
        setError('获取项目详情失败，请稍后再试');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    
    return () => {
      setProjectTitle(null);
      setDemoLink(null);
    };
  }, [slug, setProjectTitle, setDemoLink]);
  
  const validateGithubRepo = async () => {
    if (!githubRepoUrl.trim()) {
      setGithubValidationResult(null);
      return;
    }
    
    try {
      setValidatingGithub(true);
      const response = await projectAPI.validateGithubRepository(githubRepoUrl, githubAccessToken);
      if (response.data.isValid && response.data.isAccessible) {
        setGithubValidationResult('✓ 仓库验证成功');
      } else {
        setGithubValidationResult(`✗ ${response.data.message}`);
      }
    } catch (err: any) {
      setGithubValidationResult(`✗ ${err.response?.data?.message || '验证失败'}`);
    } finally {
      setValidatingGithub(false);
    }
  };
  
  const handleUpdateProject = async () => {
    if (!project) return;
    
    try {
      setSavingProject(true);
      setError(null);
      setSuccessMessage(null);
      
      const response = await projectAPI.updateProject(
        project.id,
        projectName,
        projectDescription,
        projectDemoLink,
        githubRepoUrl,
        githubAccessToken
      );
      
      setProject(response.data);
      setProjectTitle(response.data.name);
      
      if (projectDemoLink) {
        setDemoLink(projectDemoLink);
      }
      
      setSuccessMessage('项目信息更新成功');
    } catch (err: any) {
      console.error('更新项目信息失败:', err);
      setError(err.response?.data?.message || '更新项目信息失败，请稍后再试');
    } finally {
      setSavingProject(false);
    }
  };
  
  const handleAddMember = async () => {
    if (!project || !newMemberName) return;
    
    try {
      setAddingMember(true);
      setMemberError(null);
      
      const response = await projectAPI.addMemberByUsername(project.id, newMemberName);
      
      setMembers(response.data.members);
      setNewMemberName('');
      
      setSuccessMessage('成员添加成功');
    } catch (err: any) {
      console.error('添加成员失败:', err);
      setMemberError(err.response?.data?.message || '添加成员失败，请确认用户名正确');
    } finally {
      setAddingMember(false);
    }
  };
  
  const handleRemoveMember = async (memberId: string) => {
    if (!project || !isCreator) return;
    
    try {
      const response = await projectAPI.removeMember(project.id, memberId);
      
      setMembers(response.data.members);
      
      setSuccessMessage('成员移除成功');
    } catch (err: any) {
      console.error('移除成员失败:', err);
      setError(err.response?.data?.message || '移除成员失败，请稍后再试');
    }
  };
  
  const handleUpdateContributionRates = async () => {
    if (!project) return;
    
    try {
      setSavingRates(true);
      setError(null);
      setSuccessMessage(null);
      
      await projectAPI.updateContributionRates(
        project.id,
        contributionRates
      );
      
      setSuccessMessage('贡献度获得率更新成功');
    } catch (err: any) {
      console.error('更新贡献度获得率失败:', err);
      setError(err.response?.data?.message || '更新贡献度获得率失败，请稍后再试');
    } finally {
      setSavingRates(false);
    }
  };
  
  const handleRateChange = (field: keyof typeof contributionRates, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      setContributionRates(prev => ({
        ...prev,
        [field]: numValue
      }));
    }
  };
  
  const handleDeleteProject = async () => {
    if (!project || !isCreator) return;
    
    try {
      setDeletingProject(true);
      
      await projectAPI.deleteProject(project.id);
      
      navigate('/');
    } catch (err: any) {
      console.error('删除项目失败:', err);
      setError(err.response?.data?.message || '删除项目失败，请稍后再试');
      setDeletingProject(false);
    }
  };

  const handleWithdraw = async () => {
    if (!project || withdrawAmount <= 0) return;

    try {
      setWithdrawLoading(true);
      setWithdrawError(null);

      await projectAPI.withdrawFromProject(project.id, withdrawAmount);

      const updatedProject = await projectAPI.getProjectBySlug(slug || '');
      setProject(updatedProject.data);

      try {
        const response = await projectAPI.getProjectDetailComplete(slug || '');
        if (response.data.withdrawals) {
          setWithdrawals(response.data.withdrawals);
        }
      } catch {
        // 忽略
      }

      setWithdrawAmount(0);
      setSuccessMessage('提款成功');
    } catch (err: any) {
      console.error('提款失败:', err);
      setWithdrawError(err.response?.data?.message || '提款失败，请稍后再试');
    } finally {
      setWithdrawLoading(false);
    }
  };

  const formatUsername = (userId: string) => {
    const member = members.find(m => m.id === userId);
    return member ? member.username : '未知用户';
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && !project) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">{error || '项目不存在'}</Alert>
        <Button sx={{ mt: 2 }} onClick={() => navigate('/')}>
          返回首页
        </Button>
      </Container>
    );
  }

  return (
    <Box sx={{ pb: 8 }}>
      <Container maxWidth="md" sx={{ mt: 2, px: { xs: 1, md: 2 } }}>
        {/* 顶部导航 */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate(`/projects/${slug}`)}
            sx={{ mr: 1 }}
          >
            返回项目
          </Button>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            项目设置
          </Typography>
        </Box>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        
        {successMessage && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMessage(null)}>
            {successMessage}
          </Alert>
        )}
        
        {/* Tabs */}
        <Paper sx={{ mb: 3 }}>
          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              borderBottom: 1,
              borderColor: 'divider',
              '& .MuiTab-root': { minHeight: 48 }
            }}
          >
            <Tab label="基本信息" />
            <Tab label="项目成员" />
            <Tab label="贡献度设置" />
            {isMember && project && project.members.length > 1 && (
              <Tab label="项目账户" />
            )}
            {isCreator && <Tab label="危险区域" />}
          </Tabs>
        </Paper>

        {/* Tab 0: 基本信息 */}
        <TabPanel value={activeTab} index={0}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              项目信息
            </Typography>
            
            <FormControl fullWidth sx={{ mb: 2 }}>
              <TextField
                label="项目名称"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                variant="outlined"
                fullWidth
                disabled={!isCreator}
              />
            </FormControl>
            
            <FormControl fullWidth sx={{ mb: 2 }}>
              <TextField
                label="项目描述"
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                variant="outlined"
                fullWidth
                multiline
                rows={4}
                disabled={!isCreator}
              />
            </FormControl>
            
            <FormControl fullWidth sx={{ mb: 2 }}>
              <TextField
                label="项目演示链接 (可选)"
                value={projectDemoLink}
                onChange={(e) => setProjectDemoLink(e.target.value)}
                variant="outlined"
                fullWidth
                placeholder="https://example.com"
                disabled={!isCreator}
              />
            </FormControl>
            
            <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
              GitHub 仓库关联
            </Typography>
            
            <FormControl fullWidth sx={{ mb: 2 }}>
              <TextField
                label="GitHub 仓库 URL (可选)"
                value={githubRepoUrl}
                onChange={(e) => {
                  setGithubRepoUrl(e.target.value);
                  setGithubValidationResult(null);
                }}
                variant="outlined"
                fullWidth
                placeholder="https://github.com/username/repository"
                disabled={!isCreator}
                helperText="项目关联的GitHub仓库地址，用于代码管理和协作"
              />
            </FormControl>
            
            <FormControl fullWidth sx={{ mb: 2 }}>
              <TextField
                label="GitHub 访问令牌 (私有仓库需要)"
                value={githubAccessToken}
                onChange={(e) => {
                  setGithubAccessToken(e.target.value);
                  setGithubValidationResult(null);
                }}
                variant="outlined"
                fullWidth
                type="password"
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                disabled={!isCreator}
                helperText="访问私有仓库需要提供Personal Access Token"
              />
            </FormControl>
            
            {isCreator && (
              <Stack direction="row" spacing={2} sx={{ mb: 2, alignItems: 'center' }}>
                <Button
                  variant="outlined"
                  onClick={validateGithubRepo}
                  disabled={!githubRepoUrl.trim() || validatingGithub}
                  startIcon={validatingGithub && <CircularProgress size={20} />}
                >
                  {validatingGithub ? '验证中...' : '验证仓库'}
                </Button>
                
                {githubValidationResult && (
                  <Typography 
                    variant="body2" 
                    color={githubValidationResult.startsWith('✓') ? 'success.main' : 'error.main'}
                  >
                    {githubValidationResult}
                  </Typography>
                )}
              </Stack>
            )}
            
            <Button
              variant="contained"
              color="primary"
              startIcon={<Save />}
              onClick={handleUpdateProject}
              disabled={savingProject || !isCreator}
            >
              {savingProject ? '保存中...' : '保存项目信息'}
            </Button>
          </Paper>
        </TabPanel>

        {/* Tab 1: 项目成员 */}
        <TabPanel value={activeTab} index={1}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              项目成员
            </Typography>
            
            <List>
              {members.map((member) => (
                <ListItem key={member.id}>
                  <ListItemText
                    primary={member.username}
                    secondary={member.email}
                  />
                  
                  {isCreator && member.id !== user?.id && (
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        onClick={() => handleRemoveMember(member.id)}
                        disabled={!isCreator}
                      >
                        <PersonRemove />
                      </IconButton>
                    </ListItemSecondaryAction>
                  )}
                </ListItem>
              ))}
            </List>
            
            {isCreator && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  添加新成员
                </Typography>
                
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <TextField
                    label="用户名"
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    variant="outlined"
                    size="small"
                    sx={{ flexGrow: 1, mr: 1 }}
                    error={!!memberError}
                    helperText={memberError}
                  />
                  
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<PersonAdd />}
                    onClick={handleAddMember}
                    disabled={addingMember || !newMemberName}
                  >
                    添加
                  </Button>
                </Box>
              </Box>
            )}
          </Paper>
        </TabPanel>

        {/* Tab 2: 贡献度设置 */}
        <TabPanel value={activeTab} index={2}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              贡献度获得率设置
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              设置用户在各种情况下获得贡献度的比例
            </Typography>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                创建提案获得的贡献度（每个）
              </Typography>
              <TextField
                fullWidth
                variant="outlined"
                size="small"
                type="number"
                inputProps={{ min: 0, step: 0.1 }}
                value={contributionRates.proposalCreation}
                onChange={(e) => handleRateChange('proposalCreation', e.target.value)}
                sx={{ mb: 2 }}
              />
              
              <Typography variant="subtitle2" gutterBottom>
                创建悬赏时立即获得的贡献度比例（悬赏额 × 此比例）
              </Typography>
              <TextField
                fullWidth
                variant="outlined"
                size="small"
                type="number"
                inputProps={{ min: 0, max: 1, step: 0.1 }}
                value={contributionRates.bountyCreation}
                onChange={(e) => handleRateChange('bountyCreation', e.target.value)}
                sx={{ mb: 2 }}
              />
              
              <Typography variant="subtitle2" gutterBottom>
                提案完成后悬赏者获得的剩余贡献度比例（悬赏额 × 此比例）
              </Typography>
              <TextField
                fullWidth
                variant="outlined"
                size="small"
                type="number"
                inputProps={{ min: 0, max: 1, step: 0.1 }}
                value={contributionRates.bountyCompletion}
                onChange={(e) => handleRateChange('bountyCompletion', e.target.value)}
                sx={{ mb: 2 }}
              />
              
              <Typography variant="subtitle2" gutterBottom>
                一次性贡献获得的贡献度比例（捐赠额 × 此比例）
              </Typography>
              <TextField
                fullWidth
                variant="outlined"
                size="small"
                type="number"
                inputProps={{ min: 0, max: 1, step: 0.1 }}
                value={contributionRates.oneTimeContribution}
                onChange={(e) => handleRateChange('oneTimeContribution', e.target.value)}
                sx={{ mb: 2 }}
              />
              
              <Typography variant="subtitle2" gutterBottom>
                长期贡献获得的贡献度比例（捐赠额 × 此比例）
              </Typography>
              <TextField
                fullWidth
                variant="outlined"
                size="small"
                type="number"
                inputProps={{ min: 0, max: 2, step: 0.1 }}
                value={contributionRates.longTermContribution}
                onChange={(e) => handleRateChange('longTermContribution', e.target.value)}
                sx={{ mb: 2 }}
              />
              
              <Button
                variant="contained"
                color="primary"
                startIcon={<Save />}
                onClick={handleUpdateContributionRates}
                disabled={savingRates || !isCreator}
                sx={{ mt: 1 }}
              >
                {savingRates ? '保存中...' : '保存贡献度设置'}
              </Button>
            </Box>
          </Paper>
        </TabPanel>

        {/* Tab 3: 项目账户管理 (条件渲染) */}
        {isMember && project && project.members.length > 1 && (
          <TabPanel value={activeTab} index={3}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>项目账户管理</Typography>
              
              <Box sx={{ mb: 3, p: 2, bgcolor: theme.palette.mode === 'dark' ? 'rgba(25, 118, 210, 0.08)' : 'rgba(25, 118, 210, 0.04)', borderRadius: 1 }}>
                <Typography variant="body1" fontWeight="bold" color="primary" sx={{ fontSize: '1.2rem' }}>
                  账户余额: {project?.projectBalance || 0} 金币
                </Typography>
              </Box>
              
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom fontWeight={500}>
                  提取金币到个人账户
                </Typography>
                
                <Box sx={{ display: 'flex', gap: 1, mb: 1, maxWidth: 400 }}>
                  <TextField
                    size="small"
                    type="number"
                    label="提取金额"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(parseInt(e.target.value))}
                    InputProps={{ inputProps: { min: 1, max: project?.projectBalance || 0 } }}
                    sx={{ flex: 1 }}
                    error={!!withdrawError}
                    helperText={withdrawError}
                  />
                  <Button
                    variant="contained"
                    onClick={handleWithdraw}
                    disabled={withdrawLoading || !withdrawAmount || withdrawAmount <= 0 || withdrawAmount > (project?.projectBalance || 0)}
                  >
                    {withdrawLoading ? '提取中...' : '提取'}
                  </Button>
                </Box>
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle1" sx={{ flexGrow: 1 }} fontWeight={500}>
                    提款记录
                  </Typography>
                  <IconButton size="small" onClick={() => setExpandWithdrawals(!expandWithdrawals)}>
                    {expandWithdrawals ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                  </IconButton>
                </Box>
                
                {withdrawals.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                    暂无提款记录
                  </Typography>
                ) : (
                  <Collapse in={expandWithdrawals}>
                    <List dense disablePadding>
                      {withdrawals.map((withdrawal: any) => (
                        <ListItem key={withdrawal.id} divider>
                          <ListItemText
                            primary={`${formatUsername(withdrawal.userId)} 提取了 ${withdrawal.amount} 金币`}
                            secondary={formatRelativeTime(withdrawal.createdAt)}
                            primaryTypographyProps={{ variant: 'body2' }}
                            secondaryTypographyProps={{ variant: 'caption' }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Collapse>
                )}
              </Box>
            </Paper>
          </TabPanel>
        )}

        {/* Tab: 危险区域 (条件渲染, index depends on account tab presence) */}
        {isCreator && (
          <TabPanel
            value={activeTab}
            index={isMember && project && project.members.length > 1 ? 4 : 3}
          >
            <Paper sx={{ p: 3, bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 0, 0, 0.1)' : 'rgba(255, 0, 0, 0.05)' }}>
              <Typography variant="h6" color="error" gutterBottom>
                危险区域
              </Typography>
              
              <Divider sx={{ mb: 3 }} />
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="subtitle1" gutterBottom>
                    删除项目
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    删除后，项目及其所有相关数据将被永久删除，此操作不可撤销。
                  </Typography>
                </Box>
                
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<Delete />}
                  onClick={() => setShowDeleteDialog(true)}
                >
                  删除项目
                </Button>
              </Box>
            </Paper>
          </TabPanel>
        )}
        
        {/* 删除确认对话框 */}
        <Dialog
          open={showDeleteDialog}
          onClose={() => setShowDeleteDialog(false)}
        >
          <DialogTitle>确认删除项目？</DialogTitle>
          <DialogContent>
            <DialogContentText>
              此操作将永久删除项目"{project?.name}"及其所有相关数据，删除后将无法恢复。
            </DialogContentText>
            <DialogContentText sx={{ mt: 2, fontWeight: 'bold' }}>
              请输入项目名称"{project?.name}"确认删除：
            </DialogContentText>
            <TextField
              fullWidth
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              margin="dense"
              variant="outlined"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowDeleteDialog(false)}>取消</Button>
            <Button
              onClick={handleDeleteProject}
              color="error"
              disabled={deleteConfirmText !== project?.name || deletingProject}
            >
              {deletingProject ? '删除中...' : '确认删除'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

export default ProjectSettingsPage;
