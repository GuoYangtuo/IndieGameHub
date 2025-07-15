import React, { useState, useCallback, forwardRef, useImperativeHandle, RefObject } from 'react';
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

// 为组件添加额外暴露的方法
interface DebouncedInputHandle {
  resetValue: () => void;
  inputElement: HTMLInputElement | HTMLTextAreaElement | null;
}

const DebouncedInput = forwardRef<DebouncedInputHandle, DebouncedInputProps>(({
  onDebouncedChange,
  onChange,
  debounceTime = 300,
  value: propValue,
  ...props
}, ref) => {
  // 内部状态跟踪输入值
  const [inputValue, setInputValue] = useState<string>(propValue as string || '');
  // 保存对内部TextField的ref
  const inputRef = React.useRef<HTMLDivElement>(null);
  
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

  // 添加重置值的方法
  const resetValue = () => {
    setInputValue('');
    if (onDebouncedChange) {
      onDebouncedChange('');
    }
  };

  // 获取实际的input或textarea元素
  const getInputElement = (): HTMLInputElement | HTMLTextAreaElement | null => {
    if (!inputRef.current) return null;
    return inputRef.current.querySelector('input, textarea') as HTMLInputElement | HTMLTextAreaElement | null;
  };

  // 暴露方法给父组件
  useImperativeHandle(ref, () => ({
    resetValue,
    get inputElement() {
      return getInputElement();
    }
  }));

  return (
    <TextField
      {...props}
      value={inputValue}
      onChange={handleChange}
      ref={inputRef}
    />
  );
});

export default DebouncedInput; 