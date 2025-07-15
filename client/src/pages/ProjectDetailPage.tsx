import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Button,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Card,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Paper,
  List,
  ListItem,
  ListItemText,
  Avatar,
  ListItemAvatar,
  Stack,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ListItemButton,
  Collapse,
  IconButton,
  Chip,
  FormHelperText,
  GlobalStyles
} from '@mui/material';
import { ExpandMore, ExpandLess, Add, Lock, LockOpen, Delete, Send, Download, DownloadDone, Close, MonetizationOn, UndoRounded, ThumbUp, CalendarToday, CalendarMonth, PlaylistAdd, Visibility } from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import MDEditor from '@uiw/react-md-editor';
import DebouncedInput from '../components/DebouncedInput';
import DebouncedMDEditor from '../components/DebouncedMDEditor';
import { projectAPI, proposalAPI, commentAPI, userAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useProjectTitle } from '../contexts/ProjectTitleContext';
import ProposalCard from '../components/ProposalCard';
import { formatRelativeTime } from '../utils/dateUtils';
import CalendarHeatmap from 'react-calendar-heatmap';
import ReactTooltip from 'react-tooltip';
import '../styles/calendar-heatmap.css';
import RechargeDialog from '../components/RechargeDialog';
import NewProposalDialog from './ProjectDetailPageComponents/newProposal';
import ProposalDetailDialog from './ProjectDetailPageComponents/ProposalDetailDialog';
import ProjectInfoDialog from './ProjectDetailPageComponents/ProjectInfoDialog';
import ProposalCardsPool from './ProjectDetailPageComponents/ProposalCardsPool';
import ProjectComments from './ProjectDetailPageComponents/ProjectComments';
import ProjectUpdateForm from './ProjectDetailPageComponents/ProjectUpdateForm';
import RecentUpdatesSection from './ProjectDetailPageComponents/RecentUpdatesSection';
import ProjectSidebar, { ProjectSidebarTop, ProjectSidebarBottom } from './ProjectDetailPageComponents/ProjectSidebar';

interface ProjectUpdate {
  id: string;
  content: string;
  demoLink?: string;
  createdAt: string;
  createdBy?: string;
  isVersion?: boolean;
  versionName?: string;
  imageUrl?: string;
}

interface ProjectImage {
  id: string;
  url: string;
  order: number;
}

