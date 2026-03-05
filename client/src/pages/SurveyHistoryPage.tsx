import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projectAPI, surveyAPI } from '../services/api';
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
  Stack,
  LinearProgress,
  alpha,
  useTheme,
  Fade,
  Grow
} from '@mui/material';
import {
  Poll,
  TextFields,
  ArrowBack,
  Schedule,
  CheckCircle,
  Close,
  History as HistoryIcon,
  HowToVote,
  Comment as CommentIcon,
  Person,
  TrendingUp,
  Campaign
} from '@mui/icons-material';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

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

// 投票结果项组件
const VoteResultItem: React.FC<{
  option: SurveyOption;
  totalVotes: number;
  index: number;
}> = ({ option, totalVotes, index }) => {
  const theme = useTheme();
  const percentage = totalVotes > 0 ? Math.round((option.voteCount / totalVotes) * 100) : 0;

  const colors = [
    { main: '#58a6ff', light: alpha('#58a6ff', 0.15) },
    { main: '#3fb950', light: alpha('#3fb950', 0.15) },
    { main: '#f85149', light: alpha('#f85149', 0.15) },
    { main: '#d29922', light: alpha('#d29922', 0.15) },
    { main: '#a371f7', light: alpha('#a371f7', 0.15) },
    { main: '#f778ba', light: alpha('#f778ba', 0.15) },
  ];

  const color = colors[index % colors.length];

  return (
    <Grow in timeout={300 + index * 100}>
      <Box
        sx={{
          p: 2,
          mb: 1.5,
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          transition: 'all 0.2s ease',
          '&:hover': {
            borderColor: color.main,
            bgcolor: color.light,
            transform: 'translateX(4px)',
          }
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                bgcolor: color.light,
                color: color.main,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.8rem'
              }}
            >
              {index + 1}
            </Box>
            <Typography sx={{ fontWeight: 600 }}>
              {option.optionText}
            </Typography>
          </Box>
          <Chip
            label={`${option.voteCount} 票`}
            size="small"
            sx={{
              bgcolor: color.light,
              color: color.main,
              fontWeight: 600,
              '& .MuiChip-label': { px: 1 }
            }}
          />
        </Box>
        <Box sx={{ position: 'relative', height: 8, bgcolor: 'divider', borderRadius: 4, overflow: 'hidden' }}>
          <Box
            sx={{
              position: 'absolute',
              left: 0,
              top: 0,
              height: '100%',
              width: `${percentage}%`,
              bgcolor: color.main,
              borderRadius: 4,
              transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
              background: `linear-gradient(90deg, ${color.main}, ${alpha(color.main, 0.7)})`,
            }}
          />
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
            {percentage}%
          </Typography>
        </Box>
      </Box>
    </Grow>
  );
};

