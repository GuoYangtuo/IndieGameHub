/**
 * 将数据库中用户名为 admin 的用户的密码重置为 aaaaaa
 * 运行: npx ts-node src/scripts/resetAdminPassword.ts
 */
import bcrypt from 'bcryptjs';
import { query } from '../utils/dbTools';
import { findUserByUsername } from '../models/userModel';

async function main() {
  const user = await findUserByUsername('GuoYangtuo');
  if (!user) {
    console.error('未找到用户 GuoYangtuo');
    process.exit(1);
  }

  const newPassword = 'aaaaaa';
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await query('UPDATE users SET password = ? WHERE username = ?', [
    hashedPassword,
    'GuoYangtuo',
  ]);

  console.log('GuoYangtuo 用户密码已更新为 aaaaaa');
  process.exit(0);
}

main().catch((err) => {
  console.error('执行失败:', err);
  process.exit(1);
});
