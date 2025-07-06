import { useState, useEffect } from 'react';

/**
 * 创建一个防抖钩子，用于延迟处理输入框等快速变化的值
 * @param value 需要防抖的值
 * @param delay 延迟时间（毫秒）
 * @returns 防抖后的值
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // 设置定时器以延迟更新防抖值
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // 清除函数，在下一次effect执行前或组件卸载时调用
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]); // 依赖于输入值和延迟时间

  return debouncedValue;
}

export default useDebounce; 