import AsyncStorage from '@react-native-async-storage/async-storage';
import { EMPTY_LMS_DATA, type CourseProgress, type LmsData } from '../types/lms';

const KEY = 'lms-mobile.lms.v1';

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asProgress(value: unknown): Record<string, CourseProgress> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, CourseProgress>)
    : {};
}

export async function loadLmsData(): Promise<LmsData> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return EMPTY_LMS_DATA;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return EMPTY_LMS_DATA;
    const p = parsed as Record<string, unknown>;
    return {
      courses: asArray(p.courses),
      quizzes: asArray(p.quizzes),
      attempts: asArray(p.attempts),
      progress: asProgress(p.progress),
    };
  } catch (error) {
    console.warn('Could not read LMS data', error);
    return EMPTY_LMS_DATA;
  }
}

export async function saveLmsData(data: LmsData): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(data));
}
