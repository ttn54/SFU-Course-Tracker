import React, { useEffect, useState } from 'react';
import { CourseGroup, CourseSection } from '../../types';
import { X } from 'lucide-react';
import { api } from '../../services/api';

interface EnrollmentCache {
  [sectionId: string]: {
    enrolled: string;
    waitlist: string;
  };
}

interface SectionSelectorModalProps {
  group: CourseGroup;
  onClose: () => void;
  onSelectSection: (section: CourseSection) => void;
}

export const SectionSelectorModal: React.FC<SectionSelectorModalProps> = ({
  group,
  onClose,
  onSelectSection,
}) => {
  const [enrollmentData, setEnrollmentData] = useState<EnrollmentCache>({});
  const [loading, setLoading] = useState(true);

  // Group sections: Lecture sections with their corresponding tutorials
  const groupedSections = React.useMemo(() => {
    // Identify lectures: sections ending in 00 (D100, D200, etc.) that have lecture schedules
    const lectures = group.sections.filter(s => 
      /\d00$/.test(s.section) && // Section ends in 00
      s.schedule.some(sched => sched.type === 'Lecture')
    );
    
    // Identify tutorials: sections ending in 01-99 (D101-D199, etc.) that have tutorial schedules
    const tutorials = group.sections.filter(s => 
      !/\d00$/.test(s.section) && // NOT ending in 00
      s.schedule.some(sched => sched.type === 'Tutorial')
    );

    // Create groups: each lecture with its matching tutorials
    const groups: Array<{ lecture: CourseSection; tutorials: CourseSection[] }> = [];

    lectures.forEach(lecture => {
      // Extract the base section number (e.g., D100 -> D1)
      const lectureBase = lecture.section.replace(/(\d)\d+$/, '$1');
      
      // Find tutorials that match this lecture
      const matchingTutorials = tutorials.filter(tutorial => {
        const tutorialBase = tutorial.section.replace(/(\d)\d+$/, '$1');
        return tutorialBase === lectureBase;
      });

      groups.push({
        lecture,
        tutorials: matchingTutorials
      });
    });

    // Add standalone sections (no lecture or tutorial component)
    const standaloneSections = group.sections.filter(s => 
      !s.schedule.some(sched => sched.type === 'Lecture' || sched.type === 'Tutorial')
    );

    return { groups, standaloneSections };
  }, [group.sections]);

  // Handler to combine lecture + tutorial when tutorial is clicked
  const handleTutorialSelect = (lecture: CourseSection, tutorial: CourseSection) => {
    // Combine schedules from both lecture and tutorial
    const combinedSection: CourseSection = {
      ...tutorial, // Keep tutorial as base (including its ID)
      schedule: [
        ...lecture.schedule,
        ...tutorial.schedule
      ],
      // Update section name to show it includes lecture
      section: `${lecture.section}+${tutorial.section}`
    };
    
    console.log('Combined section:', combinedSection);
    console.log('Combined schedule:', combinedSection.schedule);
    
    onSelectSection(combinedSection);
  };

  useEffect(() => {
    // Fetch enrollment data for all sections
    const fetchEnrollmentData = async () => {
      setLoading(true);
      try {
        const coursesToFetch = group.sections.map(section => ({
          dept: section.dept,
          number: section.number,
          section: section.section
        }));

        const results = await api.getBatchEnrollment(coursesToFetch, '2025/fall');
        
        const cache: EnrollmentCache = {};
        results.forEach((result, index) => {
          const section = group.sections[index];
          if (section) {
            cache[section.id] = {
              enrolled: result.enrolled,
              waitlist: result.waitlist
            };
          }
        });

        setEnrollmentData(cache);
      } catch (error) {
        console.error('Failed to fetch enrollment data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEnrollmentData();
  }, [group]);

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-dark-card border border-gray-600 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-white">
            Select Section for {group.dept} {group.number}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Grouped Lecture + Tutorial Sections */}
          {groupedSections.groups.map(({ lecture, tutorials }) => (
            <div
              key={lecture.id}
              className="bg-dark-bg border border-gray-700 rounded-lg overflow-hidden"
            >
              {/* Lecture Section */}
              <div
                className={`p-4 border-b border-gray-700 ${
                  tutorials.length > 0 
                    ? 'opacity-75 cursor-not-allowed' 
                    : 'cursor-pointer hover:bg-gray-800 transition-all'
                }`}
                onClick={tutorials.length === 0 ? () => onSelectSection(lecture) : undefined}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-baseline space-x-2">
                      <h4 className="text-lg font-semibold text-white">
                        {lecture.section}
                      </h4>
                      <span className="text-xs px-2 py-0.5 bg-blue-900 text-blue-300 rounded">
                        Lecture
                      </span>
                      <span className="text-sm text-gray-400">{lecture.instructor}</span>
                    </div>
                    
                    <div className="mt-2 space-y-1">
                      {lecture.schedule.map((sched, idx) => (
                        <div key={idx} className="text-sm text-gray-300">
                          <span className="font-medium">{sched.type}:</span> {sched.day} {sched.startTime} - {sched.endTime}
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 flex items-center space-x-4 text-xs">
                      <span className="text-gray-400">
                        Enrolled: <span className="text-white">
                          {loading ? 'Loading...' : (enrollmentData[lecture.id]?.enrolled || lecture.stats.enrolled)}
                        </span>
                      </span>
                      {enrollmentData[lecture.id]?.waitlist && enrollmentData[lecture.id].waitlist !== '0' && (
                        <span className="text-gray-400">
                          Waitlist: <span className="text-orange-400">({enrollmentData[lecture.id].waitlist}W)</span>
                        </span>
                      )}
                      <span className="text-gray-400">
                        Rating: <span className="text-yellow-400">{lecture.stats.profRating}</span>
                      </span>
                      <span className="text-gray-400">
                        Avg Grade: <span className="text-green-400">{lecture.stats.avgGrade}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tutorial Sections */}
              {tutorials.length > 0 && (
                <div className="bg-gray-900 bg-opacity-50">
                  <div className="px-4 py-2 text-xs text-gray-400 font-semibold">
                    Choose Tutorial (will include lecture automatically):
                  </div>
                  <div className="grid grid-cols-2 gap-2 p-3">
                    {tutorials.map((tutorial) => (
                      <div
                        key={tutorial.id}
                        onClick={() => handleTutorialSelect(lecture, tutorial)}
                        className="bg-dark-bg border border-gray-700 rounded p-3 cursor-pointer hover:border-purple-500 hover:bg-gray-800 transition-all"
                      >
                        <div className="flex items-baseline space-x-2 mb-1">
                          <span className="text-sm font-semibold text-white">
                            {tutorial.section}
                          </span>
                          <span className="text-xs px-1.5 py-0.5 bg-purple-900 text-purple-300 rounded">
                            Tutorial
                          </span>
                        </div>
                        <div className="text-xs text-gray-400 mb-1">{tutorial.instructor}</div>
                        {tutorial.schedule.map((sched, idx) => (
                          <div key={idx} className="text-xs text-gray-300">
                            {sched.day} {sched.startTime} - {sched.endTime}
                          </div>
                        ))}
                        <div className="mt-2 text-xs text-gray-400">
                          {loading ? 'Loading...' : (enrollmentData[tutorial.id]?.enrolled || tutorial.stats.enrolled)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Standalone Sections (no lecture/tutorial) */}
          {groupedSections.standaloneSections.map((section) => (
            <div
              key={section.id}
              onClick={() => onSelectSection(section)}
              className="bg-dark-bg border border-gray-700 rounded-lg p-4 cursor-pointer hover:border-gray-500 hover:bg-gray-800 transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-baseline space-x-2">
                    <h4 className="text-lg font-semibold text-white">
                      {section.section}
                    </h4>
                    <span className="text-sm text-gray-400">{section.instructor}</span>
                  </div>
                  
                  <div className="mt-2 space-y-1">
                    {section.schedule.map((sched, idx) => (
                      <div key={idx} className="text-sm text-gray-300">
                        <span className="font-medium">{sched.type}:</span> {sched.day} {sched.startTime} - {sched.endTime}
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 flex items-center space-x-4 text-xs">
                    <span className="text-gray-400">
                      Enrolled: <span className="text-white">
                        {loading ? 'Loading...' : (enrollmentData[section.id]?.enrolled || section.stats.enrolled)}
                      </span>
                    </span>
                    {enrollmentData[section.id]?.waitlist && (
                      <span className="text-gray-400">
                        Waitlist: <span className="text-orange-400">({enrollmentData[section.id].waitlist}W)</span>
                      </span>
                    )}
                    <span className="text-gray-400">
                      Rating: <span className="text-yellow-400">{section.stats.profRating}</span>
                    </span>
                    <span className="text-gray-400">
                      Avg Grade: <span className="text-green-400">{section.stats.avgGrade}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