// 发言卡片组件
const ResponseCard: React.FC<{ response: SurveyResponse; index: number }> = ({ response, index }) => {
  const theme = useTheme();

  return (
    <Grow in timeout={200 + index * 50}>
      <Paper
        sx={{
          p: 2,
          bgcolor: 'transparent',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          transition: 'all 0.2s ease',
          '&:hover': {
            borderColor: 'primary.main',
            boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.1)}`,
          }
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
          <Avatar
            src={response.userAvatar}
            sx={{
              width: 36,
              height: 36,
              bgcolor: 'primary.main',
              border: '2px solid',
              borderColor: 'primary.main',
            }}
          >
            {response.username?.[0]?.toUpperCase()}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, lineHeight: 1.3 }}>
              {response.username}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {format(new Date(response.createdAt), 'yyyy-MM-dd HH:mm', { locale: zhCN })}
            </Typography>
          </Box>
        </Box>
        <Typography
          variant="body2"
          sx={{
            color: 'text.primary',
            lineHeight: 1.7,
            pl: 5.5,
          }}
        >
          {response.content}
        </Typography>
      </Paper>
    </Grow>
  );
};

// 侧边栏统计卡片
const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
}> = ({ icon, label, value, color }) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 1,
      p: 1,
      borderRadius: 1,
      bgcolor: alpha(color, 0.08),
    }}
  >
    <Box sx={{ color, opacity: 0.8 }}>{icon}</Box>
    <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
      {label} {value}
    </Typography>
  </Box>
);

const SurveyHistoryPage: React.FC = () => {
  const { slug: projectSlug, projectId: projectIdParam } = useParams<{ slug?: string; projectId?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const theme = useTheme();

  const [projectId, setProjectId] = useState<string | null>(projectIdParam || null);
  const [slug, setSlug] = useState<string | null>(projectSlug || null);

  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [closingSurvey, setClosingSurvey] = useState(false);

  useEffect(() => {
    const init = async () => {
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
      } else if (projectIdParam) {
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
      loadSurveys();
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

  const sortedSurveys = [...surveys].sort((a, b) => {
    if (a.isEnded !== b.isEnded) {
      return a.isEnded ? 1 : -1;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // 计算统计数据
  const activeCount = surveys.filter(s => !s.isEnded).length;
  const endedCount = surveys.filter(s => s.isEnded).length;
  const totalVotes = selectedSurvey?.options?.reduce((sum, o) => sum + o.voteCount, 0) || 0;

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 'calc(100vh - 64px)',
          gap: 2
        }}
      >
        <CircularProgress size={48} thickness={4} />
        <Typography color="text.secondary">加载中...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 64px)', bgcolor: 'background.default' }}>
      {/* 左侧边栏 */}
      <Box
        sx={{
          width: 320,
          borderRight: '1px solid',
          borderColor: 'divider',
          overflow: 'auto',
          bgcolor: 'background.default',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* 头部 */}
        <Box sx={{ p: 2.5, pb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <IconButton
              onClick={() => navigate(`/projects/${projectSlug}`)}
              size="small"
              sx={{
                bgcolor: 'action.hover',
                '&:hover': { bgcolor: 'action.selected' }
              }}
            >
              <ArrowBack fontSize="small" />
            </IconButton>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
              意见征询
            </Typography>
          </Box>

          {/* 统计卡片 */}
          <Stack direction="row" spacing={1}>
            <StatCard
              icon={<Campaign sx={{ fontSize: 18 }} />}
              label="进行中"
              value={activeCount}
              color={theme.palette.success.main}
            />
            <StatCard
              icon={<CheckCircle sx={{ fontSize: 18 }} />}
              label="已结束"
              value={endedCount}
              color={theme.palette.text.secondary}
            />
          </Stack>
        </Box>

        <Divider />

        {/* 征询列表 */}
        <List sx={{ flex: 1, py: 1 }}>
          {sortedSurveys.map((survey) => (
            <ListItem key={survey.id} disablePadding sx={{ px: 1.5, py: 0.5 }}>
              <ListItemButton
                selected={selectedSurvey?.id === survey.id}
                onClick={() => handleSurveyClick(survey)}
                sx={{
                  py: 1.5,
                  px: 2,
                  borderRadius: 2,
                  mb: 0.5,
                  '&.Mui-selected': {
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    border: '1px solid',
                    borderColor: alpha(theme.palette.primary.main, 0.3),
                    '&:hover': {
                      bgcolor: alpha(theme.palette.primary.main, 0.15),
                    }
                  },
                  '&:hover': {
                    bgcolor: 'action.hover',
                  }
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: 1.5,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: survey.isEnded
                        ? 'action.disabledBackground'
                        : alpha(survey.useVoting ? theme.palette.primary.main : theme.palette.secondary.main, 0.15),
                      color: survey.isEnded
                        ? 'text.disabled'
                        : survey.useVoting
                          ? 'primary.main'
                          : 'secondary.main',
                    }}
                  >
                    {survey.useVoting ? <Poll fontSize="small" /> : <TextFields fontSize="small" />}
                  </Box>
                </ListItemIcon>
                <ListItemText
                  primary={survey.title}
                  primaryTypographyProps={{
                    noWrap: true,
                    fontSize: '0.875rem',
                    fontWeight: survey.isEnded ? 'normal' : 600,
                    sx: { mb: 0.5 }
                  }}
                  secondary={
                    <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip
                        label={survey.isEnded ? '已结束' : '进行中'}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          bgcolor: survey.isEnded
                            ? 'action.disabledBackground'
                            : alpha(theme.palette.success.main, 0.15),
                          color: survey.isEnded
                            ? 'text.disabled'
                            : 'success.main',
                          '& .MuiChip-label': { px: 1 }
                        }}
                      />
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                        {format(new Date(survey.createdAt), 'MM-dd', { locale: zhCN })}
                      </Typography>
                    </Box>
                  }
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>

        {surveys.length === 0 && (
          <Box sx={{ p: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5 }}>
            <Campaign sx={{ fontSize: 24, color: 'text.disabled', opacity: 0.5 }} />
            <Typography color="text.secondary" sx={{ fontSize: '0.9rem' }}>
              暂无意见征询
            </Typography>
          </Box>
        )}
      </Box>

      {/* 右侧主内容区 */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 4 }}>
        {selectedSurvey ? (
          <Box sx={{ maxWidth: 900, mx: 'auto' }}>
            {/* 主卡片 */}
            <Box>
              {/* 标题区 */}
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                  <Typography
                    variant="h4"
                    sx={{
                      fontWeight: 700,
                      lineHeight: 1.3,
                      flex: 1,
                      mr: 2,
                    }}
                  >
                    {selectedSurvey.title}
                  </Typography>
                  {user && selectedSurvey.createdBy === user.id && !selectedSurvey.isEnded && (
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      startIcon={<Close />}
                      onClick={() => handleEndSurvey(selectedSurvey.id)}
                      disabled={closingSurvey}
                      sx={{ flexShrink: 0 }}
                    >
                      {closingSurvey ? '处理中...' : '结束'}
                    </Button>
                  )}
                </Box>

                <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', gap: 1 }}>
                  {!selectedSurvey.isEnded ? (
                    <Chip
                      icon={<Schedule />}
                      label={selectedSurvey.endTime
                        ? `结束于 ${format(new Date(selectedSurvey.endTime), 'yyyy-MM-dd HH:mm', { locale: zhCN })}`
                        : '手动结束'
                      }
                      color="success"
                      variant="outlined"
                      size="small"
                      sx={{ fontWeight: 500 }}
                    />
                  ) : (
                    <Chip
                      icon={<CheckCircle />}
                      label={selectedSurvey.endedAt
                        ? `已于 ${format(new Date(selectedSurvey.endedAt), 'yyyy-MM-dd HH:mm', { locale: zhCN })} 结束`
                        : '已结束'
                      }
                      color="default"
                      size="small"
                      sx={{ fontWeight: 500 }}
                    />
                  )}
                  <Chip
                    icon={<Person />}
                    label={selectedSurvey.creatorUsername}
                    variant="outlined"
                    size="small"
                    sx={{ fontWeight: 500 }}
                  />
                  {selectedSurvey.useVoting && (
                    <Chip
                      icon={<HowToVote />}
                      label="投票"
                      color="primary"
                      size="small"
                      sx={{ fontWeight: 500 }}
                    />
                  )}
                  {selectedSurvey.allowFreeResponse && (
                    <Chip
                      icon={<CommentIcon />}
                      label="发言"
                      color="secondary"
                      size="small"
                      sx={{ fontWeight: 500 }}
                    />
                  )}
                </Stack>
              </Box>

              {/* 描述 */}
              {selectedSurvey.description && (
                <Box
                  sx={{
                    p: 2.5,
                    bgcolor: 'action.hover',
                    borderRadius: 1,
                    mb: 3,
                  }}
                >
                  <Typography sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                    {selectedSurvey.description}
                  </Typography>
                </Box>
              )}

              {/* 图片 */}
              {selectedSurvey.images && selectedSurvey.images.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <ImageList cols={Math.min(selectedSurvey.images.length, 3)} rowHeight={180} gap={12}>
                    {selectedSurvey.images.map((img, idx) => (
                      <ImageListItem
                        key={idx}
                        sx={{
                          borderRadius: 2,
                          overflow: 'hidden',
                          cursor: 'pointer',
                          transition: 'transform 0.2s ease',
                          '&:hover': { transform: 'scale(1.02)' }
                        }}
                      >
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
            </Box>

            {/* 投票结果 */}
            {selectedSurvey.useVoting && selectedSurvey.options && selectedSurvey.options.length > 0 && (
              <Fade in timeout={300}>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                    <HowToVote sx={{ color: 'primary.main', fontSize: 28 }} />
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      投票结果
                    </Typography>
                    <Chip
                      label={`${totalVotes} 票总计`}
                      size="small"
                      color="primary"
                      sx={{ ml: 'auto', fontWeight: 600 }}
                    />
                  </Box>

                  {selectedSurvey.options
                    .sort((a, b) => b.voteCount - a.voteCount)
                    .map((option, idx) => (
                      <VoteResultItem
                        key={option.id}
                        option={option}
                        totalVotes={totalVotes}
                        index={idx}
                      />
                    ))}
                </Box>
              </Fade>
            )}

            {/* 发言列表 */}
            {selectedSurvey.allowFreeResponse && selectedSurvey.responses && selectedSurvey.responses.length > 0 && (
              <Fade in timeout={400}>
                <Box sx={{  marginTop: 3}}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                    <CommentIcon sx={{ color: 'secondary.main', fontSize: 28 }} />
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      玩家发言
                    </Typography>
                    <Chip
                      label={`${selectedSurvey.responses.length} 条`}
                      size="small"
                      color="secondary"
                      sx={{ ml: 'auto', fontWeight: 600 }}
                    />
                  </Box>
                  <Stack spacing={2}>
                    {selectedSurvey.responses.map((response, idx) => (
                      <ResponseCard key={response.id} response={response} index={idx} />
                    ))}
                  </Stack>
                </Box>
              </Fade>
            )}
          </Box>
        ) : (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              opacity: 0.6,
            }}
          >
            <HistoryIcon sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 500 }}>
              选择一个征询查看详情
            </Typography>
            <Typography variant="body2" color="text.disabled" sx={{ mt: 1 }}>
              点击左侧列表中的征询项
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default SurveyHistoryPage;
