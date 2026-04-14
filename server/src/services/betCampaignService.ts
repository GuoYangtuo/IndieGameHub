import axios from 'axios';
import { query } from '../utils/dbTools';
import { rsaSign } from '../utils/zblPay';

/**
 * 调用支付平台退款接口
 */
export const refundViaPayment = async (
  trade_no: string,
  amount: number
): Promise<{ success: boolean; message: string }> => {
  const pid = process.env.ZBL_PAY_PID;
  const privateKey = process.env.ZBL_PAY_PRIVATE_KEY;
  const apiUrl = process.env.ZBL_PAY_API_URL || 'https://pay.zhenbianli.cn';

  if (!pid || !privateKey) {
    return { success: false, message: '支付配置缺失，无法退款' };
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const out_refund_no = 'RF' + Date.now().toString() + Math.floor(Math.random() * 1000);

  const requestParams: Record<string, string> = {
    pid,
    trade_no,
    money: amount.toString(),
    out_refund_no,
    timestamp,
    sign_type: 'RSA',
  };

  const sign = rsaSign(requestParams, privateKey);
  requestParams.sign = sign;

  try {
    const response = await axios.post(
      `${apiUrl}/api/pay/refund`,
      new URLSearchParams(requestParams).toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 15000,
      }
    );

    const data = response.data;
    if (data && data.code === 0) {
      return { success: true, message: '退款成功' };
    }
    return { success: false, message: data?.msg || '退款接口返回失败' };
  } catch (error: any) {
    const msg = error?.response?.data?.msg || error.message || '网络错误';
    return { success: false, message: `退款请求失败: ${msg}` };
  }
};

/**
 * 检查并更新众筹状态（众筹到期时调用）
 */
export const checkAndUpdateCampaignStatus = async (campaignId: string): Promise<void> => {
  try {
    const campaign = await query('SELECT * FROM bet_campaigns WHERE id = ?', [campaignId]);

    if (!campaign || (campaign as any[]).length === 0) {
      return;
    }

    const campaignData = (campaign as any[])[0];

    if (campaignData.status !== 'funding') {
      return;
    }

    const now = new Date();
    const fundingEndTime = new Date(campaignData.fundingEndTime);

    if (now >= fundingEndTime) {
      if (campaignData.totalRaised >= campaignData.targetAmount) {
        await query("UPDATE bet_campaigns SET status = 'development' WHERE id = ?", [campaignId]);
      } else {
        await refundAllDonations(campaignId);
        await query("UPDATE bet_campaigns SET status = 'failed', result = 'failed' WHERE id = ?", [campaignId]);
      }
    }
  } catch (error) {
    console.error('检查众筹状态失败:', error);
  }
};

/**
 * 批量退款所有已支付的捐赠
 */
export const refundAllDonations = async (
  campaignId: string
): Promise<{ donationId: string; success: boolean; message: string }[]> => {
  const paidDonations = await query(
    `SELECT * FROM bet_donations WHERE campaignId = ? AND status = 'paid'`,
    [campaignId]
  ) as any[];

  const refundResults: { donationId: string; success: boolean; message: string }[] = [];

  for (const donation of paidDonations || []) {
    const refundRes = await refundViaPayment(donation.trade_no, donation.amount);
    if (refundRes.success) {
      await query(`UPDATE bet_donations SET status = 'refunded' WHERE id = ?`, [donation.id]);
    }
    refundResults.push({ donationId: donation.id, success: refundRes.success, message: refundRes.message });
  }

  return refundResults;
};
