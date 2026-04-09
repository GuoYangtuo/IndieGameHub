import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  Alert,
  CircularProgress,
} from '@mui/material';
import MDEditor from '@uiw/react-md-editor';
import { CloudUpload, Delete, CheckCircle, Cancel } from '@mui/icons-material';

interface SetResultDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (content: string, images: File[]) => Promise<void>;
  resultType: 'success' | 'failed';
  loading?: boolean;
}

const SetResultDialog: React.FC<SetResultDialogProps> = ({
  open,
  onClose,
  onSubmit,
  resultType,
  loading = false,
}) => {
  const [content, setContent] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSuccess = resultType === 'success';
  const [showConfirm, setShowConfirm] = useState(false);

  const handleClose = () => {
    if (!submitting) {
      setContent('');
      setImages([]);
      setImagePreviews([]);
      setError(null);
      setShowConfirm(false);
      onClose();
    }
  };

  const handleOpenConfirm = () => {
    if (isSuccess && !content.trim()) {
      setError('请填写交付结果说明');
      return;
    }
    if (!isSuccess && !content.trim()) {
      setError('请填写放弃原因');
      return;
    }
    setShowConfirm(true);
  };

  const handleSubmit = async () => {
    setShowConfirm(false);
    try {
      setSubmitting(true);
      setError(null);
      await onSubmit(content, images);
      // 成功后关闭对话框
      setContent('');
      setImages([]);
      setImagePreviews([]);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || '提交失败，请稍后再试');
    } finally {
      setSubmitting(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newFiles = Array.from(files);
      const totalFiles = images.length + newFiles.length;
      if (totalFiles > 10) {
        setError('最多只能上传10张图片');
        return;
      }
      setImages(prev => [...prev, ...newFiles]);
      const newPreviews = newFiles.map(file => URL.createObjectURL(file));
      setImagePreviews(prev => [...prev, ...newPreviews]);
    }
    // 清空 input 以允许重复选择同一文件
    e.target.value = '';
  };

  const handleRemoveImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    setImages(newImages);
    setImagePreviews(newPreviews);
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {isSuccess ? (
          <>
            <CheckCircle color="success" />
            <span>任务完成 - 填写交付结果，等待粉丝审核</span>
          </>
        ) : (
          <>
            <Cancel color="error" />
            <span>放弃开发 - 退回所有捐款</span>
          </>
        )}
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom sx={{ mt: 1 }}>
            {isSuccess
              ? '详细说明完成的工作和交付内容（比如“已发布最新Demo可试玩，感谢支持”等，支持 Markdown 格式）'
              : '说明遇到的困难或不可抗力等，或说明已经完成的部分（支持 Markdown 格式）'}
          </Typography>
          <MDEditor
            value={content}
            onChange={(val) => setContent(val || '')}
            preview="edit"
            height={300}
          />
        </Box>

        {/* 图片上传 */}
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            {isSuccess ? '配图（可选，最多10张）' : '相关截图或说明图片（可选，最多10张）'}
          </Typography>
          <Button
            variant="outlined"
            component="label"
            startIcon={<CloudUpload />}
            sx={{ mb: 1 }}
            disabled={submitting}
          >
            上传图片
            <input
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={handleImageChange}
            />
          </Button>

          {imagePreviews.length > 0 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
              {imagePreviews.map((preview, index) => (
                <Box key={index} sx={{ position: 'relative' }}>
                  <img
                    src={preview}
                    alt={`图片 ${index + 1}`}
                    style={{
                      width: 100,
                      height: 100,
                      objectFit: 'cover',
                      borderRadius: 4,
                      border: '1px solid #e0e0e0',
                    }}
                  />
                  <IconButton
                    size="small"
                    sx={{
                      position: 'absolute',
                      top: -8,
                      right: -8,
                      bgcolor: 'error.main',
                      color: 'white',
                      '&:hover': { bgcolor: 'error.dark' },
                      width: 24,
                      height: 24,
                    }}
                    onClick={() => handleRemoveImage(index)}
                    disabled={submitting}
                  >
                    <Delete sx={{ fontSize: 16 }} />
                  </IconButton>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose} disabled={submitting}>
          取消
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color={isSuccess ? 'success' : 'error'}
          disabled={submitting}
          startIcon={submitting ? <CircularProgress size={16} /> : (isSuccess ? <CheckCircle /> : <Cancel />)}
        >
          {submitting ? '提交中...' : (isSuccess ? '确认完成' : '确认放弃')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SetResultDialog;
