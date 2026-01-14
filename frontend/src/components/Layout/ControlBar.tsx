import React, { useState, useEffect } from 'react';
import { Filter, Search, Plus } from 'lucide-react';
import { useCourseStore } from '../../stores/courseStore';
import { CourseGroup } from '../../types';
import { api } from '../../services/api';
import { generateCourseColor } from '../../utils/colorGenerator';

// Static department list for now
const departments = [
  'CMPT - Computing Science',
  'MATH - Mathematics',
  'MACM - Mathematics and Computing Science',
  'STAT - Statistics'
];

const terms = ['Fall 2025', 'Spring 2026', 'Summer 2026'];

export const ControlBar: React.FC = () => {
  const [selectedTerm, setSelectedTerm] = useState('Fall 2025');
  const [selectedDept, setSelectedDept] = useState('CMPT - Computing Science');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<CourseGroup | null>(null);
  const [allCourses, setAllCourses] = useState<CourseGroup[]>([]);
  
  const addCourseGroup = useCourseStore((state) => state.addCourseGroup);
  const courseGroups = useCourseStore((state) => state.courseGroups);

  // Fetch all courses from backend on mount
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const rawCourses = await api.getAllCourses();
        
        // Group courses by dept + number (multiple sections → 1 course group)
        const courseMap = new Map<string, any>();
        
        rawCourses.forEach((rawCourse: any) => {
          const info = rawCourse.info || {};
          const dept = info.dept || '';
          const number = info.number || '';
          const courseKey = `${dept}-${number}`;
          const sectionCode = info.section || '';
          
          // Parse schedule into the format CourseSection expects
          const schedule = (rawCourse.courseSchedule || []).map((sched: any) => {
            const daysStr = sched.days || '';
            const dayMap: Record<string, 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri'> = {
              'Mo': 'Mon',
              'Tu': 'Tue',
              'We': 'Wed',
              'Th': 'Thu',
              'Fr': 'Fri'
            };
            
            // Parse "Mo, We, Fr" into individual days
            return daysStr.split(',').map((d: string) => {
              const day = d.trim();
              return {
                day: dayMap[day] || 'Mon',
                startTime: sched.startTime || '00:00',
                endTime: sched.endTime || '00:00',
                type: info.type === 'e' ? 'Lecture' as const : 
                      info.type === 'l' ? 'Lab' as const : 
                      'Tutorial' as const
              };
            });
          }).flat();
          
          // Parse enrollment
          const enrollmentData = rawCourse.enrollmentData || {};
          const enrolled = enrollmentData.enrolled || '0/0';
          const waitlist = enrollmentData.waitlist || '0';
          
          // Create CourseSection object matching the type definition
          const section = {
            id: `${courseKey}-${sectionCode}`,
            dept,
            number,
            section: sectionCode,
            title: info.title || '',
            instructor: rawCourse.instructor?.[0]?.name || 'TBA',
            credits: parseInt(info.units) || 3,
            location: (rawCourse.courseSchedule?.[0]?.campus || 'TBA') + 
                     (rawCourse.courseSchedule?.[0]?.roomNumber ? ` ${rawCourse.courseSchedule[0].roomNumber}` : ''),
            schedule,
            stats: {
              enrolled,
              waitlist: waitlist !== '0' ? `(${waitlist}W)` : '',
              profRating: 'N/A',
              avgGrade: 'N/A',
              textbookISBN: 'None'
            },
            color: generateCourseColor(courseKey) // Generate unique color per course
          };
          
          if (!courseMap.has(courseKey)) {
            courseMap.set(courseKey, {
              courseKey,
              dept,
              number,
              title: info.title || '',
              sections: [section],
              isScheduled: false,
              scheduledSectionId: undefined
            });
          } else {
            courseMap.get(courseKey).sections.push(section);
          }
        });
        
        setAllCourses(Array.from(courseMap.values()));
      } catch (error) {
        console.error('Failed to fetch courses:', error);
      }
    };

    fetchCourses();
  }, []); // Only fetch once on mount

  // Filter available courses based on search query, selected department, and what's not already added
  const availableCourses = allCourses.filter(course => {
    const isAlreadyAdded = courseGroups.some(g => g.courseKey === course.courseKey);
    if (isAlreadyAdded) return false;
    
    // Extract department code from selected department (e.g., "CMPT - Computing Science" -> "CMPT")
    const selectedDeptCode = selectedDept.split(' - ')[0];
    
    // Filter by department first
    if (course.dept !== selectedDeptCode) return false;
    
    if (!searchQuery) return false;
    
    const query = searchQuery.toLowerCase();
    return (
      course.number.toLowerCase().includes(query) ||
      course.title.toLowerCase().includes(query) ||
      course.courseKey.toLowerCase().includes(query)
    );
  });

  const handleSelectCourse = (course: CourseGroup) => {
    setSelectedCourse(course);
    setSearchQuery(`${course.dept} ${course.number}`);
    setShowSuggestions(false);
  };

  const handleAddCourse = async () => {
    if (selectedCourse) {
      // Add as unscheduled
      const result = await addCourseGroup({
        ...selectedCourse,
        isScheduled: false,
        scheduledSectionId: undefined
      });
      
      if (!result.success) {
        alert(result.error || 'Failed to add course');
        return;
      }
      
      setSelectedCourse(null);
      setSearchQuery('');
    }
  };

  return (
    <div className="w-full bg-dark-card border-b border-gray-700 px-6 py-4">
      <div className="flex items-center space-x-4">
        {/* Filter Button */}
        <button className="flex items-center space-x-2 px-4 py-2 border border-gray-600 rounded-lg hover:bg-dark-card-hover transition-colors">
          <Filter size={18} />
          <span className="text-sm">Filter</span>
        </button>

        {/* Term Selector */}
        <select
          value={selectedTerm}
          onChange={(e) => setSelectedTerm(e.target.value)}
          className="px-4 py-2 bg-dark-bg border border-gray-600 rounded-lg text-sm hover:border-gray-500 focus:outline-none focus:border-sfu-red transition-colors"
        >
          {terms.map((term) => (
            <option key={term} value={term}>
              {term}
            </option>
          ))}
        </select>

        {/* Department Selector */}
        <select
          value={selectedDept}
          onChange={(e) => setSelectedDept(e.target.value)}
          className="px-4 py-2 bg-dark-bg border border-gray-600 rounded-lg text-sm hover:border-gray-500 focus:outline-none focus:border-sfu-red transition-colors min-w-[250px]"
        >
          {departments.map((dept) => (
            <option key={dept} value={dept}>
              {dept}
            </option>
          ))}
        </select>

        {/* Search Input with Suggestions */}
        <div className="flex-1 relative">
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                <Search size={18} />
              </div>
              <input
                type="text"
                placeholder="Search courses..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSelectedCourse(null);
                  setShowSuggestions(e.target.value.length > 0);
                }}
                onFocus={() => searchQuery && setShowSuggestions(true)}
                className="w-full pl-10 pr-4 py-2 bg-dark-bg border border-gray-600 rounded-lg text-sm hover:border-gray-500 focus:outline-none focus:border-sfu-red transition-colors"
              />
              
              {/* Suggestions Dropdown */}
              {showSuggestions && availableCourses.length > 0 && (
                <div 
                  className="absolute top-full left-0 right-0 mt-2 bg-dark-card border border-gray-600 rounded-lg shadow-xl z-50 max-h-80 overflow-y-auto"
                  onMouseDown={(e) => e.preventDefault()}
                >
                  {availableCourses.map((course) => (
                    <div
                      key={course.courseKey}
                      onClick={() => handleSelectCourse(course)}
                      className="px-4 py-3 hover:bg-dark-card-hover cursor-pointer border-b border-gray-700 last:border-b-0"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-semibold text-sm">{course.dept} {course.number} - {course.title}</div>
                          <div className="flex items-center gap-2 mt-1">
                            {course.offeringFrequency && (
                              <span className={`text-xs px-2 py-1 rounded ${course.offeringFrequency.color} text-white`}>
                                {course.offeringFrequency.label}
                              </span>
                            )}
                            <span className="text-xs text-gray-400">
                              {course.sections.length} section{course.sections.length !== 1 ? 's' : ''} available
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {showSuggestions && availableCourses.length === 0 && searchQuery && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-dark-card border border-gray-600 rounded-lg shadow-xl z-50">
                  <div className="px-4 py-3 text-sm text-gray-400 text-center">
                    No courses found
                  </div>
                </div>
              )}
            </div>
            
            {/* Add Button */}
            <button 
              onClick={handleAddCourse}
              disabled={!selectedCourse}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                selectedCourse 
                  ? 'bg-sfu-red hover:bg-red-800 cursor-pointer' 
                  : 'bg-gray-600 cursor-not-allowed opacity-50'
              }`}
            >
              <Plus size={18} />
              <span className="text-sm font-semibold">Add</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
