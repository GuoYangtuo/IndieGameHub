import { query } from '../utils/dbTools';

export type RechargeStatus = 'pending' | 'paid' | 'closed' | 'failed';

export interface RechargeOrder {
  id: string;
  userId: string;
  out_trade_no: string;
  trade_no?: string;
  money: number;
  coins: number;
  pay_type?: string;
  status: RechargeStatus;
  raw_notify?: string;
  created_at?: string;
  updated_at?: string;
}

const generateId = (): string => {
  return Date.now().toString() + Math.floor(Math.random() * 1000).toString();
};

export const createRechargeOrder = async (data: {
  userId: string;
  out_trade_no: string;
  money: number;
  coins: number;
  pay_type?: string;
}): Promise<RechargeOrder> => {
  const id = generateId();

  await query(
    `INSERT INTO recharge_orders (id, userId, out_trade_no, money, coins, pay_type, status)
     VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
    [id, data.userId, data.out_trade_no, data.money, data.coins, data.pay_type || null]
  );

  return {
    id,
    userId: data.userId,
    out_trade_no: data.out_trade_no,
    money: data.money,
    coins: data.coins,
    pay_type: data.pay_type,
    status: 'pending',
  };
};

export const getRechargeOrderByOutTradeNo = async (
  out_trade_no: string
): Promise<RechargeOrder | null> => {
  const rows = await query(
    `SELECT id, userId, out_trade_no, trade_no, money, coins, pay_type, status, raw_notify, created_at, updated_at
     FROM recharge_orders
     WHERE out_trade_no = ?`,
    [out_trade_no]
  );

  if (!rows || rows.length === 0) return null;
  return rows[0] as RechargeOrder;
};

export const markRechargeOrderPaid = async (options: {
  out_trade_no: string;
  trade_no: string;
  raw_notify: string;
}): Promise<void> => {
  await query(
    `UPDATE recharge_orders
     SET trade_no = ?, status = 'paid', raw_notify = ?
     WHERE out_trade_no = ?`,
    [options.trade_no, options.raw_notify, options.out_trade_no]
  );
};

