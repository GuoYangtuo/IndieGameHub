import React, { useState, useCallback } from 'react';
import { TextField, TextFieldProps } from '@mui/material';
import useDebounce from '../hooks/useDebounce';

/**
 * 带防抖功能的输入框组件
 * 仅在用户停止输入一段时间后才会触发onChange事件
 */
interface DebouncedInputProps extends Omit<TextFieldProps, 'onChange'> {
  // 实际值变化的回调函数，只在防抖后触发
  onDebouncedChange?: (value: string) => void;
  // 原始onChange事件，每次输入都会触发
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  // 防抖延迟时间（毫秒）
  debounceTime?: number;
}

const DebouncedInput: React.FC<DebouncedInputProps> = ({
  onDebouncedChange,
  onChange,
  debounceTime = 300,
  value: propValue,
  ...props
}) => {
  // 内部状态跟踪输入值
  const [inputValue, setInputValue] = useState<string>(propValue as string || '');
  
  // 防抖处理后的值
  const debouncedValue = useDebounce<string>(inputValue, debounceTime);

  // 当防抖值变化时触发回调
  React.useEffect(() => {
    if (onDebouncedChange && debouncedValue !== propValue) {
      onDebouncedChange(debouncedValue);
    }
  }, [debouncedValue, onDebouncedChange, propValue]);

  // 处理输入变化
  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      // 更新内部状态
      setInputValue(event.target.value);
      
      // 如果提供了原始onChange，仍然调用它
      if (onChange) {
        onChange(event);
      }
    },
    [onChange]
  );

  return (
    <TextField
      {...props}
      value={inputValue}
      onChange={handleChange}
    />
  );
};

export default DebouncedInput; 