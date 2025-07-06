import React, { useState, useEffect } from 'react';
import MDEditor, { PreviewType } from '@uiw/react-md-editor';
import useDebounce from '../hooks/useDebounce';

interface DebouncedMDEditorProps {
  value: string;
  onChange: (value: string | undefined) => void;
  height?: number;
  preview?: PreviewType;
  debounceTime?: number;
  [key: string]: any; // 其他MDEditor的属性
}

/**
 * 带防抖功能的Markdown编辑器组件
 * 仅在用户停止输入一段时间后才会触发onChange事件
 */
const DebouncedMDEditor: React.FC<DebouncedMDEditorProps> = ({
  value,
  onChange,
  height = 200,
  preview = "edit",
  debounceTime = 300,
  ...props
}) => {
  // 内部状态跟踪输入值
  const [inputValue, setInputValue] = useState<string>(value || '');
  
  // 当外部value变化时更新内部状态
  useEffect(() => {
    setInputValue(value);
  }, [value]);
  
  // 防抖处理后的值
  const debouncedValue = useDebounce<string>(inputValue, debounceTime);

  // 当防抖值变化时触发回调
  useEffect(() => {
    if (debouncedValue !== value) {
      onChange(debouncedValue);
    }
  }, [debouncedValue, onChange, value]);

  // 处理输入变化
  const handleChange = (newValue: string | undefined) => {
    setInputValue(newValue || '');
  };

  return (
    <MDEditor
      value={inputValue}
      onChange={handleChange}
      height={height}
      preview={preview}
      {...props}
    />
  );
};

export default DebouncedMDEditor; 