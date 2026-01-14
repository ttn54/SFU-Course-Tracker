import React, { useState, useRef, useEffect } from 'react';
import { GlobalHeader } from './GlobalHeader';
import { ControlBar } from './ControlBar';
import { WeeklyCalendar } from '../Calendar/WeeklyCalendar';
import { CourseList } from '../CourseList/CourseList';
import { FooterActionBar } from './FooterActionBar';

export const MainLayout: React.FC = () => {
  const [rightPanelWidth, setRightPanelWidth] = useState(400);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !containerRef.current) return;

      const container = containerRef.current;
      const containerRect = container.getBoundingClientRect();
      const newWidth = containerRect.right - e.clientX;

      // Set min width to 400px and max width to 60% of container
      const minWidth = 400;
      const maxWidth = containerRect.width * 0.6;
      
      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setRightPanelWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  return (
    <div className="h-screen flex flex-col bg-dark-bg">
      {/* Header */}
      <GlobalHeader />
      
      {/* Control Bar */}
      <ControlBar />
      
      {/* Main Content: Resizable 2-Column Layout */}
      <div ref={containerRef} className="flex-1 flex overflow-hidden relative">
        {/* Left Column: Calendar */}
        <div 
          className="flex-1 border-r border-gray-700 overflow-hidden"
          style={{ width: `calc(100% - ${rightPanelWidth}px)` }}
        >
          <WeeklyCalendar />
        </div>
        
        {/* Resize Handle */}
        <div
          onMouseDown={handleMouseDown}
          className={`w-1 bg-gray-700 hover:bg-sfu-red cursor-col-resize transition-colors relative group ${
            isResizing ? 'bg-sfu-red' : ''
          }`}
          style={{ flexShrink: 0 }}
        >
          {/* Visual indicator on hover */}
          <div className="absolute inset-y-0 -left-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="h-full w-3 bg-sfu-red/20"></div>
          </div>
        </div>
        
        {/* Right Column: Course List */}
        <div 
          className="flex flex-col overflow-hidden"
          style={{ width: `${rightPanelWidth}px`, flexShrink: 0 }}
        >
          <div className="flex-1 overflow-hidden">
            <CourseList />
          </div>
          <FooterActionBar />
        </div>
      </div>
    </div>
  );
};
