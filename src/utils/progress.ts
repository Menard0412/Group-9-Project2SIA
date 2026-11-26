import type { Course, CourseProgress, LmsData, QuizAttempt } from '../types/lms';

export interface Completion {
  done: number;
  total: number;
  percent: number;
}

/** Completion over materials that still exist in the file library. */
export function courseCompletion(
  course: Course,
  progress: CourseProgress | undefined,
  availableFileIds: Set<string>,
): Completion {
  const ids = course.materialIds.filter((id) => availableFileIds.has(id));
  const completed = new Set(progress?.completedMaterialIds ?? []);
  const done = ids.filter((id) => completed.has(id)).length;
  const total = ids.length;
  return { done, total, percent: total === 0 ? 0 : Math.round((done / total) * 100) };
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)} s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `${hours} h ${minutes % 60} min`;
}

export function attemptPercent(attempt: QuizAttempt): number {
  return attempt.total === 0 ? 0 : Math.round((attempt.score / attempt.total) * 100);
}

export function bestAttemptPercent(attempts: QuizAttempt[]): number | null {
  if (attempts.length === 0) return null;
  return Math.max(...attempts.map(attemptPercent));
}

export interface OverallStats {
  courses: number;
  done: number;
  total: number;
  percent: number;
  seconds: number;
  quizzesTaken: number;
  averageScore: number | null;
}

export function overallStats(data: LmsData, availableFileIds: Set<string>): OverallStats {
  let done = 0;
  let total = 0;
  let seconds = 0;
  for (const course of data.courses) {
    const progress = data.progress[course.id];
    const completion = courseCompletion(course, progress, availableFileIds);
    done += completion.done;
    total += completion.total;
    seconds += progress?.secondsSpent ?? 0;
  }
  const percents = data.attempts.map(attemptPercent);
  return {
    courses: data.courses.length,
    done,
    total,
    percent: total === 0 ? 0 : Math.round((done / total) * 100),
    seconds,
    quizzesTaken: data.attempts.length,
    averageScore: percents.length === 0 ? null : Math.round(percents.reduce((a, b) => a + b, 0) / percents.length),
  };
}
