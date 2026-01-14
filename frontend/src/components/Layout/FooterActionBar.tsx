import React from 'react';
import { Download, Trash2, Cloud } from 'lucide-react';
import { useCourseStore } from '../../stores/courseStore';

export const FooterActionBar: React.FC = () => {
  const getTotalCredits = useCourseStore((state) => state.getTotalCredits);
  const clearAll = useCourseStore((state) => state.clearAll);
  const getScheduledCourses = useCourseStore((state) => state.getScheduledCourses);
  const courseGroups = useCourseStore((state) => state.courseGroups);
  
  const totalCredits = getTotalCredits();
  const scheduledCourses = getScheduledCourses();
  const courseCount = scheduledCourses.length;

  const handleExport = () => {
    const dataStr = JSON.stringify(courseGroups, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sfu-schedule-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all courses? This will remove all scheduled and unscheduled courses.')) {
      clearAll();
    }
  };

  return (
    <div className="sticky bottom-0 bg-dark-card border-t border-gray-700 px-4 py-3 shadow-2xl">
      <div className="flex items-center justify-between">
        {/* Left: Total Credits */}
        <div className="flex items-center space-x-4">
          <div className="text-sm">
            <span className="text-gray-400">Courses:</span>
            <span className="ml-2 font-semibold text-white">{courseCount}</span>
          </div>
          <div className="h-6 w-px bg-gray-600" />
          <div className="text-sm">
            <span className="text-gray-400">Total Credits:</span>
            <span className="ml-2 font-semibold text-white">{totalCredits}</span>
          </div>
          <div className="h-6 w-px bg-gray-600" />
          <div className="flex items-center space-x-2 text-xs text-green-400">
            <Cloud size={14} />
            <span>Auto-saved</span>
          </div>
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center space-x-2">
          <button 
            onClick={handleExport}
            className="flex items-center space-x-2 px-4 py-2 bg-sfu-red hover:bg-red-800 rounded-lg transition-colors text-sm font-medium"
            title="Export schedule as JSON"
          >
            <Download size={16} />
            <span>Export</span>
          </button>
          
          <button 
            onClick={handleClearAll}
            className="flex items-center space-x-2 px-4 py-2 bg-red-700 hover:bg-red-800 rounded-lg transition-colors text-sm font-medium"
            title="Clear all courses"
          >
            <Trash2 size={16} />
            <span>Clear All</span>
          </button>
        </div>
      </div>
    </div>
  );
};
