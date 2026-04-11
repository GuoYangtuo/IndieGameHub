import { query } from '../utils/dbTools';

export type BetDonationStatus = 'pending' | 'paid' | 'refunded' | 'failed';
export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface BetDonation {
  id: string;
  campaignId: string;
  userId: string;
  amount: number;
  message?: string;
  createdAt?: string;
  updatedAt?: string;
  // 支付相关字段
  out_trade_no?: string;
  trade_no?: string;
  pay_type?: string;
  status?: BetDonationStatus;
  raw_notify?: string;
  // 审核相关字段
  reviewStatus?: ReviewStatus;
  reviewComment?: string;
  reviewedAt?: string;
}

const generateId = (): string => {
  return Date.now().toString() + Math.floor(Math.random() * 1000).toString();
};

// 创建捐赠订单（支付前）
export const createBetDonationOrder = async (data: {
  campaignId: string;
  userId: string;
  amount: number;
  message?: string;
  out_trade_no: string;
  pay_type?: string;
}): Promise<BetDonation> => {
  const id = generateId();

  await query(
    `INSERT INTO bet_donations (id, campaignId, userId, amount, message, out_trade_no, pay_type, status, reviewStatus)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 'pending')`,
    [id, data.campaignId, data.userId, data.amount, data.message || null, data.out_trade_no, data.pay_type || null]
  );

  return {
    id,
    campaignId: data.campaignId,
    userId: data.userId,
    amount: data.amount,
    message: data.message,
    out_trade_no: data.out_trade_no,
    pay_type: data.pay_type,
    status: 'pending',
    reviewStatus: 'pending',
  };
};

// 根据 out_trade_no 获取捐赠订单
export const getBetDonationByOutTradeNo = async (
  out_trade_no: string
): Promise<BetDonation | null> => {
  const rows = await query(
    `SELECT * FROM bet_donations WHERE out_trade_no = ?`,
    [out_trade_no]
  );

  if (!rows || (rows as any[]).length === 0) return null;
  return rows[0] as BetDonation;
};

// 根据 ID 获取捐赠订单
export const getBetDonationById = async (
  id: string
): Promise<BetDonation | null> => {
  const rows = await query(
    `SELECT * FROM bet_donations WHERE id = ?`,
    [id]
  );

  if (!rows || (rows as any[]).length === 0) return null;
  return rows[0] as BetDonation;
};

// 标记捐赠订单已支付
export const markBetDonationPaid = async (options: {
  out_trade_no: string;
  trade_no: string;
  raw_notify: string;
}): Promise<void> => {
  await query(
    `UPDATE bet_donations
     SET trade_no = ?, status = 'paid', raw_notify = ?
     WHERE out_trade_no = ?`,
    [options.trade_no, options.raw_notify, options.out_trade_no]
  );
};

// 获取众筹的所有捐赠订单
export const getBetDonationsByCampaignId = async (
  campaignId: string,
  status?: BetDonationStatus
): Promise<BetDonation[]> => {
  let sql = `SELECT * FROM bet_donations WHERE campaignId = ?`;
  const params: any[] = [campaignId];

  if (status) {
    sql += ` AND status = ?`;
    params.push(status);
  }

  sql += ` ORDER BY createdAt DESC`;

  const rows = await query(sql, params);
  return (rows as BetDonation[]) || [];
};

// 获取用户的所有捐赠订单
export const getBetDonationsByUserId = async (
  userId: string
): Promise<BetDonation[]> => {
  const rows = await query(
    `SELECT * FROM bet_donations WHERE userId = ? ORDER BY createdAt DESC`,
    [userId]
  );
  return (rows as BetDonation[]) || [];
};

// 标记捐赠订单已退款
export const markBetDonationRefunded = async (id: string): Promise<void> => {
  await query(
    `UPDATE bet_donations SET status = 'refunded' WHERE id = ?`,
    [id]
  );
};

// 批量标记众筹的所有捐赠订单已退款
export const markBetDonationsRefundedByCampaign = async (
  campaignId: string
): Promise<number> => {
  const result = await query(
    `UPDATE bet_donations SET status = 'refunded' WHERE campaignId = ? AND status = 'paid'`,
    [campaignId]
  );
  return (result as any).affectedRows || 0;
};

// 获取众筹已支付的捐赠总金额
export const getTotalPaidAmountByCampaign = async (
  campaignId: string
): Promise<number> => {
  const rows = await query(
    `SELECT COALESCE(SUM(amount), 0) as total FROM bet_donations WHERE campaignId = ? AND status = 'paid'`,
    [campaignId]
  );
  return (rows as any[])[0]?.total || 0;
};
