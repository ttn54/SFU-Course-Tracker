import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Trash2, MapPin } from 'lucide-react';
import { CourseSection } from '../../types';
import { useCourseStore } from '../../stores/courseStore';
import { useSingleEnrollment } from '../../hooks/useEnrollmentData';
import { api } from '../../services/api';

interface CourseCardProps {
  course: CourseSection;
}

export const CourseCard: React.FC<CourseCardProps> = ({ course }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [profRating, setProfRating] = useState<any>(null);
  const [ratingLoading, setRatingLoading] = useState(false);
  
  const courseGroups = useCourseStore((state) => state.courseGroups);
  const unscheduleSection = useCourseStore((state) => state.unscheduleSection);

  // For combined sections like "D100+D102", extract the lecture section (D100) for enrollment data
  const lectureSection = course.section.includes('+') 
    ? course.section.split('+')[0] // Get D100 from "D100+D102"
    : course.section;

  // Fetch live enrollment data using lecture section only
  const enrollmentData = useSingleEnrollment(
    course.dept,
    course.number,
    lectureSection,
    '2025/fall'
  );

  // Generate term string for CourSys URL (e.g., "2025fa" for Fall 2025)
  const termCode = "2025fa";
  
  // Convert section format: "D100" -> "d1", "D101" -> "d1", "D200" -> "d2"
  const sectionCode = lectureSection.toLowerCase().replace(/^([a-z])(\d)\d+$/, '$1$2');

  // Find the course group this belongs to
  const courseGroup = courseGroups.find(g => 
    g.sections.some(s => s.id === course.id)
  );

  // Fetch professor rating when card is expanded
  useEffect(() => {
    if (isExpanded && !profRating && !ratingLoading && course.instructor !== 'TBA') {
      setRatingLoading(true);
      api.getProfessorRating(course.instructor)
        .then(result => {
          if (result.found && result.data) {
            setProfRating(result.data);
          }
        })
        .catch(err => console.error('Failed to fetch professor rating:', err))
        .finally(() => setRatingLoading(false));
    }
  }, [isExpanded, course.instructor, profRating, ratingLoading]);

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (courseGroup) {
      unscheduleSection(courseGroup.courseKey);
    }
  };

  return (
    <div className="bg-dark-card border border-gray-700 rounded-lg overflow-hidden hover:border-gray-600 transition-colors">
      {/* Header */}
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-dark-card-hover"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-3 flex-1">
          <div 
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: course.color }}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline space-x-2">
              <h3 className="text-lg font-semibold text-white">
                {course.dept} {course.number} {course.section}
              </h3>
              <span className="text-sm text-gray-400">({course.title})</span>
            </div>
            <div className="flex items-center space-x-3 mt-1 text-sm text-gray-400">
              <span>{course.credits} credits</span>
              <span className="flex items-center space-x-1">
                <MapPin size={14} />
                <span>{course.location}</span>
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={handleRemove}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-950 rounded transition-colors"
            title="Unschedule course"
          >
            <Trash2 size={18} />
          </button>
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* 4-Column Stats Grid - Responsive */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-dark-bg rounded-lg p-4">
            {/* Enrollment Count */}
            <div className="flex flex-col min-h-[100px]">
              <div className="text-xs text-gray-500 mb-2 font-medium">Enrolled Count</div>
              <div className="text-lg font-semibold text-white mb-1">
                {enrollmentData.loading ? (
                  <span className="text-gray-400 text-sm">Loading...</span>
                ) : enrollmentData.error ? (
                  <span className="text-red-400 text-sm">Error</span>
                ) : (
                  enrollmentData.enrolled
                )}
              </div>
              {enrollmentData.waitlist && (
                <div className="text-xs text-gray-400 mb-2">
                  ({enrollmentData.waitlist}W)
                </div>
              )}
              <a 
                href={`https://coursys.sfu.ca/browse/info/${termCode}-${course.dept.toLowerCase()}-${course.number}-${sectionCode}`}
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 hover:underline mt-auto break-words"
              >
                CourSys.sfu.ca
              </a>
            </div>
            
            {/* Professor Rating */}
            <div className="flex flex-col min-h-[100px]">
              <div className="text-xs text-gray-500 mb-2 font-medium">Professor Rating</div>
              {ratingLoading ? (
                <div className="text-sm font-medium text-gray-400 mb-2">Loading...</div>
              ) : profRating ? (
                <>
                  <div className="text-lg font-semibold text-yellow-400 mb-1">
                    {profRating.rating}/5
                  </div>
                  <div className="text-xs text-gray-400 mb-2">
                    ({profRating.numRatings} ratings)
                  </div>
                </>
              ) : (
                <div className="text-sm font-medium text-gray-400 mb-2">
                  {course.instructor === 'TBA' ? 'TBA' : 'Not found'}
                </div>
              )}
              <a 
                href={profRating 
                  ? `https://www.ratemyprofessors.com/professor/${profRating.rmpId}` 
                  : `https://www.ratemyprofessors.com/search/professors/1482?q=${encodeURIComponent(course.instructor)}`}
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 hover:underline mt-auto break-words"
              >
                RateMyProfessors.com
              </a>
            </div>
            
            {/* Average Grade */}
            <div className="flex flex-col min-h-[100px]">
              <div className="text-xs text-gray-500 mb-2 font-medium">Average Grade</div>
              <div className="text-lg font-semibold text-green-400 mb-1">
                {course.stats.avgGrade}
              </div>
              <div className="text-xs text-gray-400 mb-2">
                (may be outdated)
              </div>
              <a 
                href={`https://coursediggers.com/`}
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 hover:underline mt-auto break-words"
              >
                CourseDiggers.com
              </a>
            </div>
            
            {/* Textbook ISBN */}
            <div className="flex flex-col min-h-[100px]">
              <div className="text-xs text-gray-500 mb-2 font-medium">Textbook ISBN</div>
              <div className="text-sm font-medium text-white mb-2 break-words">
                {course.stats.textbookISBN}
              </div>
              {course.stats.textbookISBN !== 'None' && (
                <a 
                  href={`https://shop.sfu.ca/Item?item=${course.stats.textbookISBN}#item=${course.stats.textbookISBN}`}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:text-blue-300 hover:underline mt-auto break-words"
                >
                  shop.sfu.ca
                </a>
              )}
            </div>
          </div>

          {/* Schedule Info */}
          <div className="space-y-2">
            <div className="text-sm font-semibold text-gray-300">Schedule:</div>
            {course.schedule.map((sched, idx) => (
              <div key={idx} className="text-sm text-gray-400 flex items-center space-x-2">
                <span className="font-medium text-gray-300">{sched.type}:</span>
                <span>{sched.day} {sched.startTime} - {sched.endTime}</span>
              </div>
            ))}
          </div>

          {/* Instructor Info */}
          <div className="text-sm text-gray-400">
            <span className="font-medium text-gray-300">Instructor:</span> {course.instructor}
          </div>
        </div>
      )}
    </div>
  );
};