interface Project {
  id: string;
  name: string;
  slug: string;
  description: string;
  demoLink?: string;
  createdBy: string;
  members: string[];
  updates: ProjectUpdate[];
  createdAt: string;
  proposals?: Proposal[];
  comments?: Comment[];
  displayImages?: ProjectImage[];
  projectBalance: number; // 项目账户存款额，确保初始化为0
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

interface Bounty {
  id: string;
  proposalId: string;
  userId: string;
  amount: number;
  createdAt: string;
  userNickname?: string;
}

interface Comment {
  id: string;
  proposalId: string;
  userId: string;
  userNickname: string;
  content: string;
  createdAt: string;
  userAvatarUrl?: string;
}

interface Member {
  id: string;
  username: string;
  avatarUrl?: string;
}

const ProjectDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, updateUserCoins } = useAuth();
  const { setProjectTitle, setProjectSlug, setDemoLink } = useProjectTitle();
  const { isDarkMode } = useTheme();
  
  // 添加针对高对比度模式的全局样式修复
  const globalStyles = (
    <GlobalStyles
      styles={{
        '@media (forced-colors: active)': {
          '*': {
            // 替换-ms-high-contrast样式
            borderColor: 'CanvasText',
            color: 'CanvasText',
            backgroundColor: 'Canvas'
          }
        }
      }}
    />
  );
  
  // 避免重复加载的标记 - 移到组件顶层
  const isLoadingRef = useRef(false);
  
  const [project, setProject] = useState<Project | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  
  // 提案状态
  const [openProposalDialog, setOpenProposalDialog] = useState(false);
  const [proposalTitle, setProposalTitle] = useState('');
  const [proposalDescription, setProposalDescription] = useState('');
  const [proposalCategory, setProposalCategory] = useState('功能建议');
  const [creatingProposal, setCreatingProposal] = useState(false);
  
  // 提案视图
  const [proposalView, setProposalView] = useState<'cards' | 'list'>(() => {
    const savedView = localStorage.getItem('proposalViewMode');
    return savedView === 'list' ? 'list' : 'cards';
  });
  const [proposalSort, setProposalSort] = useState<'random' | 'time' | 'hot'>('random');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  
  // 提案详情对话框
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [proposalBounties, setProposalBounties] = useState<{[key: string]: Bounty[]}>({});
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [bountyAmount, setBountyAmount] = useState<number>(1);
  const [bountyDeadline, setBountyDeadline] = useState<string>('');
  const [bountyDialogOpen, setBountyDialogOpen] = useState(false);
  const [addingBounty, setAddingBounty] = useState(false);
  const [bountyError, setBountyError] = useState<string | null>(null);
  
  // 评论状态
  const [comments, setComments] = useState<Comment[]>([]);
  const [proposalComments, setProposalComments] = useState<{[key: string]: Comment[]}>({});
  const [proposalCommentContent, setProposalCommentContent] = useState<{[key: string]: string}>({});
  const [addingProposalComment, setAddingProposalComment] = useState<{[key: string]: boolean}>({});

  // 添加项目评论相关状态
  const [projectComments, setProjectComments] = useState<Comment[]>([]);
  const [projectCommentContent, setProjectCommentContent] = useState('');
  const [addingProjectComment, setAddingProjectComment] = useState(false);
  const [projectCommentError, setProjectCommentError] = useState<string | null>(null);
  const [updateFormError, setUpdateFormError] = useState<string | null>(null);

  // 添加提案附件状态
  const [proposalAttachments, setProposalAttachments] = useState<File[]>([]);
  const [proposalAttachmentPreviews, setProposalAttachmentPreviews] = useState<string[]>([]);
  
  // 充值对话框状态
  const [rechargeDialogOpen, setRechargeDialogOpen] = useState(false);

  // 添加关注状态
  const [isFavorite, setIsFavorite] = useState(false);

  // 添加编辑提案状态
  const [isEditingProposal, setIsEditingProposal] = useState(false);
  const [editProposalTitle, setEditProposalTitle] = useState('');
  const [editProposalDescription, setEditProposalDescription] = useState('');

  // 添加自动保存引用
  const autoSaveTimeout = useRef<NodeJS.Timeout | null>(null);
  
  // 检查用户是否为项目成员
  const isMember = project && user ? project.members.includes(user.id) || project.createdBy === user.id : false;
  
  // 检查用户是否为项目创建者
  const isCreator = project && user ? project.createdBy === user.id : false;

  // 项目信息对话框状态
  const [showInfoDialog, setShowInfoDialog] = useState(false);

  // 项目资金管理相关状态
  const [withdrawAmount, setWithdrawAmount] = useState<number>(0);
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loadingWithdrawals, setLoadingWithdrawals] = useState(false);
  const [expandWithdrawals, setExpandWithdrawals] = useState(false);

  // 项目贡献度列表相关状态
  const [contributors, setContributors] = useState<{ id: string; username: string; avatarUrl?: string; contribution: number }[]>([]);
  const [loadingContributors, setLoadingContributors] = useState(false);

  // 设置项目标题到导航栏，确保使用slug而不是title
  useEffect(() => {
    // 清理函数，离开页面时清除项目标题和Demo链接
    return () => {
      setProjectTitle(null);
      setProjectSlug(null);
      setDemoLink(null);
    };
  }, [setProjectTitle, setProjectSlug, setDemoLink]);

  // 获取项目和提案数据
  useEffect(() => {
    const fetchData = async () => {
      if (!slug) return;
      
      // 避免重复请求
      if (isLoadingRef.current) return;
      isLoadingRef.current = true;
      
      try {
        setLoading(true);
        setError(null);
        
        // 使用整合API一次性获取项目详情页所有数据
        const response = await projectAPI.getProjectDetailComplete(slug);
        const data = response.data;
        
        // 设置项目数据
        setProject(data.project);
        
        // 设置项目标题和slug到导航栏
        setProjectTitle(data.project.name);
        setProjectSlug(data.project.slug);
        
        // 设置Demo链接
        const updates = Array.isArray(data.project.updates) ? data.project.updates : [];
        const latestVersionUpdate = updates.find((update: ProjectUpdate) => update.isVersion);
        
        if (latestVersionUpdate && latestVersionUpdate.demoLink) {
          setDemoLink(latestVersionUpdate.demoLink);
        } else if (data.project.demoLink) {
          setDemoLink(data.project.demoLink);
        } else {
          setDemoLink(null);
        }
        
        // 设置提案数据
        const proposalsData = data.project.proposals || [];
        setProposals(proposalsData);
        
        // 根据用户是否是成员设置默认排序方式
        const isMemberCheck = user && data.project.members ? 
          data.project.members.includes(user.id) : false;
        
        // 成员默认按热度排序，非成员默认随机排序
        setProposalSort(isMemberCheck ? 'hot' : 'random');
        
        // 初始化评论对象和悬赏对象
        const proposalCommentsObj: {[key: string]: Comment[]} = {};
        const proposalCommentContentObj: {[key: string]: string} = {};
        const addingProposalCommentObj: {[key: string]: boolean} = {};
        const proposalBountiesObj: {[key: string]: Bounty[]} = {};
        
        // 使用提案中已有的评论和悬赏数据，避免额外的API调用
        if (Array.isArray(proposalsData) && proposalsData.length > 0) {
          for (const proposal of proposalsData) {
            // 使用提案中已有的评论
            proposalCommentsObj[proposal.id] = proposal.comments || [];
            proposalCommentContentObj[proposal.id] = '';
            addingProposalCommentObj[proposal.id] = false;
            
            // 使用提案中已有的悬赏
            proposalBountiesObj[proposal.id] = proposal.bounties || [];
          }
        }
        
        setProposalComments(proposalCommentsObj);
        setProposalCommentContent(proposalCommentContentObj);
        setAddingProposalComment(addingProposalCommentObj);
        setProposalBounties(proposalBountiesObj);
        
        // 设置项目成员信息
        setMembers(data.members || []);
        console.log('data.project.comments', data.project.comments);
        // 设置项目评论
        setProjectComments(data.project.comments || []);
        
        // 如果已登录，设置项目收藏状态
        if (user) {
          setIsFavorite(data.isFavorite || false);
        }
        
        // 如果有提款记录，设置提款记录
        if (data.withdrawals) {
          setWithdrawals(data.withdrawals);
        }
        
        // 如果有贡献度数据，设置贡献者列表
        if (data.contributors) {
          setContributors(data.contributors);
        } else {
          // 如果没有贡献度数据，尝试获取项目贡献度列表
          fetchProjectContributors(data.project.id);
        }
        
      } catch (err) {
        console.error('获取项目详情失败:', err);
        setError('获取项目详情失败，请稍后再试');
      } finally {
        setLoading(false);
        isLoadingRef.current = false;
      }
    };

    fetchData();
  }, [slug, setProjectTitle, setProjectSlug, setDemoLink]);

  // 单独处理与用户相关的逻辑
  useEffect(() => {
    // 如果用户状态变更，但不需要重新加载整个项目数据
    // 这里可以放置只与用户相关的逻辑，如检查收藏状态等
  }, [user?.id]);

  // 处理提案点赞
  const handleProposalLike = async (proposalId: string) => {
    try {
      // 找到当前提案
      const proposal = proposals.find(p => p.id === proposalId);
      if (!proposal || !user) return;
      
      // 检查用户是否已点赞
      const isLiked = proposal.likes.includes(user.id);
      
      // 立即更新UI，但不改变数组顺序，只修改当前提案的likes
      const updatedProposals = proposals.map(p => {
        if (p.id === proposalId) {
          // 如果已点赞，则移除；否则添加
          const newLikes = isLiked
            ? p.likes.filter(id => id !== user.id)
            : [...p.likes, user.id];
          
          return { ...p, likes: newLikes };
        }
        return p;
      });
      
      setProposals(updatedProposals);
      
      // 如果当前选中的提案是被点赞的提案，也更新选中的提案
      if (selectedProposal && selectedProposal.id === proposalId) {
        const updatedLikes = isLiked
          ? selectedProposal.likes.filter(id => id !== user.id)
          : [...selectedProposal.likes, user.id];
        
        setSelectedProposal({
          ...selectedProposal,
          likes: updatedLikes
        });
      }
      
      // 发送请求到后端，指定明确的操作（添加或移除），而不是切换
      if (isLiked) {
        await proposalAPI.unlikeProposal(proposalId);
      } else {
        await proposalAPI.likeProposal(proposalId);
      }
    } catch (err) {
      console.error('点赞/取消点赞提案失败:', err);
      // 发生错误时，恢复之前的状态
      if (user) {
        const originalProposal = proposals.find(p => p.id === proposalId);
        if (originalProposal) {
          // 查询最新状态，确保显示正确
          try {
            const response = await proposalAPI.getProposalById(proposalId);
            const updatedProposal = response.data;
            
            // 更新提案列表中的提案
            setProposals(
              proposals.map(p => p.id === proposalId ? updatedProposal : p)
            );
            
            // 如果当前选中的提案是被点赞的提案，也更新选中的提案
            if (selectedProposal && selectedProposal.id === proposalId) {
              setSelectedProposal(updatedProposal);
            }
          } catch (fetchErr) {
            console.error('获取提案最新状态失败:', fetchErr);
          }
        }
      }
    }
  };
  
  // 处理提案关闭
  const handleProposalClose = async (proposalId: string) => {
    try {
      const response = await proposalAPI.closeProposal(proposalId);
      setProposals(
        proposals.map(proposal => 
          proposal.id === proposalId ? response.data : proposal
        )
      );
      
      // 如果当前选中的提案是被关闭的提案，也更新选中的提案
      if (selectedProposal && selectedProposal.id === proposalId) {
        setSelectedProposal(response.data);
      }
    } catch (err) {
      console.error('关闭提案失败:', err);
    }
  };
  
  // 处理提案删除
  const handleProposalDelete = async (proposalId: string) => {
    if (!window.confirm('确定要删除此提案吗？此操作不可恢复。')) return;
    
    try {
      await proposalAPI.deleteProposal(proposalId);
      setProposals(proposals.filter(proposal => proposal.id !== proposalId));
      
      // 如果当前选中的提案是被删除的提案，关闭详情对话框
      if (selectedProposal && selectedProposal.id === proposalId) {
        setDetailDialogOpen(false);
        setSelectedProposal(null);
      }
    } catch (err) {
      console.error('删除提案失败:', err);
    }
  };
  
  // 处理提案详情对话框打开
  const handleOpenProposalDetail = (proposal: Proposal) => {
    // 添加评论到提案对象
    const proposalWithComments = {
      ...proposal,
      comments: proposalComments[proposal.id] || [],
      bounties: proposalBounties[proposal.id] || []
    };
    
    setSelectedProposal(proposalWithComments);
    
    // 设置默认编辑状态，对创建者直接显示编辑模式
    const isCreator = !!(user && proposal.createdBy === user.id);
    setIsEditingProposal(isCreator);
    
    setEditProposalTitle(proposal.title);
    setEditProposalDescription(proposal.description);
    setDetailDialogOpen(true);
    
    // 如果用户没有点赞过，自动点赞
    if (user && !proposal.likes.includes(user.id)) {
      handleProposalLike(proposal.id);
    }
  };

  // 添加项目评论的处理函数
  const handleAddProjectComment = async () => {
    if (!project || !user || !projectCommentContent.trim()) return;
    
    try {
      setAddingProjectComment(true);
      setProjectCommentError(null);
      
      const response = await commentAPI.createProjectComment(project.id, projectCommentContent);
      console.log('response', response);
      setProjectComments([...projectComments, response.data]);
      // 提交后立即清空评论内容（这里注释掉原来的代码，转移到finally中）
      // setProjectCommentContent(''); // 清空评论输入框
    } catch (err: any) {
      console.error('添加项目评论失败:', err);
      setProjectCommentError(err.response?.data?.message || '添加评论失败，请稍后再试');
    } finally {
      setAddingProjectComment(false);
      // 无论成功或失败，都清空评论内容
      setProjectCommentContent('');
    }
  };

  // 删除项目评论的处理函数
  const handleDeleteProjectComment = async (commentId: string) => {
    if (!user) return;
    
    try {
      await commentAPI.deleteComment(commentId);
      setProjectComments(projectComments.filter(comment => comment.id !== commentId));
    } catch (err: any) {
      console.error('删除评论失败:', err);
    }
  };

  // 添加新的函数处理从任务队列移除
  const handleRemoveFromTaskQueue = async (proposalId: string) => {
    try {
      // 调用API将提案从任务队列中移除（状态从queued改回open）
      await proposalAPI.removeFromTaskQueue(proposalId);
      
      // 更新提案列表
      setProposals(
        proposals.map(proposal => 
          proposal.id === proposalId ? { ...proposal, status: 'open' } : proposal
        )
      );
      
      // 如果当前选中的提案是被移出队列的提案，也更新选中的提案
      if (selectedProposal && selectedProposal.id === proposalId) {
        setSelectedProposal({ ...selectedProposal, status: 'open' });
      }
    } catch (err) {
      console.error('从任务队列移除提案失败:', err);
    }
  };

  // 完成提案
  const handleCompleteTask = async (proposal: Proposal) => {
    try {
      const response = await proposalAPI.completeTask(proposal.id);
      
      // 更新提案列表
      setProposals(
        proposals.map(p => p.id === proposal.id ? { ...p, status: 'completed' } : p)
      );
      
      // 如果当前选中的提案是被完成的提案，也更新选中的提案
      if (selectedProposal && selectedProposal.id === proposal.id) {
        setSelectedProposal({ ...selectedProposal, status: 'completed' });
      }
      
      // 刷新项目信息
      const updatedProject = await projectAPI.getProjectBySlug(slug || '');
      setProject(updatedProject.data);
    } catch (err) {
      console.error('完成提案失败:', err);
    }
  };

  // 添加任务队列项组件
  const TaskQueueItem = ({ proposal, onRemove, onOpenDetail, bountyTotal }: {
    proposal: Proposal;
    onRemove: (id: string) => void;
    onOpenDetail: (proposal: Proposal) => void;
    bountyTotal: number;
  }) => {
    const [expanded, setExpanded] = useState(false);
    
    return (
      <React.Fragment key={proposal.id}>
        <ListItemButton 
          divider
          onClick={() => setExpanded(!expanded)}
        >
          {bountyTotal > 0 && (
            <Chip 
              icon={<MonetizationOn fontSize="small" />}
              label={`${bountyTotal}`}
              color="primary"
              size="small"
              sx={{ mr: 2 }}
            />
          )}
          <ListItemText 
            primary={
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography variant="body1" sx={{ mr: 1 }}>{proposal.title}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {proposal.queuedByNickname ? `· 由 ${proposal.queuedByNickname} 添加` : ''}
                  {proposal.queuedAt ? ` · ${formatRelativeTime(proposal.queuedAt)}` : ''}
                </Typography>
              </Box>
            }
          />
          <Tooltip title="移出队列">
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(proposal.id);
              }}
              sx={{ mr: 1 }}
            >
              <UndoRounded fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="标记为已完成">
            <IconButton
              size="small"
              color="success"
              onClick={(e) => {
                e.stopPropagation();
                handleCompleteTask(proposal);
              }}
            >
              <DownloadDone fontSize="small" />
            </IconButton>
          </Tooltip>
          {expanded ? <ExpandLess /> : <ExpandMore />}
        </ListItemButton>
        
        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <Box sx={{ px: 2, py: 1, bgcolor: 'background.paper' }}>
            <Typography variant="body2" sx={{ mb: 2 }}>
              {proposal.description.length > 200 
                ? proposal.description.substring(0, 200) + '...' 
                : proposal.description
              }
            </Typography>
            
            {/* 显示提案评论 */}
            {proposalComments[proposal.id] && proposalComments[proposal.id].length > 0 && (
              <Box sx={{ mt: 2, mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>评论</Typography>
                <List dense>
                  {proposalComments[proposal.id].map((comment) => (
                    <ListItem key={comment.id} divider>
                      <ListItemAvatar>
                        <Avatar src={comment.userAvatarUrl}>
                          {comment.userNickname && comment.userNickname.charAt(0).toUpperCase()}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="subtitle2">{comment.userNickname || '未知用户'}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatRelativeTime(comment.createdAt)}
                            </Typography>
                          </Box>
                        }
                        secondary={comment.content}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
          </Box>
        </Collapse>
      </React.Fragment>
    );
  };

  // 处理设置封面图片
  const handleSetCoverImage = async (update: ProjectUpdate) => {
    if (!project || !update || !update.imageUrl) return;
    
    try {
      // 调用API设置封面图片
      await projectAPI.setCoverImage(project.id, update.id);
      
      // 更新本地项目数据，将所有其他更新的isVersion设为false，当前更新设为true
      const updatedUpdates = project.updates.map((u: ProjectUpdate) => {
        if (u.id === update.id) {
          return { ...u, isVersion: true };
        } else if (u.isVersion) {
          return { ...u, isVersion: false };
        }
        return u;
      });
      
      // 更新项目数据
      setProject({
        ...project,
        updates: updatedUpdates
      });
      
      // 如果更新包含demoLink，更新导航栏的demoLink
      if (update.demoLink) {
        setDemoLink(update.demoLink);
      }
    } catch (error) {
      console.error('设置封面图片失败:', error);
      alert('设置封面失败，请稍后再试');
    }
  };

  // 更新视图模式并保存到localStorage
  const handleViewModeChange = (mode: 'cards' | 'list') => {
    setProposalView(mode);
    localStorage.setItem('proposalViewMode', mode);
  };

  // 计算提案的总悬赏金额
  const getProposalBountyTotal = (proposalId: string) => {
    if (!proposalBounties[proposalId]) return 0;
    return proposalBounties[proposalId].reduce((sum, bounty) => sum + bounty.amount, 0);
  };
  
  // 处理列表视图添加悬赏
  const handleAddProposalBounty = async (proposalId: string, amount: number, deadline?: string) => {
    if (!user || amount <= 0) return;
    
    try {
      const response = await proposalAPI.createBounty(proposalId, amount, deadline);
      
      // 更新提案列表中对应提案的悬赏
      if (response.data.proposal) {
        setProposals(
          proposals.map(p => p.id === proposalId ? response.data.proposal : p)
        );
        
        // 更新悬赏列表状态
        const newBounties = { ...proposalBounties };
        newBounties[proposalId] = response.data.proposal.bounties || [];
        setProposalBounties(newBounties);
      } else {
        // 兼容旧版API，只返回新增的悬赏
        const newBounties = { ...proposalBounties };
        if (!newBounties[proposalId]) {
          newBounties[proposalId] = [];
        }
        newBounties[proposalId] = [...newBounties[proposalId], response.data.bounty];
        setProposalBounties(newBounties);
      }
      
      // 更新用户金币
      if (response.data.userCoins) {
        updateUserCoins(response.data.userCoins);
      }
      
      // 重置表单
      setBountyAmount(1);
      setBountyDeadline('');
    } catch (err: any) {
      console.error('添加悬赏失败:', err);
    }
  };
  
  // 添加提案到任务队列的处理函数
  const handleAddToTaskQueue = async (proposalId: string) => {
    try {
      await proposalAPI.addToTaskQueue(proposalId);
      
      // 使用整合API刷新数据
      const response = await projectAPI.getProjectDetailComplete(slug || '');
      
      // 更新项目和提案数据
      setProject(response.data.project);
      setProposals(response.data.project.proposals || []);
      
      // 更新提案评论和悬赏数据
      const proposalCommentsObj: {[key: string]: Comment[]} = {};
      const proposalCommentContentObj: {[key: string]: string} = {};
      const addingProposalCommentObj: {[key: string]: boolean} = {};
      const proposalBountiesObj: {[key: string]: Bounty[]} = {};
      
      const updatedProposals = response.data.project.proposals || [];
      if (Array.isArray(updatedProposals) && updatedProposals.length > 0) {
        for (const proposal of updatedProposals) {
          proposalCommentsObj[proposal.id] = proposal.comments || [];
          proposalCommentContentObj[proposal.id] = '';
          addingProposalCommentObj[proposal.id] = false;
          proposalBountiesObj[proposal.id] = proposal.bounties || [];
        }
      }
      
      setProposalComments(proposalCommentsObj);
      setProposalCommentContent(proposalCommentContentObj);
      setAddingProposalComment(addingProposalCommentObj);
      setProposalBounties(proposalBountiesObj);
      
      // 更新选中的提案（如果存在）
      if (selectedProposal && selectedProposal.id === proposalId) {
        const updatedProposal = updatedProposals.find((p: Proposal) => p.id === proposalId);
        if (updatedProposal) {
          setSelectedProposal(updatedProposal);
        }
      }
    } catch (err) {
      console.error('添加提案到任务队列失败:', err);
    }
  };

  // 检查URL参数是否需要显示项目信息对话框
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const showInfo = searchParams.get('showInfo');
    if (showInfo === 'true' && project) {
      setShowInfoDialog(true);
    }
  }, [location.search, project]);

  // 处理提款
  const handleWithdraw = async () => {
    if (!project || withdrawAmount <= 0) return;
    
    try {
      setWithdrawLoading(true);
      setWithdrawError(null);
      
      await projectAPI.withdrawFromProject(project.id, withdrawAmount);
      
      // 提款成功后刷新项目数据和提款记录
      const updatedProject = await projectAPI.getProjectBySlug(slug || '');
      setProject(updatedProject.data);
      
      // 不再需要单独获取提款记录了，使用整合API
      // fetchWithdrawals();
      
      // 刷新整合API数据
      const response = await projectAPI.getProjectDetailComplete(slug || '');
      if (response.data.withdrawals) {
        setWithdrawals(response.data.withdrawals);
      }
      
      // 清空提款金额
      setWithdrawAmount(0);
    } catch (err: any) {
      console.error('提款失败:', err);
      setWithdrawError(err.response?.data?.message || '提款失败，请稍后再试');
    } finally {
      setWithdrawLoading(false);
    }
  };
  
  // 格式化用户名
  const formatUsername = (userId: string) => {
    const member = members.find(m => m.id === userId);
    return member ? member.username : '未知用户';
  };
  
  // 获取项目贡献者列表
  const fetchProjectContributors = async (projectId: string) => {
    try {
      setLoadingContributors(true);
      // 创建新的API调用获取项目的贡献者列表
      const response = await fetch(`/api/projects/${projectId}/contributors`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('获取项目贡献者列表失败');
      }
      
      const data = await response.json();
      setContributors(data || []);
    } catch (error) {
      console.error('获取项目贡献者列表失败:', error);
      setContributors([]);
    } finally {
      setLoadingContributors(false);
    }
  };

  // 处理新创建的提案
  const handleProposalCreated = (newProposal: Proposal) => {
    // 将新创建的提案添加到提案列表的开头
    setProposals([newProposal, ...proposals]);
  };
  
  // 渲染组件
  return (
    <Box sx={{ pb: 8 }}>
      {globalStyles}
      
      <Container maxWidth="xl" sx={{ mt: 1, px: { xs: 1, md: 0.5 } }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>
        ) : project ? (
          // 项目详情内容
          <Box>
            {/* 在小屏幕上显示上半部分侧边栏组件 */}
            <Box sx={{ display: { xs: 'block', md: 'none' }, mb: 3 }}>
              <ProjectSidebarTop
                project={project}
                onOpenInfoDialog={() => setShowInfoDialog(true)}
              />
            </Box>
            
            {/* 主内容区 - 左右两栏布局 */}
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
              {/* 主内容区 - 左侧 75% */}
              <Box sx={{ flex: { xs: '1', md: '0.75' } }}>
                {/* 项目成员的更新表单 */}
                {isMember && project && (
                  <ProjectUpdateForm
                    projectId={project.id}
                    projectSlug={slug || ''}
                    user={user}
                    isDarkMode={isDarkMode}
                    onUpdateAdded={setProject}
                    onDemoLinkUpdate={setDemoLink}
                    onError={setUpdateFormError}
                  />
                )}
                
                {/* 在项目成员的更新表单下方添加任务队列区域 */}
                {isMember && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" gutterBottom>任务队列</Typography>
                    
                    {proposals.filter(p => p.status === 'queued').length === 0 ? (
                      <Alert severity="info" sx={{ mb: 2 }}>任务队列为空</Alert>
                    ) : (
                      <Paper variant="outlined" sx={{ p: 0 }}>
                        <List component="nav" disablePadding>
                          {proposals
                            .filter(p => p.status === 'queued')
                            .map(proposal => (
                              <TaskQueueItem
                                key={proposal.id}
                                proposal={proposal}
                                onRemove={handleRemoveFromTaskQueue}
                                onOpenDetail={handleOpenProposalDetail}
                                bountyTotal={getProposalBountyTotal(proposal.id)}
                                />
                            ))
                          }
                        </List>
                      </Paper>
                    )}
                  </Box>
                )}
                
                {/* 最近更新区域 */}
                <RecentUpdatesSection 
                  project={project}
                  isMember={isMember}
                  onSetCoverImage={handleSetCoverImage}
                />
                
                {/* 提案列表 */}
                <ProposalCardsPool
                  proposals={Array.isArray(proposals) ? proposals : []}
                  proposalView={proposalView}
                  proposalSort={proposalSort}
                  selectedCategory={selectedCategory}
                  isMember={isMember}
                  isCreator={isCreator}
                  user={user}
                  proposalBounties={proposalBounties}
                  onOpenProposalDialog={() => setOpenProposalDialog(true)}
                  onViewModeChange={handleViewModeChange}
                  onSortChange={setProposalSort}
                  onCategoryChange={(category) => setSelectedCategory(category)}
                  onProposalLike={handleProposalLike}
                  onProposalClose={handleProposalClose}
                  onProposalDelete={handleProposalDelete}
                  onAddToTaskQueue={handleAddToTaskQueue}
                  onAddProposalBounty={handleAddProposalBounty}
                  onOpenProposalDetail={handleOpenProposalDetail}
                />

                {/* 添加非成员用户也可见的任务队列区域，放在提案列表之后 */}
                {!isMember && Array.isArray(proposals) && proposals.filter(p => p.status === 'queued').length > 0 && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" gutterBottom>当前任务队列</Typography>
                    <Paper variant="outlined" sx={{ p: 0 }}>
                      <List component="nav" disablePadding>
                        {proposals
                          .filter(p => p.status === 'queued')
                          .map(proposal => (
                            <ListItem 
                              key={proposal.id} 
                              divider
                              sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.04)' } }}
                              onClick={() => handleOpenProposalDetail(proposal)}
                            >
                              <ListItemText 
                                primary={
                                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <Typography variant="body1" sx={{ mr: 1 }}>{proposal.title}</Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {proposal.queuedByNickname ? `· 由 ${proposal.queuedByNickname} 添加` : ''}
                                      {proposal.queuedAt ? ` · ${formatRelativeTime(proposal.queuedAt)}` : ''}
                                    </Typography>
                                  </Box>
                                }
                                secondary={
                                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    {getProposalBountyTotal(proposal.id) > 0 && (
                                      <Chip 
                                        icon={<MonetizationOn fontSize="small" />}
                                        label={`${getProposalBountyTotal(proposal.id)}`}
                                        color="primary"
                                        size="small"
                                        sx={{ mr: 1 }}
                                      />
                                    )}
                                  </Box>
                                }
                              />
                            </ListItem>
                          ))
                        }
                      </List>
                    </Paper>
                  </Box>
                )}

                {/* 项目评论区域 */}
                <ProjectComments
                  comments={projectComments}
                  user={user}
                  commentContent={projectCommentContent}
                  isAddingComment={addingProjectComment}
                  commentError={projectCommentError}
                  onCommentContentChange={setProjectCommentContent}
                  onAddComment={handleAddProjectComment}
                  onDeleteComment={handleDeleteProjectComment}
                />
                
                {/* 在小屏幕上在主内容区底部显示下半部分侧边栏组件 */}
                <Box sx={{ display: { xs: 'block', md: 'none' }, mt: 3 }}>
                  <ProjectSidebarBottom
                    project={project}
                    members={members}
                    isMember={isMember}
                    user={user}
                    withdrawAmount={withdrawAmount}
                    withdrawLoading={withdrawLoading}
                    withdrawError={withdrawError}
                    withdrawals={withdrawals}
                    loadingWithdrawals={loadingWithdrawals}
                    expandWithdrawals={expandWithdrawals}
                    onWithdrawAmountChange={(amount) => setWithdrawAmount(amount)}
                    onWithdraw={handleWithdraw}
                    onToggleWithdrawals={() => setExpandWithdrawals(!expandWithdrawals)}
                    formatUsername={formatUsername}
                    contributors={contributors}
                    loadingContributors={loadingContributors}
                  />
                </Box>
              </Box>
              
              {/* 侧边栏 - 右侧 固定宽度，仅在中等及以上屏幕显示 */}
              <Box sx={{ display: { xs: 'none', md: 'block' }, flex: '0.25' }}>
                <ProjectSidebar
                  project={project}
                  members={members}
                  isMember={isMember}
                  user={user}
                  withdrawAmount={withdrawAmount}
                  withdrawLoading={withdrawLoading}
                  withdrawError={withdrawError}
                  withdrawals={withdrawals}
                  loadingWithdrawals={loadingWithdrawals}
                  expandWithdrawals={expandWithdrawals}
                  onOpenInfoDialog={() => setShowInfoDialog(true)}
                  onWithdrawAmountChange={(amount) => setWithdrawAmount(amount)}
                  onWithdraw={handleWithdraw}
                  onToggleWithdrawals={() => setExpandWithdrawals(!expandWithdrawals)}
                  formatUsername={formatUsername}
                  contributors={contributors}
                  loadingContributors={loadingContributors}
                />
              </Box>
            </Box>
          </Box>
        ) : (
          <Container maxWidth="lg" sx={{ mt: 4 }}>
            <Alert severity="error">{error || '项目不存在'}</Alert>
            <Button sx={{ mt: 2 }} onClick={() => navigate('/')}>
              返回首页
            </Button>
          </Container>
        )}
      </Container>
      
      {/* 提案对话框 */}
      <NewProposalDialog
        isDarkMode={isDarkMode}
        projectId={project?.id || ''}
        open={openProposalDialog}
        onClose={() => setOpenProposalDialog(false)}
        onProposalCreated={handleProposalCreated}
      />
      
      {/* 充值对话框 */}
      <RechargeDialog
        open={rechargeDialogOpen}
        onClose={() => setRechargeDialogOpen(false)}
      />
      
      {/* 项目信息对话框 */}
      {project && (
        <ProjectInfoDialog
          open={showInfoDialog}
          onClose={() => {
            setShowInfoDialog(false);
            // 移除URL中的showInfo参数
            const newUrl = window.location.pathname;
            window.history.replaceState({}, '', newUrl);
          }}
          project={{
            id: project.id,
            name: project.name,
            description: project.description,
            displayImages: project.displayImages || [],
            members: members.map(member => ({
              id: member.id,
              userId: member.id,
              projectId: project.id,
              role: project.createdBy === member.id ? 'owner' : 'member',
              joinedAt: project.createdAt,
              user: {
                id: member.id,
                nickname: member.username,
                avatarUrl: member.avatarUrl
              }
            }))
          }}
          isOwner={isCreator}
          onProjectUpdate={(updatedProject) => {
            // 处理项目更新
            if (updatedProject.displayImages) {
              // 创建新的项目对象
              const newProject = {
                ...project,
                displayImages: updatedProject.displayImages
              };
              setProject(newProject);
            }
          }}
          isDarkMode={isDarkMode}
        />
      )}
      
      {/* 提案详情对话框 */}
      <ProposalDetailDialog
        isDarkMode={isDarkMode}
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        proposal={selectedProposal}
        isMember={isMember}
        onProposalDelete={handleProposalDelete}
        onProposalClose={handleProposalClose}
        onProposalUpdate={(updatedProposal) => {
          // 更新提案列表
          if (Array.isArray(proposals)) {
            setProposals(
              proposals.map(p => p.id === updatedProposal.id ? updatedProposal : p)
            );
          }
          // 更新选中的提案
          setSelectedProposal(updatedProposal);
        }}
        onOpenRechargeDialog={() => setRechargeDialogOpen(true)}
        onCommentAdded={(proposalId, comment) => {
          // 更新评论列表
          const newProposalComments = { ...proposalComments };
          if (!newProposalComments[proposalId]) {
            newProposalComments[proposalId] = [];
          }
          newProposalComments[proposalId] = [...newProposalComments[proposalId], comment];
          setProposalComments(newProposalComments);
        }}
        onCommentDeleted={(proposalId, commentId) => {
          // 更新评论列表
          const newProposalComments = { ...proposalComments };
          newProposalComments[proposalId] = newProposalComments[proposalId].filter(
            comment => comment.id !== commentId
          );
          setProposalComments(newProposalComments);
        }}
      />
    </Box>
  );
};

export default ProjectDetailPage;
