import React, { useState, useRef, useEffect } from 'react';
import { TextField, TextFieldProps } from '@mui/material';

/**
 * 隔离重绘的输入框组件
 * 输入框的内容变化只会重绘自身，而不会影响父组件
 */
interface IsolatedInputProps extends Omit<TextFieldProps, 'onChange' | 'value'> {
  // 初始值
  initialValue?: string;
  // 当值变化时的回调函数
  onValueChange?: (value: string) => void;
}

const IsolatedInput: React.FC<IsolatedInputProps> = ({
  initialValue = '',
  onValueChange,
  ...props
}) => {
  // 使用ref来避免重复渲染
  const valueRef = useRef<string>(initialValue);
  // 内部状态，只在组件内部使用
  const [localValue, setLocalValue] = useState<string>(initialValue);
  
  // 当初始值变化时更新内部状态和ref
  useEffect(() => {
    if (initialValue !== valueRef.current) {
      valueRef.current = initialValue;
      setLocalValue(initialValue);
    }
  }, [initialValue]);

  // 处理输入变化
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    // 更新ref和内部状态
    valueRef.current = newValue;
    setLocalValue(newValue);
    
    // 调用回调函数
    if (onValueChange) {
      onValueChange(newValue);
    }
  };

  return (
    <TextField
      {...props}
      value={localValue}
      onChange={handleChange}
    />
  );
};

export default React.memo(IsolatedInput); 