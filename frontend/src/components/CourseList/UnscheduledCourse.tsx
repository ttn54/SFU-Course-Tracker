import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { CourseGroup } from '../../types';
import { useCourseStore } from '../../stores/courseStore';

interface UnscheduledCourseProps {
  group: CourseGroup;
  onDragStart: (group: CourseGroup) => void;
}

export const UnscheduledCourse: React.FC<UnscheduledCourseProps> = ({ group, onDragStart }) => {
  const removeCourseGroup = useCourseStore((state) => state.removeCourseGroup);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('courseKey', group.courseKey);
    e.dataTransfer.setData('courseGroup', JSON.stringify(group));
    onDragStart(group);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  // Count total sections
  const inPersonCount = group.sections.filter(s => s.section.includes('D')).length;
  const remoteCount = group.sections.filter(s => !s.section.includes('D')).length;

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={`bg-dark-card border border-gray-700 rounded-lg p-3 cursor-move hover:border-gray-500 transition-all ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-baseline space-x-2">
            <h4 className="text-base font-semibold text-white">
              {group.dept} {group.number}
            </h4>
            <span className="text-xs text-gray-500">
              {inPersonCount} in-persons
            </span>
            {remoteCount > 0 && (
              <span className="text-xs text-gray-500">
                & {remoteCount} remotes
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5 italic">• Drag to schedule</p>
        </div>
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            removeCourseGroup(group.courseKey);
          }}
          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-950 rounded transition-colors"
          title="Remove course"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
};
