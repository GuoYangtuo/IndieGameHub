import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Alert,
  Card,
  CardContent,
  Button,
  Collapse,
  IconButton,
  Divider,
  List,
  ListItem,
  ListItemText,
  Paper,
  Grid,
  Chip,
  Badge
} from '@mui/material';
import { ExpandMore, ExpandLess, Favorite, CalendarToday, MonetizationOn } from '@mui/icons-material';
import ProjectCard from '../components/ProjectCard';
import { projectAPI, userAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { formatRelativeTime, toDateString, parseDate } from '../utils/dateUtils';
import CalendarHeatmap from 'react-calendar-heatmap';
import ReactTooltip from 'react-tooltip';
import 'react-calendar-heatmap/dist/styles.css';
import '../styles/heatmap.css';

// 项目接口
interface Project {
  id: string;
  name: string;
  slug: string;
  description: string;
  demoLink?: string;
  createdBy: string;
  createdAt: string;
  coverImage?: string;
  projectBalance?: number;
  updates: ProjectUpdate[];
}

// 项目更新接口
interface ProjectUpdate {
  id: string;
  projectId: string;
  content: string;
  demoLink?: string;
  createdAt: string;
  createdBy?: string;
  isVersion?: boolean;
  versionName?: string;
  imageUrl?: string;
}

// 项目更新集合接口
interface ProjectUpdates {
  projectId: string;
  projectName?: string;
  projectSlug?: string;
  updates: ProjectUpdate[];
}

// 提案接口
interface Proposal {
  id: string;
  title: string;
  status: string;
  projectId: string;
}

// 悬赏接口
interface Bounty {
  id: string;
  proposalId: string;
  projectId: string;
  amount: number;
  status: 'active' | 'pending' | 'closed';
  createdAt: string;
  proposalTitle: string;
}

// 项目热力图组件
const ProjectHeatmap: React.FC<{
  project: Project;
  updates: ProjectUpdate[];
  onSelectDate?: (date: string | null, projectId: string) => void;
  selectedDate?: string | null;
}> = ({ project, updates, onSelectDate, selectedDate }) => {
  // 处理点击日期
  const handleDateClick = (value: any) => {
    if (!value || !value.date) return;
    
    try {
      const dateStr = toDateString(value.date.toISOString());
      
      if (selectedDate === dateStr) {
        // 如果点击已选中的日期，取消选择
        onSelectDate && onSelectDate(null, project.id);
      } else {
        // 否则选中该日期
        onSelectDate && onSelectDate(dateStr, project.id);
      }
    } catch (error) {
      console.error('处理日期点击时出错:', error);
    }
  };

  // 获取当前日期的更新
  const getSelectedDateUpdates = () => {
    if (!selectedDate) return [];
    
    return updates.filter(update => {
      try {
        const updateDate = toDateString(update.createdAt);
        return updateDate === selectedDate;
      } catch (error) {
        return false;
      }
    }).sort((a, b) => {
      try {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } catch (error) {
        return 0;
      }
    });
  };

  const selectedDateUpdates = getSelectedDateUpdates();

  return (
    <Paper elevation={1} sx={{ p: { xs: 2, md: 1.5 }, mb: 2, borderRadius: 2 }}>
      <Typography 
        variant="h6" 
        sx={{ 
          fontWeight: 'bold',
          mb: 1,
          cursor: 'pointer',
          fontSize: { xs: '1.25rem', md: '1.1rem' }, // 在桌面端稍微缩小字体
          lineHeight: 1.2
        }}
        onClick={() => window.location.href = `/projects/${project.slug}`}
      >
        {project.name}
      </Typography>
      
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 1 }}>
        {/* 更新活跃度热力图 - 左侧 */}
        <Box sx={{ 
          flex: { xs: '1', md: '0.15' },
          display: { xs: 'none', md: 'block' }
        }}>
            <CalendarHeatmap
              startDate={new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)}
              endDate={new Date()}
              values={
                (() => {
                  // 按日期分组更新
                  const updatesByDate: Record<string, ProjectUpdate[]> = {};
                  
                  if (updates && Array.isArray(updates)) {
                    updates.forEach(update => {
                      try {
                        const date = parseDate(update.createdAt);
                        if (date) {
                          const dateStr = toDateString(date.toISOString());
                          if (!updatesByDate[dateStr]) {
                            updatesByDate[dateStr] = [];
                          }
                          updatesByDate[dateStr].push(update);
                        }
                      } catch (error) {
                        // 忽略无效日期
                      }
                    });
                  }
                  
                  // 转换为热力图数据格式
                  return Object.entries(updatesByDate).map(([date, updates]) => {
                    try {
                      return {
                        date: new Date(date),
                        count: updates.length, // 使用实际更新数量
                        content: updates.map(u => u.content).join(', '),
                        updates: updates // 保存完整的更新数据
                      };
                    } catch (error) {
                      return null;
                    }
                  }).filter(Boolean) as { date: Date; count: number; content: string; updates: ProjectUpdate[] }[];
                })()
              }
              classForValue={(value) => {
                if (!value) {
                  return 'color-empty';
                }
                
                // 判断是否是选中的日期
                let dateStr = null;
                try {
                  dateStr = toDateString(value.date?.toISOString());
                } catch (error) {
                  return 'color-empty';
                }
                
                const isSelected = dateStr === selectedDate;
                
                // 根据更新次数设置不同的颜色级别
                // 1-3次，4-6次，7-9次，10次+
                const count = value.count || 0;
                let colorClass = 'color-empty';
                if (count >= 10) colorClass = 'color-scale-4';
                else if (count >= 7) colorClass = 'color-scale-3';
                else if (count >= 4) colorClass = 'color-scale-2';
                else if (count > 0) colorClass = 'color-scale-1';
                
                // 如果是选中的日期，添加高亮类
                return isSelected ? `${colorClass} highlighted` : colorClass;
              }}
              tooltipDataAttrs={(value) => {
                if (!value || !value.date) {
                  return null;
                }
                
                try {
                  const date = value.date.toLocaleDateString('zh-CN');
                  // 获取当日更新计数
                  const count = value.count || 0;
                  return {
                    'data-tip': `${date}: ${count}次更新`,
                  };
                } catch (error) {
                  return {
                    'data-tip': '无效日期',
                  };
                }
              }}
              onClick={handleDateClick}
            />
            <ReactTooltip />
        </Box>
        
        {/* 日常更新列表 - 右侧 */}
        <Box sx={{ 
            flex: { xs: '1', md: '0.85' },
            width: { xs: '100%', md: 'auto' },
            borderLeft: { xs: 'none', md: theme => `1px solid ${theme.palette.divider}` }
          }}>
            {!updates || !Array.isArray(updates) || 
            (selectedDate && selectedDateUpdates.length === 0) || 
            (!selectedDate && updates.filter(u => !u.isVersion).length === 0) ? (
              <Alert severity="info">暂无开发进度更新</Alert>
            ) : (
              <Box sx={{ maxHeight: '200px', overflow: 'auto' }}>
                <List dense>
                  {(selectedDate ? selectedDateUpdates : 
                    (Array.isArray(updates) ? updates : [])
                      .filter(update => !update.isVersion)
                      .sort((a, b) => {
                        try {
                          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                        } catch (error) {
                          return 0;
                        }
                      })
                      .slice(0, 3)
                  ).map((update) => (
                    <ListItem 
                      key={update.id} 
                      divider
                      sx={{ cursor: 'pointer' }}
                      onClick={() => window.location.href = `/${project.slug}`}
                    >
                      <ListItemText 
                        primary={
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body2" noWrap sx={{ maxWidth: { xs: '80%', md: '70%' } }}>
                              {update.isVersion && update.versionName 
                                ? `${update.versionName}` 
                                : update.content}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatRelativeTime(update.createdAt)}
                            </Typography>
                          </Box>
                        }
                        secondary={
                          Boolean(update.isVersion) && 
                          <Chip 
                            label="版本更新" 
                            size="small" 
                            color="primary" 
                            variant="outlined"
                            sx={{ mt: 0.5 }} 
                          />
                        }
                      />
                      {update.imageUrl && (
                        <Box 
                          component="img" 
                          src={update.imageUrl} 
                          sx={{ 
                            width: 40, 
                            height: 40, 
                            ml: 1, 
                            borderRadius: 1,
                            objectFit: 'cover'
                          }} 
                        />
                      )}
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
        </Box>
      </Box>
    </Paper>
  );
};

const HomePage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [favoriteProjects, setFavoriteProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [expandFavorites, setExpandFavorites] = useState(false);
  const [projectUpdates, setProjectUpdates] = useState<ProjectUpdates[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [createdProposals, setCreatedProposals] = useState<Record<string, Proposal>>({});
  const [expandProposals, setExpandProposals] = useState(false);
  const [userBounties, setUserBounties] = useState<Record<string, Bounty>>({});
  const [expandBounties, setExpandBounties] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  // 处理日期选择
  const handleSelectDate = (date: string | null, projectId: string) => {
    setSelectedDate(date);
    setSelectedProjectId(projectId);
  };

  // 获取所有项目
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setError(null);
        const response = await projectAPI.getProjects();
        setProjects(response.data);
      } catch (err) {
        console.error('获取项目列表失败:', err);
        setError('获取项目列表失败，请稍后再试');
      }
    };

    fetchProjects();
  }, []);
  
  // 获取关注的项目和更新
  useEffect(() => {
    const fetchFavoriteProjects = async () => {
      if (!user) return;
      
      try {
        // 获取关注的项目
        const response = await userAPI.getFavoriteProjects();
        
        // 按最近更新排序
        const sortedProjects = response.data.sort((a: Project, b: Project) => {
          const getLatestUpdateTime = (project: Project) => {
            if (project.updates && project.updates.length > 0) {
              return new Date(project.updates[project.updates.length - 1].createdAt).getTime();
            }
            return new Date(project.createdAt).getTime();
          };
          
          return getLatestUpdateTime(b) - getLatestUpdateTime(a);
        });
        
        setFavoriteProjects(sortedProjects);
        
        // 获取关注项目的更新数据
        try {
          const updatesResponse = await userAPI.getFavoriteProjectsUpdates();
          
          // 将项目名称和slug添加到更新数据中
          const updatesWithNames = updatesResponse.data.map((item: ProjectUpdates) => {
            const project = sortedProjects.find((p: Project) => p.id === item.projectId);
            return {
              ...item,
              projectName: project ? project.name : '未知项目',
              projectSlug: project ? project.slug : ''
            };
          });
          
          setProjectUpdates(updatesWithNames);
        } catch (err) {
          console.error('获取关注项目更新失败:', err);
        }
      } catch (err) {
        console.error('获取关注项目失败:', err);
      }
    };
    
    fetchFavoriteProjects();
  }, [user]);

  // 获取用户创建的提案
  useEffect(() => {
    const fetchCreatedProposals = async () => {
      if (!user) return;
      
      try {
        const response = await userAPI.getCreatedProposals();
        setCreatedProposals(response.data);
      } catch (err) {
        console.error('获取创建的提案失败:', err);
      }
    };
    
    fetchCreatedProposals();
  }, [user]);

  // 获取用户悬赏的提案
  useEffect(() => {
    if (!user) return;
    
    const fetchUserBounties = async () => {
      try {
        const response = await userAPI.getUserBounties();
        setUserBounties(response.data);
      } catch (err) {
        console.error('获取悬赏提案失败:', err);
      }
    };
    
    fetchUserBounties();
  }, [user]);

  // 处理关闭悬赏
  const handleCloseBounty = async (bountyId: string) => {
    try {
      await userAPI.closeBounty(bountyId);
      
      // 更新本地状态
      setUserBounties(prev => {
        const newBounties = { ...prev };
        if (newBounties[bountyId]) {
          newBounties[bountyId] = {
            ...newBounties[bountyId],
            status: 'closed'
          };
        }
        return newBounties;
      });
    } catch (err) {
      console.error('关闭悬赏失败:', err);
    }
  };

  // 将项目和更新数据合并
  const getProjectsWithUpdates = () => {
    return favoriteProjects.map(project => {
      const updates = projectUpdates.find(item => item.projectId === project.id);
      return {
        project,
        updates: updates ? updates.updates : []
      };
    }).filter(item => item.updates.length > 0);
  };

  const projectsWithUpdates = getProjectsWithUpdates();

  // 获取提案状态对应的标签颜色
  const getProposalStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'info';
      case 'queued':
        return 'warning';
      case 'completed':
        return 'success';
      case 'closed':
        return 'success';
      default:
        return 'default';
    }
  };

  // 获取提案状态对应的文本
  const getProposalStatusText = (status: string) => {
    switch (status) {
      case 'open':
        return '开放中';
      case 'queued':
        return '已排队';
      case 'completed':
        return '已完成';
      case 'closed':
        return '已关闭';
      default:
        return '未知';
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* 用户创建的提案 */}
      {user && Object.keys(createdProposals).length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5" sx={{ flexGrow: 1 }}>
              我创建的提案
            </Typography>
            <IconButton 
              onClick={() => setExpandProposals(!expandProposals)}
            >
              {expandProposals ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          </Box>
          
          <Box sx={{ display: 'flex', flexWrap: 'wrap', mx: -1 }}>
            {/* 默认最多显示3个提案，展开后显示全部 */}
            {Object.entries(createdProposals)
              .slice(0, expandProposals ? undefined : 3)
              .map(([proposalId, proposal]) => (
                <Box key={proposalId} sx={{ width: { xs: '100%', sm: '50%', md: '33.33%' }, p: 1 }}>
                  <Card 
                    sx={{ 
                      cursor: 'pointer',
                      '&:hover': { boxShadow: 3 } 
                    }}
                    onClick={() => navigate(`/projects/${
                      projects.find(p => p.id === proposal.projectId)?.slug || proposal.projectId
                    }`)}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="body1" fontWeight="bold" noWrap>
                          {proposal.title}
                        </Typography>
                        <Chip 
                          size="small" 
                          label={getProposalStatusText(proposal.status)}
                          color={getProposalStatusColor(proposal.status) as "info" | "warning" | "success" | "default" | "primary" | "secondary" | "error"}
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        所属项目: {projects.find(p => p.id === proposal.projectId)?.name || '未知项目'}
                      </Typography>
                    </CardContent>
                  </Card>
                </Box>
              ))}
          </Box>
          
          <Divider sx={{ my: 3 }} />
        </Box>
      )}
      
      {/* 用户悬赏的提案 */}
      {user && Object.keys(userBounties).length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5" sx={{ flexGrow: 1 }}>
              我悬赏的提案
            </Typography>
            <IconButton 
              onClick={() => setExpandBounties(!expandBounties)}
            >
              {expandBounties ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          </Box>
          
          <Box sx={{ display: 'flex', flexWrap: 'wrap', mx: -1 }}>
            {/* 默认最多显示3个悬赏，展开后显示全部 */}
            {Object.entries(userBounties)
              .slice(0, expandBounties ? undefined : 3)
              .map(([bountyId, bounty]) => (
                <Box key={bountyId} sx={{ width: { xs: '100%', sm: '50%', md: '33.33%' }, p: 1 }}>
                  <Card 
                    sx={{ 
                      cursor: 'pointer',
                      '&:hover': { boxShadow: 3 },
                      borderLeft: bounty.status === 'pending' ? '3px solid #ff9800' : undefined
                    }}
                    onClick={() => navigate(`/projects/${
                      projects.find(p => p.id === bounty.projectId)?.slug || bounty.projectId
                    }`)}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="body1" fontWeight="bold" noWrap>
                          {bounty.proposalTitle}
                        </Typography>
                        <Chip 
                          icon={<MonetizationOn fontSize="small" />}
                          size="small" 
                          label={`${bounty.amount} 金币`}
                          color="primary"
                        />
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                          所属项目: {projects.find(p => p.id === bounty.projectId)?.name || '未知项目'}
                        </Typography>
                        <Chip 
                          size="small" 
                          label={
                            bounty.status === 'active' ? '进行中' : 
                            bounty.status === 'pending' ? '待确认' : '已完成'
                          }
                          color={
                            bounty.status === 'active' ? 'info' : 
                            bounty.status === 'pending' ? 'warning' : 'success'
                          }
                        />
                      </Box>
                      {bounty.status === 'pending' && (
                        <Button
                          variant="outlined"
                          size="small"
                          color="warning"
                          sx={{ mt: 1 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCloseBounty(bountyId);
                          }}
                        >
                          已检查，确认转账
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </Box>
              ))}
          </Box>
          
          <Divider sx={{ my: 3 }} />
        </Box>
      )}
      
      {/* 关注的项目 */}
      {user && projectsWithUpdates.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5" sx={{ flexGrow: 1 }}>
              我关注的项目
            </Typography>
            <IconButton 
              onClick={() => setExpandFavorites(!expandFavorites)}
            >
              {expandFavorites ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          </Box>
          
          {projectsWithUpdates.length === 0 ? (
            <Alert severity="info" sx={{ mb: 2 }}>关注的项目暂无更新</Alert>
          ) : (
            <>
              {/* 默认显示前两个项目 */}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                {projectsWithUpdates.slice(0, 2).map((item) => (
                  <Box 
                    key={item.project.id}
                    sx={{ 
                      width: { xs: '100%', md: 'calc(50% - 8px)' },
                      minWidth: { md: '400px' }
                    }}
                  >
                    <ProjectHeatmap 
                      project={item.project}
                      updates={item.updates}
                      onSelectDate={handleSelectDate}
                      selectedDate={selectedProjectId === item.project.id ? selectedDate : null}
                    />
                  </Box>
                ))}
              </Box>
              
              {/* 展开后显示其余项目 */}
              <Collapse in={expandFavorites}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2 }}>
                  {projectsWithUpdates.slice(2).map((item) => (
                    <Box 
                      key={item.project.id}
                      sx={{ 
                        width: { xs: '100%', md: 'calc(50% - 8px)' },
                        minWidth: { md: '400px' }
                      }}
                    >
                      <ProjectHeatmap 
                        project={item.project}
                        updates={item.updates}
                        onSelectDate={handleSelectDate}
                        selectedDate={selectedProjectId === item.project.id ? selectedDate : null}
                      />
                    </Box>
                  ))}
                </Box>
              </Collapse>
            </>
          )}
          
          <Divider sx={{ my: 3 }} />
        </Box>
      )}

      {/* 所有项目列表 */}
      <Typography variant="h5" gutterBottom>
        探索新的独立游戏
      </Typography>
      {/* 此功能暂不开放 */}
      <Alert severity="info">此功能暂不开放</Alert>
      <Divider sx={{ my: 3 }} />
      {error ? (
        <Alert severity="error">{error}</Alert>
      ) : projects.length === 0 ? (
        <Alert severity="info">暂无项目</Alert>
      ) : (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', mx: -1.5 }}>
          {projects.map((project) => (
            <Box key={project.id} sx={{ width: { xs: '100%', sm: '50%', md: '33.33%' }, p: 1.5 }}>
              <ProjectCard
                id={project.id}
                name={project.name}
                slug={project.slug}
                description={project.description}
                demoLink={project.demoLink}
                updates={project.updates}
                createdAt={project.createdAt}
              />
            </Box>
          ))}
        </Box>
      )}
    </Container>
  );
};

export default HomePage; 