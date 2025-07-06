declare module 'react-tooltip' {
  import React from 'react';
  
  interface ReactTooltipProps {
    id?: string;
    place?: 'top' | 'right' | 'bottom' | 'left';
    type?: 'dark' | 'success' | 'warning' | 'error' | 'info' | 'light';
    effect?: 'float' | 'solid';
    multiline?: boolean;
    border?: boolean;
    className?: string;
    delayHide?: number;
    delayShow?: number;
    delayUpdate?: number;
    event?: 'mouseenter' | 'mouseover' | 'mouseleave' | 'mouseout' | 'focus' | 'click';
    eventOff?: 'mouseenter' | 'mouseover' | 'mouseleave' | 'mouseout' | 'focus' | 'click';
    html?: boolean;
    getContent?: string | ((dataTip: string) => React.ReactNode);
    isCapture?: boolean;
    offset?: { top?: number; right?: number; left?: number; bottom?: number };
    resizeHide?: boolean;
    scrollHide?: boolean;
    wrapper?: 'div' | 'span';
    children?: React.ReactNode;
    [key: string]: any;
  }
  
  const ReactTooltip: React.FC<ReactTooltipProps> & {
    rebuild: () => void;
    hide: () => void;
    show: (target: HTMLElement) => void;
  };
  
  export default ReactTooltip;
} 