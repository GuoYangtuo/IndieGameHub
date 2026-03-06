/**
 * 为指定项目批量生成示例日常更新记录，随机分布在今天往前 90 天内。
 *
 * 用法（在 server/ 目录下执行）：
 *   npx ts-node src/scripts/seedProjectUpdates.ts <projectId> [count]
 *
 * 示例：
 *   npx ts-node src/scripts/seedProjectUpdates.ts abc123 30
 *
 * 参数：
 *   projectId  必填，目标项目 ID
 *   count      可选，生成条数，默认 20
 */

import { query } from '../utils/dbTools';

// ─── 可配置区域 ────────────────────────────────────────────────────────────────

// 往前推多少天（随机区间）
const DAYS_BACK = 90;

// 示例更新内容池（日常更新，非版本发布）
const UPDATE_CONTENTS: string[] = [
  '修复了玩家在特定地形上卡住不动的问题',
  '优化了场景加载速度，减少约 30% 的卡顿',
  '调整了敌人 AI 的巡逻逻辑，使其更自然',
  '重绘了主角的奔跑动画，帧数从 8 帧提升到 12 帧',
  '新增了背景音效：森林环境、水流声和鸟鸣',
  '完善了对话系统，支持选项分支和角色表情变化',
  '修复了存档读取时偶发的黑屏问题',
  '调整了关卡 2 的难度曲线，降低初始敌人密度',
  '新增暂停菜单，支持返回主界面和设置入口',
  '优化了碰撞检测逻辑，解决了穿模边缘情况',
  '为主角添加了受击动画和无敌帧',
  '完成了世界地图草图的数字化绘制',
  '调整了道具掉落概率，平衡游戏前期体验',
  '实现了可破坏场景元素：木箱和陶罐',
  '修复了多个 UI 文字截断显示的问题',
  '新增了玩家死亡后的重生提示界面',
  '完成了 Boss 战第一阶段的脚本编写',
  '优化了粒子特效内存占用，删除冗余粒子池',
  '新增了成就系统的数据结构，暂未接入 UI',
  '整理并归档了本周的美术素材，统一命名规范',
  '修复了音效在特定设备上无法播放的兼容性问题',
  '完善了设置界面：音量、分辨率和键位重映射',
  '为 NPC 添加了简单的随机闲逛行为',
  '优化了灯光系统，改善地下城场景的氛围',
  '实现了角色属性面板的基础显示逻辑',
  '修复了切换场景时背景音乐重叠播放的 Bug',
  '新增了游戏内时钟系统，支持昼夜循环',
  '调整了跳跃手感参数，提升操控流畅度',
  '完成了商店界面的原型设计，待接入数据',
  '为主角添加了翻滚技能，配合无敌帧使用',
  '修复了任务追踪器在完成后不消失的显示问题',
  '新增了游戏内教程的第一章节文本',
  '整理了游戏世界观设定文档，补充了历史背景',
  '优化了水面反射效果，减少 GPU 开销',
  '为关键剧情触发点添加了演出镜头动画',
  '修复了排行榜数据在离线时崩溃的问题',
  '新增了图鉴系统的骨架，暂时没有数据填充',
  '调整了 UI 配色方案，与游戏风格更统一',
  '完成了第三章节地图的白盒搭建',
  '修复了蓄力攻击在低帧率下判定失效的问题',
];

// ─────────────────────────────────────────────────────────────────────────────

const generateId = (): string =>
  Date.now().toString() + Math.floor(Math.random() * 1000).toString();

/** 在 [min, max] 之间取随机整数 */
const randInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

/** 生成随机日期字符串（今天往前 daysBack 天内），MySQL DATETIME 格式 */
const randomPastDate = (daysBack: number): string => {
  const now = new Date();
  const offsetMs = randInt(0, daysBack * 24 * 60 * 60 * 1000);
  const d = new Date(now.getTime() - offsetMs);
  return d.toISOString().slice(0, 19).replace('T', ' ');
};

/** 从数组中随机取一个元素 */
const pickRandom = <T>(arr: T[]): T => arr[randInt(0, arr.length - 1)];

async function main() {
  const [, , projectId, countArg] = process.argv;

  if (!projectId) {
    console.error('用法: npx ts-node src/scripts/seedProjectUpdates.ts <projectId> [count]');
    process.exit(1);
  }

  const count = countArg ? parseInt(countArg, 10) : 20;
  if (isNaN(count) || count <= 0) {
    console.error('count 必须是正整数');
    process.exit(1);
  }

  // 验证项目是否存在
  const projects = await query('SELECT id, name FROM projects WHERE id = ?', [projectId]);
  if (!projects || projects.length === 0) {
    console.error(`未找到项目 ID: ${projectId}`);
    process.exit(1);
  }
  console.log(`目标项目: ${projects[0].name} (${projectId})`);
  console.log(`准备生成 ${count} 条日常更新记录，分布在过去 ${DAYS_BACK} 天内...\n`);

  let successCount = 0;
  for (let i = 0; i < count; i++) {
    // 避免同一毫秒生成导致 ID 冲突
    await new Promise((r) => setTimeout(r, 2));

    const id = generateId();
    const content = pickRandom(UPDATE_CONTENTS);
    const createdAt = randomPastDate(DAYS_BACK);

    try {
      await query(
        `INSERT INTO project_updates (id, projectId, content, demoLink, isVersion, versionName, imageUrl, createdAt)
         VALUES (?, ?, ?, NULL, FALSE, NULL, NULL, ?)`,
        [id, projectId, content, createdAt]
      );
      console.log(`  [${i + 1}/${count}] ${createdAt}  ${content.slice(0, 30)}...`);
      successCount++;
    } catch (err) {
      console.error(`  [${i + 1}/${count}] 插入失败:`, err);
    }
  }

  console.log(`\n完成！成功插入 ${successCount}/${count} 条记录。`);
  process.exit(0);
}

main().catch((err) => {
  console.error('脚本执行失败:', err);
  process.exit(1);
});
