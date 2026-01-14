import React, { useMemo, useState } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useCourseStore } from '../../stores/courseStore';
import { CalendarEvent, CourseGroup, CourseSection } from '../../types';
import { SectionSelectorModal } from '../CourseList/SectionSelectorModal';

const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

export const WeeklyCalendar: React.FC = () => {
  const getScheduledCourses = useCourseStore((state) => state.getScheduledCourses);
  const scheduleSection = useCourseStore((state) => state.scheduleSection);
  const courseGroups = useCourseStore((state) => state.courseGroups);
  const [pendingCourseGroup, setPendingCourseGroup] = useState<CourseGroup | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const scheduledCourses = getScheduledCourses();

  const events: CalendarEvent[] = useMemo(() => {
    const eventsArray: CalendarEvent[] = [];
    
    scheduledCourses.forEach((course) => {
      course.schedule.forEach((scheduleItem) => {
        const dayMap: { [key: string]: number } = {
          Mon: 1,
          Tue: 2,
          Wed: 3,
          Thu: 4,
          Fri: 5,
        };
        
        const today = new Date();
        const dayOfWeek = dayMap[scheduleItem.day];
        const currentDay = today.getDay();
        const diff = dayOfWeek - currentDay;
        
        const eventDate = new Date(today);
        eventDate.setDate(today.getDate() + diff);
        
        const [startHour, startMinute] = scheduleItem.startTime.split(':').map(Number);
        const [endHour, endMinute] = scheduleItem.endTime.split(':').map(Number);
        
        const startTime = new Date(eventDate);
        startTime.setHours(startHour, startMinute, 0);
        
        const endTime = new Date(eventDate);
        endTime.setHours(endHour, endMinute, 0);
        
        eventsArray.push({
          id: `${course.id}-${scheduleItem.day}`,
          title: `${course.dept} ${course.number}\n${course.section}`,
          start: startTime,
          end: endTime,
          resource: course,
        });
      });
    });
    
    return eventsArray;
  }, [scheduledCourses]);

  const eventStyleGetter = (event: CalendarEvent) => {
    return {
      style: {
        backgroundColor: event.resource.color,
        borderRadius: '4px',
        opacity: 0.9,
        color: 'white',
        border: 'none',
        display: 'block',
        fontSize: '13px',
        fontWeight: '500',
        padding: '4px',
      },
    };
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const groupData = e.dataTransfer.getData('courseGroup');
    
    if (groupData) {
      const group: CourseGroup = JSON.parse(groupData);
      setPendingCourseGroup(group);
    }
  };

  const handleSelectSection = (section: CourseSection) => {
    if (pendingCourseGroup) {
      const result = scheduleSection(pendingCourseGroup.courseKey, section.id, section);
      
      if (!result.success) {
        alert(result.error || 'Failed to schedule section');
        return;
      }
      
      setPendingCourseGroup(null);
    }
  };

  return (
    <div className="h-full flex flex-col bg-dark-bg">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <h2 className="text-lg font-semibold text-white">Weekly Schedule</h2>
        <button className="px-3 py-1.5 text-sm bg-blue-600 text-white border border-blue-500 rounded hover:bg-blue-700 transition-colors">
          Drag-N-Drop
        </button>
      </div>
      
      <div 
        className={`flex-1 p-4 transition-all ${isDragOver ? 'bg-blue-900 bg-opacity-10 border-2 border-blue-500 border-dashed' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%' }}
          defaultView="work_week"
          views={['work_week']}
          step={30}
          timeslots={2}
          min={new Date(2024, 0, 1, 8, 0, 0)}
          max={new Date(2024, 0, 1, 21, 0, 0)}
          eventPropGetter={eventStyleGetter}
          toolbar={false}
          components={{
            event: ({ event }: { event: CalendarEvent }) => (
              <div 
                draggable
                onDragStart={(e) => {
                  e.stopPropagation();
                  const courseGroup = courseGroups.find(g => 
                    g.scheduledSectionId === event.resource.id
                  );
                  if (courseGroup) {
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('scheduledCourseKey', courseGroup.courseKey);
                  }
                }}
                className="cursor-move h-full"
              >
                <div className="text-xs font-medium leading-tight whitespace-pre-line">
                  {event.title}
                </div>
              </div>
            ),
          }}
          formats={{
            dayFormat: 'EEE',
            timeGutterFormat: 'h a',
          }}
        />
      </div>

      {pendingCourseGroup && (
        <SectionSelectorModal
          group={pendingCourseGroup}
          onClose={() => setPendingCourseGroup(null)}
          onSelectSection={handleSelectSection}
        />
      )}
    </div>
  );
};
