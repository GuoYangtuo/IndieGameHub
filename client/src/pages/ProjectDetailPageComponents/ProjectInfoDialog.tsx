import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  Typography,
  Box,
  IconButton,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  CircularProgress,
  Paper,
  Divider,
  useTheme
} from '@mui/material';
import { 
  ArrowBackIos, 
  ArrowForwardIos, 
  Add,
  Delete,
  Info,
  Group,
  Close
} from '@mui/icons-material';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import MDEditor from '@uiw/react-md-editor';
import { projectAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate } from '../../utils/dateUtils';

// 扩展projectAPI类型，添加新方法
declare module '../../services/api' {
  interface ProjectAPI {
    updateProjectImagesOrder: (projectId: string, orderData: Array<{id: string, order: number}>) => Promise<any>;
    addProjectDisplayImage: (formData: FormData) => Promise<any>;
    deleteProjectDisplayImage: (projectId: string, imageId: string) => Promise<any>;
  }
}

interface ProjectImage {
  id: string;
  url: string;
  order: number;
}

interface ProjectMember {
  id: string;
  userId: string;
  projectId: string;
  role: string;
  joinedAt: string;
  user: {
    id: string;
    nickname: string;
    avatarUrl?: string;
  };
}

interface Project {
  id: string;
  name: string;
  description: string;
  coverImage?: string;
  displayImages?: ProjectImage[];
  members?: ProjectMember[];
  slug?: string;
  demoLink?: string;
  createdBy?: string;
  updates?: any[];
  createdAt?: string;
  proposals?: any[];
  comments?: any[];
}

interface ProjectInfoDialogProps {
  open: boolean;
  onClose: () => void;
  project: Project | null;
  isOwner: boolean;
  onProjectUpdate?: (updatedProject: Project) => void;
  isDarkMode?: boolean;
}

// 可排序的缩略图组件
const SortableThumbnail = ({ image, isActive, isOwner, onDelete }: { 
  image: ProjectImage; 
  isActive: boolean; 
  isOwner: boolean;
  onDelete: (id: string) => void;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition: dndTransition,
  } = useSortable({ 
    id: image.id,
    disabled: false
  });

  // 只应用水平方向的变换，忽略垂直方向
  const style = {
    transform: transform ? 
      `translate3d(${transform.x}px, 0px, 0)` : 
      undefined,
    transition: dndTransition,
    cursor: isOwner ? 'grab' : 'pointer',
    opacity: isActive ? 1 : 0.6,
    border: isActive ? '2px solid #1976d2' : '2px solid transparent',
  };

  // 阻止删除按钮上的拖拽事件
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onDelete(image.id);
  };

  return (
    <Box
      ref={setNodeRef}
      component="div"
      sx={{
        width: 80,
        height: 60,
        position: 'relative',
        borderRadius: 0.5,
        overflow: 'hidden',
        '&:hover': {
          transform: 'scale(1.05)'
        },
        ...style
      }}
      {...(isOwner ? { ...attributes, ...listeners } : {})}
    >
      <Box
        component="img"
        src={image.url}
        sx={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />
      {isOwner && (
        <IconButton
          size="small"
          sx={{
            position: 'absolute',
            top: 0,
            right: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            color: 'white',
            p: 0.5,
            '&:hover': {
              backgroundColor: 'rgba(255,0,0,0.7)',
            },
            zIndex: 10
          }}
          onClick={handleDeleteClick}
        >
          <Delete fontSize="small" />
        </IconButton>
      )}
    </Box>
  );
};

// 添加图片按钮组件
const AddImageButton = ({ onClick }: { onClick: () => void }) => {
  return (
    <Box
      component="div"
      sx={{
        width: 80,
        height: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1px dashed grey',
        borderRadius: 1,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        '&:hover': {
          backgroundColor: 'rgba(255,255,255,0.1)',
          borderColor: 'primary.main'
        }
      }}
      onClick={onClick}
    >
      <Add />
    </Box>
  );
};

