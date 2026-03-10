import React, { useState } from 'react';
import {
  Typography,
  Box,
  Paper,
  IconButton
} from '@mui/material';
import {
  TrendingUp,
  Schedule,
  EmojiEvents,
  Close
} from '@mui/icons-material';

interface BetCampaignGuideProps {
  /**
   * 是否显示关闭按钮（默认 true）
   */
  showCloseButton?: boolean;
  
  /**
   * 组件样式配置
   */
  sx?: object;
}

const BetCampaignGuide: React.FC<BetCampaignGuideProps> = ({ 
  showCloseButton = true,
  sx 
}) => {
  const [visible, setVisible] = useState(true);

  if (!visible) {
    return null;
  }

  return (
    <Paper 
      sx={{ 
        p: 3, 
        mb: 3, 
        bgcolor: 'info.main', 
        color: 'info.contrastText',
        position: 'relative',
        ...sx
      }}
    >
      {/* 关闭按钮 */}
      {showCloseButton && (
        <IconButton
          onClick={() => setVisible(false)}
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            color: 'info.contrastText',
            '&:hover': {
              bgcolor: 'rgba(255, 255, 255, 0.1)',
            },
          }}
          size="small"
        >
          <Close />
        </IconButton>
      )}

      <Typography variant="h6" gutterBottom>
        <EmojiEvents sx={{ mr: 1, verticalAlign: 'middle' }} />
        什么是"对赌众筹"？
      </Typography>
      <Typography variant="body2" sx={{ mb: 2 }}>
        对赌众筹是一种创新的众筹模式，将众筹分为两个阶段：
      </Typography>
      <Box sx={{ pl: 2 }}>
        <Typography variant="body2" sx={{ mb: 1 }}>
          <TrendingUp sx={{ mr: 1, verticalAlign: 'middle', fontSize: 18 }} />
          <strong>众筹阶段：</strong>在设定的时间内（如3天）筹集目标金额。如果未达成目标，所有捐款将被退还。
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          <Schedule sx={{ mr: 1, verticalAlign: 'middle', fontSize: 18 }} />
          <strong>开发阶段：</strong>众筹成功后，进入开发阶段（如7天）。开发者需要完成预设的目标。
        </Typography>
        <Typography variant="body2">
          <EmojiEvents sx={{ mr: 1, verticalAlign: 'middle', fontSize: 18 }} />
          <strong>挑战结果：</strong>开发完成后，如果达成目标，开发者获得捐款；如果未达成，所有捐款将被退还给捐赠者。
        </Typography>
      </Box>
    </Paper>
  );
};

export default BetCampaignGuide;
