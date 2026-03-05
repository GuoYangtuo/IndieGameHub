import React from 'react';
import {
  Typography,
  Box,
  Paper,
  Alert,
  List,
  ListItem,
  ListItemText,
  Avatar,
  Tooltip,
  IconButton,
  Chip
} from '@mui/material';
import { 
  Download
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { formatRelativeTime } from '../../utils/dateUtils';
import ProjectContributionList from './ProjectContributionList';
import SurveySidebar from '../../components/SurveySidebar';

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
                  {update.isVersion == true && (
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

// 下半部分组件：项目成员、版本更新
interface ProjectSidebarBottomProps {
  project: {
    id: string;
    name: string;
    slug: string;
    createdBy: string;
    members: string[];
    updates: ProjectUpdate[];
  };
  members: Member[];
  contributors?: { id: string; username: string; avatarUrl?: string; contribution: number }[];
  loadingContributors?: boolean;
  isMember?: boolean;
  onCreateSurvey?: () => void;
  onRefreshSurvey?: () => void;
  currentUsername?: string;
}

export const ProjectSidebarBottom: React.FC<ProjectSidebarBottomProps> = ({
  project,
  members,
  contributors = [],
  loadingContributors = false,
  isMember = false,
  onCreateSurvey,
  onRefreshSurvey,
  currentUsername
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
      <Box sx={{ mb: 2 }}>
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

      {/* 意见征询板块 - 仅项目成员可见 */}
      {isMember && (
        <SurveySidebar
          projectId={project.id}
          projectSlug={project.slug}
          isMember={isMember}
          onCreateSurvey={onCreateSurvey || (() => {})}
          onRefresh={onRefreshSurvey || (() => {})}
          currentUsername={currentUsername}
        />
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
    slug: string;
    description: string;
    createdBy: string;
    members: string[];
    updates: ProjectUpdate[];
  };
  members: Member[];
  onOpenInfoDialog: () => void;
  contributors?: { id: string; username: string; avatarUrl?: string; contribution: number }[];
  loadingContributors?: boolean;
  isMember?: boolean;
  onCreateSurvey?: () => void;
  onRefreshSurvey?: () => void;
  currentUsername?: string;
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
        contributors={props.contributors}
        loadingContributors={props.loadingContributors}
        isMember={props.isMember}
        onCreateSurvey={props.onCreateSurvey}
        onRefreshSurvey={props.onRefreshSurvey}
        currentUsername={props.currentUsername}
      />
    </Box>
  );
};

export default ProjectSidebar; 