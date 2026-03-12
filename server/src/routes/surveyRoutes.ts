import express, { Request, Response } from 'express';
import { query } from '../utils/dbTools';
import { verifyToken } from '../middleware/authMiddleware';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

export const surveyRouter = express.Router();

// 配置图片上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/surveys');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'survey-image-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('只允许上传图片文件'));
    }
    cb(null, true);
  }
});

// 获取项目的所有征询
surveyRouter.get('/project/:projectId', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const surveys = await query(
      `SELECT ps.id, ps.projectId, ps.title, ps.description, 
       ps.useVoting, ps.allowFreeResponse, 
       ps.endTime, ps.isManualEnd, 
       CAST(ps.isEnded AS UNSIGNED) as isEnded,
       ps.endedAt, ps.createdBy, ps.createdAt,
       u.username as creatorUsername, u.avatar_url as creatorAvatar
       FROM project_surveys ps
       LEFT JOIN users u ON ps.createdBy = u.id
       WHERE ps.projectId = ?
       ORDER BY ps.isEnded ASC, ps.createdAt DESC`,
      [projectId]
    );
    
    // 获取每个征询的图片
    for (const survey of surveys as any[]) {
      const images = await query(
        'SELECT * FROM survey_images WHERE surveyId = ? ORDER BY image_order',
        [survey.id]
      );
      survey.images = images;
      
      // 如果使用投票，获取选项和投票数
      if (survey.useVoting) {
        const options = await query(
          'SELECT * FROM survey_options WHERE surveyId = ? ORDER BY optionOrder',
          [survey.id]
        );
        
        // 获取每个选项的投票数
        for (const option of options as any[]) {
          const voteCount = await query(
            'SELECT COUNT(*) as count FROM survey_votes WHERE optionId = ?',
            [option.id]
          );
          option.voteCount = voteCount[0].count;
        }
        survey.options = options;
      }
    }
    
    res.json(surveys);
  } catch (error) {
    console.error('获取征询失败:', error);
    res.status(500).json({ message: '获取征询失败' });
  }
});

// 获取单个征询详情
surveyRouter.get('/:surveyId', async (req: Request, res: Response) => {
  try {
    const { surveyId } = req.params;
    
    const surveys = await query(
      `SELECT ps.*, u.username as creatorUsername, u.avatar_url as creatorAvatar
       FROM project_surveys ps
       LEFT JOIN users u ON ps.createdBy = u.id
       WHERE ps.id = ?`,
      [surveyId]
    );
    
    if (surveys.length === 0) {
      return res.status(404).json({ message: '征询不存在' });
    }
    
    const survey = surveys[0];
    
    // 获取图片
    const images = await query(
      'SELECT * FROM survey_images WHERE surveyId = ? ORDER BY image_order',
      [surveyId]
    );
    survey.images = images;
    
    // 如果使用投票，获取选项和投票数
    if (survey.useVoting) {
      const options = await query(
        'SELECT * FROM survey_options WHERE surveyId = ? ORDER BY optionOrder',
        [surveyId]
      );
      
      for (const option of options as any[]) {
        const voteCount = await query(
          'SELECT COUNT(*) as count FROM survey_votes WHERE optionId = ?',
          [option.id]
        );
        option.voteCount = voteCount[0].count;
      }
      survey.options = options;
    }
    
    // 获取自由发言
    const responses = await query(
      `SELECT sr.*, u.username, u.avatar_url as userAvatar
       FROM survey_responses sr
       LEFT JOIN users u ON sr.userId = u.id
       WHERE sr.surveyId = ?
       ORDER BY sr.createdAt DESC`,
      [surveyId]
    );
    survey.responses = responses;
    
    res.json(survey);
  } catch (error) {
    console.error('获取征询详情失败:', error);
    res.status(500).json({ message: '获取征询详情失败' });
  }
});

