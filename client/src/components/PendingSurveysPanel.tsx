import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Radio,
  RadioGroup,
  FormControlLabel,
  TextField,
  Alert,
  Paper,
  ImageList,
  ImageListItem,
  Slide,
  Collapse,
  Link
} from '@mui/material';
import {
  Poll,
  TextFields,
  ChevronLeft,
  ChevronRight,
  Send,
  Close,
  History,
  ExpandMore,
  ExpandLess,
  Login
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { surveyAPI } from '../services/api';
import AuthDialog from './AuthDialog';

interface Survey {
  id: string;
  title: string;
  description?: string;
  useVoting: boolean;
  allowFreeResponse: boolean;
  isEnded: boolean;
  createdAt: string;
  images?: { id: string; url: string }[];
  options?: { id: string; optionText: string; optionOrder: number }[];
}

interface PendingSurveysProps {
  projectId: string;
  projectSlug: string;
  isLoggedIn: boolean;
  onSurveysCompleted: () => void;
}

const PendingSurveysPanel: React.FC<PendingSurveysProps> = ({
  projectId,
  projectSlug,
  isLoggedIn,
  onSurveysCompleted
}) => {
  const navigate = useNavigate();
  
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  
  // 表单状态
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [freeResponse, setFreeResponse] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadPendingSurveys();
  }, [projectId]);

  const loadPendingSurveys = async () => {
    try {
      setLoading(true);
      
      let response;
      if (isLoggedIn) {
        // 登录用户：获取未提交的征询
        response = await surveyAPI.getPendingSurveys(projectId);
        setSurveys(response.data);
        
        if (response.data.length === 0) {
          setCompleted(true);
        }
      } else {
        // 未登录用户：获取所有进行中的征询（不跟踪提交状态）
        response = await surveyAPI.getActiveSurveys(projectId);
        setSurveys(response.data);
        
        if (response.data.length === 0) {
          setCompleted(true);
        }
      }
    } catch (err) {
      console.error('加载征询失败:', err);
      // 静默处理错误
      setCompleted(true);
    } finally {
      setLoading(false);
    }
  };

  const currentSurvey = surveys[currentIndex];

  const handleSubmit = async () => {
    // 未登录时弹出登录对话框
    if (!isLoggedIn) {
      setShowAuthDialog(true);
      return;
    }

    if (!currentSurvey) return;

    // 验证
    if (currentSurvey.useVoting && !selectedOption && currentSurvey.allowFreeResponse && !freeResponse.trim()) {
      setError('请投票或填写发言内容');
      return;
    }
    if (currentSurvey.useVoting && !selectedOption) {
      setError('请选择一个选项');
      return;
    }
    if (currentSurvey.allowFreeResponse && !freeResponse.trim() && !currentSurvey.useVoting) {
      setError('请填写发言内容');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      await surveyAPI.submit(
        currentSurvey.id,
        selectedOption || undefined,
        freeResponse.trim() || undefined
      );

      setSuccess(true);

      // 延迟后显示下一个
      setTimeout(() => {
        if (currentIndex < surveys.length - 1) {
          setCurrentIndex(currentIndex + 1);
          setSelectedOption('');
          setFreeResponse('');
          setSuccess(false);
        } else {
          // 所有征询都已完成
          setCompleted(true);
          onSurveysCompleted();
        }
      }, 1500);
    } catch (err: any) {
      console.error('提交失败:', err);
      setError(err.response?.data?.message || '提交失败，请稍后再试');
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewHistory = () => {
    navigate(`/projects/${projectSlug}/surveys`);
  };

  // 加载中或已完成时不显示
  if (loading || completed) {
    return null;
  }

  // 没有任何待处理的征询
  if (surveys.length === 0) {
    return null;
  }

  return (
    <Paper
      sx={{
        mb: 3,
        overflow: 'hidden',
        border: '2px solid',
        borderColor: 'primary.main'
      }}
    >
      {/* 面板头部 */}
      <Box
        sx={{
          p: 1.5,
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: collapsed ? 'pointer' : 'default'
        }}
        onClick={() => !collapsed && setCollapsed(true)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="subtitle1" fontWeight="bold">
            意见征询
          </Typography>
          <Typography variant="body2">
            ({currentIndex + 1}/{surveys.length})
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {collapsed ? (
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                setCollapsed(false);
              }}
              sx={{ color: 'inherit' }}
            >
              <ExpandLess />
            </IconButton>
          ) : (
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                setCollapsed(true);
              }}
              sx={{ color: 'inherit' }}
            >
              <ExpandMore />
            </IconButton>
          )}
        </Box>
      </Box>

      {/* 面板内容 */}
      <Collapse in={!collapsed}>
        <Box sx={{ p: 3 }}>
          {currentSurvey && (
            <>
              {/* 进度指示 */}
              {surveys.length > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mb: 2 }}>
                  {surveys.map((_, idx) => (
                    <Box
                      key={idx}
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: idx === currentIndex ? 'primary.main' : 'grey.300',
                        cursor: 'pointer'
                      }}
                      onClick={() => setCurrentIndex(idx)}
                    />
                  ))}
                </Box>
              )}

              {/* 标题 */}
              <Typography variant="h6" gutterBottom>
                {currentSurvey.title}
              </Typography>

              {/* 描述 */}
              {currentSurvey.description && (
                <Typography color="text.secondary" sx={{ mb: 2 }}>
                  {currentSurvey.description}
                </Typography>
              )}

              {/* 图片 */}
              {currentSurvey.images && currentSurvey.images.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <ImageList cols={Math.min(currentSurvey.images.length, 3)} rowHeight={120} gap={8}>
                    {currentSurvey.images.map((img, idx) => (
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

              {/* 投票 */}
              {currentSurvey.useVoting && currentSurvey.options && (
                <Box sx={{ mb: 2 }}>
                  <RadioGroup
                    value={selectedOption}
                    onChange={(e) => setSelectedOption(e.target.value)}
                  >
                    {currentSurvey.options.map((option) => (
                      <FormControlLabel
                        key={option.id}
                        value={option.id}
                        control={<Radio />}
                        label={option.optionText}
                        sx={{
                          mb: 1,
                          p: 1,
                          borderRadius: 1,
                          border: '1px solid',
                          borderColor: selectedOption === option.id ? 'primary.main' : 'divider',
                          bgcolor: selectedOption === option.id ? 'primary.light' : 'transparent',
                          width: '100%',
                          m: 0
                        }}
                      />
                    ))}
                  </RadioGroup>
                </Box>
              )}

              {/* 自由发言 */}
              {currentSurvey.allowFreeResponse && (
                <Box sx={{ mb: 2 }}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    placeholder="我有更好的点子..."
                    value={freeResponse}
                    onChange={(e) => setFreeResponse(e.target.value)}
                  />
                </Box>
              )}

              {/* 错误提示 */}
              {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                  {error}
                </Alert>
              )}

              {/* 成功提示 */}
              {success && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  提交成功！
                </Alert>
              )}

              {/* 按钮 */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Link
                  component="button"
                  variant="body2"
                  onClick={handleViewHistory}
                  sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                >
                  <History fontSize="small" />
                  查看历史征询
                </Link>
                
                <Button
                  variant="contained"
                  startIcon={!isLoggedIn ? <Login /> : <Send />}
                  onClick={handleSubmit}
                  disabled={submitting || success}
                >
                  {submitting ? '提交中...' : success ? '已提交' : (isLoggedIn ? '提交' : '登录后提交')}
                </Button>
              </Box>
            </>
          )}
        </Box>
      </Collapse>

      {/* 收起状态 */}
      {collapsed && (
        <Box
          sx={{
            p: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            bgcolor: 'grey.100',
            cursor: 'pointer'
          }}
          onClick={() => setCollapsed(false)}
        >
          <Typography variant="body2">
            感谢您的参与！
          </Typography>
          <Link
            component="button"
            variant="body2"
            onClick={(e) => {
              e.stopPropagation();
              handleViewHistory();
            }}
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
          >
            <History fontSize="small" />
            查看历史
          </Link>
        </Box>
      )}

      {/* 登录对话框 */}
      <AuthDialog
        open={showAuthDialog}
        onClose={() => setShowAuthDialog(false)}
      />
    </Paper>
  );
};

export default PendingSurveysPanel;
