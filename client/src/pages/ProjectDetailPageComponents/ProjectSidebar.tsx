import React from 'react';
import {
  Typography,
  Box,
  Paper,
  Button,
  Alert,
  List,
  ListItem,
  ListItemText,
  Avatar,
  Stack,
  Tooltip,
  TextField,
  Collapse,
  IconButton,
  Chip,
  CircularProgress
} from '@mui/material';
import { 
  ExpandMore, 
  ExpandLess, 
  Download, 
  DownloadDone
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { formatRelativeTime } from '../../utils/dateUtils';
import ProjectContributionList from './ProjectContributionList';

interface ProjectUpdate {
  id: string;
  content: string;
  demoLink?: string;
  createdAt: string;
  createdBy?: string;
  isVersion?: boolean;
  versionName?: string;
  imageUrl?: string;
}

interface Member {
  id: string;
  username: string;
  avatarUrl?: string;
}

// 上半部分组件：项目简介和图片墙
interface ProjectSidebarTopProps {
  project: {
    id: string;
    name: string;
    description: string;
    updates: ProjectUpdate[];
  };
  onOpenInfoDialog: () => void;
}

export const ProjectSidebarTop: React.FC<ProjectSidebarTopProps> = ({
  project,
  onOpenInfoDialog
}) => {
  return (
    <>
      {/* 项目简介 */}
      <Box sx={{ mb: 2 }}>
        <Paper 
          elevation={0} 
          sx={{ 
            bgcolor: 'rgba(0,0,0,0)',
            p: 2,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            cursor: 'pointer',
            '&:hover': {
              bgcolor: 'action.hover'
            }
          }}
          onClick={onOpenInfoDialog}
        >
          <Typography variant="h6" gutterBottom>{project.name}</Typography>
          <Typography variant="body2" sx={{ 
            maxHeight: '100px', 
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical'
          }}>
            {project.description}
          </Typography>
        </Paper>
      </Box>

      {/* 照片墙 */}
      {project.updates.filter(update => update.imageUrl).length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 1 }}>
            {project.updates
              .filter(update => update.imageUrl)
              .sort((a, b) => {
                // 将封面图片（版本更新的图片）排在前面
                if (a.isVersion && !b.isVersion) return -1;
                if (!a.isVersion && b.isVersion) return 1;
                // 如果都是版本更新，按时间倒序
                if (a.isVersion && b.isVersion) {
                  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                }
                // 其他按时间倒序
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
              })
              .map((update, index) => (
                <Box 
                  key={index}
                  sx={{ position: 'relative' }}
                >
                  <Box 
                    component="img"
                    src={update.imageUrl}
                    alt={`项目图片 ${index+1}`}
                    sx={{ 
                      width: '100%', 
                      height: 80, 
                      objectFit: 'cover',
                      borderRadius: 1,
                      cursor: 'pointer',
                      transition: 'transform 0.2s',
                      border: update.isVersion ? '2px solid #1976d2' : '1px solid rgba(0,0,0,0.1)',
                      '&:hover': {
                        transform: 'scale(1.05)'
                      }
                    }}
                    onClick={() => {
                      if (update.imageUrl) {
                        window.open(update.imageUrl, '_blank');
                      }
                    }}
                  />
                  {update.isVersion && (
                    <Chip
                      label="封面"
                      size="small"
                      color="primary"
                      sx={{ 
                        position: 'absolute',
                        top: 2,
                        right: 2,
                        fontSize: '0.6rem',
                        height: '18px'
                      }}
                    />
                  )}
                </Box>
              ))
            }
          </Box>
        </Box>
      )}
    </>
  );
};

