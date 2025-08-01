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
  Chip,
  useTheme,
  Grid,
  FormControl
} from '@mui/material';
import { Save, Delete, PersonAdd, PersonRemove } from '@mui/icons-material';
import { projectAPI, userAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useProjectTitle } from '../contexts/ProjectTitleContext';
import DebouncedInput from '../components/DebouncedInput';

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
  contributionRates?: {
    proposalCreation: number;
    bountyCreation: number;
    bountyCompletion: number;
    oneTimeContribution: number;
    longTermContribution: number;
  };
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
  
  const [savingProject, setSavingProject] = useState(false);
  const [deletingProject, setDeletingProject] = useState(false);
  
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  
  const [members, setMembers] = useState<User[]>([]);
  const [newMemberName, setNewMemberName] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [memberError, setMemberError] = useState<string | null>(null);
  
  // 添加贡献度获得率状态
  const [contributionRates, setContributionRates] = useState({
    proposalCreation: 0.1,
    bountyCreation: 0.2,
    bountyCompletion: 0.8,
    oneTimeContribution: 0.9,
    longTermContribution: 1.0
  });
  const [savingRates, setSavingRates] = useState(false);
  
  // 检查用户是否为项目创建者
  const isCreator = project && user ? project.createdBy === user.id : false;
  
  // 获取主题对象
  const theme = useTheme();
  
  // 获取项目数据
  useEffect(() => {
    const fetchData = async () => {
      if (!slug) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // 获取项目详情
        const projectResponse = await projectAPI.getProjectBySlug(slug);
        const projectData = projectResponse.data;
        setProject(projectData);
        
        // 设置表单值
        setProjectName(projectData.name);
        setProjectDescription(projectData.description);
        setProjectDemoLink(projectData.demoLink || '');
        
        // 设置贡献度获得率
        if (projectData.contributionRates) {
          setContributionRates(projectData.contributionRates);
        }
        
        // 设置项目标题到导航栏
        setProjectTitle(projectData.name);
        
        // 获取最新版本更新的Demo链接，并设置到导航栏
        const latestVersionUpdate = projectData.updates?.find((update: any) => update.isVersion);
        
        if (latestVersionUpdate && latestVersionUpdate.demoLink) {
          setDemoLink(latestVersionUpdate.demoLink);
        } else if (projectData.demoLink) {
          setDemoLink(projectData.demoLink);
        } else {
          setDemoLink(null);
        }
        
        // 获取项目成员
        if (projectData.members && projectData.members.length > 0) {
          const membersResponse = await userAPI.getUsersByIds(projectData.members);
          setMembers(membersResponse.data);
        }
      } catch (err) {
        console.error('获取项目详情失败:', err);
        setError('获取项目详情失败，请稍后再试');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    
    // 清理函数，离开页面时清除项目标题和Demo链接
    return () => {
      setProjectTitle(null);
      setDemoLink(null);
    };
  }, [slug, setProjectTitle, setDemoLink]);
  
  // 处理更新项目信息
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
        projectDemoLink
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
  
  // 处理添加成员
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
  
  // 处理移除成员
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
  
  // 处理更新贡献度获得率
  const handleUpdateContributionRates = async () => {
    if (!project) return;
    
    try {
      setSavingRates(true);
      setError(null);
      setSuccessMessage(null);
      
      const response = await projectAPI.updateContributionRates(
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
  
  // 处理贡献度获得率输入变化
  const handleRateChange = (field: keyof typeof contributionRates, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      setContributionRates(prev => ({
        ...prev,
        [field]: numValue
      }));
    }
  };
  
  // 处理删除项目
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
      <Container maxWidth="lg" sx={{ mt: 2, px: 1 }}>
        <Typography variant="h4" gutterBottom>
          项目设置
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        {successMessage && (
          <Alert severity="success" sx={{ mb: 3 }}>
            {successMessage}
          </Alert>
        )}
        
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
          <Box sx={{ flex: 1 }}>
            {/* 项目基本信息 */}
            <Paper sx={{ p: 3, mb: 3 }}>
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
            
            {/* 项目成员管理 */}
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                项目成员
              </Typography>
              
              {/* 成员列表 */}
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
          </Box>
          
          <Box sx={{ flex: 1 }}>
            {/* 贡献度获得率设置 */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                贡献度获得率设置
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
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
            
            {/* 危险区域 */}
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
          </Box>
        </Box>
        
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