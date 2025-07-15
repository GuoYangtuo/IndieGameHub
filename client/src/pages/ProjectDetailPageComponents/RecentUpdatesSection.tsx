import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Chip
} from '@mui/material';
import { Download } from '@mui/icons-material';
import { Theme } from '@mui/material/styles';
import CalendarHeatmap from 'react-calendar-heatmap';
import ReactTooltip from 'react-tooltip';
import { formatRelativeTime, formatDate, parseDate, toDateString } from '../../utils/dateUtils';
import '../../styles/calendar-heatmap.css';

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

interface RecentUpdatesSectionProps {
  project: {
    id: string;
    updates: ProjectUpdate[];
  } | null;
  isMember: boolean;
  onSetCoverImage?: (update: ProjectUpdate) => void;
}

const RecentUpdatesSection: React.FC<RecentUpdatesSectionProps> = ({
  project,
  isMember,
  onSetCoverImage
}) => {
  // 添加选中日期状态
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedDateUpdates, setSelectedDateUpdates] = useState<ProjectUpdate[]>([]);
  const [updateDetailDialogOpen, setUpdateDetailDialogOpen] = useState(false);
  const [selectedUpdateDetail, setSelectedUpdateDetail] = useState<ProjectUpdate | null>(null);
  
  // 图片状态
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedUpdate, setSelectedUpdate] = useState<ProjectUpdate | null>(null);

  // 处理点击热力图日期
  const handleDateClick = (value: any) => {
    if (!value || !value.date || !project) return;

    try {
      const dateStr = toDateString(value.date.toISOString());
      
      if (selectedDate === dateStr) {
        // 如果点击已选中的日期，取消选择
        setSelectedDate(null);
        setSelectedDateUpdates([]);
      } else {
        // 否则选中该日期并获取当日更新
        setSelectedDate(dateStr);
        
        // 过滤出该日期的所有更新
        const updatesForDate = (project.updates || []).filter(update => {
          try {
            const updateDate = toDateString(update.createdAt);
            return updateDate === dateStr;
          } catch (error) {
            return false;
          }
        });
        
        // 按时间倒序排序
        updatesForDate.sort((a, b) => {
          try {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          } catch (error) {
            return 0;
          }
        });
        
        setSelectedDateUpdates(updatesForDate);
      }
    } catch (error) {
      console.error('处理日期点击时出错:', error);
      setSelectedDate(null);
      setSelectedDateUpdates([]);
    }
  };
  
  // 处理点击更新条目，显示详情
  const handleUpdateClick = (update: ProjectUpdate) => {
    setSelectedUpdateDetail(update);
    setUpdateDetailDialogOpen(true);
  };

  // 处理设置封面图片
  const handleSetCoverImage = (update: ProjectUpdate) => {
    if (onSetCoverImage) {
      onSetCoverImage(update);
    }
    // 关闭图片对话框
    setSelectedImage(null);
    setSelectedUpdate(null);
  };

  // 使用导入的parseDate函数替代

  // 不再需要此函数，我们使用工具库

  return (
    <Box>
      <Paper 
        elevation={0} 
        sx={{ 
          p: 2, 
          mb: 3, 
          borderRadius: 1,
          border: theme => `1px solid ${theme.palette.divider}`,
          transition: 'box-shadow 0.2s ease-in-out',
          '&:hover': {
            boxShadow: theme => theme.palette.mode === 'dark' 
              ? '0 3px 6px rgba(149, 157, 165, 0.1)' 
              : '0 3px 6px rgba(149, 157, 165, 0.2)',
          }
        }}
        style={{
          boxShadow: 'none',
          border: 'none',
          backgroundColor: 'transparent'
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 1 }}>
          {/* 更新活跃度热力图 - 左侧 */}
          <Box sx={{ flex: { xs: '1', md: '0.3' } }}>
            <CalendarHeatmap
              startDate={new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)}
                endDate={new Date()}
                values={
                  (() => {
                    // 按日期分组更新
                    const updatesByDate: Record<string, ProjectUpdate[]> = {};
                    
                    if (project?.updates && Array.isArray(project.updates)) {
                      project.updates.forEach(update => {
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
            flex: { xs: '1', md: '0.7' },
            borderLeft: { xs: 'none', md: theme => `1px solid ${theme.palette.divider}` },
            pl: { xs: 0}
          }}>
            {!project?.updates || !Array.isArray(project.updates) || 
            (selectedDate && selectedDateUpdates.length === 0) || 
            (!selectedDate && project?.updates.filter(u => !u.isVersion).length === 0) ? (
              <Alert severity="info">暂无开发进度更新</Alert>
            ) : (
              <Box sx={{ maxHeight: '200px', overflow: 'auto' }}>
                <List dense>
                  {(selectedDate ? selectedDateUpdates : 
                    (Array.isArray(project?.updates) ? project.updates : [])
                      .filter(update => !update.isVersion)
                      .sort((a, b) => {
                        try {
                          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                        } catch (error) {
                          return 0;
                        }
                      })
                      .slice(0, 4)
                  ).map((update) => (
                    <ListItem 
                      key={update.id} 
                      divider
                      sx={{ cursor: 'pointer' }}
                      onClick={() => handleUpdateClick(update)}
                    >
                      <ListItemText 
                        primary={
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body2" noWrap sx={{ maxWidth: '70%' }}>
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

      {/* 更新详情对话框 */}
      <Dialog 
        open={updateDetailDialogOpen} 
        onClose={() => setUpdateDetailDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        {selectedUpdateDetail && (
          <>
            <DialogTitle>
              {selectedUpdateDetail.isVersion && selectedUpdateDetail.versionName 
                ? `版本更新: ${selectedUpdateDetail.versionName}` 
                : '开发进度更新'}
            </DialogTitle>
            <DialogContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                {formatDate(selectedUpdateDetail.createdAt)}
              </Typography>
              
              <Typography variant="body1" gutterBottom sx={{ mt: 2 }}>
                {selectedUpdateDetail.content}
              </Typography>
              
              {selectedUpdateDetail.imageUrl && (
                <Box sx={{ mt: 2, mb: 2 }}>
                  <img 
                    src={selectedUpdateDetail.imageUrl} 
                    alt="更新图片"
                    style={{ 
                      maxWidth: '100%', 
                      maxHeight: '300px', 
                      objectFit: 'contain',
                      cursor: 'pointer' 
                    }}
                    onClick={() => {
                      if (selectedUpdateDetail.imageUrl) {
                        setSelectedImage(selectedUpdateDetail.imageUrl);
                        setSelectedUpdate(selectedUpdateDetail);
                        setUpdateDetailDialogOpen(false);
                      }
                    }}
                  />
                </Box>
              )}
              
              {selectedUpdateDetail.demoLink && (
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-start' }}>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<Download />}
                    href={selectedUpdateDetail.demoLink}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    下载Demo
                  </Button>
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              {isMember && !selectedUpdateDetail.isVersion && (
                <Button 
                  color="primary"
                  onClick={() => {
                    handleSetCoverImage(selectedUpdateDetail);
                    setUpdateDetailDialogOpen(false);
                  }}
                >
                  设为封面
                </Button>
              )}
              <Button onClick={() => setUpdateDetailDialogOpen(false)}>
                关闭
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* 图片查看对话框 */}
      <Dialog 
        open={!!selectedImage} 
        onClose={() => {
          setSelectedImage(null);
          setSelectedUpdate(null);
        }}
        maxWidth="xl"
      >
        <DialogContent sx={{ p: 1 }}>
          {selectedImage && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <img 
                src={selectedImage} 
                alt="项目图片查看" 
                style={{ 
                  maxWidth: '100%', 
                  maxHeight: '60vh', 
                  objectFit: 'contain' 
                }} 
              />
              {selectedUpdate && (
                <Box sx={{ width: '100%', mt: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    {selectedUpdate.isVersion ? (
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Chip 
                          label="封面图片" 
                          color="primary" 
                          size="small" 
                          sx={{ mr: 1 }} 
                        />
                        {selectedUpdate.versionName && (
                          <Typography variant="subtitle1" component="span">
                            {selectedUpdate.versionName}
                          </Typography>
                        )}
                      </Box>
                    ) : "更新内容"}
                  </Typography>
                  <Typography variant="body1" sx={{ mt: 1 }}>
                    {selectedUpdate.content}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    {formatDate(selectedUpdate.createdAt)}
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {isMember && selectedUpdate && !selectedUpdate.isVersion && (
            <Button 
              color="primary"
              onClick={() => handleSetCoverImage(selectedUpdate)}
            >
              设为封面
            </Button>
          )}
          <Button onClick={() => {
            setSelectedImage(null);
            setSelectedUpdate(null);
          }}>
            关闭
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RecentUpdatesSection; 