import React, { useState } from 'react';
import {
  Typography,
  Box,
  Button,
  Card,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  IconButton,
  Tooltip,
  Alert,
  Paper,
  ListItem,
  ListItemText,
  Collapse,
  Divider
} from '@mui/material';
import { ExpandMore, ExpandLess, Lock, PlaylistAdd, Add } from '@mui/icons-material';
import ProposalCard from '../../components/ProposalCard';

interface Bounty {
  id: string;
  proposalId: string;
  userId: string;
  amount: number;
  createdAt: string;
  userNickname?: string;
}

interface Proposal {
  id: string;
  title: string;
  description: string;
  createdBy: string;
  creatorNickname?: string;
  projectId: string;
  status: 'open' | 'closed' | 'queued' | 'completed';
  likes: string[];
  bountyTotal?: number;
  bounties?: Bounty[];
  createdAt: string;
  category?: string;
  attachments?: {
    name: string;
    url: string;
    size: number;
  }[];
  queuedAt?: string;
  queuedBy?: string;
  queuedByNickname?: string;
}

interface ProposalCardsPoolProps {
  proposals: Proposal[];
  proposalView: 'cards' | 'list';
  proposalSort: 'random' | 'time' | 'hot';
  selectedCategory: string;
  isMember: boolean;
  isCreator?: boolean;
  user: any | null;
  proposalBounties: {[key: string]: Bounty[]};
  onOpenProposalDialog: () => void;
  onViewModeChange: (mode: 'cards' | 'list') => void;
  onSortChange: (sort: 'random' | 'time' | 'hot') => void;
  onCategoryChange: (category: string) => void;
  onProposalLike: (proposalId: string) => void;
  onProposalClose: (proposalId: string) => void;
  onProposalDelete: (proposalId: string) => void;
  onAddToTaskQueue: (proposalId: string) => void;
  onAddProposalBounty: (proposalId: string, amount: number) => void;
  onOpenProposalDetail: (proposal: Proposal) => void;
}

