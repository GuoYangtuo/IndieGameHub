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
import { formatRelativeTime, toDateString } from '../utils/dateUtils';
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
    
    const dateStr = value.date.toISOString().split('T')[0];
    
    if (dateStr === selectedDate) {
      // 如果点击已选中的日期，取消选择
      onSelectDate && onSelectDate(null, project.id);
    } else {
      // 否则选择该日期
      onSelectDate && onSelectDate(dateStr, project.id);
    }
  };

  // 获取热力图数据
  const getHeatmapData = () => {
    const updatesByDate: Record<string, ProjectUpdate[]> = {};
    
    updates.forEach(update => {
      const date = new Date(update.createdAt).toISOString().split('T')[0];
      if (!updatesByDate[date]) {
        updatesByDate[date] = [];
      }
      updatesByDate[date].push(update);
    });
    
    return Object.entries(updatesByDate).map(([date, updates]) => ({
      date: new Date(date),
      count: updates.length,
      updates
    }));
  };

  // 获取当前日期的更新
  const getSelectedDateUpdates = () => {
    if (!selectedDate) return [];
    
    return updates.filter(update => {
      const updateDate = toDateString(update.createdAt);
      return updateDate === selectedDate;
    });
  };

  // 获取最近的更新
  const getRecentUpdates = () => {
    return [...updates]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 3);
  };

  const heatmapData = getHeatmapData();
  const selectedDateUpdates = getSelectedDateUpdates();
  const recentUpdates = getRecentUpdates();

  return (
    <Paper elevation={1} sx={{ p: 2, mb: 2, borderRadius: 2 }}>
      <Typography 
        variant="h6" 
        sx={{ 
          fontWeight: 'bold',
          mb: 1,
          cursor: 'pointer'
        }}
        onClick={() => window.location.href = `/${project.slug}`}
      >
        {project.name}
      </Typography>
      
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
        {/* 热力图 - 尺寸更小 */}
        <Box sx={{ flex: '0 0 auto', width: { xs: '100%', md: '220px' } }}>
          <Paper elevation={0} sx={{ p: 0.5, bgcolor: 'rgba(0,0,0,0.02)', borderRadius: 1 }}>
            <CalendarHeatmap
              startDate={new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)}
              endDate={new Date()}
              values={heatmapData}
              classForValue={(value) => {
                if (!value) {
                  return 'color-empty';
                }
                
                // 判断是否是选中的日期
                const dateStr = toDateString(value.date?.toISOString());
                const isSelected = dateStr === selectedDate;
                
                // 根据更新次数设置不同的颜色级别
                const count = value.count || 0;
                let colorClass = 'color-empty';
                if (count >= 10) colorClass = 'color-scale-4';
                else if (count >= 7) colorClass = 'color-scale-3';
                else if (count >= 4) colorClass = 'color-scale-2';
                else if (count > 0) colorClass = 'color-scale-1';
                
                return isSelected ? `${colorClass} highlighted` : colorClass;
              }}
              tooltipDataAttrs={(value) => {
                if (!value || !value.date) {
                  return null;
                }
                const date = value.date.toLocaleDateString('zh-CN');
                const count = value.count || 0;
                return {
                  'data-tip': `${date}: ${count}次更新`,
                };
              }}
              onClick={handleDateClick}
              gutterSize={1}
              horizontal={false}
            />
            <ReactTooltip />
          </Paper>
        </Box>
        
        {/* 更新列表 */}
        <Box sx={{ flex: '1 1 auto' }}>
          {selectedDate ? (
            <>
              <Typography variant="subtitle2" gutterBottom>
                {selectedDate} 的更新
              </Typography>
              {selectedDateUpdates.length === 0 ? (
                <Alert severity="info" sx={{ py: 0.5 }}>当天没有更新记录</Alert>
              ) : (
                <List dense disablePadding>
                  {selectedDateUpdates.map((update) => (
                    <ListItem 
                      key={update.id} 
                      divider 
                      sx={{ cursor: 'pointer', py: 0.5 }}
                      onClick={() => window.location.href = `/${project.slug}`}
                    >
                      <ListItemText 
                        primary={update.content}
                        primaryTypographyProps={{ variant: 'body2', noWrap: true }}
                        secondary={formatRelativeTime(update.createdAt)}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </>
          ) : (
            <>
              <Typography variant="subtitle2" gutterBottom>
                最近更新
              </Typography>
              <List dense disablePadding>
                {recentUpdates.map((update) => (
                  <ListItem 
                    key={update.id} 
                    divider 
                    sx={{ cursor: 'pointer', py: 0.5 }}
                    onClick={() => window.location.href = `/${project.slug}`}
                  >
                    <ListItemText 
                      primary={update.content}
                      primaryTypographyProps={{ variant: 'body2', noWrap: true }}
                      secondary={formatRelativeTime(update.createdAt)}
                    />
                  </ListItem>
                ))}
              </List>
            </>
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
              {/* 默认只显示第一个项目 */}
              <ProjectHeatmap 
                project={projectsWithUpdates[0].project}
                updates={projectsWithUpdates[0].updates}
                onSelectDate={handleSelectDate}
                selectedDate={selectedProjectId === projectsWithUpdates[0].project.id ? selectedDate : null}
              />
              
              {/* 展开后显示所有项目 */}
              <Collapse in={expandFavorites}>
                {projectsWithUpdates.slice(1).map((item) => (
                  <ProjectHeatmap 
                    key={item.project.id}
                    project={item.project}
                    updates={item.updates}
                    onSelectDate={handleSelectDate}
                    selectedDate={selectedProjectId === item.project.id ? selectedDate : null}
                  />
                ))}
              </Collapse>
            </>
          )}
          
          <Divider sx={{ my: 3 }} />
        </Box>
      )}

      {/* 所有项目列表 */}
      <Typography variant="h5" gutterBottom>
        项目列表
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