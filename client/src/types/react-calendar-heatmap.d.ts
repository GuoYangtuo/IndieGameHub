declare module 'react-calendar-heatmap' {
  import React from 'react';
  
  interface CalendarHeatmapProps {
    values: Array<{
      date: Date;
      count: number;
      [key: string]: any;
    }>;
    startDate: Date;
    endDate: Date;
    classForValue?: (value: any) => string;
    tooltipDataAttrs?: (value: any) => { [key: string]: string } | null;
    [key: string]: any;
  }
  
  const CalendarHeatmap: React.FC<CalendarHeatmapProps>;
  
  export default CalendarHeatmap;
} 