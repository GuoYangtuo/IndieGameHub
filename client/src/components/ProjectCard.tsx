import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  CardActionArea,
  CardMedia,
  Box,
  Chip,
  Stack
} from '@mui/material';
import { Link as LinkIcon, Code, Update as UpdateIcon } from '@mui/icons-material';

interface ProjectUpdate {
  id: string;
  content: string;
  demoLink?: string;
  createdAt: string;
  imageUrl?: string;
}

interface ProjectCardProps {
  id: string;
  name: string;
  slug: string;
  description?: string;
  demoLink?: string;
  updates?: ProjectUpdate[];
  createdAt: string;
}

const ProjectCard: React.FC<ProjectCardProps> = ({
  id,
  name,
  slug,
  description = '',
  demoLink,
  updates = [],
  createdAt
}) => {
  const navigate = useNavigate();

  // 查找是否有项目图片
  const projectImage = updates?.find(update => update.imageUrl)?.imageUrl;

  const handleCardClick = () => {
    // 打开新标签页并带上showInfo=true参数
    window.open(`/projects/${slug}?showInfo=true`, '_blank');
  };

  // 计算更新日期，格式化为"最近更新于XX天前"
  const getLastUpdateText = () => {
    if (updates && updates.length > 0) {
      const latestUpdate = updates.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0];
      
      const updateDate = new Date(latestUpdate.createdAt);
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
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        transition: 'transform 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-4px)'
        }
      }}
    >
      <CardActionArea onClick={handleCardClick} sx={{ flexGrow: 1 }}>
        {projectImage && (
          <CardMedia
            component="img"
            height="180"
            image={projectImage}
            alt={name}
            sx={{ objectFit: 'cover' }}
          />
        )}
        <CardContent sx={{ py: 2, px: 2.5 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
            <Code fontSize="small" color="primary" />
            <Typography 
              variant="h6" 
              component="div" 
              sx={{ 
                fontWeight: 600,
                color: theme => theme.palette.mode === 'dark' ? '#58a6ff' : '#0969da'
              }}
            >
              {name}
            </Typography>
          </Stack>
          
          <Typography 
            variant="body2" 
            color="text.secondary" 
            sx={{ 
              height: '2.5em', 
              overflow: 'hidden', 
              textOverflow: 'ellipsis', 
              mb: 2,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical'
            }}
          >
            {description && description.length > 120 ? `${description.substring(0, 120)}...` : description}
          </Typography>

          <Box sx={{ mt: 'auto' }}>
            <Chip
              size="small"
              icon={<UpdateIcon fontSize="small" />}
              label={getLastUpdateText()}
              variant="outlined"
              sx={{ 
                height: 24, 
                fontSize: '0.75rem',
                color: 'text.secondary'
              }}
            />
          </Box>
        </CardContent>
      </CardActionArea>
      
      <CardActions sx={{ py: 1, px: 2, bgcolor: theme => theme.palette.mode === 'dark' ? 'rgba(13, 17, 23, 0.3)' : 'rgba(246, 248, 250, 0.5)' }}>
        {demoLink && (
          <Button 
            size="small" 
            startIcon={<LinkIcon />}
            href={demoLink}
            target="_blank"
            rel="noopener noreferrer"
            variant="outlined"
            color="primary"
            sx={{ 
              ml: 0, 
              fontWeight: 'medium',
              fontSize: '0.8125rem'
            }}
          >
            下载Demo
          </Button>
        )}
      </CardActions>
    </Card>
  );
};

export default ProjectCard; 