// 获取项目正在进行中的征询（无需登录，供玩家查看）
surveyRouter.get('/project/:projectId/active', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    
    // 获取所有未结束的征询
    const surveys = await query(
      `SELECT ps.*, u.username as creatorUsername
       FROM project_surveys ps
       LEFT JOIN users u ON ps.createdBy = u.id
       WHERE ps.projectId = ? AND ps.isEnded = FALSE
       AND (ps.endTime IS NULL OR ps.endTime > NOW())
       ORDER BY ps.createdAt DESC`,
      [projectId]
    );
    
    // 为每个征询添加图片和选项
    for (const survey of surveys as any[]) {
      // 获取图片
      const images = await query(
        'SELECT * FROM survey_images WHERE surveyId = ? ORDER BY image_order',
        [survey.id]
      );
      survey.images = images;
      
      // 如果使用投票，获取选项
      if (survey.useVoting) {
        const options = await query(
          'SELECT * FROM survey_options WHERE surveyId = ? ORDER BY optionOrder',
          [survey.id]
        );
        survey.options = options;
      }
    }
    
    res.json(surveys);
  } catch (error) {
    console.error('获取进行中征询失败:', error);
    res.status(500).json({ message: '获取进行中征询失败' });
  }
});

// 检查用户对某征询的提交状态
surveyRouter.get('/:surveyId/status', verifyToken, async (req: Request, res: Response) => {
  try {
    const { surveyId } = req.params;
    const userId = req.user!.id;
    
    const submissions = await query(
      'SELECT * FROM survey_submissions WHERE surveyId = ? AND userId = ?',
      [surveyId, userId]
    );
    
    const hasVoted = await query(
      'SELECT * FROM survey_votes WHERE surveyId = ? AND userId = ?',
      [surveyId, userId]
    );
    
    const hasResponded = await query(
      'SELECT * FROM survey_responses WHERE surveyId = ? AND userId = ?',
      [surveyId, userId]
    );
    
    res.json({
      hasSubmitted: submissions.length > 0,
      hasVoted: hasVoted.length > 0,
      hasResponded: hasResponded.length > 0
    });
  } catch (error) {
    console.error('获取提交状态失败:', error);
    res.status(500).json({ message: '获取提交状态失败' });
  }
});

// 获取用户未提交的征询（玩家视图）
surveyRouter.get('/project/:projectId/pending', verifyToken, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const userId = req.user!.id;
    
    // 获取所有未结束的征询
    const surveys = await query(
      `SELECT ps.*, u.username as creatorUsername
       FROM project_surveys ps
       LEFT JOIN users u ON ps.createdBy = u.id
       WHERE ps.projectId = ? AND ps.isEnded = FALSE
       AND (ps.endTime IS NULL OR ps.endTime > NOW())
       ORDER BY ps.createdAt DESC`,
      [projectId]
    );
    
    // 过滤出用户未提交的征询
    const pendingSurveys = [];
    for (const survey of surveys as any[]) {
      const submissions = await query(
        'SELECT * FROM survey_submissions WHERE surveyId = ? AND userId = ?',
        [survey.id, userId]
      );
      
      if (submissions.length === 0) {
        // 获取图片
        const images = await query(
          'SELECT * FROM survey_images WHERE surveyId = ? ORDER BY image_order',
          [survey.id]
        );
        survey.images = images;
        
        // 如果使用投票，获取选项
        if (survey.useVoting) {
          const options = await query(
            'SELECT * FROM survey_options WHERE surveyId = ? ORDER BY optionOrder',
            [survey.id]
          );
          survey.options = options;
        }
        
        pendingSurveys.push(survey);
      }
    }
    
    res.json(pendingSurveys);
  } catch (error) {
    console.error('获取未提交征询失败:', error);
    res.status(500).json({ message: '获取未提交征询失败' });
  }
});

