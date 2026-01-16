import React, { useState } from 'react';
import { CourseCard } from './CourseCard';
import { UnscheduledCourse } from './UnscheduledCourse';
import { useCourseStore } from '../../stores/courseStore';
import { Search } from 'lucide-react';

export const CourseList: React.FC = () => {
  // Subscribe to courseGroups to trigger re-render when courses are added/removed
  const courseGroups = useCourseStore((state) => state.courseGroups);
  const getScheduledCourses = useCourseStore((state) => state.getScheduledCourses);
  const getUnscheduledGroups = useCourseStore((state) => state.getUnscheduledGroups);
  const unscheduleSection = useCourseStore((state) => state.unscheduleSection);
  const [isDragOverUnscheduled, setIsDragOverUnscheduled] = useState(false);

  // Force re-render when courseGroups changes
  const scheduledCourses = getScheduledCourses();
  const unscheduledGroups = getUnscheduledGroups();
  
  // Prevent unused variable warning
  void courseGroups;

  const handleDragOverUnscheduled = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOverUnscheduled(true);
  };

  const handleDragLeaveUnscheduled = () => {
    setIsDragOverUnscheduled(false);
  };

  const handleDropOnUnscheduled = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverUnscheduled(false);
    
    const scheduledCourseKey = e.dataTransfer.getData('scheduledCourseKey');
    if (scheduledCourseKey) {
      unscheduleSection(scheduledCourseKey);
    }
  };

  return (
    <div className="h-full flex flex-col bg-dark-bg overflow-hidden">
      {/* Unscheduled Courses Section */}
      <div className="border-b border-gray-700">
        <div className="px-4 py-3 bg-dark-card">
          <h3 className="text-sm font-medium text-gray-300">
            {unscheduledGroups.length} Unscheduled Course{unscheduledGroups.length !== 1 ? 's' : ''}
          </h3>
        </div>
        <div 
          className={`px-4 py-3 bg-dark-bg space-y-2 min-h-[100px] transition-all ${
            isDragOverUnscheduled ? 'bg-green-900 bg-opacity-20 border-2 border-green-500 border-dashed' : ''
          }`}
          onDragOver={handleDragOverUnscheduled}
          onDragLeave={handleDragLeaveUnscheduled}
          onDrop={handleDropOnUnscheduled}
        >
          {unscheduledGroups.length === 0 ? (
            <div className="text-center text-gray-500 py-4">
              <Search size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-xs">
                {isDragOverUnscheduled 
                  ? 'Drop here to unschedule' 
                  : 'Search and Add courses then drop them here'
                }
              </p>
            </div>
          ) : (
            unscheduledGroups.map((group) => (
              <UnscheduledCourse
                key={group.courseKey}
                group={group}
                onDragStart={() => {}}
              />
            ))
          )}
        </div>
      </div>

      {/* Scheduled Course Cards List */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {scheduledCourses.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
            <p className="text-sm mb-2">No Scheduled Courses</p>
            <p className="text-xs text-gray-600">
              Move courses from above to schedule then drop them here
            </p>
          </div>
        ) : (
          scheduledCourses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))
        )}
      </div>
    </div>
  );
};
