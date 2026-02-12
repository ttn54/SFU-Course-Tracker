import React, { useState, useEffect } from 'react';
import { Filter, Search, Plus, X } from 'lucide-react';
import { useCourseStore } from '../../stores/courseStore';
import type { CourseGroup } from '../../types';
import { api } from '../../services/api';
import { generateCourseColor } from '../../utils/colorGenerator';

// Department name mapping
const DEPT_NAMES: Record<string, string> = {
 'ALS': 'Applied and Liberal Studies',
  'APMA': 'Applied Mathematics',
  'ARCH': 'Architecture',
  'BISC': 'Biological Sciences',
  'BPK': 'Biomedical Physiology and Kinesiology',
  'BUS': 'Business Administration',
  'CA': 'Contemporary Arts',
  'CENV': 'Centre for Environmental Assessment',
  'CHEM': 'Chemistry',
  'CHIN': 'Chinese',
  'CMNS': 'Communication',
  'CMPT': 'Computing Science',
  'COGS': 'Cognitive Science',
  'CRIM': 'Criminology',
  'DATA': 'Data Science',
  'DMED': 'Digital Media',
  'EASC': 'Earth Sciences',
  'ECON': 'Economics',
  'EDUC': 'Education',
  'ENGL': 'English',
  'ENSC': 'Engineering Science',
  'EVSC': 'Environmental Science',
  'FAL': 'Fine and Applied Arts',
  'FAN': 'First Nations Studies',
  'FASS': 'Faculty of Arts and Social Sciences',
  'FEP': 'Field Experience Program',
  'FREN': 'French',
  'GA': 'Gender, Sexuality, and Women\'s Studies',
  'GEOG': 'Geography',
  'GERM': 'German',
  'GERO': 'Gerontology',
  'GRAD': 'Graduate Studies',
  'GRK': 'Greek',
  'GSWS': 'Gender, Sexuality, and Women\'s Studies',
  'HIST': 'History',
  'HSCI': 'Health Sciences',
  'HUM': 'Humanities',
  'IAT': 'Interactive Arts and Technology',
  'INDG': 'Indigenous Studies',
  'INLG': 'International Languages',
  'INS': 'International Studies',
  'IS': 'International Studies',
  'ITAL': 'Italian',
  'JAPN': 'Japanese',
  'LBRL': 'Liberal Studies',
  'LBST': 'Liberal Studies',
  'LING': 'Linguistics',
  'LS': 'Labour Studies',
  'MACM': 'Mathematics and Computing Science',
  'MASC': 'Mathematics and Statistics',
  'MATH': 'Mathematics',
  'MBB': 'Molecular Biology and Biochemistry',
  'MSE': 'Mechatronic Systems Engineering',
  'NEUR': 'Neuroscience',
  'NUSC': 'Nuclear Science',
  'ONC': 'Online Learning',
  'PHIL': 'Philosophy',
  'PHYS': 'Physics',
  'PLAN': 'Urban Studies and Planning',
  'PLCY': 'Public Policy',
  'POL': 'Political Science',
  'PORT': 'Portuguese',
  'PSYC': 'Psychology',
  'PUB': 'Public Policy',
  'PUNJ': 'Punjabi',
  'REM': 'Resource and Environmental Management',
  'RISK': 'Risk Management',
  'SA': 'Study Abroad',
  'SCI': 'Science',
  'SD': 'Sustainable Development',
  'SDA': 'Sustainable Development',
  'SEE': 'Software Engineering',
  'SPAN': 'Spanish',
  'STAT': 'Statistics',
  'TEKX': 'Technical Studies',
  'URB': 'Urban Studies',
  'WL': 'World Literature'
};

const terms = ['Spring 2026', 'Summer 2026'];