// 创建征询（仅项目成员）
surveyRouter.post('/', verifyToken, async (req: Request, res: Response) => {
  try {
    const { projectId, title, description, useVoting, allowFreeResponse, endTime, options } = req.body;
    const userId = req.user!.id;
    
    // 检查是否是项目成员
    const members = await query(
      'SELECT * FROM project_members WHERE projectId = ? AND userId = ?',
      [projectId, userId]
    );
    
    // 检查是否是项目创建者
    const projects = await query('SELECT * FROM projects WHERE id = ?', [projectId]);
    const isOwner = projects.length > 0 && projects[0].createdBy === userId;
    
    if (members.length === 0 && !isOwner) {
      return res.status(403).json({ message: '只有项目成员才能创建征询' });
    }
    
    // 验证：至少选择投票或自由发言之一
    if (!useVoting && !allowFreeResponse) {
      return res.status(400).json({ message: '至少需要选择投票或自由发言之一' });
    }
    
    const surveyId = uuidv4();
    
    // 创建征询
    await query(
      `INSERT INTO project_surveys (id, projectId, title, description, useVoting, allowFreeResponse, endTime, isManualEnd, createdBy)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [surveyId, projectId, title, description || null, useVoting, allowFreeResponse, endTime || null, !endTime, userId]
    );
    
    // 如果使用投票，添加选项
    if (useVoting && options && options.length > 0) {
      for (let i = 0; i < options.length; i++) {
        const optionId = uuidv4();
        await query(
          'INSERT INTO survey_options (id, surveyId, optionText, optionOrder) VALUES (?, ?, ?, ?)',
          [optionId, surveyId, options[i], i]
        );
      }
    }
    
    res.json({ message: '征询创建成功', surveyId });
  } catch (error) {
    console.error('创建征询失败:', error);
    res.status(500).json({ message: '创建征询失败' });
  }
});

// 上传征询图片
surveyRouter.post('/:surveyId/images', verifyToken, upload.array('images', 10), async (req: Request, res: Response) => {
  try {
    const { surveyId } = req.params;
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      return res.status(400).json({ message: '没有上传图片' });
    }
    
    // 获取当前最大排序号
    const maxOrder = await query(
      'SELECT MAX(image_order) as maxOrder FROM survey_images WHERE surveyId = ?',
      [surveyId]
    );
    
    let order = (maxOrder[0].maxOrder || 0) + 1;
    
    for (const file of files) {
      const imageId = uuidv4();
      await query(
        'INSERT INTO survey_images (id, surveyId, url, image_order) VALUES (?, ?, ?, ?)',
        [imageId, surveyId, `/uploads/surveys/${file.filename}`, order]
      );
      order++;
    }
    
    res.json({ message: '图片上传成功' });
  } catch (error) {
    console.error('上传图片失败:', error);
    res.status(500).json({ message: '上传图片失败' });
  }
});

// 投票
surveyRouter.post('/:surveyId/vote', verifyToken, async (req: Request, res: Response) => {
  try {
    const { surveyId } = req.params;
    const { optionId } = req.body;
    const userId = req.user!.id;
    
    // 检查征询是否存在
    const surveys = await query('SELECT * FROM project_surveys WHERE id = ?', [surveyId]);
    if (surveys.length === 0) {
      return res.status(404).json({ message: '征询不存在' });
    }
    
    const survey = surveys[0];
    
    if (survey.isEnded) {
      return res.status(400).json({ message: '征询已结束' });
    }
    
    if (!survey.useVoting) {
      return res.status(400).json({ message: '该征询不支持投票' });
    }
    
    // 检查选项是否属于该征询
    const options = await query('SELECT * FROM survey_options WHERE id = ? AND surveyId = ?', [optionId, surveyId]);
    if (options.length === 0) {
      return res.status(400).json({ message: '无效的投票选项' });
    }
    
    // 检查是否已投票
    const existingVote = await query(
      'SELECT * FROM survey_votes WHERE surveyId = ? AND userId = ?',
      [surveyId, userId]
    );
    
    if (existingVote.length > 0) {
      return res.status(400).json({ message: '您已投票' });
    }
    
    // 记录投票
    const voteId = uuidv4();
    await query(
      'INSERT INTO survey_votes (id, surveyId, optionId, userId) VALUES (?, ?, ?, ?)',
      [voteId, surveyId, optionId, userId]
    );
    
    // 标记用户已提交
    const submissionId = uuidv4();
    await query(
      'INSERT INTO survey_submissions (id, surveyId, userId) VALUES (?, ?, ?)',
      [submissionId, surveyId, userId]
    );

    // 通知征询创建者有人提交了意见
    try {
      const { findUserById } = require('../models/userModel');
      const submitter = await findUserById(userId);
      const submitterName = submitter?.username || '某用户';
      
      const projects = await query('SELECT name FROM projects WHERE id = ?', [survey.projectId]);
      const projectName = projects[0]?.name || '某项目';
      
      // 获取app和ws
      const app = req.app as any;
      const ws = app?.ws;
      
      const { notifySurveyCreatorOnSubmission } = require('../models/notificationModel');
      await notifySurveyCreatorOnSubmission(
        surveyId,
        survey.projectId,
        projectName,
        submitterName,
        ws
      );
    } catch (notifyError) {
      console.error('发送征询提交通知失败:', notifyError);
    }
    
    res.json({ message: '投票成功' });
  } catch (error) {
    console.error('投票失败:', error);
    res.status(500).json({ message: '投票失败' });
  }
});

// 提交自由发言
surveyRouter.post('/:surveyId/respond', verifyToken, async (req: Request, res: Response) => {
  try {
    const { surveyId } = req.params;
    const { content } = req.body;
    const userId = req.user!.id;
    
    // 检查征询是否存在
    const surveys = await query('SELECT * FROM project_surveys WHERE id = ?', [surveyId]);
    if (surveys.length === 0) {
      return res.status(404).json({ message: '征询不存在' });
    }
    
    const survey = surveys[0];
    
    if (survey.isEnded) {
      return res.status(400).json({ message: '征询已结束' });
    }
    
    if (!survey.allowFreeResponse) {
      return res.status(400).json({ message: '该征询不支持自由发言' });
    }
    
    if (!content || content.trim() === '') {
      return res.status(400).json({ message: '发言内容不能为空' });
    }
    
    // 记录发言
    const responseId = uuidv4();
    await query(
      'INSERT INTO survey_responses (id, surveyId, userId, content) VALUES (?, ?, ?, ?)',
      [responseId, surveyId, userId, content]
    );
    
    // 标记用户已提交
    const submissionId = uuidv4();
    await query(
      'INSERT INTO survey_submissions (id, surveyId, userId) VALUES (?, ?, ?)',
      [submissionId, surveyId, userId]
    );
    
    res.json({ message: '发言提交成功' });
  } catch (error) {
    console.error('提交发言失败:', error);
    res.status(500).json({ message: '提交发言失败' });
  }
});

// 同时投票和自由发言
surveyRouter.post('/:surveyId/submit', verifyToken, async (req: Request, res: Response) => {
  try {
    const { surveyId } = req.params;
    const { optionId, content } = req.body;
    const userId = req.user!.id;
    
    // 检查征询是否存在
    const surveys = await query('SELECT * FROM project_surveys WHERE id = ?', [surveyId]);
    if (surveys.length === 0) {
      return res.status(404).json({ message: '征询不存在' });
    }
    
    const survey = surveys[0];
    
    if (survey.isEnded) {
      return res.status(400).json({ message: '征询已结束' });
    }
    
    // 检查是否已提交
    const existingSubmission = await query(
      'SELECT * FROM survey_submissions WHERE surveyId = ? AND userId = ?',
      [surveyId, userId]
    );
    
    if (existingSubmission.length > 0) {
      return res.status(400).json({ message: '您已提交过意见' });
    }
    
    // 处理投票
    if (survey.useVoting && optionId) {
      const options = await query('SELECT * FROM survey_options WHERE id = ? AND surveyId = ?', [optionId, surveyId]);
      if (options.length === 0) {
        return res.status(400).json({ message: '无效的投票选项' });
      }
      
      const voteId = uuidv4();
      await query(
        'INSERT INTO survey_votes (id, surveyId, optionId, userId) VALUES (?, ?, ?, ?)',
        [voteId, surveyId, optionId, userId]
      );
    }
    
    // 处理自由发言
    if (survey.allowFreeResponse && content && content.trim() !== '') {
      const responseId = uuidv4();
      await query(
        'INSERT INTO survey_responses (id, surveyId, userId, content) VALUES (?, ?, ?, ?)',
        [responseId, surveyId, userId, content]
      );
    }
    
    // 标记用户已提交
    const submissionId = uuidv4();
    await query(
      'INSERT INTO survey_submissions (id, surveyId, userId) VALUES (?, ?, ?)',
      [submissionId, surveyId, userId]
    );

    // 通知征询创建者有人提交了意见
    try {
      const { findUserById } = require('../models/userModel');
      const submitter = await findUserById(userId);
      const submitterName = submitter?.username || '某用户';
      
      const projects = await query('SELECT name FROM projects WHERE id = ?', [survey.projectId]);
      const projectName = projects[0]?.name || '某项目';
      
      // 获取app和ws
      const app = req.app as any;
      const ws = app?.ws;
      
      const { notifySurveyCreatorOnSubmission } = require('../models/notificationModel');
      await notifySurveyCreatorOnSubmission(
        surveyId,
        survey.projectId,
        projectName,
        submitterName,
        ws
      );
    } catch (notifyError) {
      console.error('发送征询提交通知失败:', notifyError);
    }
    
    res.json({ message: '提交成功' });
  } catch (error) {
    console.error('提交失败:', error);
    res.status(500).json({ message: '提交失败' });
  }
});

// 结束征询（仅项目成员）
surveyRouter.post('/:surveyId/end', verifyToken, async (req: Request, res: Response) => {
  try {
    const { surveyId } = req.params;
    const userId = req.user!.id;
    
    // 检查征询是否存在
    const surveys = await query('SELECT * FROM project_surveys WHERE id = ?', [surveyId]);
    if (surveys.length === 0) {
      return res.status(404).json({ message: '征询不存在' });
    }
    
    const survey = surveys[0];
    
    // 检查是否是项目成员
    const members = await query(
      'SELECT * FROM project_members WHERE projectId = ? AND userId = ?',
      [survey.projectId, userId]
    );
    
    // 检查是否是项目创建者
    const projects = await query('SELECT * FROM projects WHERE id = ?', [survey.projectId]);
    const isOwner = projects.length > 0 && projects[0].createdBy === userId;
    
    if (members.length === 0 && !isOwner) {
      return res.status(403).json({ message: '只有项目成员才能结束征询' });
    }
    
    if (survey.isEnded) {
      return res.status(400).json({ message: '征询已经结束' });
    }
    
    await query(
      'UPDATE project_surveys SET isEnded = TRUE, endedAt = NOW() WHERE id = ?',
      [surveyId]
    );
    
    res.json({ message: '征询已结束' });
  } catch (error) {
    console.error('结束征询失败:', error);
    res.status(500).json({ message: '结束征询失败' });
  }
});

// 删除征询（仅创建者）
surveyRouter.delete('/:surveyId', verifyToken, async (req: Request, res: Response) => {
  try {
    const { surveyId } = req.params;
    const userId = req.user!.id;
    
    // 检查征询是否存在
    const surveys = await query('SELECT * FROM project_surveys WHERE id = ?', [surveyId]);
    if (surveys.length === 0) {
      return res.status(404).json({ message: '征询不存在' });
    }
    
    const survey = surveys[0];
    
    // 只有创建者可以删除
    if (survey.createdBy !== userId) {
      return res.status(403).json({ message: '只有创建者才能删除征询' });
    }
    
    await query('DELETE FROM project_surveys WHERE id = ?', [surveyId]);
    
    res.json({ message: '征询已删除' });
  } catch (error) {
    console.error('删除征询失败:', error);
    res.status(500).json({ message: '删除征询失败' });
  }
});
