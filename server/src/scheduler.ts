import { query } from './utils/dbTools';
import { checkAndUpdateCampaignStatus, refundAllDonations } from './services/betCampaignService';
import { getGitHubCommits } from './utils/githubTools';
import { findProjectById, addProjectUpdate, checkGitHubCommitExists } from './models/projectModel';

/**
 * 预热结束时间点检查：自动从 preheating 切换为 funding
 */
async function checkWarmupEnd(): Promise<void> {
  try {
    const now = new Date();
    const rows = await query(
      `SELECT id FROM bet_campaigns WHERE status = 'preheating' AND warmupEndTime IS NOT NULL AND warmupEndTime <= ?`,
      [now]
    ) as any[];

    if (!rows || rows.length === 0) return;

    console.log(`[Scheduler] 检查到 ${rows.length} 个预热到期`);

    for (const campaign of rows) {
      await query("UPDATE bet_campaigns SET status = 'funding' WHERE id = ?", [campaign.id]);
      console.log(`[Scheduler] 众筹 ${campaign.id} 预热结束，进入众筹阶段`);
    }
  } catch (error) {
    console.error('[Scheduler] checkWarmupEnd 执行失败:', error);
  }
}

/**
 * 众筹结束时间点检查：自动切换为 development 或 failed
 */
async function checkFundingEnd(): Promise<void> {
  try {
    const now = new Date();
    const rows = await query(
      `SELECT id FROM bet_campaigns WHERE status = 'funding' AND fundingEndTime <= ?`,
      [now]
    ) as any[];

    if (!rows || rows.length === 0) return;

    console.log(`[Scheduler] 检查到 ${rows.length} 个众筹到期`);

    for (const campaign of rows) {
      await checkAndUpdateCampaignStatus(campaign.id);
      const updated = await query('SELECT status, totalRaised, targetAmount FROM bet_campaigns WHERE id = ?', [campaign.id]) as any[];
      if (updated && updated[0]) {
        console.log(`[Scheduler] 众筹 ${campaign.id} 状态: ${updated[0].status}`);
      }
    }
  } catch (error) {
    console.error('[Scheduler] checkFundingEnd 执行失败:', error);
  }
}

/**
 * 开发结束时间点检查：到期未结算则默认标记失败并退款
 */
async function checkDevelopmentEnd(): Promise<void> {
  try {
    const now = new Date();
    const rows = await query(
      `SELECT id FROM bet_campaigns WHERE status = 'development' AND developmentEndTime <= ? AND (result IS NULL OR result = 'pending')`,
      [now]
    ) as any[];

    if (!rows || rows.length === 0) return;

    console.log(`[Scheduler] 检查到 ${rows.length} 个开发到期未结算`);

    for (const campaign of rows) {
      await refundAllDonations(campaign.id);
      await query(
        `UPDATE bet_campaigns SET status = 'failed', result = 'failed' WHERE id = ?`,
        [campaign.id]
      );
      console.log(`[Scheduler] 开发众筹 ${campaign.id} 到期未提交结果，默认标记为失败并已退款`);
    }
  } catch (error) {
    console.error('[Scheduler] checkDevelopmentEnd 执行失败:', error);
  }
}

/**
 * 启动对赌众筹调度器
 * @param intervalMs 检查间隔（毫秒），默认每 10 分钟检查一次
 */
export function startBetCampaignScheduler(intervalMs: number = 10 * 60 * 1000): NodeJS.Timeout {
  checkWarmupEnd();
  checkFundingEnd();
  checkDevelopmentEnd();

  const timer = setInterval(() => {
    checkWarmupEnd();
    checkFundingEnd();
    checkDevelopmentEnd();
  }, intervalMs);

  console.log(`[Scheduler] 对赌众筹调度器已启动，间隔 ${intervalMs / 1000 / 60} 分钟`);
  return timer;
}

/**
 * 同步 GitHub commits 到项目更新日志
 * 策略：对于每个关联了 GitHub 仓库的项目，从最新的一组 commits 开始检查，
 * 如果 commit 在数据库中已存在，则立即停止该项目的检查
 */
