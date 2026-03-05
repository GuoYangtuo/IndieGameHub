import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
  TextField,
  Button,
  Checkbox,
  FormControlLabel,
  IconButton,
  Alert,
  ImageList,
  ImageListItem,
  Stack
} from '@mui/material';
import { Add, Delete, Close } from '@mui/icons-material';
import { surveyAPI } from '../services/api';

interface CreateSurveyDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  onSurveyCreated: () => void;
}

const CreateSurveyDialog: React.FC<CreateSurveyDialogProps> = ({
  open,
  onClose,
  projectId,
  onSurveyCreated
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [useVoting, setUseVoting] = useState(false);
  const [allowFreeResponse, setAllowFreeResponse] = useState(false);
  const [options, setOptions] = useState<string[]>(['', '']);
  const [endTime, setEndTime] = useState('');
  const [isManualEnd, setIsManualEnd] = useState(true);
  
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 处理图片选择
  const handleImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const fileArray = Array.from(e.target.files);
      const validFiles: File[] = [];
      const invalidFiles: string[] = [];
      
      fileArray.forEach(file => {
        if (file.size > 5 * 1024 * 1024) {
          invalidFiles.push(`${file.name} 超过5MB`);
          return;
        }
        if (!file.type.match('image.*')) {
          invalidFiles.push(`${file.name} 不是图片文件`);
          return;
        }
        validFiles.push(file);
      });
      
      if (invalidFiles.length > 0) {
        setError(`无法添加以下文件: ${invalidFiles.join(', ')}`);
      } else {
        setError(null);
      }
      
      setImages([...images, ...validFiles]);
      
      const newPreviews: string[] = [];
      validFiles.forEach(file => {
        const reader = new FileReader();
        reader.onload = () => {
          newPreviews.push(reader.result as string);
          if (newPreviews.length === validFiles.length) {
            setImagePreviews([...imagePreviews, ...newPreviews]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
    // 清空input以便重复选择同一文件
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 移除图片
  const handleRemoveImage = (index: number) => {
    const newImages = [...images];
    const newPreviews = [...imagePreviews];
    newImages.splice(index, 1);
    newPreviews.splice(index, 1);
    setImages(newImages);
    setImagePreviews(newPreviews);
  };

  // 添加投票选项
  const handleAddOption = () => {
    setOptions([...options, '']);
  };

  // 移除投票选项
  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      const newOptions = [...options];
      newOptions.splice(index, 1);
      setOptions(newOptions);
    }
  };

  // 修改投票选项
  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  // 重置表单
  const handleReset = () => {
    setTitle('');
    setDescription('');
    setUseVoting(false);
    setAllowFreeResponse(false);
    setOptions(['', '']);
    setEndTime('');
    setIsManualEnd(true);
    setImages([]);
    setImagePreviews([]);
    setError(null);
  };

  // 关闭弹窗
  const handleClose = () => {
    handleReset();
    onClose();
  };

  // 创建征询
  const handleCreate = async () => {
    // 验证
    if (!title.trim()) {
      setError('请输入征询标题');
      return;
    }
    if (!useVoting && !allowFreeResponse) {
      setError('至少需要选择投票或自由发言之一');
      return;
    }
    if (useVoting) {
      const validOptions = options.filter(o => o.trim());
      if (validOptions.length < 2) {
        setError('投票选项至少需要2个');
        return;
      }
    }

    try {
      setLoading(true);
      setError(null);

      // 创建征询
      const response = await surveyAPI.createSurvey({
        projectId,
        title: title.trim(),
        description: description.trim() || undefined,
        useVoting,
        allowFreeResponse,
        endTime: isManualEnd ? undefined : (endTime || undefined),
        options: useVoting ? options.filter(o => o.trim()) : undefined
      });

      const surveyId = response.data.surveyId;

      // 上传图片
      if (images.length > 0) {
        const formData = new FormData();
        images.forEach(file => {
          formData.append('images', file);
        });
        await surveyAPI.uploadSurveyImages(surveyId, formData);
      }

      handleReset();
      onSurveyCreated();
    } catch (err: any) {
      console.error('创建征询失败:', err);
      setError(err.response?.data?.message || '创建征询失败，请稍后再试');
    } finally {
      setLoading(false);
    }
  };

  // 获取当前时间，格式化为datetime-local可用的格式
  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">创建意见征询</Typography>
          <IconButton onClick={handleClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Stack spacing={3} sx={{ mt: 1 }}>
          {/* 标题 */}
          <TextField
            fullWidth
            label="征询标题"
            placeholder="请输入征询标题"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          {/* 描述 */}
          <TextField
            fullWidth
            label="征询描述"
            placeholder="请输入征询描述（可选）"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            multiline
            rows={3}
          />

          {/* 图片上传 */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              附加图片（可选）
            </Typography>
            <input
              accept="image/*"
              style={{ display: 'none' }}
              id="survey-images"
              type="file"
              multiple
              ref={fileInputRef}
              onChange={handleImagesChange}
            />
            <label htmlFor="survey-images">
              <Button variant="outlined" component="span">
                添加图片
              </Button>
            </label>
            
            {imagePreviews.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <ImageList cols={4} rowHeight={80} gap={8}>
                  {imagePreviews.map((preview, index) => (
                    <ImageListItem key={index} sx={{ position: 'relative' }}>
                      <img
                        src={preview}
                        alt={`预览 ${index + 1}`}
                        style={{ 
                          width: '100%', 
                          height: '100%', 
                          objectFit: 'cover',
                          borderRadius: '4px'
                        }}
                      />
                      <IconButton
                        size="small"
                        sx={{
                          position: 'absolute',
                          top: -8,
                          right: -8,
                          bgcolor: 'rgba(255,255,255,0.9)',
                          '&:hover': { bgcolor: 'white' }
                        }}
                        onClick={() => handleRemoveImage(index)}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </ImageListItem>
                  ))}
                </ImageList>
              </Box>
            )}
          </Box>

          {/* 功能选项 */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              征询功能
            </Typography>
            <FormControlLabel
              control={
                <Checkbox
                  checked={useVoting}
                  onChange={(e) => setUseVoting(e.target.checked)}
                />
              }
              label="使用投票"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={allowFreeResponse}
                  onChange={(e) => setAllowFreeResponse(e.target.checked)}
                />
              }
              label="允许自由发言"
            />
          </Box>

          {/* 投票选项 */}
          {useVoting && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                投票选项
              </Typography>
              {options.map((option, index) => (
                <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder={`选项 ${index + 1}`}
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                  />
                  {options.length > 2 && (
                    <IconButton onClick={() => handleRemoveOption(index)} size="small">
                      <Delete />
                    </IconButton>
                  )}
                </Box>
              ))}
              <Button
                startIcon={<Add />}
                onClick={handleAddOption}
                size="small"
                sx={{ mt: 1 }}
              >
                添加选项
              </Button>
            </Box>
          )}

          {/* 结束时间 */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              结束方式
            </Typography>
            <FormControlLabel
              control={
                <Checkbox
                  checked={isManualEnd}
                  onChange={(e) => setIsManualEnd(e.target.checked)}
                />
              }
              label="手动结束"
            />
            {!isManualEnd && (
              <TextField
                type="datetime-local"
                fullWidth
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                inputProps={{
                  min: getMinDateTime()
                }}
                sx={{ mt: 1 }}
              />
            )}
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} color="inherit">
          取消
        </Button>
        <Button
          onClick={handleCreate}
          variant="contained"
          disabled={loading || !title.trim() || (!useVoting && !allowFreeResponse)}
        >
          {loading ? '发布中...' : '发布征询'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateSurveyDialog;
