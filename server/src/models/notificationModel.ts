import { query } from '../utils/dbTools';
import { findUserById } from './userModel';

// 系统通知接口
export interface SystemNotification {
  id: string;
  userId: string;
  title: string;
  content: string;
  type: string;
  isRead: boolean;
  relatedType?: string;
  relatedId?: string;
  createdAt: string;
}

// 用户通知设置接口
export interface UserNotificationSettings {
  id: string;
  userId: string;
  notifyOnNewProposal: boolean;
  notifyOnNewComment: boolean;
  notifyOnSurveySubmission: boolean;
  notifyOnProposalQueued: boolean;
  emailOnNewProposal: boolean;
  emailOnNewComment: boolean;
  emailOnSurveySubmission: boolean;
  emailOnProposalQueued: boolean;
  createdAt: string;
  updatedAt: string;
}

// 生成唯一ID
const generateId = (): string => {
  return Date.now().toString() + Math.floor(Math.random() * 1000).toString();
};

// 创建系统通知（同时发送实时通知和保存到数据库）
export const createSystemNotification = async (
  userId: string,
  title: string,
  content: string,
  type: string = 'system',
  relatedType?: string,
  relatedId?: string,
  ws?: any // WebSocket实例
): Promise<SystemNotification | null> => {
  try {
    const id = generateId();
    const now = new Date();
    const mysqlDateFormat = now.toISOString().slice(0, 19).replace('T', ' ');
    const createdAt = now.toISOString();

    // 保存到数据库
    await query(
      `INSERT INTO system_notifications 
       (id, userId, title, content, type, relatedType, relatedId, createdAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, userId, title, content, type, relatedType || null, relatedId || null, mysqlDateFormat]
    );

    // 如果提供了WebSocket实例，发送实时通知
    if (ws) {
      ws.sendToUser(userId, {
        type: 'notification',
        payload: {
          id,
          title,
          content,
          type,
          relatedType,
          relatedId,
          createdAt
        }
      });
    }

    const notification: SystemNotification = {
      id,
      userId,
      title,
      content,
      type,
      isRead: false,
      relatedType,
      relatedId,
      createdAt
    };

    return notification;
  } catch (error) {
    console.error('创建系统通知失败:', error);
    return null;
  }
};

// 获取用户的系统通知列表
export const getUserNotifications = async (userId: string, limit: number = 50, offset: number = 0): Promise<SystemNotification[]> => {
  try {
    // MySQL prepared statements don't support LIMIT/OFFSET as parameters, so we embed them directly
    // Since limit and offset are number type, they're safe from SQL injection
    const safeLimit = Math.max(0, Math.floor(Number(limit))) || 50;
    const safeOffset = Math.max(0, Math.floor(Number(offset))) || 0;
    
    const notifications = await query(
      `SELECT * FROM system_notifications WHERE userId = ? ORDER BY createdAt DESC LIMIT ${safeLimit} OFFSET ${safeOffset}`,
      [userId]
    );
    return notifications.map((n: any) => ({
      ...n,
      isRead: Boolean(n.isRead)
    }));
  } catch (error) {
    console.error('获取用户通知失败:', error);
    return [];
  }
};

// 获取用户未读通知数量
export const getUnreadNotificationCount = async (userId: string): Promise<number> => {
  try {
    const result = await query(
      'SELECT COUNT(*) as count FROM system_notifications WHERE userId = ? AND isRead = FALSE',
      [userId]
    );
    return result[0]?.count || 0;
  } catch (error) {
    console.error('获取未读通知数量失败:', error);
    return 0;
  }
};

// 标记通知为已读
export const markNotificationAsRead = async (notificationId: string, userId: string): Promise<boolean> => {
  try {
    const result = await query(
      'UPDATE system_notifications SET isRead = TRUE WHERE id = ? AND userId = ?',
      [notificationId, userId]
    );
    return result.affectedRows > 0;
  } catch (error) {
    console.error('标记通知已读失败:', error);
    return false;
  }
};

// 标记所有通知为已读
export const markAllNotificationsAsRead = async (userId: string): Promise<boolean> => {
  try {
    const result = await query(
      'UPDATE system_notifications SET isRead = TRUE WHERE userId = ? AND isRead = FALSE',
      [userId]
    );
    return true;
  } catch (error) {
    console.error('标记所有通知已读失败:', error);
    return false;
  }
};

// 删除通知
export const deleteNotification = async (notificationId: string, userId: string): Promise<boolean> => {
  try {
    const result = await query(
      'DELETE FROM system_notifications WHERE id = ? AND userId = ?',
      [notificationId, userId]
    );
    return result.affectedRows > 0;
  } catch (error) {
    console.error('删除通知失败:', error);
    return false;
  }
};

// 清空用户所有通知
export const clearAllNotifications = async (userId: string): Promise<boolean> => {
  try {
    await query('DELETE FROM system_notifications WHERE userId = ?', [userId]);
    return true;
  } catch (error) {
    console.error('清空通知失败:', error);
    return false;
  }
};

// 获取用户通知设置
export const getUserNotificationSettings = async (userId: string): Promise<UserNotificationSettings | null> => {
  try {
    const settings = await query(
      'SELECT * FROM user_notification_settings WHERE userId = ?',
      [userId]
    );
    if (settings.length === 0) {
      // 如果没有设置，创建默认设置
      return await createDefaultNotificationSettings(userId);
    }
    return settings[0];
  } catch (error) {
    console.error('获取用户通知设置失败:', error);
    return null;
  }
};

// 创建默认通知设置
export const createDefaultNotificationSettings = async (userId: string): Promise<UserNotificationSettings | null> => {
  try {
    const id = generateId();
    const now = new Date();
    const mysqlDateFormat = now.toISOString().slice(0, 19).replace('T', ' ');

    await query(
      `INSERT INTO user_notification_settings 
       (id, userId, notifyOnNewProposal, notifyOnNewComment, notifyOnSurveySubmission, notifyOnProposalQueued, 
        emailOnNewProposal, emailOnNewComment, emailOnSurveySubmission, emailOnProposalQueued, createdAt) 
       VALUES (?, ?, TRUE, TRUE, TRUE, TRUE, FALSE, FALSE, FALSE, FALSE, ?)`,
      [id, userId, mysqlDateFormat]
    );

    return await getUserNotificationSettings(userId);
  } catch (error) {
    console.error('创建默认通知设置失败:', error);
    return null;
  }
};

// 更新用户通知设置
export const updateUserNotificationSettings = async (
  userId: string,
  settings: Partial<UserNotificationSettings>
): Promise<UserNotificationSettings | null> => {
  try {
    // 先获取现有设置
    const existing = await getUserNotificationSettings(userId);
    if (!existing) {
      return await createDefaultNotificationSettings(userId);
    }

    const updateFields: string[] = [];
    const params: any[] = [];

    if (settings.notifyOnNewProposal !== undefined) {
      updateFields.push('notifyOnNewProposal = ?');
      params.push(settings.notifyOnNewProposal);
    }
    if (settings.notifyOnNewComment !== undefined) {
      updateFields.push('notifyOnNewComment = ?');
      params.push(settings.notifyOnNewComment);
    }
    if (settings.notifyOnSurveySubmission !== undefined) {
      updateFields.push('notifyOnSurveySubmission = ?');
      params.push(settings.notifyOnSurveySubmission);
    }
    if (settings.notifyOnProposalQueued !== undefined) {
      updateFields.push('notifyOnProposalQueued = ?');
      params.push(settings.notifyOnProposalQueued);
    }
    if (settings.emailOnNewProposal !== undefined) {
      updateFields.push('emailOnNewProposal = ?');
      params.push(settings.emailOnNewProposal);
    }
    if (settings.emailOnNewComment !== undefined) {
      updateFields.push('emailOnNewComment = ?');
      params.push(settings.emailOnNewComment);
    }
    if (settings.emailOnSurveySubmission !== undefined) {
      updateFields.push('emailOnSurveySubmission = ?');
      params.push(settings.emailOnSurveySubmission);
    }
    if (settings.emailOnProposalQueued !== undefined) {
      updateFields.push('emailOnProposalQueued = ?');
      params.push(settings.emailOnProposalQueued);
    }

    if (updateFields.length > 0) {
      params.push(userId);
      await query(
        `UPDATE user_notification_settings SET ${updateFields.join(', ')} WHERE userId = ?`,
        params
      );
    }

    return await getUserNotificationSettings(userId);
  } catch (error) {
    console.error('更新用户通知设置失败:', error);
    return null;
  }
};

// 通知类型
export type NotificationEventType = 
  | 'new_proposal' 
  | 'new_comment' 
  | 'survey_submission' 
  | 'proposal_queued';

// 发送通知给多个用户
export const notifyMultipleUsers = async (
  userIds: string[],
  title: string,
  content: string,
  type: NotificationEventType,
  relatedType?: string,
  relatedId?: string,
  ws?: any
): Promise<void> => {
  // 过滤掉重复的userId
  const uniqueUserIds = [...new Set(userIds)];
  
  for (const userId of uniqueUserIds) {
    await createSystemNotification(userId, title, content, type, relatedType, relatedId, ws);
  }
};

// 通知辅助函数：项目获得新提案时通知所有成员
export const notifyProjectMembersOnNewProposal = async (
  projectId: string,
  proposalId: string,
  proposalTitle: string,
  projectName: string,
  ws?: any
): Promise<void> => {
  try {
    // 获取项目所有成员
    const members = await query(
      'SELECT userId FROM project_members WHERE projectId = ?',
      [projectId]
    );

    // 同时通知项目创建者
    const project = await query('SELECT createdBy FROM projects WHERE id = ?', [projectId]);
    const creatorId = project[0]?.createdBy;
    
    // 合并成员和创建者
    const allUserIds = [...new Set([
      ...members.map((m: any) => m.userId),
      creatorId
    ].filter(Boolean))];

    // 获取通知设置并过滤
    const notifiedUsers: string[] = [];
    for (const userId of allUserIds) {
      const settings = await getUserNotificationSettings(userId);
      if (settings?.notifyOnNewProposal) {
        notifiedUsers.push(userId);
      }
    }

    await notifyMultipleUsers(
      notifiedUsers,
      '新提案通知',
      `项目"${projectName}"有一个新提案：${proposalTitle}`,
      'new_proposal',
      'proposal',
      proposalId,
      ws
    );
  } catch (error) {
    console.error('通知项目成员新提案失败:', error);
  }
};

// 通知辅助函数：项目获得新评论时通知所有成员
export const notifyProjectMembersOnNewComment = async (
  projectId: string,
  commentId: string,
  commenterName: string,
  projectName: string,
  ws?: any
): Promise<void> => {
  try {
    // 获取项目所有成员
    const members = await query(
      'SELECT userId FROM project_members WHERE projectId = ?',
      [projectId]
    );

    // 同时通知项目创建者
    const project = await query('SELECT createdBy FROM projects WHERE id = ?', [projectId]);
    const creatorId = project[0]?.createdBy;
    
    // 合并成员和创建者
    const allUserIds = [...new Set([
      ...members.map((m: any) => m.userId),
      creatorId
    ].filter(Boolean))];

    // 获取通知设置并过滤
    const notifiedUsers: string[] = [];
    for (const userId of allUserIds) {
      const settings = await getUserNotificationSettings(userId);
      if (settings?.notifyOnNewComment) {
        notifiedUsers.push(userId);
      }
    }

    await notifyMultipleUsers(
      notifiedUsers,
      '新评论通知',
      `${commenterName}在项目"${projectName}"发表了评论`,
      'new_comment',
      'comment',
      commentId,
      ws
    );
  } catch (error) {
    console.error('通知项目成员新评论失败:', error);
  }
};

// 通知辅助函数：意见征询有人提交时通知创建者
export const notifySurveyCreatorOnSubmission = async (
  surveyId: string,
  projectId: string,
  projectName: string,
  submitterName: string,
  ws?: any
): Promise<void> => {
  try {
    // 获取征询创建者
    const survey = await query(
      'SELECT createdBy FROM project_surveys WHERE id = ?',
      [surveyId]
    );
    const creatorId = survey[0]?.createdBy;
    
    if (!creatorId) return;

    // 获取通知设置
    const settings = await getUserNotificationSettings(creatorId);
    if (!settings?.notifyOnSurveySubmission) return;

    await createSystemNotification(
      creatorId,
      '意见征询提交通知',
      `${submitterName}提交了对项目"${projectName}"的意见征询`,
      'survey_submission',
      'survey',
      surveyId,
      ws
    );
  } catch (error) {
    console.error('通知征询创建者失败:', error);
  }
};

// 通知辅助函数：提案被加入队列时通知创建者
export const notifyProposalCreatorOnQueued = async (
  proposalId: string,
  ws?: any
): Promise<void> => {
  try {
    // 获取提案信息
    const proposal = await query(
      'SELECT p.*, pr.name as projectName FROM proposals p JOIN projects pr ON p.projectId = pr.id WHERE p.id = ?',
      [proposalId]
    );
    
    if (!proposal.length) return;
    
    const proposalData = proposal[0];
    const creatorId = proposalData.createdBy;
    const projectName = proposalData.projectName;
    
    if (!creatorId) return;

    // 获取通知设置
    const settings = await getUserNotificationSettings(creatorId);
    if (!settings?.notifyOnProposalQueued) return;

    await createSystemNotification(
      creatorId,
      '提案已加入队列',
      `您的提案"${proposalData.title}"已被项目"${projectName}"加入执行队列`,
      'proposal_queued',
      'proposal',
      proposalId,
      ws
    );
  } catch (error) {
    console.error('通知提案创建者队列状态失败:', error);
  }
};
