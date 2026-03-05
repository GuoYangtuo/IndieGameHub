import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { projectAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Chip,
  CircularProgress,
  Paper,
  Button,
  IconButton,
  ImageList,
  ImageListItem,
  Avatar,
  Stack
} from '@mui/material';
import {
  Poll,
  TextFields,
  ArrowBack,
  Schedule,
  CheckCircle,
  Close,
  History as HistoryIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { surveyAPI } from '../services/api';

interface Survey {
  id: string;
  title: string;
  description?: string;
  useVoting: boolean;
  allowFreeResponse: boolean;
  isEnded: boolean;
  endTime?: string;
  endedAt?: string;
  createdAt: string;
  createdBy: string;
  creatorUsername?: string;
  creatorAvatar?: string;
  images?: { id: string; url: string }[];
  options?: SurveyOption[];
  responses?: SurveyResponse[];
}

interface SurveyOption {
  id: string;
  optionText: string;
  optionOrder: number;
  voteCount: number;
}

interface SurveyResponse {
  id: string;
  userId: string;
  username?: string;
  userAvatar?: string;
  content: string;
  createdAt: string;
}

const SurveyHistoryPage: React.FC = () => {
  const { slug: projectSlug, projectId: projectIdParam } = useParams<{ slug?: string; projectId?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [projectId, setProjectId] = useState<string | null>(projectIdParam || null);
  const [slug, setSlug] = useState<string | null>(projectSlug || null);
  
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [closingSurvey, setClosingSurvey] = useState(false);

  // 如果只有slug没有projectId，需要获取projectId
  useEffect(() => {
    const init = async () => {
      // 如果有 slug，优先通过 slug 获取项目真实 ID
      if (projectSlug) {
        try {
          const response = await projectAPI.getProjectBySlug(projectSlug);
          if (response.data) {
            setProjectId(response.data.id);
            setSlug(projectSlug);
          }
        } catch (err) {
          console.error('获取项目失败:', err);
        }
      }
      // 如果有直接的 projectId 参数
      else if (projectIdParam) {
        setProjectId(projectIdParam);
      }
    };
    init();
  }, [projectSlug, projectIdParam]);

  useEffect(() => {
    if (projectId) {
      loadSurveys();
    }
  }, [projectId]);

  const loadSurveys = async () => {
    if (!projectId) return;
    
    try {
      setLoading(true);
      const response = await surveyAPI.getProjectSurveys(projectId);
      setSurveys(response.data);
      
      // 默认选择第一个正在进行的征询
      const activeSurvey = response.data.find((s: Survey) => !s.isEnded);
      if (activeSurvey) {
        setSelectedSurvey(activeSurvey);
      } else if (response.data.length > 0) {
        setSelectedSurvey(response.data[0]);
      }
    } catch (error) {
      console.error('加载征询失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSurveyDetail = async (surveyId: string) => {
    try {
      const response = await surveyAPI.getSurveyById(surveyId);
      setSelectedSurvey(response.data);
    } catch (error) {
      console.error('加载征询详情失败:', error);
    }
  };

  const handleEndSurvey = async (surveyId: string) => {
    if (!window.confirm('确定要手动结束此征询吗？结束后将无法再接收投票和发言。')) {
      return;
    }
    
    try {
      setClosingSurvey(true);
      await surveyAPI.endSurvey(surveyId);
      // 刷新征询列表
      loadSurveys();
      // 刷新详情
      loadSurveyDetail(surveyId);
    } catch (error) {
      console.error('结束征询失败:', error);
      alert('结束征询失败，请稍后再试');
    } finally {
      setClosingSurvey(false);
    }
  };

  const handleSurveyClick = (survey: Survey) => {
    loadSurveyDetail(survey.id);
  };

  // 排序：正在进行的在前，然后按时间倒序
  const sortedSurveys = [...surveys].sort((a, b) => {
    if (a.isEnded !== b.isEnded) {
      return a.isEnded ? 1 : -1;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 64px)' }}>
      {/* 左侧细边栏 */}
      <Box
        sx={{
          width: 280,
          borderRight: '1px solid',
          borderColor: 'divider',
          overflow: 'auto',
          bgcolor: 'background.paper'
        }}
      >
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton onClick={() => navigate(`/projects/${projectSlug}`)} size="small">
            <ArrowBack />
          </IconButton>
          <Typography variant="h6" fontSize="1rem">
            意见征询
          </Typography>
        </Box>
        
        <Divider />
        
        <List>
          {sortedSurveys.map((survey) => (
            <ListItem key={survey.id} disablePadding>
              <ListItemButton
                selected={selectedSurvey?.id === survey.id}
                onClick={() => handleSurveyClick(survey)}
                sx={{ py: 1.5 }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>
                  {survey.useVoting ? (
                    <Poll color={survey.isEnded ? 'disabled' : 'primary'} fontSize="small" />
                  ) : (
                    <TextFields color={survey.isEnded ? 'disabled' : 'secondary'} fontSize="small" />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={survey.title}
                  primaryTypographyProps={{
                    noWrap: true,
                    fontSize: '0.875rem',
                    fontWeight: survey.isEnded ? 'normal' : 'bold'
                  }}
                  secondary={
                    <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {!survey.isEnded && (
                        <Chip
                          label="进行中"
                          size="small"
                          color="success"
                          sx={{ height: 16, fontSize: '0.7rem', mr: 0.5 }}
                        />
                      )}
                      {survey.isEnded && (
                        <Chip
                          label="已结束"
                          size="small"
                          color="default"
                          sx={{ height: 16, fontSize: '0.7rem', mr: 0.5 }}
                        />
                      )}
                      {format(new Date(survey.createdAt), 'yyyy-MM-dd', { locale: zhCN })}
                    </Box>
                  }
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
        
        {surveys.length === 0 && (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary">
              暂无意见征询
            </Typography>
          </Box>
        )}
      </Box>

      {/* 右侧主视区 */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
        {selectedSurvey ? (
          <Paper sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
            {/* 标题和状态 */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <Box>
                <Typography variant="h5" gutterBottom>
                  {selectedSurvey.title}
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  {!selectedSurvey.isEnded && (
                    <Chip
                      icon={<Schedule />}
                      label={selectedSurvey.endTime 
                        ? `结束于 ${format(new Date(selectedSurvey.endTime), 'yyyy-MM-dd HH:mm', { locale: zhCN })}`
                        : '手动结束'
                      }
                      color="success"
                      variant="outlined"
                      size="small"
                    />
                  )}
                  {selectedSurvey.isEnded && (
                    <Chip
                      icon={<CheckCircle />}
                      label={selectedSurvey.endedAt 
                        ? `已于 ${format(new Date(selectedSurvey.endedAt), 'yyyy-MM-dd HH:mm', { locale: zhCN })} 结束`
                        : '已结束'
                      }
                      color="default"
                      size="small"
                    />
                  )}
                  <Typography variant="body2" color="text.secondary">
                    创建者: {selectedSurvey.creatorUsername}
                  </Typography>
                  {/* 只有创建者且征询未结束才显示手动结束按钮 */}
                  {user && selectedSurvey.createdBy === user.id && !selectedSurvey.isEnded && (
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      startIcon={<Close />}
                      onClick={() => handleEndSurvey(selectedSurvey.id)}
                      disabled={closingSurvey}
                    >
                      {closingSurvey ? '处理中...' : '手动结束'}
                    </Button>
                  )}
                </Stack>
              </Box>
            </Box>

            {/* 描述 */}
            {selectedSurvey.description && (
              <Typography sx={{ mb: 3, whiteSpace: 'pre-wrap' }}>
                {selectedSurvey.description}
              </Typography>
            )}

            {/* 图片 */}
            {selectedSurvey.images && selectedSurvey.images.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <ImageList cols={3} rowHeight={160} gap={8}>
                  {selectedSurvey.images.map((img, idx) => (
                    <ImageListItem key={idx}>
                      <img
                        src={img.url}
                        alt={`图片 ${idx + 1}`}
                        style={{ borderRadius: 8 }}
                      />
                    </ImageListItem>
                  ))}
                </ImageList>
              </Box>
            )}

            <Divider sx={{ my: 3 }} />

            {/* 投票结果 */}
            {selectedSurvey.useVoting && selectedSurvey.options && (() => {
              const totalVotes = selectedSurvey.options.reduce((sum, o) => sum + o.voteCount, 0);
              return (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  投票结果
                </Typography>
                {selectedSurvey.options.map((option) => {
                  const percentage = totalVotes > 0 ? Math.round((option.voteCount / totalVotes) * 100) : 0;
                  
                  return (
                    <Box
                      key={option.id}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        p: 1.5,
                        mb: 1,
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'divider'
                      }}
                    >
                      <Typography sx={{ width: 120, fontWeight: 500 }}>
                        {option.optionText}
                      </Typography>
                      <Box sx={{ flex: 1, mx: 2 }}>
                        <Box sx={{ 
                          height: 20, 
                          bgcolor: 'grey.200', 
                          borderRadius: 1,
                          position: 'relative',
                          overflow: 'hidden'
                        }}>
                          <Box sx={{ 
                            height: '100%', 
                            width: `${percentage}%`, 
                            bgcolor: 'primary.main',
                            borderRadius: 1,
                            transition: 'width 0.3s ease'
                          }} />
                        </Box>
                      </Box>
                      <Chip
                        label={`${option.voteCount} 票 (${percentage}%)`}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                  );
                })}
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  总投票数: {totalVotes}
                </Typography>
              </Box>
              );
            })()}

            {/* 发言列表 */}
            {selectedSurvey.allowFreeResponse && selectedSurvey.responses && selectedSurvey.responses.length > 0 && (
              <Box sx={{ mt: 4 }}>
                <Typography variant="h6" gutterBottom>
                  玩家发言 ({selectedSurvey.responses.length})
                </Typography>
                <Stack spacing={2}>
                  {selectedSurvey.responses.map((response) => (
                    <Paper key={response.id} sx={{ p: 2, bgcolor: 'grey.50' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Avatar
                          src={response.userAvatar}
                          sx={{ width: 24, height: 24 }}
                        >
                          {response.username?.[0]?.toUpperCase()}
                        </Avatar>
                        <Typography variant="subtitle2">
                          {response.username}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {format(new Date(response.createdAt), 'yyyy-MM-dd HH:mm', { locale: zhCN })}
                        </Typography>
                      </Box>
                      <Typography variant="body2">
                        {response.content}
                      </Typography>
                    </Paper>
                  ))}
                </Stack>
              </Box>
            )}
          </Paper>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <HistoryIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              选择一个征询查看详情
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default SurveyHistoryPage;
