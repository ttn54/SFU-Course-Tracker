export interface CourseSection {
  id: string;
  dept: string;
  number: string;
  section: string;
  title: string;
  instructor: string;
  credits: number;
  location: string;
  schedule: {
    day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri';
    startTime: string;
    endTime: string;
    type: 'Lecture' | 'Lab' | 'Tutorial';
  }[];
  stats: {
    enrolled: string;
    waitlist: string;
    profRating: string;
    avgGrade: string;
    textbookISBN: string;
    profRMPId?: string;
  };
  color: string;
}

export interface CourseGroup {
  courseKey: string;
  dept: string;
  number: string;
  title: string;
  sections: CourseSection[];
  isScheduled: boolean;
  scheduledSectionId?: string | null;
  combinedSection?: CourseSection;
  offeringFrequency?: {
    label: string;
    color: string;
  };
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: CourseSection;
}

export interface CourseStore {
  courseGroups: CourseGroup[];
  addCourseGroup: (group: CourseGroup) => void;
  removeCourseGroup: (courseKey: string) => void;
  scheduleSection: (courseKey: string, sectionId: string, combinedSection?: CourseSection) => void;
  unscheduleSection: (courseKey: string) => void;
  clearAll: () => void;
  getTotalCredits: () => number;
  getScheduledCourses: () => CourseSection[];
  getUnscheduledGroups: () => CourseGroup[];
}
