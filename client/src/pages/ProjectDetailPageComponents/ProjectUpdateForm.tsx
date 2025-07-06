import React, { useState } from 'react';
import {
  Box,
  Button,
  IconButton,
  Alert
} from '@mui/material';
import { Delete } from '@mui/icons-material';
import DebouncedInput from '../../components/DebouncedInput';
import DebouncedMDEditor from '../../components/DebouncedMDEditor';
import { projectAPI } from '../../services/api';

interface ProjectUpdateFormProps {
  projectId: string;
  projectSlug: string;
  user: any | null;
  isDarkMode: boolean;
  onUpdateAdded: (updatedProject: any) => void;
  onDemoLinkUpdate?: (demoLink: string) => void;
  onError: (error: string | null) => void;
}

const ProjectUpdateForm: React.FC<ProjectUpdateFormProps> = ({
  projectId,
  projectSlug,
  user,
  isDarkMode,
  onUpdateAdded,
  onDemoLinkUpdate,
  onError
}) => {
  // 更新表单状态
  const [updateContent, setUpdateContent] = useState('');
  const [updateDemoLink, setUpdateDemoLink] = useState('');
  const [updateVersionName, setUpdateVersionName] = useState('');
  const [isVersionUpdate, setIsVersionUpdate] = useState(false);
  const [updatingProject, setUpdatingProject] = useState(false);
  const [updateImages, setUpdateImages] = useState<File[]>([]);
  const [updateImagePreviews, setUpdateImagePreviews] = useState<string[]>([]);

  // 处理图片选择
  const handleImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const fileArray = Array.from(e.target.files);
      const validFiles: File[] = [];
      const invalidFiles: string[] = [];
      
      fileArray.forEach(file => {
        // 检查文件大小（限制为5MB）
        if (file.size > 5 * 1024 * 1024) {
          invalidFiles.push(`${file.name} 超过5MB`);
          return;
        }
        
        // 检查文件类型
        if (!file.type.match('image.*')) {
          invalidFiles.push(`${file.name} 不是图片文件`);
          return;
        }
        
        validFiles.push(file);
      });
      
      if (invalidFiles.length > 0) {
        onError(`无法添加以下文件: ${invalidFiles.join(', ')}`);
      } else {
        onError(null);
      }
      
      setUpdateImages([...updateImages, ...validFiles]);
      
      // 创建预览
      const newPreviews: string[] = [];
      validFiles.forEach(file => {
        const reader = new FileReader();
        reader.onload = () => {
          newPreviews.push(reader.result as string);
          if (newPreviews.length === validFiles.length) {
            setUpdateImagePreviews([...updateImagePreviews, ...newPreviews]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };
  
  // 移除图片
  const handleRemoveImage = (index: number) => {
    const newImages = [...updateImages];
    const newPreviews = [...updateImagePreviews];
    newImages.splice(index, 1);
    newPreviews.splice(index, 1);
    setUpdateImages(newImages);
    setUpdateImagePreviews(newPreviews);
  };
  
  // 处理添加更新
  const handleAddUpdate = async () => {
    if (!projectId || !updateContent) return;
    
    // 版本更新必须填写demo链接和版本名称
    if (isVersionUpdate) {
      if (!updateDemoLink.trim()) {
        onError('版本更新必须提供Demo下载链接');
        return;
      }
      
      if (!updateVersionName.trim()) {
        onError('版本更新必须提供版本名称');
        return;
      }
    }
    
    try {
      setUpdatingProject(true);
      
      const updateData = {
        content: updateContent,
        demoLink: isVersionUpdate ? updateDemoLink : undefined,
        isVersion: isVersionUpdate,
        versionName: isVersionUpdate ? updateVersionName : undefined,
        createdBy: user?.username || "项目成员"
      };
      
      console.log("添加更新数据:", updateData);
      
      // 如果有图片，使用图片上传接口
      if (updateImages.length > 0) {
        for (const image of updateImages) {
          const formData = new FormData();
          formData.append('image', image);
          formData.append('content', updateContent);
          formData.append('isVersion', isVersionUpdate ? 'true' : 'false');
          if (isVersionUpdate && updateDemoLink) {
            formData.append('demoLink', updateDemoLink);
          }
          if (isVersionUpdate && updateVersionName) {
            formData.append('versionName', updateVersionName);
          }
          
          await projectAPI.addUpdateWithImage(projectId, formData);
        }
        
        // 重新获取项目数据
        const updatedProject = await projectAPI.getProjectBySlug(projectSlug);
        onUpdateAdded(updatedProject.data);
      } else {
        // 没有图片，使用普通更新接口
        const response = await projectAPI.addUpdate(
          projectId, 
          updateData.content, 
          updateData.demoLink, 
          updateData.isVersion,
          updateData.versionName
        );
        
        onUpdateAdded(response.data);
      }
      
      // 如果是版本更新并且有Demo链接，更新导航栏的Demo链接
      if (isVersionUpdate && updateDemoLink && onDemoLinkUpdate) {
        onDemoLinkUpdate(updateDemoLink);
      }
      
      // 重置表单
      setUpdateContent('');
      setUpdateDemoLink('');
      setUpdateVersionName('');
      setIsVersionUpdate(false);
      setUpdateImages([]);
      setUpdateImagePreviews([]);
      
    } catch (err) {
      console.error('添加项目更新失败:', err);
      onError('添加项目更新失败，请稍后再试');
    } finally {
      setUpdatingProject(false);
    }
  };

  return (
    <Box>
      {isVersionUpdate ? (
        <>
          <Box data-color-mode={isDarkMode ? "dark" : "light"}>
            <DebouncedMDEditor
              value={updateContent}
              onChange={(value) => setUpdateContent(value || '')}
              height={200}
              preview="edit"
            />
          </Box>
          <DebouncedInput
            fullWidth
            placeholder="版本名称，如v1.0.0或'日暮之下'"
            value={updateVersionName}
            onDebouncedChange={(value) => setUpdateVersionName(value)}
            sx={{ mb: 2, mt: 2 }}
            required
            error={isVersionUpdate && !updateVersionName.trim() && updateVersionName !== ''}
            helperText={isVersionUpdate && !updateVersionName.trim() && updateVersionName !== '' ? "版本更新必须提供版本名称" : ""}
          />
          <DebouncedInput
            fullWidth
            placeholder="Demo下载链接"
            value={updateDemoLink}
            onDebouncedChange={(value) => setUpdateDemoLink(value)}
            sx={{ mb: 2 }}
            required
            error={isVersionUpdate && !updateDemoLink.trim() && updateDemoLink !== ''}
            helperText={isVersionUpdate && !updateDemoLink.trim() && updateDemoLink !== '' ? "版本更新必须提供Demo下载链接" : ""}
          />
        </>
      ) : (
        <DebouncedInput
          fullWidth
          placeholder="简述一项今天完成的任务..."
          multiline
          rows={1}
          value={updateContent}
          onDebouncedChange={(value) => setUpdateContent(value)}
          sx={{ mb: 0 }}
        />
      )}
      
      {/* 图片上传区域 */}
      <Box sx={{ mt: 2, mb: 2 }}>
        <input
          accept="image/*"
          style={{ display: 'none' }}
          id="update-images"
          type="file"
          multiple
          onChange={handleImagesChange}
        />
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          <label htmlFor="update-images">
            <Button variant="outlined" component="span" size="small" sx={{ mr: 1 }}>
              添加图片
            </Button>
          </label>
          
          <Button
            variant="outlined"
            color="primary"
            onClick={() => setIsVersionUpdate(!isVersionUpdate)}
            size="small"
            sx={{ mr: 1 }}
          >
            {isVersionUpdate ? "切换为日常更新" : "切换为版本更新"}
          </Button>
          
          <Button
            variant="contained"
            color="primary"
            disabled={!updateContent || 
                     (isVersionUpdate && (!updateDemoLink.trim() || !updateVersionName.trim())) || 
                     updatingProject}
            onClick={handleAddUpdate}
          >
            {updatingProject ? "提交中..." : "提交更新"}
          </Button>
        </Box>
      </Box>

      {updateImagePreviews.length > 0 && (
        <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {updateImagePreviews.map((preview, index) => (
            <Box key={index} sx={{ position: 'relative' }}>
              <img 
                src={preview} 
                alt={`图片预览 ${index+1}`} 
                style={{ 
                  width: '100px', 
                  height: '100px', 
                  objectFit: 'cover',
                  borderRadius: '4px',
                  border: '1px solid #eee'
                }} 
              />
              <IconButton 
                size="small" 
                sx={{ 
                  position: 'absolute', 
                  top: -10, 
                  right: -10,
                  bgcolor: 'white',
                  '&:hover': { bgcolor: '#f5f5f5' }
                }}
                onClick={() => handleRemoveImage(index)}
              >
                <Delete fontSize="small" />
              </IconButton>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default ProjectUpdateForm; 