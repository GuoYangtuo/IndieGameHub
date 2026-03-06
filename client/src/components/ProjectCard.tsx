import React from 'react';
import {
  Card,
  Typography,
  CardActionArea,
  CardMedia,
  Box,
  Chip,
  useTheme
} from '@mui/material';
import { Update as UpdateIcon } from '@mui/icons-material';

interface ProjectCardProps {
  id: string;
  name: string;
  slug: string;
  description?: string;
  demoLink?: string;
  latestUpdateAt?: string;
  createdAt: string;
  coverImage?: string;
  tags?: Array<{
    id: string;
    name: string;
    color: string;
  }>;
}

const ProjectCard: React.FC<ProjectCardProps> = ({
  name,
  slug,
  description = '',
  latestUpdateAt,
  coverImage,
  tags = []
}) => {
  const theme = useTheme();
  const handleCardClick = () => {
    window.open(`/projects/${slug}?showInfo=true`, '_blank');
  };

  // 计算更新日期，格式化为"最近更新于XX天前"
  const getLastUpdateText = () => {
    if (latestUpdateAt) {
      const updateDate = new Date(latestUpdateAt);
      const today = new Date();
      const diffTime = Math.abs(today.getTime() - updateDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return `最近更新于${diffDays}天前`;
    }
    
    return "暂无更新";
  };

  return (
    <Card 
      sx={{ 
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 2,
        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 6
        }
      }}
    >
      <CardActionArea onClick={handleCardClick}>
        {coverImage ? (
          <CardMedia
            component="img"
            image={coverImage}
            alt={name}
            sx={{ 
              objectFit: 'cover',
              width: '100%',
              maxHeight: 400,
              display: 'block'
            }}
          />
        ) : (
          <Box
            sx={{
              width: '100%',
              paddingTop: '56.25%', // 16:9 比例
              bgcolor: theme => theme.palette.mode === 'dark' 
                ? 'rgba(255,255,255,0.05)' 
                : 'rgba(0,0,0,0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Typography 
              variant="h5" 
              sx={{ 
                fontWeight: 700,
                color: theme => theme.palette.mode === 'dark' 
                  ? 'rgba(255,255,255,0.15)' 
                  : 'rgba(0,0,0,0.1)',
                textTransform: 'uppercase',
                letterSpacing: 2,
                position: 'absolute'
              }}
            >
              {name.substring(0, 2)}
            </Typography>
          </Box>
        )}
        
        {/* 悬停叠加层 */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            background: theme => 
              theme.palette.mode === 'dark'
                ? 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 60%, transparent 100%)'
                : 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.6) 60%, transparent 100%)',
            padding: 2,
            pt: 6,
            opacity: 0,
            transition: 'opacity 0.3s ease',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            height: '100%',
            '.MuiCard-root:hover &': {
              opacity: 1
            }
          }}
        >
          <Typography 
            variant="h6" 
            component="div" 
            sx={{ 
              fontWeight: 600,
              color: '#fff',
              mb: 0.5
            }}
          >
            {name}
          </Typography>
          
          <Typography 
            variant="body2" 
            sx={{ 
              color: 'rgba(255,255,255,0.85)', 
              overflow: 'hidden', 
              textOverflow: 'ellipsis', 
              mb: 1,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical'
            }}
          >
            {description && description.length > 120 ? `${description.substring(0, 120)}...` : description}
          </Typography>

          {tags && tags.length > 0 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1, alignItems: 'center' }}>
              {tags.map((tag) => (
                <Chip
                  key={tag.id}
                  label={tag.name}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: '0.65rem',
                    bgcolor: 'rgba(255,255,255,0.15)',
                    color: 'rgba(255,255,255,0.9)',
                    '& .MuiChip-label': {
                      px: 1
                    }
                  }}
                />
              ))}
              <Chip
                size="small"
                icon={<UpdateIcon fontSize="small" sx={{ color: 'rgba(255,255,255,0.7) !important' }} />}
                label={getLastUpdateText()}
                sx={{ 
                  height: 20, 
                  fontSize: '0.65rem',
                  color: 'rgba(255,255,255,0.8)',
                  bgcolor: 'rgba(255,255,255,0.1)',
                  '& .MuiChip-icon': {
                    color: 'rgba(255,255,255,0.7)'
                  }
                }}
              />
            </Box>
          )}

          {(!tags || tags.length === 0) && (
            <Box sx={{ display: 'inline-flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
              <Chip
                size="small"
                icon={<UpdateIcon fontSize="small" sx={{ color: 'rgba(255,255,255,0.7) !important' }} />}
                label={getLastUpdateText()}
                sx={{ 
                  height: 20, 
                  fontSize: '0.65rem',
                  color: 'rgba(255,255,255,0.8)',
                  bgcolor: 'rgba(255,255,255,0.1)',
                  width: 'auto',
                  '& .MuiChip-icon': {
                    color: 'rgba(255,255,255,0.7)'
                  }
                }}
              />
            </Box>
          )}
        </Box>
      </CardActionArea>
    </Card>
  );
};

export default ProjectCard; 