async function syncGitHubCommits(): Promise<void> {
  try {
    // 获取所有关联了 GitHub 仓库且启用了更新日志的项目
    const projects = await query(`
      SELECT id, name, githubRepoUrl, githubAccessToken
      FROM projects
      WHERE githubRepoUrl IS NOT NULL
        AND githubRepoUrl != ''
        AND enableUpdates = 1
    `) as any[];

    if (!projects || projects.length === 0) {
      return;
    }

    console.log(`[Scheduler] 开始检查 ${projects.length} 个项目的 GitHub commits 同步`);

    for (const project of projects) {
      await syncProjectGitHubCommits(project);
    }

    console.log(`[Scheduler] GitHub commits 同步检查完成`);
  } catch (error) {
    console.error('[Scheduler] syncGitHubCommits 执行失败:', error);
  }
}

/**
 * 同步单个项目的 GitHub commits
 */
async function syncProjectGitHubCommits(project: { id: string; name: string; githubRepoUrl: string; githubAccessToken?: string }): Promise<void> {
  try {
    const { id: projectId, name, githubRepoUrl, githubAccessToken } = project;

    // 获取最新的一组 commits（每次最多获取 30 条）
    let commits = await getGitHubCommits(githubRepoUrl, githubAccessToken, 30);

    if (!commits || commits.length === 0) {
      return;
    }

    let newUpdateCount = 0;
    let page = 1;

    // 循环获取 commits 直到找到已存在的或者全部获取完
    while (commits && commits.length > 0) {
      let foundExisting = false;

      // 从最新往旧检查
      for (const commit of commits) {
        const sha = commit.sha;
        const message = commit.commit.message;
        const commitDate = commit.commit.author.date; // GitHub commit 的提交时间

        // 检查这个 commit 是否已经在数据库中
        const exists = await checkGitHubCommitExists(projectId, sha);

        if (exists) {
          // 找到已存在的 commit，说明之前的都同步过了，停止检查
          console.log(`[Scheduler] 项目 "${name}" 在 commit ${sha.substring(0, 7)} 处已同步过，停止检查`);
          foundExisting = true;
          break;
        }

        // commit 不存在，添加到数据库
        const cleanMessage = message.split('\n')[0].trim(); // 只取第一行作为更新内容

        if (cleanMessage) {
          const update = await addProjectUpdate(
            projectId,
            cleanMessage,
            commit.html_url, // 使用 commit 链接作为 demoLink
            false, // 不是版本更新
            undefined,
            undefined,
            sha, // 保存 commit SHA
            commitDate // 使用 commit 的提交时间
          );

          if (update) {
            newUpdateCount++;
            console.log(`[Scheduler] 项目 "${name}" 新增更新: ${cleanMessage.substring(0, 50)}...`);
          }
        }
      }

      // 如果找到已存在的 commit，停止
      if (foundExisting) {
        break;
      }

      // 如果这一组没有找到已存在的，说明可能还有更旧的 commit，需要继续获取
      // 检查是否还有更多 commits（如果返回数量少于请求数量，说明已经到头了）
      if (commits.length < 30) {
        console.log(`[Scheduler] 项目 "${name}" 已获取全部 commits`);
        break;
      }

      // 继续获取下一页（更旧的 commits）
      page++;
      console.log(`[Scheduler] 项目 "${name}" 继续获取更旧的 commits (第 ${page} 页)`);

      commits = await getGitHubCommits(githubRepoUrl, githubAccessToken, 30, page);

      // 如果没有更多 commits，停止
      if (!commits || commits.length === 0) {
        break;
      }
    }

    if (newUpdateCount > 0) {
      console.log(`[Scheduler] 项目 "${name}" 同步完成，新增 ${newUpdateCount} 条更新`);
    }
  } catch (error) {
    console.error(`[Scheduler] 同步项目 "${project.name}" 的 GitHub commits 失败:`, error);
  }
}

/**
 * 启动 GitHub commits 同步调度器
 * @param intervalMs 检查间隔（毫秒），默认每 30 分钟检查一次
 */
export function startGitHubSyncScheduler(intervalMs: number = 30 * 60 * 1000): NodeJS.Timeout {
  // 立即执行一次
  syncGitHubCommits();

  const timer = setInterval(() => {
    syncGitHubCommits();
  }, intervalMs);

  console.log(`[Scheduler] GitHub commits 同步调度器已启动，间隔 ${intervalMs / 1000 / 60} 分钟`);
  return timer;
}