const ProposalCardsPool: React.FC<ProposalCardsPoolProps> = ({
  proposals,
  proposalView,
  proposalSort,
  selectedCategory,
  isMember,
  isCreator,
  user,
  proposalBounties,
  onOpenProposalDialog,
  onViewModeChange,
  onSortChange,
  onCategoryChange,
  onProposalLike,
  onProposalClose,
  onProposalDelete,
  onAddToTaskQueue,
  onAddProposalBounty,
  onOpenProposalDetail
}) => {
  // 展开/折叠提案的状态
  const [expandedProposals, setExpandedProposals] = useState<{[key: string]: boolean}>({});

  // 切换提案的展开/折叠状态
  const toggleExpand = (proposalId: string) => {
    setExpandedProposals(prev => ({
      ...prev,
      [proposalId]: !prev[proposalId]
    }));
  };

  // 计算提案的总悬赏金额
  const getProposalBountyTotal = (proposalId: string) => {
    if (!proposalBounties[proposalId]) return 0;
    return proposalBounties[proposalId].reduce((sum, bounty) => sum + bounty.amount, 0);
  };

  // 获取所有可用的提案分类
  const getAvailableCategories = (): string[] => {
    const categories = proposals
      .map(proposal => proposal.category)
      .filter((category): category is string => !!category);
    return Array.from(new Set(categories));
  };

  // 处理排序提案列表
  const getSortedProposals = () => {
    const currentSortMode = proposalSort;
    
    // 复制提案数组以避免直接修改原数组
    let sortedProposals = [...proposals];
    
    // 找出用户创建或悬赏的提案
    const userProposals = user 
      ? sortedProposals.filter(p => p.createdBy === user.id) 
      : [];
    
    // 从列表中移除用户的提案
    sortedProposals = sortedProposals.filter(p => !userProposals.includes(p));
    
    // 根据排序方式处理剩余的提案
    if (currentSortMode === 'hot') {
      // 按热度排序：先按赏金总额，再按点赞数
      sortedProposals.sort((a, b) => {
        // 获取赏金总额（如果无法获取则为0）
        const aBounty = getProposalBountyTotal(a.id) || 0;
        const bBounty = getProposalBountyTotal(b.id) || 0;
        
        // 首先按赏金排序
        if (aBounty !== bBounty) {
          return bBounty - aBounty; // 赏金多的排前面
        }
        
        // 如果赏金相同，按点赞数排序
        return b.likes.length - a.likes.length;
      });
    } else if (currentSortMode === 'time') {
      // 按时间排序：后创建的排在前面
      sortedProposals.sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    } else if (currentSortMode === 'random') {
      // 随机排序
      // 创建一个随机排序函数，但使用固定的种子值
      const randomSort = (array: Proposal[]) => {
        // 使用Fisher-Yates洗牌算法，但使用确定性种子
        const seed = proposals.reduce((sum, p) => sum + p.id.charCodeAt(0), 0);
        const rng = (max: number) => {
          const x = Math.sin(seed + array.length) * 10000;
          return Math.floor((x - Math.floor(x)) * max);
        };
        
        const result = [...array];
        for (let i = result.length - 1; i > 0; i--) {
          const j = rng(i + 1);
          [result[i], result[j]] = [result[j], result[i]];
        }
        return result;
      };
      
      sortedProposals = randomSort(sortedProposals);
    }
    
    // 将用户创建或悬赏的提案放在最前面
    return [...userProposals, ...sortedProposals];
  };
  
  // 获取筛选后的提案
  const getFilteredProposals = () => {
    // 先获取排序后的提案
    let filteredProposals = getSortedProposals();
    
    // 如果选择了分类，进行筛选
    if (selectedCategory && isMember) {
      filteredProposals = filteredProposals.filter(
        proposal => proposal.category === selectedCategory
      );
    }
    
    return filteredProposals;
  };

  // 渲染列表视图中的单个提案项
  const renderListItem = (proposal: Proposal, isUserProposal: boolean = false) => {
    const isExpanded = expandedProposals[proposal.id] || false;
    const statusColor = 
      proposal.status === 'open' ? 'success' : 
      proposal.status === 'closed' ? 'default' : 
      proposal.status === 'queued' ? 'info' : 'success';
    
    const statusText = 
      proposal.status === 'open' ? '开放中' : 
      proposal.status === 'closed' ? '已关闭' : 
      proposal.status === 'queued' ? '队列中' : '已完成';
    
    return (
      <React.Fragment key={proposal.id}>
        <ListItem 
          onClick={() => toggleExpand(proposal.id)}
          sx={{ 
            borderLeft: `4px solid ${proposal.category ? getCategoryBorderColor(proposal.category) : '#d0d7de'}`,
            mb: 1,
            borderRadius: 1,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            cursor: 'pointer',
            bgcolor: (theme) => theme.palette.mode === 'dark' 
              ? 'rgba(255, 255, 255, 0.03)' 
              : 'rgba(255, 255, 255, 0.9)',
            '&:hover': {
              bgcolor: (theme) => theme.palette.mode === 'dark' 
                ? 'rgba(255, 255, 255, 0.05)' 
                : 'rgba(255, 255, 255, 1)',
              boxShadow: '0 2px 5px rgba(0,0,0,0.15)'
            }
          }}
        >
          <ListItemText 
            primary={
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Chip 
                  size="small"
                  label={statusText}
                  color={statusColor}
                  sx={{ mr: 2, height: 24 }}
                />
                <Typography 
                  sx={{ 
                    fontWeight: isUserProposal ? 600 : 400,
                    color: isUserProposal ? 'primary.main' : 'text.primary'
                  }}
                >
                  {proposal.title}
                </Typography>
                {(proposal.bountyTotal ?? getProposalBountyTotal(proposal.id)) > 0 && (
                  <Chip 
                    size="small"
                    label={`${proposal.bountyTotal ?? getProposalBountyTotal(proposal.id)} 金币`}
                    color="primary"
                    sx={{ ml: 2, height: 24 }}
                  />
                )}
              </Box>
            }
          />
          
          <Box sx={{ display: 'flex', alignItems: 'center', ml: 'auto', mr: 1 }}>
            {user && isMember && proposal.status === 'open' && (
              <Tooltip title="添加到任务队列">
                <IconButton
                  size="small"
                  color="info"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddToTaskQueue(proposal.id);
                  }}
                  sx={{ mr: 1 }}
                >
                  <PlaylistAdd fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            
            {user && (isMember || isCreator) && proposal.status === 'open' && (
              <Tooltip title="关闭提案">
                <IconButton 
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onProposalClose(proposal.id);
                  }}
                >
                  <Lock fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
          
          {isExpanded ? <ExpandLess /> : <ExpandMore />}
        </ListItem>
        
        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
          <Box sx={{ pl: 4, pr: 2, pb: 2 }}>
            <Typography variant="body2" sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>
              {proposal.description}
            </Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={() => onOpenProposalDetail(proposal)}
            >
              查看详情
            </Button>
          </Box>
        </Collapse>
      </React.Fragment>
    );
  };

  // 获取提案类别对应的边框颜色
  const getCategoryBorderColor = (category: string) => {
    switch (category) {
      case '功能建议':
        return '#0969da'; // 蓝色
      case '数值调整':
        return '#bf8700'; // 橙色
      case 'bug反馈':
        return '#cf222e'; // 红色
      case '艺术性相关':
        return '#8250df'; // 紫色
      default:
        return '#d0d7de'; // 默认灰色
    }
  };

  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">许愿池</Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {user && (
            <Button
              variant="contained"
              color="secondary"
              startIcon={<Add />}
              onClick={onOpenProposalDialog}
              sx={{ mr: 2 }}
            >
              创建提案
            </Button>
          )}
          
          {/* 成员可见的分类筛选 */}
          {isMember && (
            <Box sx={{ mr: 2 }}>
              <FormControl sx={{ minWidth: 120 }}>
                <InputLabel id="category-select-label" size="small">提案分类</InputLabel>
                <Select
                  labelId="category-select-label"
                  id="category-select"
                  value={selectedCategory}
                  label="提案分类"
                  onChange={(e) => onCategoryChange(e.target.value)}
                  size="small"
                >
                  <MenuItem value="">所有分类</MenuItem>
                  {getAvailableCategories().map(category => (
                    <MenuItem key={category} value={category}>{category}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          )}
          
          {/* 排序选项切换按钮 */}
          <Chip
            label={proposalSort === 'random' ? "随机排序" : proposalSort === 'time' ? "时间排序" : "热度排序"}
            onClick={() => {
              if (proposalSort === 'random') onSortChange('time');
              else if (proposalSort === 'time') onSortChange('hot');
              else onSortChange('random');
            }}
            clickable
            color="primary"
            variant="outlined"
            sx={{ mr: 1, height: '30px'  }}
          />
          
          {/* 视图切换按钮 */}
          <Chip
            label={proposalView === 'cards' ? "卡片视图" : "列表视图"}
            onClick={() => onViewModeChange(proposalView === 'cards' ? 'list' : 'cards')}
            clickable
            color="primary"
            variant="outlined"
            sx={{ height: '30px' }}
          />
        </Box>
      </Box>
      
      {proposals.length === 0 ? (
        <Alert severity="info">暂无提案，快来创建第一个提案吧！</Alert>
      ) : proposalView === 'cards' ? (
        <Box>
          {/* 用户创建的提案专区 - 带边框 */}
          {user && proposals.filter(p => p.createdBy === user.id).length > 0 && (
            <Box 
              sx={{ 
                mb: 4, 
                p: 2, 
                bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)',
                borderRadius: 2
              }}
            >
              <Typography variant="h6" sx={{ mb: 2 }}>我创建的提案</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 2 }}>
                {proposals
                  .filter(p => p.createdBy === user.id)
                  .map(proposal => (
                    <ProposalCard
                      key={proposal.id}
                      id={proposal.id}
                      title={proposal.title}
                      description={proposal.description}
                      createdBy={proposal.createdBy}
                      creatorNickname={user && proposal.createdBy === user.id ? '我' : proposal.creatorNickname}
                      status={proposal.status}
                      likes={proposal.likes || []}
                      createdAt={proposal.createdAt}
                      bountyTotal={getProposalBountyTotal(proposal.id)}
                      category={proposal.category}
                      onLike={() => onProposalLike(proposal.id)}
                      onClose={() => onProposalClose(proposal.id)}
                      onDelete={() => onProposalDelete(proposal.id)}
                      onBountyAdd={(amount) => onAddProposalBounty(proposal.id, amount)}
                      onAddToQueue={(e) => {
                        e.stopPropagation();
                        onAddToTaskQueue(proposal.id);
                      }}
                      isCreator={!!(user && proposal.createdBy === user.id)}
                      isMember={!!isMember}
                      viewMode="card"
                      onOpenDetail={() => onOpenProposalDetail(proposal)}
                    />
                  ))
                }
              </Box>
            </Box>
          )}
          
          {/* 所有提案区域 - 许愿池 */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 2 }}>
            {getFilteredProposals()
              .filter(p => !user || p.createdBy !== user.id) // 不再显示用户自己创建的提案
              .map((proposal) => (
                <ProposalCard
                  key={proposal.id}
                  id={proposal.id}
                  title={proposal.title}
                  description={proposal.description}
                  createdBy={proposal.createdBy}
                  creatorNickname={user && proposal.createdBy === user.id ? '我' : proposal.creatorNickname}
                  status={proposal.status}
                  likes={proposal.likes || []}
                  createdAt={proposal.createdAt}
                  bountyTotal={getProposalBountyTotal(proposal.id)}
                  category={proposal.category}
                  onLike={() => onProposalLike(proposal.id)}
                  onClose={() => onProposalClose(proposal.id)}
                  onDelete={() => onProposalDelete(proposal.id)}
                  onBountyAdd={(amount) => onAddProposalBounty(proposal.id, amount)}
                  onAddToQueue={(e) => {
                    e.stopPropagation();
                    onAddToTaskQueue(proposal.id);
                  }}
                  isCreator={!!(user && proposal.createdBy === user.id)}
                  isMember={!!isMember}
                  viewMode="card"
                  onOpenDetail={() => onOpenProposalDetail(proposal)}
                />
              ))
            }
          </Box>
        </Box>
      ) : (
        <Box>
          {/* 列表视图 - 用户创建的提案专区 */}
          {user && proposals.filter(p => p.createdBy === user.id).length > 0 && (
            <Box 
              sx={{ 
                mb: 4, 
                p: 2, 
                bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.01)',
                borderRadius: 2
              }}
            >
              <Typography variant="h6" sx={{ mb: 2 }}>我创建的提案</Typography>
              <List>
                {proposals
                  .filter(p => p.createdBy === user.id)
                  .map(proposal => renderListItem(proposal, true))
                }
              </List>
            </Box>
          )}
          
          {/* 列表视图 - 所有提案 */}
          <List>
            {getFilteredProposals()
              .filter(p => !user || p.createdBy !== user.id)
              .map(proposal => renderListItem(proposal))
            }
          </List>
        </Box>
      )}
    </Box>
  );
};

export default ProposalCardsPool;
