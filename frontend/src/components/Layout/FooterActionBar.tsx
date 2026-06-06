import React, { useState } from 'react';
import { Download, Trash2, Cloud, X, AlertTriangle } from 'lucide-react';
import { useCourseStore } from '../../stores/courseStore';
import { showToast } from './Toast';

export const FooterActionBar: React.FC = () => {
  const getTotalCredits = useCourseStore((state) => state.getTotalCredits);
  const clearAll = useCourseStore((state) => state.clearAll);
  const getScheduledCourses = useCourseStore((state) => state.getScheduledCourses);
  const courseGroups = useCourseStore((state) => state.courseGroups);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  
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
    showToast('Schedule exported successfully', 'success');
  };

  const handleClearAll = () => {
    setShowConfirmModal(true);
  };

  const confirmClear = () => {
    clearAll();
    setShowConfirmModal(false);
    showToast('All courses cleared', 'success');
  };

  return (
    <>
      <div className="md:sticky md:bottom-0 bg-dark-card border-t border-gray-700 px-3 sm:px-4 py-3 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Left: Total Credits */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="text-xs sm:text-sm">
              <span className="text-gray-400">Courses:</span>
              <span className="ml-2 font-semibold text-white">{courseCount}</span>
            </div>
            <div className="h-6 w-px bg-gray-600" />
            <div className="text-xs sm:text-sm">
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
          <div className="flex items-center space-x-2 self-end sm:self-auto">
            <button 
              onClick={handleExport}
              className="flex items-center space-x-2 px-3 sm:px-4 py-2 bg-sfu-red hover:bg-red-800 rounded-lg text-xs sm:text-sm font-medium"
              title="Export schedule as JSON"
            >
              <Download size={16} />
              <span>Export</span>
            </button>
            
            <button 
              onClick={handleClearAll}
              className="flex items-center space-x-2 px-3 sm:px-4 py-2 bg-red-700 hover:bg-red-800 rounded-lg text-xs sm:text-sm font-medium"
              title="Clear all courses"
            >
              <Trash2 size={16} />
              <span>Clear All</span>
            </button>
          </div>
        </div>
      </div>

      {/* Clear All Confirmation Modal */}
      {showConfirmModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4"
          onClick={() => setShowConfirmModal(false)}
        >
          <div
            className="bg-dark-card border border-gray-600 rounded-lg p-6 max-w-sm w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-red-900/30 rounded-full">
                <AlertTriangle size={22} className="text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Clear All Courses?</h3>
            </div>
            <p className="text-sm text-gray-400 mb-6">
              This will remove all scheduled and unscheduled courses from your planner. This action cannot be undone.
            </p>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 px-4 py-2.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium text-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={confirmClear}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium text-white"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
