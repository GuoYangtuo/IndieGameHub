import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

/**
 * 格式化日期为本地时间字符串
 * @param dateString ISO格式的日期字符串
 * @returns 格式化的日期字符串 (如: 2023年3月15日)
 */
export const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'Asia/Shanghai' // 使用中国时区
    });
  } catch (error) {
    return '未知日期';
  }
};

/**
 * 格式化日期和时间为本地时间字符串
 * @param dateString ISO格式的日期字符串
 * @returns 格式化的日期和时间字符串 (如: 2023年3月15日 14:30)
 */
export const formatDateTime = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Shanghai' // 使用中国时区
    });
  } catch (error) {
    return '未知日期';
  }
};

/**
 * 格式化相对时间 (如: 3天前, 2小时前)
 * @param dateString ISO格式的日期字符串
 * @returns 格式化的相对时间字符串
 */
export const formatRelativeTime = (dateString: string): string => {
  try {
    // 先将日期转换为中国时区的时间
    const utcDate = new Date(dateString);
    
    // 创建一个表示相同时刻但使用本地时区解释的日期对象
    // 这样在计算相对时间时就会考虑正确的时区偏移
    const chinaTimeOffset = 8 * 60 * 60 * 1000; // 中国时区偏移UTC 8小时（毫秒）
    const localDate = new Date(utcDate.getTime() + chinaTimeOffset);
    
    return formatDistanceToNow(localDate, {
      addSuffix: true,
      locale: zhCN
    });
  } catch (error) {
    return '未知时间';
  }
};

/**
 * 将日期字符串转换为 YYYY-MM-DD 格式
 * @param dateString ISO格式的日期字符串
 * @returns YYYY-MM-DD 格式的日期
 */
export const toDateString = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch (error) {
    return '';
  }
};

/**
 * 安全地将字符串解析为Date对象
 * @param dateString ISO格式的日期字符串
 * @returns Date对象或null（如果解析失败）
 */
export const parseDate = (dateString: string | undefined): Date | null => {
  if (!dateString) return null;
  try {
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
  } catch (error) {
    return null;
  }
};

/**
 * 判断两个日期是否是同一天
 * @param date1 第一个日期字符串
 * @param date2 第二个日期字符串
 * @returns 是否是同一天
 */
export const isSameDay = (date1: string, date2: string): boolean => {
  try {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  } catch (error) {
    return false;
  }
}; 