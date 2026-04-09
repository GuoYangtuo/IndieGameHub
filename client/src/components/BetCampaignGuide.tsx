import React, { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  Paper,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  TrendingUp,
  Schedule,
  EmojiEvents,
  Close,
  VisibilityOff,
  Close as CloseIcon,
  CheckCircle
} from '@mui/icons-material';

const STORAGE_KEY = 'bet_campaign_guide_hidden';

interface BetCampaignGuideProps {
  /**
   * 是否显示关闭按钮（默认 true）
   */
  showCloseButton?: boolean;
  
  /**
   * 组件样式配置
   */
  sx?: object;

  /**
   * 触发重新检查 localStorage（使用数字递增）
   */
  forceShow?: number;

  /**
   * 当用户选择"不再显示"时的回调
   */
  onNeverShow?: () => void;
}

const BetCampaignGuide: React.FC<BetCampaignGuideProps> = ({ 
  showCloseButton = true,
  sx,
  forceShow = 0,
  onNeverShow
}) => {
  const [visible, setVisible] = useState(true);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  // 检查 localStorage 状态
  useEffect(() => {
    const isHidden = localStorage.getItem(STORAGE_KEY) === 'true';
    if (isHidden && !forceShow) {
      setVisible(false);
    } else {
      setVisible(true);
    }
  }, [forceShow]);

  if (!visible) {
    return null;
  }

  // 处理关闭按钮点击
  const handleCloseClick = (event: React.MouseEvent<HTMLElement>) => {
    if (showCloseButton) {
      setMenuAnchor(event.currentTarget);
    }
  };

  // 仅关闭一次
  const handleCloseOnce = () => {
    setVisible(false);
    setMenuAnchor(null);
  };

  // 不再显示
  const handleNeverShow = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setVisible(false);
    setMenuAnchor(null);
    if (onNeverShow) {
      onNeverShow();
    }
  };

  return (
    <Paper 
      sx={{ 
        p: 3, 
        mb: 3, 
        bgcolor: '#58a6ff', 
        color: 'black',
        position: 'relative',
        ...sx
      }}
    >
      {/* 关闭按钮 */}
      {showCloseButton && (
        <IconButton
          onClick={handleCloseClick}
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

      {/* 关闭选项菜单 */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={handleCloseOnce}>
          <ListItemIcon>
            <CloseIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>仅关闭一次</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleNeverShow}>
          <ListItemIcon>
            <VisibilityOff fontSize="small" />
          </ListItemIcon>
          <ListItemText>不再显示</ListItemText>
        </MenuItem>
      </Menu>

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
          src="/images/bet-campaign-flowchart.png" 
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
        <Typography component="li" variant="body2">开发初期缺钱，或者希望全职开发独立游戏的（通过连续的对赌众筹，获得源源不断的支持）</Typography>
        <Typography component="li" variant="body2">进度缓慢，需要监督和动力的；想挑战自己，进行快速限时开发的</Typography>
        <Typography component="li" variant="body2">害怕一次性创业式众筹的高风险的，或者独狼没有团队的</Typography>
      </Box>

      <Typography variant="body2" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center' }}>
        <EmojiEvents sx={{ mr: 1, fontSize: 18, color: 'info.dark' }} />
        哪些粉丝可能需要？
      </Typography>
      <Box component="ul" sx={{ pl: 3.5, m: 1, '& li': { mb: 0.5 } }}>
        <Typography component="li" variant="body2">想要支持梦想，但担心捐款打水漂的</Typography>
        <Typography component="li" variant="body2">觉得开发者进度慢，想激励他的</Typography>
        <Typography component="li" variant="body2">看见有人想挑战自己，想看热闹捧个场的</Typography>
      </Box>

      <Typography variant="body2" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center' }}>
        <CheckCircle sx={{ mr: 1, fontSize: 18, color: 'info.dark' }} />
        审核机制是怎样的？
      </Typography>
      <Box component="ul" sx={{ pl: 3.5, m: 1, '& li': { mb: 0.5 } }}>
        <Typography component="li" variant="body2">开发阶段结束后，开发者会提交最新版Demo，截图等成果，粉丝有三天时间审核</Typography>
        <Typography component="li" variant="body2">只有捐款者可参与审核，判断开发者的开发成果是否满意（即使没有达到预定目标），决定是否兑现自己的那笔捐款</Typography>
        <Typography component="li" variant="body2">三天内没有进行的审核，则默认为通过</Typography>
      </Box>
    </Paper>
  );
};

export default BetCampaignGuide;
