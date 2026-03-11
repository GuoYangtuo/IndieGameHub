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
        什么是"对赌众筹"？
      </Typography>
      <Typography variant="body2" sx={{ mb: 2 }}>
        一种创新的众筹模式，简单来说就是开发者给自己设定一个短期开发目标（比如一周或一个月内做完xx）然后众筹，完成目标之后才能拿到筹得捐款，如果开发失败则退还捐款。
      </Typography>
      {/* 流程图 */}
      <Box 
        sx={{ 
          mt: 2,
          textAlign: 'center',
          '& img': {
            maxWidth: '100%',
            height: 'auto',
            borderRadius: 1,
            boxShadow: 1
          }
        }}
      >
        <img 
          src="/src/assets/images/bet-campaign-flowchart.png" 
          alt="对赌众筹流程图" 
        />
      </Box>
      {/* 特点说明 */}
      <Box sx={{ pl: 1, mb: 2 }}>
        <Typography variant="body2" sx={{ mb: 0.5, display: 'flex', alignItems: 'flex-start', pt: 2 }}>
          <Schedule sx={{ mr: 1, fontSize: 20, color: 'warning.light' }} />
          <Box>
            <strong>开发目标：</strong>
          </Box>
        </Typography>
        <Box component="ul" sx={{ pl: 3.5, m: 0, '& li': { mb: 0.5 } }}>
          <Typography component="li" variant="body2">比如一周内想要完成的功能清单，一个月内要做出几个场景，或者完成某某游戏系统的搭建等等</Typography>
          <Typography component="li" variant="body2">开发者给自己设定的任务越艰巨，开发时间越紧张，粉丝的捐赠意愿越高</Typography>
        </Box>

        <Typography variant="body2" sx={{ mb: 0.5, display: 'flex', alignItems: 'flex-start', mt: 1 }}>
          <TrendingUp sx={{ mr: 1, fontSize: 20, color: 'warning.light' }} />
          <Box>
            <strong>对赌众筹的特点：</strong>
          </Box>
        </Typography>
        <Box component="ul" sx={{ pl: 3.5, m: 0, '& li': { mb: 0.5 } }}>
          <Typography component="li" variant="body2">比传统众筹单次资金少，整个开发阶段可能会进行几十次</Typography>
          <Typography component="li" variant="body2">粉丝的捐款更有保障，捐赠意愿更高，同时也能让开发者自我挑战加快开发</Typography>
        </Box>
      </Box>

      <Typography variant="body2" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center' }}>
        <EmojiEvents sx={{ mr: 1, fontSize: 18, color: 'warning.light' }} />
        哪些开发者可能需要？
      </Typography>
      <Box component="ul" sx={{ pl: 3.5, mb: 2, m: 1, '& li': { mb: 0.5 } }}>
        <Typography component="li" variant="body2">开发初期缺钱的</Typography>
        <Typography component="li" variant="body2">希望全职开发独立游戏的（通过几十上百次小的对赌众筹，或者源源不断的支持）</Typography>
        <Typography component="li" variant="body2">进度缓慢，需要监督和动力的</Typography>
        <Typography component="li" variant="body2">害怕一次性众筹的高风险的，或者独狼没有团队的</Typography>
        <Typography component="li" variant="body2">想挑战自己的</Typography>
      </Box>

      <Typography variant="body2" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center' }}>
        <EmojiEvents sx={{ mr: 1, fontSize: 18, color: 'info.dark' }} />
        哪些粉丝可能需要？
      </Typography>
      <Box component="ul" sx={{ pl: 3.5, m: 1, '& li': { mb: 0.5 } }}>
        <Typography component="li" variant="body2">想要投资梦想，但担心捐款打水漂的</Typography>
        <Typography component="li" variant="body2">觉得开发者进度慢，想激励他的</Typography>
        <Typography component="li" variant="body2">看见有人想挑战自己，想看热闹捧个场的</Typography>
      </Box>
    </Paper>
  );
};

export default BetCampaignGuide;