export const ControlBar: React.FC = () => {
  const [selectedTerm, setSelectedTerm] = useState('Spring 2026');
  const [selectedDept, setSelectedDept] = useState('CMPT');
  const [departments, setDepartments] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<CourseGroup | null>(null);
  const [allCourses, setAllCourses] = useState<CourseGroup[]>([]);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState({
    hasSeats: false,
    noWaitlist: false,
    minCredits: '',
    maxCredits: '',
    onlyUpperDiv: false,
  });
  
  const addCourseGroup = useCourseStore((state) => state.addCourseGroup);
  const courseGroups = useCourseStore((state) => state.courseGroups);

  // Fetch departments on mount
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const depts = await api.getDepartments();
        setDepartments(depts);
        if (depts.length > 0 && !depts.includes(selectedDept)) {
          setSelectedDept(depts[0]);
        }
      } catch (error) {
        console.error('Failed to fetch departments:', error);
      }
    };
    fetchDepartments();
  }, []);

  // Fetch all courses from backend when term changes
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        // Parse term like "Spring 2026" into term="spring" and year="2026"
        const [termName, yearStr] = selectedTerm.split(' ');
        const term = termName.toLowerCase();
        const year = yearStr;
        
        const rawCourses = await api.getAllCourses(term, year);
        
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
            color: generateCourseColor(courseKey)
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
  }, [selectedTerm]);

  // Filter available courses based on search query, selected department, and what's not already added
  const availableCourses = allCourses.filter(course => {
    const isAlreadyAdded = courseGroups.some(g => g.courseKey === course.courseKey);
    if (isAlreadyAdded) return false;
    
    // Filter by department
    if (course.dept !== selectedDept) return false;
    
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
    <>
      <div className="w-full bg-dark-card border-b border-gray-700 px-6 py-4">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => setShowFilterModal(true)}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-600 rounded-lg hover:bg-dark-card-hover transition-colors"
          >
            <Filter size={18} />
            <span className="text-sm">Filter</span>
          </button>

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

        <select
          value={selectedDept}
          onChange={(e) => setSelectedDept(e.target.value)}
          className="px-4 py-2 bg-dark-bg border border-gray-600 rounded-lg text-sm hover:border-gray-500 focus:outline-none focus:border-sfu-red transition-colors min-w-[250px]"
        >
          {departments.map((dept) => (
            <option key={dept} value={dept}>
              {dept} - {DEPT_NAMES[dept] || dept}
            </option>
          ))}
        </select>

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
                          <div className="font-semibold text-sm text-white">{course.dept} {course.number} - {course.title}</div>
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

<<<<<<< HEAD
=======
    {/* Filter Modal */}
>>>>>>> 2e23994ec15f435229ed96a6369f9f40839d0d9b
    {showFilterModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowFilterModal(false)}>
        <div className="bg-dark-card border border-gray-600 rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-white flex items-center space-x-2">
              <Filter size={24} />
              <span>Filter Courses</span>
            </h3>
            <button onClick={() => setShowFilterModal(false)} className="p-2 hover:bg-gray-700 rounded transition-colors">
              <X size={20} />
            </button>
          </div>
          
          <div className="space-y-4">
            <label className="flex items-center justify-between p-3 bg-dark-bg rounded-lg border border-gray-700 hover:border-gray-600 cursor-pointer">
              <span className="text-sm text-gray-300">Only courses with available seats</span>
              <input 
                type="checkbox" 
                checked={filters.hasSeats}
                onChange={(e) => setFilters({...filters, hasSeats: e.target.checked})}
                className="w-4 h-4" 
              />
            </label>
            
            <label className="flex items-center justify-between p-3 bg-dark-bg rounded-lg border border-gray-700 hover:border-gray-600 cursor-pointer">
              <span className="text-sm text-gray-300">No waitlist</span>
              <input 
                type="checkbox" 
                checked={filters.noWaitlist}
                onChange={(e) => setFilters({...filters, noWaitlist: e.target.checked})}
                className="w-4 h-4" 
              />
            </label>
            
            <label className="flex items-center justify-between p-3 bg-dark-bg rounded-lg border border-gray-700 hover:border-gray-600 cursor-pointer">
              <span className="text-sm text-gray-300">Only upper division (300+)</span>
              <input 
                type="checkbox" 
                checked={filters.onlyUpperDiv}
                onChange={(e) => setFilters({...filters, onlyUpperDiv: e.target.checked})}
                className="w-4 h-4" 
              />
            </label>
            
            <div className="space-y-2">
              <label className="block text-sm text-gray-400">Credits Range</label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.minCredits}
                  onChange={(e) => setFilters({...filters, minCredits: e.target.value})}
                  className="flex-1 px-3 py-2 bg-dark-bg border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:border-sfu-red"
                />
                <span className="text-gray-400">to</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.maxCredits}
                  onChange={(e) => setFilters({...filters, maxCredits: e.target.value})}
                  className="flex-1 px-3 py-2 bg-dark-bg border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:border-sfu-red"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-2 pt-4">
              <button
                onClick={() => setFilters({hasSeats: false, noWaitlist: false, minCredits: '', maxCredits: '', onlyUpperDiv: false})}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-sm font-medium"
              >
                Clear Filters
              </button>
              <button
                onClick={() => setShowFilterModal(false)}
                className="flex-1 px-4 py-2 bg-sfu-red hover:bg-red-800 rounded-lg transition-colors text-sm font-medium"
              >
                Apply
              </button>
            </div>
            
            <p className="text-xs text-gray-500 text-center pt-2">
              {Object.values(filters).some(v => v) ? 'Filters are active' : 'No filters applied'}
            </p>
          </div>
        </div>
      </div>
    )}
  </>
  );
};