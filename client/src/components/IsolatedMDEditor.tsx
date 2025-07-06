import React, { useState, useRef, useEffect } from 'react';
import MDEditor, { PreviewType } from '@uiw/react-md-editor';

interface IsolatedMDEditorProps {
  initialValue?: string;
  onValueChange?: (value: string) => void;
  height?: number;
  preview?: PreviewType;
  [key: string]: any; // 其他MDEditor的属性
}

/**
 * 隔离重绘的Markdown编辑器组件
 * 内容变化只会重绘自身，而不会影响父组件
 */
const IsolatedMDEditor: React.FC<IsolatedMDEditorProps> = ({
  initialValue = '',
  onValueChange,
  height = 200,
  preview = "edit",
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
  const handleChange = (newValue: string | undefined) => {
    const value = newValue || '';
    // 更新ref和内部状态
    valueRef.current = value;
    setLocalValue(value);
    
    // 调用回调函数
    if (onValueChange) {
      onValueChange(value);
    }
  };

  return (
    <MDEditor
      value={localValue}
      onChange={handleChange}
      height={height}
      preview={preview}
      {...props}
    />
  );
};

export default React.memo(IsolatedMDEditor); 