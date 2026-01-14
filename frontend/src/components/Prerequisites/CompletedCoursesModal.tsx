import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, CheckCircle } from 'lucide-react';
import { useCourseStore } from '../../stores/courseStore';
import { PrerequisiteParser } from '../../utils/prerequisiteParser';

interface CompletedCoursesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface EligibleCourse {
  courseKey: string;
  title: string;
  prerequisites: string; // Raw prerequisite string from SFU
  prerequisites_logic?: any; // Logic tree structure
  is_eligible?: boolean; // Whether all prerequisites are met
  missing_prerequisites?: string[]; // List of missing prerequisite courses
}

export const CompletedCoursesModal: React.FC<CompletedCoursesModalProps> = ({ isOpen, onClose }) => {
  const completedCourses = useCourseStore((state) => state.completedCourses);
  const setCompletedCourses = useCourseStore((state) => state.setCompletedCourses);
  const [activeTab, setActiveTab] = useState<'completed' | 'eligible'>('completed');
  const [courses, setCourses] = useState<string[]>([]);
  const [newCourse, setNewCourse] = useState('');
  const [eligibleCourses, setEligibleCourses] = useState<EligibleCourse[]>([]);
  const [loadingEligible, setLoadingEligible] = useState(false);
  const [allCourses, setAllCourses] = useState<{course_id: string, title: string}[]>([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    setCourses([...completedCourses]);
    
    // Fetch all courses for search when modal opens
    if (isOpen && allCourses.length === 0) {
      fetchAllCourses();
    }
    
    if (isOpen && activeTab === 'eligible') {
      loadEligibleCourses();
    }
  }, [completedCourses, isOpen, activeTab, allCourses.length]);

  const fetchAllCourses = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/courses/all');
      
      if (response.ok) {
        const rawCourses = await response.json();
        
        // Deduplicate by course_id (since API returns all sections)
        const uniqueCourses = new Map<string, any>();
        
        rawCourses.forEach((course: any) => {
          const info = course.info || {};
          const dept = info.dept || '';
          const number = info.number || '';
          const title = info.title || '';
          const courseId = dept && number ? `${dept}-${number}` : '';
          
          if (courseId && !uniqueCourses.has(courseId)) {
            uniqueCourses.set(courseId, {
              course_id: courseId,
              title: title,
              dept: dept,
              number: number
            });
          }
        });
        
        const courseList = Array.from(uniqueCourses.values());
        console.log('Fetched unique courses:', courseList.length);
        setAllCourses(courseList);
      }
    } catch (error) {
      console.error('Failed to fetch courses:', error);
    }
  };

  const loadEligibleCourses = async () => {
    setLoadingEligible(true);
    const token = localStorage.getItem('token');
    if (!token) {
      setLoadingEligible(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:8000/api/v1/validate/suggest-next', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ transcript: completedCourses, limit: 100 })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Map the response to the format we need
        const coursesWithPrereqs = data.map((course: any) => ({
          courseKey: course.course_id,
          title: course.title || '',
          prerequisites: course.prerequisites || '',
          prerequisites_logic: course.prerequisites_logic,
          is_eligible: course.is_eligible,
          missing_prerequisites: course.missing_prerequisites || []
        }));
        
        setEligibleCourses(coursesWithPrereqs);
      }
    } catch (error) {
      console.error('Failed to load eligible courses:', error);
    } finally {
      setLoadingEligible(false);
    }
  };

  const handleAdd = () => {
    if (newCourse.trim()) {
      const formatted = newCourse.trim().toUpperCase().replace(/\s+/g, '-');
      if (!courses.includes(formatted)) {
        setCourses([...courses, formatted]);
      }
      setNewCourse('');
      setShowSearchDropdown(false);
    }
  };

  // Filter courses based on search input
  const searchResults = newCourse.trim().length >= 2
    ? allCourses.filter(course => {
        const query = newCourse.toLowerCase().replace(/[-\s]/g, '');
        const courseId = course.course_id.toLowerCase().replace(/[-\s]/g, '');
        const title = course.title.toLowerCase();
        return !courses.includes(course.course_id) && 
               (courseId.includes(query) || title.includes(query));
      }).slice(0, 10)
    : [];

  // Debug: log when search results change
  useEffect(() => {
    if (newCourse.length >= 2) {
      console.log('Search query:', newCourse);
      console.log('All courses count:', allCourses.length);
      console.log('Search results:', searchResults.length);
    }
  }, [newCourse, searchResults.length, allCourses.length]);

  const handleSelectCourse = (courseId: string) => {
    if (!courses.includes(courseId)) {
      setCourses([...courses, courseId]);
    }
    setNewCourse('');
    setShowSearchDropdown(false);
  };

  const handleRemove = (course: string) => {
    setCourses(courses.filter(c => c !== course));
  };

  const handleSave = async () => {
    setCompletedCourses(courses);
    setSaveMessage(null);
    
    // Save to backend
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const response = await fetch('http://localhost:8000/api/v1/user/courses', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(courses)
        });
        
        if (response.ok) {
          setSaveMessage('✓ Saved successfully!');
          // Clear message after 3 seconds
          setTimeout(() => setSaveMessage(null), 3000);
        } else {
          const errorText = await response.text();
          console.error('Save failed:', response.status, errorText);
          setSaveMessage(`✗ Failed to save (${response.status})`);
        }
      } catch (error) {
        console.error('Failed to save completed courses:', error);
        setSaveMessage('✗ Failed to save');
      }
    } else {
      setSaveMessage('✗ Not logged in');
    }
    
    // Don't close modal - stay on the page
    // onClose();
  };

  const getCourseStatus = (course: EligibleCourse): 'ready' | 'missing' | 'no-prereq' => {
    // Use the is_eligible flag from the API if available
    if (course.is_eligible !== undefined) {
      if (!course.prerequisites || course.prerequisites.trim() === '') {
        return 'no-prereq';
      }
      return course.is_eligible ? 'ready' : 'missing';
    }
    
    // Fallback to old logic if is_eligible is not available
    const prereqString = course.prerequisites;
    
    // No prerequisites - ready to take
    if (!prereqString || prereqString.trim() === '') {
      return 'no-prereq';
    }

    try {
      const tree = PrerequisiteParser.parse(prereqString);
      if (!tree) return 'ready';

      // Check if all prerequisites are met
      const checkNodeSatisfied = (node: any): boolean => {
        if (node.type === 'course') {
          return courses.includes(node.value);
        }
        if (node.type === 'and' && node.children) {
          return node.children.every((child: any) => checkNodeSatisfied(child));
        }
        if (node.type === 'or' && node.children) {
          return node.children.some((child: any) => checkNodeSatisfied(child));
        }
        return false;
      };

      return checkNodeSatisfied(tree) ? 'ready' : 'missing';
    } catch {
      return 'ready';
    }
  };

  const renderPrerequisiteLogic = (logic: any) => {
    if (!logic) return null;
    
    // Helper to check if a node has real course prerequisites (not just UNKNOWN)
    const hasRealPrereqs = (node: any): boolean => {
      if (!node || !node.type) return false;
      if (node.type === 'COURSE') return true;
      if (node.type === 'UNKNOWN') return false;
      if ((node.type === 'AND' || node.type === 'OR') && node.children) {
        return node.children.some((child: any) => hasRealPrereqs(child));
      }
      return false;
    };
    
    const renderLogicNode = (node: any, depth: number = 0): JSX.Element | null => {
      if (!node || !node.type) return null;
      
      // Skip UNKNOWN nodes
      if (node.type === 'UNKNOWN') return null;
      
      if (node.type === 'COURSE') {
        const courseId = node.course;
        const isCompleted = courses.includes(courseId);
        return (
          <span
            className={`px-2 py-1 text-xs rounded font-medium ${
              isCompleted
                ? 'bg-green-900 text-green-300 border border-green-700'
                : 'bg-gray-700 text-gray-300 border border-gray-600'
            }`}
          >
            {courseId}
          </span>
        );
      }
      
      if (node.type === 'AND' && node.children) {
        // Filter out children with no real prerequisites
        const validChildren = node.children.filter((child: any) => hasRealPrereqs(child));
        if (validChildren.length === 0) return null;
        
        return (
          <div className="flex flex-wrap gap-1.5 items-center">
            {validChildren.map((child: any, idx: number) => (
              <React.Fragment key={idx}>
                {idx > 0 && <span className="text-purple-400 text-xs font-semibold">AND</span>}
                {child.type === 'OR' ? (
                  <span className="inline-flex items-center gap-1.5 px-1 border border-purple-500 rounded">
                    <span className="text-purple-400 text-xs">( </span>
                    {renderLogicNode(child, depth + 1)}
                    <span className="text-purple-400 text-xs"> )</span>
                  </span>
                ) : (
                  renderLogicNode(child, depth + 1)
                )}
              </React.Fragment>
            ))}
          </div>
        );
      }
      
      if (node.type === 'OR' && node.children) {
        // Filter out children with no real prerequisites
        const validChildren = node.children.filter((child: any) => hasRealPrereqs(child));
        if (validChildren.length === 0) return null;
        
        return (
          <div className="inline-flex flex-wrap gap-1.5 items-center">
            {validChildren.map((child: any, idx: number) => (
              <React.Fragment key={idx}>
                {idx > 0 && <span className="text-purple-400 text-xs font-semibold">OR</span>}
                {renderLogicNode(child, depth + 1)}
              </React.Fragment>
            ))}
          </div>
        );
      }
      
      return null;
    };
    
    return (
      <div className="mt-3">
        <p className="text-xs text-gray-500 mb-2">PREREQUISITES:</p>
        <div className="bg-gray-800 p-2 rounded">
          {hasRealPrereqs(logic) ? renderLogicNode(logic) : <span className="text-xs text-gray-400 italic">None</span>}
        </div>
      </div>
    );
  };

  const renderPrerequisites = (course: EligibleCourse) => {
    // Use prerequisites_logic if available from the API
    if (course.prerequisites_logic) {
      return renderPrerequisiteLogic(course.prerequisites_logic);
    }
    
    // Fallback to parsing the string
    const prereqString = course.prerequisites;
    
    if (!prereqString || prereqString.trim() === '') {
      return (
        <div className="mt-3">
          <p className="text-xs text-gray-500 mb-1">PREREQUISITES:</p>
          <span className="text-xs text-gray-600 italic">None</span>
        </div>
      );
    }

    // Parse the prerequisite tree to get the actual structure
    const tree = PrerequisiteParser.parse(prereqString);
    
    if (!tree) {
      return (
        <div className="mt-3">
          <p className="text-xs text-gray-500 mb-1">PREREQUISITES:</p>
          <span className="text-xs text-gray-600">{prereqString}</span>
        </div>
      );
    }

    // Helper to check if all prerequisites in a node are met
    const checkNodeSatisfied = (node: any): boolean => {
      if (node.type === 'course') {
        return courses.includes(node.value);
      }
      if (node.type === 'and' && node.children) {
        return node.children.every((child: any) => checkNodeSatisfied(child));
      }
      if (node.type === 'or' && node.children) {
        return node.children.some((child: any) => checkNodeSatisfied(child));
      }
      return false;
    };

    // Helper to render a prerequisite node
    const renderNode = (node: any, depth: number = 0): JSX.Element => {
      if (node.type === 'course') {
        const isCompleted = courses.includes(node.value);
        return (
          <span
            className={`px-2 py-1 text-xs rounded font-medium ${
              isCompleted
                ? 'bg-green-900 text-green-300 border border-green-700'
                : 'bg-gray-700 text-gray-300 border border-gray-600'
            }`}
          >
            {node.value}
          </span>
        );
      }

      if (node.type === 'and' && node.children) {
        return (
          <div className="flex flex-wrap gap-1.5 items-center">
            {node.children.map((child: any, idx: number) => (
              <React.Fragment key={idx}>
                {idx > 0 && <span className="text-purple-400 text-xs font-semibold">AND</span>}
                {renderNode(child, depth + 1)}
              </React.Fragment>
            ))}
          </div>
        );
      }

      if (node.type === 'or' && node.children) {
        // Check if this is a top-level OR (Either...or structure)
        const isTopLevel = depth === 0;
        
        if (isTopLevel) {
          // Show as separate options
          return (
            <div className="space-y-2">
              {node.children.map((child: any, idx: number) => (
                <div key={idx} className="border-l-2 border-purple-500 pl-2">
                  <div className="text-purple-400 text-xs font-semibold mb-1">
                    {idx === 0 ? 'OPTION 1:' : `OPTION ${idx + 1}:`}
                  </div>
                  {renderNode(child, depth + 1)}
                </div>
              ))}
            </div>
          );
        } else {
          // Inline OR group
          return (
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-xs text-gray-500">(</span>
              {node.children.map((child: any, idx: number) => (
                <React.Fragment key={idx}>
                  {idx > 0 && <span className="text-purple-400 text-xs font-semibold">OR</span>}
                  {renderNode(child, depth + 1)}
                </React.Fragment>
              ))}
              <span className="text-xs text-gray-500">)</span>
            </div>
          );
        }
      }

      return <></>;
    };

    return (
      <div className="mt-3">
        <p className="text-xs text-gray-500 mb-2">PREREQUISITES:</p>
        {renderNode(tree)}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-card rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <CheckCircle className="text-green-500" size={24} />
            <h2 className="text-xl font-bold text-white">My Courses</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          <button
            onClick={() => setActiveTab('completed')}
            className={`flex-1 px-6 py-3 font-medium transition-colors ${
              activeTab === 'completed'
                ? 'text-white border-b-2 border-sfu-red bg-dark-bg'
                : 'text-gray-400 hover:text-white hover:bg-dark-bg'
            }`}
          >
            My Completed Courses
          </button>
          <button
            onClick={() => setActiveTab('eligible')}
            className={`flex-1 px-6 py-3 font-medium transition-colors ${
              activeTab === 'eligible'
                ? 'text-white border-b-2 border-sfu-red bg-dark-bg'
                : 'text-gray-400 hover:text-white hover:bg-dark-bg'
            }`}
          >
            Eligible Courses
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'completed' ? (
            <>
              <p className="text-gray-400 text-sm mb-4">
                Add courses you've already completed. These will be used for prerequisite checking.
              </p>

              {/* Add Course Input */}
              <div className="relative mb-6">
                <div className="flex space-x-2">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={newCourse}
                      onChange={(e) => {
                        setNewCourse(e.target.value);
                        setShowSearchDropdown(e.target.value.trim().length >= 2);
                      }}
                      onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
                      onFocus={() => newCourse.trim().length >= 2 && setShowSearchDropdown(true)}
                      onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
                      placeholder="Search course (e.g., CMPT 120)"
                      className="w-full px-4 py-2 bg-dark-bg border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-sfu-red"
                    />
                    
                    {/* Search Dropdown */}
                    {showSearchDropdown && searchResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-dark-card border border-gray-600 rounded-lg shadow-xl z-[60] max-h-60 overflow-y-auto">
                        {searchResults.map((course) => (
                          <button
                            key={course.course_id}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleSelectCourse(course.course_id);
                            }}
                            className="w-full px-4 py-3 text-left hover:bg-dark-bg transition-colors border-b border-gray-700 last:border-b-0"
                          >
                            <div className="font-medium text-white">{course.course_id}</div>
                            <div className="text-sm text-gray-400 truncate">{course.title}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <button
                    onClick={handleAdd}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center space-x-2"
                  >
                    <Plus size={18} />
                    <span>Add</span>
                  </button>
                </div>
              </div>

              {/* Course List */}
              <div className="space-y-2">
                {courses.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No completed courses yet. Add some above!
                  </div>
                ) : (
                  courses.map((course) => (
                    <div
                      key={course}
                      className="flex items-center justify-between p-3 bg-dark-bg rounded-lg border border-gray-700 hover:border-gray-600 transition-colors"
                    >
                      <span className="text-white font-medium">{course}</span>
                      <button
                        onClick={() => handleRemove(course)}
                        className="text-red-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <>
              <p className="text-gray-400 text-sm mb-4">
                Based on your completed courses, here are the courses you're eligible to take:
              </p>

              {loadingEligible ? (
                <div className="text-center py-8 text-gray-400">
                  Loading eligible courses...
                </div>
              ) : eligibleCourses.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {courses.length === 0 
                    ? 'Add completed courses first to see eligible courses.'
                    : 'No eligible courses found. Try adding more completed courses.'}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {eligibleCourses.map((course) => {
                    const status = getCourseStatus(course);
                    return (
                      <div
                        key={course.courseKey}
                        className="p-4 bg-dark-bg rounded-lg border border-gray-700 hover:border-blue-500 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h3 className="text-white font-bold text-lg">
                              {course.courseKey}
                            </h3>
                            <p className="text-gray-300 text-sm mt-1">
                              {course.title}
                            </p>
                          </div>
                          <div className="ml-3">
                            {status === 'no-prereq' && (
                              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-900 text-blue-300 border border-blue-700">
                                No Prerequisites
                              </span>
                            )}
                            {status === 'ready' && (
                              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-green-900 text-green-300 border border-green-700">
                                ✓ Ready to Take
                              </span>
                            )}
                            {status === 'missing' && (
                              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-orange-900 text-orange-300 border border-orange-700">
                                Missing Prerequisites
                              </span>
                            )}
                          </div>
                        </div>
                        {renderPrerequisites(course)}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-700">
          {saveMessage && (
            <div className={`mr-auto px-4 py-2 rounded-lg ${
              saveMessage.includes('✓') ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
            }`}>
              {saveMessage}
            </div>
          )}
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-600 rounded-lg hover:bg-dark-bg transition-colors text-white"
          >
            {activeTab === 'eligible' ? 'Close' : 'Cancel'}
          </button>
          {activeTab === 'completed' && (
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-sfu-red hover:bg-red-800 rounded-lg transition-colors text-white font-medium"
            >
              Save Changes
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