// 下半部分组件：项目成员、版本更新和项目账户管理
interface ProjectSidebarBottomProps {
  project: {
    id: string;
    name: string;
    createdBy: string;
    members: string[];
    updates: ProjectUpdate[];
    projectBalance?: number;
  };
  members: Member[];
  isMember: boolean;
  user: any | null;
  withdrawAmount: number;
  withdrawLoading: boolean;
  withdrawError: string | null;
  withdrawals: any[];
  loadingWithdrawals: boolean;
  expandWithdrawals: boolean;
  onWithdrawAmountChange: (amount: number) => void;
  onWithdraw: () => void;
  onToggleWithdrawals: () => void;
  formatUsername: (userId: string) => string;
  contributors?: { id: string; username: string; avatarUrl?: string; contribution: number }[];
  loadingContributors?: boolean;
}

export const ProjectSidebarBottom: React.FC<ProjectSidebarBottomProps> = ({
  project,
  members,
  isMember,
  user,
  withdrawAmount,
  withdrawLoading,
  withdrawError,
  withdrawals,
  loadingWithdrawals,
  expandWithdrawals,
  onWithdrawAmountChange,
  onWithdraw,
  onToggleWithdrawals,
  formatUsername,
  contributors = [],
  loadingContributors = false
}) => {
  const navigate = useNavigate();
  
  return (
    <>
      {/* 项目成员 - Github风格 */}
      <Box sx={{ mb: 1 }}>
        {project.members.length > 0 ? (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {members.map((member) => (
              <Tooltip key={member.id} title={project.createdBy === member.id ? `项目创建者：${member.username}` : `项目成员：${member.username}`}>
                <Avatar 
                  src={member.avatarUrl} 
                  alt={member.username}
                  onClick={() => navigate(`/user/${member.id}`)}
                  sx={{ 
                    width: 40, 
                    height: 40, 
                    cursor: 'pointer',
                    '&:hover': {
                      transform: 'scale(1.1)'
                    }
                  }}
                >
                  {member.username.charAt(0).toUpperCase()}
                </Avatar>
              </Tooltip>
            ))}
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">
            暂无项目成员信息
          </Typography>
        )}
      </Box>
      
      {/* 版本更新 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>版本更新</Typography>
        {project.updates.length === 0 || project.updates.filter(update => update.isVersion).length === 0 ? (
          <Alert severity="info">暂无版本更新</Alert>
        ) : (
          <List dense disablePadding>
            {project.updates
              .filter(update => update.isVersion || (update.versionName && update.versionName.length > 0))
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map((update) => (
                <ListItem
                  key={update.id}
                  sx={{
                    px: 1,
                    py: 0.5,
                    borderLeft: '3px solid',
                    borderColor: 'primary.main',
                    mb: 1,
                    borderRadius: '0 4px 4px 0',
                    bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.01)',
                    '&:hover': {
                      bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'
                    }
                  }}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" fontWeight="medium" noWrap sx={{ maxWidth: '180px' }}>
                          {update.versionName || '版本更新'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatRelativeTime(update.createdAt)}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5, flexWrap: 'wrap' }}>
                        {/* 如果版本更新有图片，显示小缩略图 */}
                        {update.imageUrl && (
                          <Box
                            component="img"
                            src={update.imageUrl}
                            sx={{ 
                              width: 40, 
                              height: 40, 
                              objectFit: 'cover',
                              borderRadius: 1,
                              cursor: 'pointer',
                              mr: 1,
                              border: '1px solid rgba(0,0,0,0.1)'
                            }}
                            onClick={() => window.open(update.imageUrl, '_blank')}
                          />
                        )}
                        <Typography variant="caption" sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {update.content}
                        </Typography>
                        
                        {update.demoLink && (
                          <IconButton 
                            size="small" 
                            color="primary"
                            href={update.demoLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{ ml: 'auto', p: 0.5 }}
                          >
                            <Download fontSize="small" />
                          </IconButton>
                        )}
                      </Box>
                    }
                  />
                </ListItem>
              ))}
          </List>
        )}
      </Box>

      {/* 项目账户管理模块 - 仅对项目成员可见且项目成员数大于1时显示 */}
      {user && isMember && project.members.length > 1 && (
        <Box sx={{ mt: 4 }}>
          <Paper 
            elevation={0} 
            sx={{ 
              p: 2, 
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1
            }}
          >
            <Typography variant="h6" gutterBottom>项目账户管理</Typography>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="body1" fontWeight="bold" color="primary">
                账户余额: {project?.projectBalance || 0} 金币
              </Typography>
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" gutterBottom>
                提取金币到个人账户
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <TextField
                  size="small"
                  type="number"
                  label="提取金额"
                  value={withdrawAmount}
                  onChange={(e) => onWithdrawAmountChange(parseInt(e.target.value))}
                  InputProps={{ inputProps: { min: 1, max: project?.projectBalance || 0 } }}
                  sx={{ flex: 1 }}
                  error={!!withdrawError}
                  helperText={withdrawError}
                />
                <Button
                  variant="contained"
                  onClick={onWithdraw}
                  disabled={withdrawLoading || !withdrawAmount || withdrawAmount <= 0 || withdrawAmount > (project?.projectBalance || 0)}
                >
                  {withdrawLoading ? '提取中...' : '提取'}
                </Button>
              </Box>
            </Box>
            
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" sx={{ flexGrow: 1 }}>
                  提款记录
                </Typography>
                <IconButton size="small" onClick={onToggleWithdrawals}>
                  {expandWithdrawals ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                </IconButton>
              </Box>
              
              {loadingWithdrawals ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
                  <CircularProgress size={20} />
                </Box>
              ) : withdrawals.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                  暂无提款记录
                </Typography>
              ) : (
                <Collapse in={expandWithdrawals}>
                  <List dense disablePadding>
                    {withdrawals.map((withdrawal) => (
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
        </Box>
      )}
      
      {/* 项目贡献度列表 */}
      <ProjectContributionList contributors={contributors} loading={loadingContributors} />
    </>
  );
};

// 侧边栏主组件，包装上下两个部分，负责响应式布局
interface ProjectSidebarProps {
  project: {
    id: string;
    name: string;
    description: string;
    createdBy: string;
    members: string[];
    updates: ProjectUpdate[];
    projectBalance?: number;
  };
  members: Member[];
  isMember: boolean;
  user: any | null;
  withdrawAmount: number;
  withdrawLoading: boolean;
  withdrawError: string | null;
  withdrawals: any[];
  loadingWithdrawals: boolean;
  expandWithdrawals: boolean;
  onOpenInfoDialog: () => void;
  onWithdrawAmountChange: (amount: number) => void;
  onWithdraw: () => void;
  onToggleWithdrawals: () => void;
  formatUsername: (userId: string) => string;
  contributors?: { id: string; username: string; avatarUrl?: string; contribution: number }[];
  loadingContributors?: boolean;
}

const ProjectSidebar: React.FC<ProjectSidebarProps> = (props) => {
  return (
    <Box sx={{ width: '100%' }}>
      <ProjectSidebarTop 
        project={props.project} 
        onOpenInfoDialog={props.onOpenInfoDialog} 
      />
      <ProjectSidebarBottom 
        project={props.project}
        members={props.members}
        isMember={props.isMember}
        user={props.user}
        withdrawAmount={props.withdrawAmount}
        withdrawLoading={props.withdrawLoading}
        withdrawError={props.withdrawError}
        withdrawals={props.withdrawals}
        loadingWithdrawals={props.loadingWithdrawals}
        expandWithdrawals={props.expandWithdrawals}
        onWithdrawAmountChange={props.onWithdrawAmountChange}
        onWithdraw={props.onWithdraw}
        onToggleWithdrawals={props.onToggleWithdrawals}
        formatUsername={props.formatUsername}
        contributors={props.contributors}
        loadingContributors={props.loadingContributors}
      />
    </Box>
  );
};

export default ProjectSidebar; 