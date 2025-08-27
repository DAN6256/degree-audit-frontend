
export type Grade =
  | 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D+' | 'D' | 'E' | 'P' | string; // unknowns treated as fail

export type SlotKind = 'required' | 'elective';

export interface Slot {
  id: string;              
  title: string;           
  kind: SlotKind;

  // required
  courseName?: string;     
  minGrade?: Grade;       

  // elective
  allowedCourses?: string[]; 

  priority?: number;

  tag?: string;
}

export interface Rule {
  id: string;
  name: string;
  when?: {
    anyPassed?: string[];   
    allPassed?: string[];
  };
  then?: {
    addSlots?: Slot[];
    waiveSlotsByTitle?: string[]; 
    waiveCourses?: string[];      
  };
}

export interface SemesterData {
  slots: Slot[];
  rules: Rule[];
  checkpointLabel?: string;       
}

export interface ProgramMeta {
  displayName: string;            
  defaultPassGrade?: Grade;       
}

export interface YearGroupSummary {
  yearGroup: number;
  programs: string[];             
}

export interface StudentCourseRow {
  program: string;                
  applicationNo: string;
  name: string;
  course: string;                 
  earnedCredits: number;          
  grade: Grade;                   
}

export interface StudentRecord {
  applicationNo: string;
  name: string;
  program: string;
  courses: {
    course: string;
    earnedCredits: number;
    grade: Grade;
  }[];
}

export interface AuditOutcome {
  applicationNo: string;
  name: string;
  program: string;
  passed: boolean;
  missing: string[];
}