// 项目信息对话框组件
const ProjectInfoDialog: React.FC<ProjectInfoDialogProps> = ({
  open,
  onClose,
  project,
  isOwner,
  onProjectUpdate,
  isDarkMode
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const theme = useTheme();
  
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [displayImages, setDisplayImages] = useState<ProjectImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [imageScale, setImageScale] = useState(1);
  
  // 设置初始值
  React.useEffect(() => {
    if (project && project.displayImages) {
      // 按order排序
      const sortedImages = [...project.displayImages].sort((a, b) => a.order - b.order);
      setDisplayImages(sortedImages);
      setCurrentImageIndex(0);
    }
  }, [project]);
  
  // 设置DnD传感器
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
        tolerance: {
          x: 5,
          y: 1000
        }
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  // 处理拖拽结束
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setDisplayImages((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        
        const newOrder = arrayMove(items, oldIndex, newIndex);
        
        // 更新顺序号
        const updatedOrder = newOrder.map((img: ProjectImage, index: number) => ({
          ...img,
          order: index
        }));
        
        // 如果有onProjectUpdate回调，通知父组件
        if (onProjectUpdate && project) {
          onProjectUpdate({
            ...project,
            displayImages: updatedOrder
          });
        }
        
        // 调用API保存新顺序
        saveImageOrder(updatedOrder);
        
        return updatedOrder;
      });
    }
  };
  
  // 自定义拖拽移动处理函数，只处理水平方向的移动
  const handleDragMove = (event: any) => {
    if (event.activatorEvent && typeof event.activatorEvent.preventDefault === 'function') {
      event.activatorEvent.preventDefault();
    }
    
    if (event.delta) {
      event.delta.y = 0;
    }
  };
  
  // 保存图片顺序
  const saveImageOrder = async (images: ProjectImage[]) => {
    if (!project) return;
    
    try {
      const orderData = images.map((img: ProjectImage, index: number) => ({
        id: img.id,
        order: index
      }));
      
      await projectAPI.updateProjectImagesOrder(project.id, orderData);
    } catch (err) {
      console.error('保存图片顺序失败:', err);
    }
  };
  
  // 处理添加图片
  const handleAddImage = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  // 处理图片上传
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files.length || !project) return;

    const file = e.target.files[0];

    // 验证文件类型和大小
    if (!file.type.match('image.*')) {
      alert('请选择图片文件');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('图片大小不能超过10MB');
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('projectId', project.id);
      formData.append('order', displayImages.length.toString());

      const response = await projectAPI.addProjectDisplayImage(formData);

      if (response.data) {
        const newImages = [...displayImages, response.data];
        setDisplayImages(newImages);

        // 如果项目没有封面图片，将上传的第一张设置为封面
        if (!project.coverImage) {
          try {
            const coverFormData = new FormData();
            coverFormData.append('coverImage', file);
            const coverResponse = await projectAPI.updateProjectCover(project.id, coverFormData);

            if (coverResponse.data && onProjectUpdate) {
              onProjectUpdate({
                ...project,
                displayImages: newImages,
                coverImage: coverResponse.data.coverImage
              });
            }
          } catch (coverErr) {
            console.error('设置封面图片失败:', coverErr);
            // 即使设置封面失败，也更新图片列表
            if (onProjectUpdate) {
              onProjectUpdate({
                ...project,
                displayImages: newImages
              });
            }
          }
        } else if (onProjectUpdate) {
          onProjectUpdate({
            ...project,
            displayImages: newImages
          });
        }
      }
    } catch (err) {
      console.error('上传图片失败:', err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // 处理删除图片
  const handleDeleteImage = async (imageId: string) => {
    if (!project) return;

    // 判断删除的是否是第一张图片（封面）
    const deletedImage = displayImages.find(img => img.id === imageId);
    const isFirstImage = deletedImage && deletedImage.order === 0;

    try {
      await projectAPI.deleteProjectDisplayImage(project.id, imageId);

      const newImages = displayImages.filter(img => img.id !== imageId);
      setDisplayImages(newImages);

      if (currentImageIndex >= newImages.length) {
        setCurrentImageIndex(Math.max(0, newImages.length - 1));
      }

      if (onProjectUpdate) {
        // 如果删除的是第一张图片，清除封面图片
        const updatedProject = isFirstImage
          ? { ...project, displayImages: newImages, coverImage: undefined }
          : { ...project, displayImages: newImages };
        onProjectUpdate(updatedProject);
      }
    } catch (err) {
      console.error('删除图片失败:', err);
    }
  };
  
  // 处理图片导航
  const handlePrevImage = () => {
    setCurrentImageIndex((prev) => 
      prev > 0 ? prev - 1 : displayImages.length - 1
    );
    setImageScale(1);
  };
  
  const handleNextImage = () => {
    setCurrentImageIndex((prev) => 
      prev < displayImages.length - 1 ? prev + 1 : 0
    );
    setImageScale(1);
  };

  // 处理滚轮缩放图片
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setImageScale((prev) => Math.max(0.5, Math.min(3, prev + delta)));
  };
  
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{ 
        sx: { 
          minHeight: { xs: '50vh', md: '80vh' }, 
          maxHeight: { xs: '90vh', md: '85vh' }, 
          height: { xs: 'auto', md: 'auto' }, 
          width: { xs: '95%', md: '85%' }, 
          maxWidth: '1400px',
          borderRadius: 2,
          overflow: 'hidden',
          position: 'relative',
          m: { xs: 1, md: 2 },
          display: 'flex',
          flexDirection: 'column'
        }
      }}
    >
      <IconButton
        onClick={onClose}
        sx={{
          position: 'absolute',
          top: { xs: 8, md: 16 },
          right: { xs: 8, md: 16 },
          zIndex: 1000,
          color: 'white',
          backgroundColor: 'rgba(0,0,0,0.5)',
          '&:hover': {
            backgroundColor: 'rgba(0,0,0,0.7)',
          }
        }}
      >
        <Close />
      </IconButton>
      <DialogContent sx={{ p: 0, overflow: 'auto', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {project && (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', md: 'row' },
            flex: 1,
            minHeight: 0
          }}>
            {/* 左侧图片查看器 */}
            <Box sx={{ 
              flex: { xs: 'none', md: '1 1 70%' },
              minHeight: { xs: 300, md: 0 },
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}>
              <Paper 
                elevation={0} 
                sx={{ 
                  backgroundColor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.9)' : 'rgba(0,0,0,0.8)',
                  position: 'relative',
                  borderRadius: { xs: 0, md: 0 },
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden'
                }}
              >
              {/* 主图片显示区 */}
              <Box 
                onWheel={handleWheel}
                sx={{ 
                  flex: 1,
                  display: 'flex', 
                  justifyContent: 'center',
                  alignItems: 'center',
                  position: 'relative',
                  px: 2,
                  py: 2,
                  overflow: 'hidden',
                  minHeight: 0
                }}
              >
                {displayImages.length > 0 ? (
                  <>
                    <Box
                      component="img"
                      src={displayImages[currentImageIndex].url}
                      sx={{
                        maxWidth: '100%',
                        maxHeight: '100%',
                        objectFit: 'contain',
                        borderRadius: 1,
                        boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                        transform: `scale(${imageScale})`,
                        transition: 'transform 0.1s ease-out',
                        cursor: 'zoom-in'
                      }}
                    />
                    {displayImages.length > 1 && (
                      <>
                        <IconButton
                          sx={{
                            position: 'absolute',
                            left: 16,
                            backgroundColor: 'rgba(0,0,0,0.5)',
                            color: 'white',
                            '&:hover': {
                              backgroundColor: 'rgba(0,0,0,0.7)',
                            }
                          }}
                          onClick={handlePrevImage}
                        >
                          <ArrowBackIos />
                        </IconButton>
                        <IconButton
                          sx={{
                            position: 'absolute',
                            right: 16,
                            backgroundColor: 'rgba(0,0,0,0.5)',
                            color: 'white',
                            '&:hover': {
                              backgroundColor: 'rgba(0,0,0,0.7)',
                            }
                          }}
                          onClick={handleNextImage}
                        >
                          <ArrowForwardIos />
                        </IconButton>
                      </>
                    )}
                  </>
                ) : (
                  <Typography variant="body1" color="white">
                    暂无图片
                  </Typography>
                )}
              </Box>
              
              {/* 缩略图区域 */}
              <Box 
                sx={{ 
                  display: 'flex', 
                  overflowX: 'auto',
                  overflowY: 'hidden',
                  maxHeight: '80px',
                  flexShrink: 0,
                  '&::-webkit-scrollbar': {
                    height: '6px',
                  },
                  '&::-webkit-scrollbar-track': {
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    borderRadius: '3px'
                  },
                  '&::-webkit-scrollbar-thumb': {
                    backgroundColor: 'rgba(255,255,255,0.3)',
                    borderRadius: '3px'
                  },
                  '&::-webkit-scrollbar-vertical': {
                    display: 'none'
                  },
                  msOverflowStyle: 'none',
                  scrollbarWidth: 'thin',
                }}
              >
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                  onDragMove={handleDragMove}
                >
                  <SortableContext
                    items={displayImages.map(img => img.id)}
                    strategy={horizontalListSortingStrategy}
                  >
                    {displayImages.map((image, index) => (
                      <Box
                        key={image.id}
                        onClick={(e) => {
                          if ((e.target as HTMLElement).closest('button')) {
                            return;
                          }
                          setCurrentImageIndex(index);
                        }}
                      >
                        <SortableThumbnail 
                          image={image} 
                          isActive={index === currentImageIndex}
                          isOwner={isOwner}
                          onDelete={handleDeleteImage}
                        />
                      </Box>
                    ))}
                  </SortableContext>
                </DndContext>
                
                {isOwner && (
                  <>
                    <AddImageButton onClick={handleAddImage} />
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleImageUpload}
                    />
                    {isUploading && (
                      <Box sx={{ display: 'flex', alignItems: 'center', ml: 2 }}>
                        <CircularProgress size={20} color="inherit" />
                        <Typography variant="body2" color="white" sx={{ ml: 1 }}>
                          上传中...
                        </Typography>
                      </Box>
                    )}
                  </>
                )}
              </Box>
            </Paper>
            </Box>
            
            {/* 右侧可滚动区域 */}
            <Box sx={{ 
              flex: { xs: 'none', md: '1 1 30%' },
              overflowY: { xs: 'visible', md: 'auto' },
              minHeight: { xs: 'auto', md: 0 },
              bgcolor: 'background.paper',
              display: { xs: 'block', md: 'block' },
              '&::-webkit-scrollbar': {
                width: '6px',
              },
              '&::-webkit-scrollbar-track': {
                backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.1)',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
                borderRadius: '3px',
              }
            }}>
            {/* 项目描述 */}
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <Info fontSize="small" sx={{ mr: 1, color: 'primary.main' }} />
                项目描述
              </Typography>
              <Box data-color-mode={isDarkMode ? "dark" : "light"} sx={{ 
                  mb: 0,
                  '& .wmde-markdown': { 
                    backgroundColor: 'transparent !important',
                    p: 0,
                    color: isDarkMode ? '#c9d1d9 !important' : 'inherit'
                  },
                  '& .wmde-markdown .wmde-markdown-color': {
                    backgroundColor: 'transparent !important'
                  },
                  '& .wmde-markdown p': {
                    color: isDarkMode ? '#c9d1d9 !important' : 'inherit'
                  },
                  '& .wmde-markdown h1, & .wmde-markdown h2, & .wmde-markdown h3, & .wmde-markdown h4, & .wmde-markdown h5, & .wmde-markdown h6': {
                    color: isDarkMode ? '#c9d1d9 !important' : 'inherit'
                  },
                  '& .wmde-markdown code': {
                    color: isDarkMode ? '#c9d1d9 !important' : 'inherit'
                  },
                  '& .wmde-markdown pre': {
                    backgroundColor: isDarkMode ? '#161b22 !important' : 'transparent',
                    color: isDarkMode ? '#c9d1d9 !important' : 'inherit'
                  },
                  '& .wmde-markdown a': {
                    color: isDarkMode ? '#58a6ff !important' : 'inherit'
                  },
                  '& .wmde-markdown ul, & .wmde-markdown ol': {
                    color: isDarkMode ? '#c9d1d9 !important' : 'inherit'
                  },
                  '& .wmde-markdown blockquote': {
                    color: isDarkMode ? '#8b949e !important' : 'inherit'
                  }
                }}>
                  <MDEditor.Markdown source={project.description || '暂无项目描述'} />
                </Box>
            </Box>
            
            <Divider sx={{ mx: 3 }} />
            
            {/* 项目成员 */}
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <Group fontSize="small" sx={{ mr: 1, color: 'primary.main' }} />
                项目成员
              </Typography>
              {project.members && project.members.length > 0 ? (
                <List>
                    {project.members.map((member) => (
                      <ListItem 
                        key={member.id}
                        sx={{ 
                          cursor: 'pointer',
                          borderRadius: 1,
                          '&:hover': {
                            bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'
                          }
                        }}
                        onClick={() => navigate(`/user/${member.userId}`)}
                      >
                        <ListItemAvatar>
                          <Avatar src={member.user.avatarUrl} sx={{ 
                            width: 40, 
                            height: 40,
                            border: '2px solid',
                            borderColor: member.role === 'owner' ? 'primary.main' : 'transparent'
                          }}>
                            {member.user.nickname.charAt(0).toUpperCase()}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Typography variant="body1" fontWeight={member.role === 'owner' ? 'bold' : 'normal'}>
                                {member.user.nickname}
                              </Typography>
                              <Typography 
                                variant="body2" 
                                color={member.role === 'owner' ? 'primary' : 'text.secondary'}
                                sx={{ ml: 1 }}
                              >
                                {member.role === 'owner' ? '(创建者)' : 
                                 member.role === 'admin' ? '(管理员)' : '(成员)'}
                              </Typography>
                            </Box>
                          }
                          secondary={`加入于 ${formatDate(member.joinedAt)}`}
                        />
                      </ListItem>
                    ))}
                  </List>
              ) : (
                <Typography variant="body1" color="text.secondary">
                  暂无成员信息
                </Typography>
              )}
            </Box>
          </Box>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ProjectInfoDialog;