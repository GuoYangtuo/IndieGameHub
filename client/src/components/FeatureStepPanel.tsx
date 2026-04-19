import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  useTheme as useMuiTheme,
  useMediaQuery,
} from '@mui/material';
import { KeyboardArrowLeft, KeyboardArrowRight, ArrowBack } from '@mui/icons-material';
import { useTheme } from '../contexts/ThemeContext';

interface FeatureImage {
  dark: string;
  light: string;
  description?: string;
}

interface FeatureStepPanelProps {
  title: string;
  description: string;
  images: FeatureImage[];
  onEnable: () => void;
  onDisable: () => void;
  onBack: () => void;
}

const FeatureStepPanel: React.FC<FeatureStepPanelProps> = ({
  title,
  description,
  images,
  onEnable,
  onDisable,
  onBack,
}) => {
  const { isDarkMode } = useTheme();
  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const hasMultipleImages = images.length > 1;

  const handlePrev = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex((prev) => prev - 1);
    }
  };

  const handleNext = () => {
    if (currentImageIndex < images.length - 1) {
      setCurrentImageIndex((prev) => prev + 1);
    }
  };

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!hasMultipleImages) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const halfWidth = rect.width / 2;
    if (clickX < halfWidth) {
      handlePrev();
    } else {
      handleNext();
    }
  };

  const imageSrc = images[currentImageIndex]?.[isDarkMode ? 'dark' : 'light'] || '';

  const contentPanel = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        p: { xs: 2, md: 4 },
        pt:"0!important",
        height: '100%',
        order: isMobile ? 2 : 1,
        justifyContent: { xs: 'flex-start', md: 'center' },
      }}
    >
      <Button
        variant="text"
        size="small"
        startIcon={<ArrowBack />}
        onClick={onBack}
        sx={{ mb: 2, alignSelf: 'flex-start', pl: 0 }}
      >
        返回上一步
      </Button>

      <Box sx={{ maxWidth: 480 }}>
        <Typography
          variant="h5"
          sx={{
            fontWeight: 600,
            mb: 1.5,
          }}
        >
          {title}
        </Typography>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 3, lineHeight: 1.6 }}
        >
          {description}
        </Typography>

        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={onEnable}
            sx={{ flex: 1 }}
          >
            启用
          </Button>
          <Button
            variant="outlined"
            onClick={onDisable}
            sx={{ flex: 1 }}
          >
            用不上 / 没兴趣
          </Button>
        </Box>
      </Box>
    </Box>
  );

  const imagePanel = (
    <Box
      sx={{
        position: 'relative',
        height: '100%',
        minHeight: { xs: 300, md: 400 },
        order: isMobile ? 1 : 2,
      }}
    >
      <Box
        onClick={handleImageClick}
        sx={{
          position: 'absolute',
          inset: 0,
          m: { xs: 2, md: 4 },
          borderRadius: 2,
          overflow: 'hidden',
          bgcolor: 'background.default',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: hasMultipleImages ? 'pointer' : 'default',
        }}
      >
        {imageSrc ? (
          <Box
            component="img"
            src={imageSrc}
            alt={`${title} 预览`}
            sx={{
              width: '100%',
              flex: 1,
              objectFit: 'contain',
              minHeight: 0,
            }}
          />
        ) : (
          <Typography variant="body2" color="text.secondary">
            暂无预览图
          </Typography>
        )}
        {images[currentImageIndex]?.description && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              py: 0.5,
              textAlign: 'center',
              width: '100%',
              flexShrink: 0,
            }}
          >
            {images[currentImageIndex].description}
          </Typography>
        )}
      </Box>

      {hasMultipleImages && (
        <>
          <Button
            size="small"
            onClick={handlePrev}
            disabled={currentImageIndex === 0}
            sx={{
              position: 'absolute',
              left: { xs: 8, md: 16 },
              bottom: { xs: 8, md: 16 },
              minWidth: 40,
              p: '6px 8px',
              '&:hover': {
                bgcolor: 'action.hover',
              },
            }}
          >
            <KeyboardArrowLeft />
          </Button>
          <Box
            sx={{
              position: 'absolute',
              bottom: { xs: 8, md: 16 },
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              gap: 1,
            }}
          >
            {images.map((_, index) => (
              <Box
                key={index}
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: index === currentImageIndex
                    ? 'primary.main'
                    : 'action.disabled',
                  transition: 'background-color 0.2s',
                }}
              />
            ))}
          </Box>
          <Button
            size="small"
            onClick={handleNext}
            disabled={currentImageIndex === images.length - 1}
            sx={{
              position: 'absolute',
              right: { xs: 8, md: 16 },
              bottom: { xs: 8, md: 16 },
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              minWidth: 40,
              p: '6px 8px',
              '&:hover': {
                bgcolor: 'action.hover',
              },
            }}
          >
            <KeyboardArrowRight />
          </Button>
        </>
      )}
    </Box>
  );

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        minHeight: { xs: 'auto', md: 500 },
        flex: 1,
        overflow: 'hidden',
      }}
    >
      {isMobile ? (
        <>
          {imagePanel}
          {contentPanel}
        </>
      ) : (
        <>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {contentPanel}
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {imagePanel}
          </Box>
        </>
      )}
    </Box>
  );
};

export default FeatureStepPanel;
