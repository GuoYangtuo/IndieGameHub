import React from 'react';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Divider,
  Tooltip
} from '@mui/material';
import { LeaderboardOutlined, EmojiEvents, PieChart } from '@mui/icons-material';

interface Contributor {
  id: string;
  username: string;
  avatarUrl?: string;
  contribution: number;
}

interface ProjectContributionListProps {
  contributors: Contributor[];
  loading: boolean;
}

const ProjectContributionList: React.FC<ProjectContributionListProps> = ({
  contributors,
  loading
}) => {
  // Sort contributors by contribution value (descending)
  const sortedContributors = [...contributors].sort((a, b) => b.contribution - a.contribution);

  // 计算总贡献度
  const totalContribution = sortedContributors.reduce((sum, contributor) => sum + contributor.contribution, 0);

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        mt: 3,
        borderRadius: 1,
        border: theme => `1px solid ${theme.palette.divider}`,
        transition: 'box-shadow 0.2s ease-in-out',
        '&:hover': {
          boxShadow: theme => theme.palette.mode === 'dark'
            ? '0 3px 6px rgba(149, 157, 165, 0.1)'
            : '0 3px 6px rgba(149, 157, 165, 0.2)',
        }
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <LeaderboardOutlined fontSize="small" sx={{ mr: 1, color: 'primary.main' }} />
        <Typography variant="h6">贡献度</Typography>
      </Box>

      {loading ? (
        <Typography variant="body2" color="text.secondary">
          加载中...
        </Typography>
      ) : sortedContributors.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          暂无贡献数据
        </Typography>
      ) : (
        <List sx={{ width: '100%' }}>
          {sortedContributors.map((contributor, index) => {
            // 计算该贡献者的贡献比例
            const contributionPercentage = totalContribution > 0 
              ? Math.round((contributor.contribution / totalContribution) * 100) 
              : 0;
              
            return (
            <React.Fragment key={contributor.id}>
              <ListItem alignItems="center">
                <ListItemAvatar>
                  <Tooltip title={contributor.username}>
                    <Avatar 
                      src={contributor.avatarUrl} 
                      alt={contributor.username}
                      sx={{
                        width: 40,
                        height: 40,
                        border: index < 3 ? '2px solid' : 'none',
                        borderColor: index === 0 ? 'gold' : 
                                   index === 1 ? 'silver' : 
                                   index === 2 ? '#cd7f32' : 'transparent'
                      }}
                    >
                      {contributor.username.charAt(0).toUpperCase()}
                    </Avatar>
                  </Tooltip>
                </ListItemAvatar>
                <ListItemText
                  primary={contributor.username}
                  secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography
                      component="span"
                      variant="body2"
                      color="text.primary"
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        fontWeight: index < 3 ? 'bold' : 'normal'
                      }}
                    >
                      贡献度: {contributor.contribution.toFixed(1)}
                    </Typography>
                        <Typography
                          component="span"
                          variant="body2"
                          color="text.secondary"
                        >
                          ({contributionPercentage}%)
                        </Typography>
                      </Box>
                  }
                />
                  {index < 3 ? (
                    <Tooltip title={index === 0 ? "最高贡献" : index === 1 ? "第二贡献" : "第三贡献"}>
                      <EmojiEvents 
                        sx={{ 
                    color: index === 0 ? 'gold' : 
                           index === 1 ? 'silver' : 
                                 '#cd7f32',
                          fontSize: '1.4rem'
                        }}
                      />
                    </Tooltip>
                  ) : (
                    <Box 
                      sx={{ 
                        width: 40, 
                        display: 'flex',
                        justifyContent: 'center',
                        opacity: 0.5
                      }}
                    >
                      {index + 1}
                  </Box>
                )}
              </ListItem>
                {index < sortedContributors.length - 1 && (
                  <Divider 
                    variant="inset" 
                    component="li" 
                    sx={{
                      '&::before': {
                        width: `${contributionPercentage}%`,
                        height: '2px',
                        backgroundColor: 'primary.main',
                        content: '""',
                        display: 'block',
                        opacity: 0.7
                      }
                    }}
                  />
                )}
            </React.Fragment>
            );
          })}
        </List>
      )}
    </Paper>
  );
};

export default ProjectContributionList; 