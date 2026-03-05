import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Divider,
  IconButton,
  CircularProgress,
  Link
} from '@mui/material';
import { 
  Poll, 
  TextFields, 
  Add, 
  History, 
  CheckCircle,
  Schedule
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { surveyAPI } from '../services/api';

interface SurveySidebarProps {
  projectId: string;
  projectSlug: string;
  isMember: boolean;
  onCreateSurvey: () => void;
  onRefresh: () => void;
}

interface Survey {
  id: string;
  title: string;
  description?: string;
  useVoting: boolean;
  allowFreeResponse: boolean;
  isEnded: boolean;
  endTime?: string;
  createdAt: string;
}

const SurveySidebar: React.FC<SurveySidebarProps> = ({
  projectId,
  projectSlug,
  isMember,
  onCreateSurvey,
  onRefresh
}) => {
  const navigate = useNavigate();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);

  // 加载征询列表
  useEffect(() => {
    loadSurveys();
  }, [projectId, onRefresh]);

  // 监听onRefresh变化时重新加载
  useEffect(() => {
    loadSurveys();
  }, [onRefresh]);

  const loadSurveys = async () => {
    try {
      setLoading(true);
      const response = await surveyAPI.getProjectSurveys(projectId);
      // 只显示正在进行的征询
      const activeSurveys = response.data.filter((s: Survey) => !s.isEnded);
      setSurveys(activeSurveys);
    } catch (error) {
      console.error('加载征询失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 跳转到历史页面
  const handleViewHistory = () => {
    navigate(`/projects/${projectSlug}/surveys`);
  };

  return (
    <Box>
      {/* 标题和按钮 */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        bgcolor: 'rgba(25, 118, 210, 0.18)',
        borderRadius: 1,
        px: 1.5,
        py: 0.75
      }}>
        <Typography variant="subtitle1" fontWeight="bold">
          意见征询
        </Typography>
        <Box>
          <IconButton size="small" onClick={handleViewHistory} title="查看历史">
            <History fontSize="small" />
          </IconButton>
          {isMember && (
            <IconButton size="small" onClick={onCreateSurvey} title="创建新征询">
              <Add fontSize="small" />
            </IconButton>
          )}
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
          <CircularProgress size={24} />
        </Box>
      ) : surveys.length === 0 ? (
        null
      ) : (
        <>
          <List dense>
            {surveys.slice(0, 3).map((survey) => (
              <ListItem
                key={survey.id}
                sx={{
                  borderRadius: 1,
                  mb: 0.5,
                  bgcolor: 'action.hover',
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'action.selected' }
                }}
                onClick={() => navigate(`/projects/${projectSlug}/surveys`)}
              >
                <ListItemIcon sx={{ minWidth: 32 }}>
                  {survey.useVoting ? (
                    <Poll fontSize="small" color="primary" />
                  ) : (
                    <TextFields fontSize="small" color="secondary" />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={survey.title}
                  primaryTypographyProps={{
                    noWrap: true,
                    fontSize: '0.875rem'
                  }}
                />
                <Chip
                  icon={survey.endTime ? <Schedule fontSize="small" /> : undefined}
                  label={survey.endTime ? '定时' : '手动'}
                  size="small"
                  sx={{ ml: 1 }}
                />
              </ListItem>
            ))}
          </List>
          
          {surveys.length > 3 && (
            <Button
              fullWidth
              size="small"
              onClick={handleViewHistory}
            >
              查看全部 ({surveys.length})
            </Button>
          )}
        </>
      )}
    </Box>
  );
};

export default SurveySidebar;
