export interface ClassMaterial {
  id: string;
  classId: string;
  name: string;
  extension: string;
  mimeType: string;
  size: number;
  storagePath: string;
  createdAt: string;
}

export interface ClassQuizQuestion {
  prompt: string;
  options: string[];
}

export interface ClassQuiz {
  id: string;
  classId: string;
  title: string;
  questions: ClassQuizQuestion[];
  createdAt: string;
}

export interface ClassAttempt {
  id: string;
  quizId: string;
  learnerId: string;
  learnerName: string;
  score: number;
  total: number;
  takenAt: string;
}

export interface MaterialProgressRow {
  materialId: string;
  learnerId: string;
}
