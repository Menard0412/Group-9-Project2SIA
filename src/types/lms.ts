export interface Course {
  id: string;
  title: string;
  description: string;
  /** Ordered ids of files from the library used as course materials. */
  materialIds: string[];
  createdAt: string;
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
}

export interface Quiz {
  id: string;
  courseId: string;
  title: string;
  questions: QuizQuestion[];
  createdAt: string;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  courseId: string;
  score: number;
  total: number;
  takenAt: string;
}

export interface CourseProgress {
  completedMaterialIds: string[];
  secondsSpent: number;
}

export interface LmsData {
  courses: Course[];
  quizzes: Quiz[];
  attempts: QuizAttempt[];
  progress: Record<string, CourseProgress>;
}

export const EMPTY_LMS_DATA: LmsData = {
  courses: [],
  quizzes: [],
  attempts: [],
  progress: {},
};
