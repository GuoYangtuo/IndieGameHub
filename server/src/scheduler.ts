import { query } from './utils/dbTools';
import { checkAndUpdateCampaignStatus, refundAllDonations } from './services/betCampaignService';

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
  checkFundingEnd();
  checkDevelopmentEnd();

  const timer = setInterval(() => {
    checkFundingEnd();
    checkDevelopmentEnd();
  }, intervalMs);

  console.log(`[Scheduler] 对赌众筹调度器已启动，间隔 ${intervalMs / 1000 / 60} 分钟`);
  return timer;
}
