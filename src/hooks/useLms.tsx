import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { loadLmsData, saveLmsData } from '../services/lmsStorage';
import {
  EMPTY_LMS_DATA,
  type Course,
  type LmsData,
  type Quiz,
  type QuizAttempt,
} from '../types/lms';
import { createId } from '../utils/id';

interface CourseInput {
  title: string;
  description: string;
}

interface LmsContextValue {
  data: LmsData;
  loading: boolean;
  getCourse: (id: string | undefined) => Course | undefined;
  getQuiz: (id: string | undefined) => Quiz | undefined;
  quizzesFor: (courseId: string) => Quiz[];
  attemptsFor: (quizId: string) => QuizAttempt[];
  createCourse: (input: CourseInput) => Promise<Course>;
  updateCourse: (id: string, input: CourseInput) => Promise<void>;
  deleteCourse: (id: string) => Promise<void>;
  setMaterials: (courseId: string, fileIds: string[]) => Promise<void>;
  toggleMaterialComplete: (courseId: string, fileId: string) => Promise<void>;
  addTimeSpent: (courseId: string, seconds: number) => void;
  saveQuiz: (quiz: Quiz) => Promise<void>;
  deleteQuiz: (id: string) => Promise<void>;
  recordAttempt: (attempt: QuizAttempt) => Promise<void>;
}

const LmsContext = createContext<LmsContextValue | null>(null);

export function LmsProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<LmsData>(EMPTY_LMS_DATA);
  const [loading, setLoading] = useState(true);
  const dataRef = useRef<LmsData>(EMPTY_LMS_DATA);
  const saveChain = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    let active = true;
    (async () => {
      const loaded = await loadLmsData();
      if (!active) return;
      dataRef.current = loaded;
      setData(loaded);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  /** Applies a change immediately, then persists it (saves run in order). */
  const commit = useCallback((updater: (current: LmsData) => LmsData): Promise<void> => {
    const next = updater(dataRef.current);
    dataRef.current = next;
    setData(next);
    const saved = saveChain.current.then(() => saveLmsData(next));
    saveChain.current = saved.catch(() => undefined);
    return saved;
  }, []);

  const createCourse = useCallback(
    async (input: CourseInput): Promise<Course> => {
      const course: Course = {
        id: createId(),
        title: input.title.trim(),
        description: input.description.trim(),
        materialIds: [],
        createdAt: new Date().toISOString(),
      };
      await commit((d) => ({ ...d, courses: [course, ...d.courses] }));
      return course;
    },
    [commit],
  );

  const updateCourse = useCallback(
    (id: string, input: CourseInput) =>
      commit((d) => ({
        ...d,
        courses: d.courses.map((c) =>
          c.id === id ? { ...c, title: input.title.trim(), description: input.description.trim() } : c,
        ),
      })),
    [commit],
  );

  const deleteCourse = useCallback(
    (id: string) =>
      commit((d) => {
        const { [id]: _removed, ...progress } = d.progress;
        return {
          courses: d.courses.filter((c) => c.id !== id),
          quizzes: d.quizzes.filter((q) => q.courseId !== id),
          attempts: d.attempts.filter((a) => a.courseId !== id),
          progress,
        };
      }),
    [commit],
  );

  const setMaterials = useCallback(
    (courseId: string, fileIds: string[]) =>
      commit((d) => {
        const selected = new Set(fileIds);
        return {
          ...d,
          courses: d.courses.map((c) => {
            if (c.id !== courseId) return c;
            const kept = c.materialIds.filter((id) => selected.has(id));
            const added = fileIds.filter((id) => !c.materialIds.includes(id));
            return { ...c, materialIds: [...kept, ...added] };
          }),
          progress: {
            ...d.progress,
            [courseId]: {
              secondsSpent: d.progress[courseId]?.secondsSpent ?? 0,
              completedMaterialIds: (d.progress[courseId]?.completedMaterialIds ?? []).filter((id) =>
                selected.has(id),
              ),
            },
          },
        };
      }),
    [commit],
  );

  const toggleMaterialComplete = useCallback(
    (courseId: string, fileId: string) =>
      commit((d) => {
        const current = d.progress[courseId] ?? { completedMaterialIds: [], secondsSpent: 0 };
        const done = current.completedMaterialIds.includes(fileId);
        return {
          ...d,
          progress: {
            ...d.progress,
            [courseId]: {
              ...current,
              completedMaterialIds: done
                ? current.completedMaterialIds.filter((id) => id !== fileId)
                : [...current.completedMaterialIds, fileId],
            },
          },
        };
      }),
    [commit],
  );

  const addTimeSpent = useCallback(
    (courseId: string, seconds: number) => {
      if (seconds <= 0 || !dataRef.current.courses.some((c) => c.id === courseId)) return;
      commit((d) => {
        const current = d.progress[courseId] ?? { completedMaterialIds: [], secondsSpent: 0 };
        return {
          ...d,
          progress: { ...d.progress, [courseId]: { ...current, secondsSpent: current.secondsSpent + seconds } },
        };
      }).catch((error) => console.warn('Could not save time spent', error));
    },
    [commit],
  );

  const saveQuiz = useCallback(
    (quiz: Quiz) =>
      commit((d) => ({
        ...d,
        quizzes: d.quizzes.some((q) => q.id === quiz.id)
          ? d.quizzes.map((q) => (q.id === quiz.id ? quiz : q))
          : [quiz, ...d.quizzes],
      })),
    [commit],
  );

  const deleteQuiz = useCallback(
    (id: string) =>
      commit((d) => ({
        ...d,
        quizzes: d.quizzes.filter((q) => q.id !== id),
        attempts: d.attempts.filter((a) => a.quizId !== id),
      })),
    [commit],
  );

  const recordAttempt = useCallback(
    (attempt: QuizAttempt) => commit((d) => ({ ...d, attempts: [attempt, ...d.attempts] })),
    [commit],
  );

  const value = useMemo<LmsContextValue>(
    () => ({
      data,
      loading,
      getCourse: (id) => data.courses.find((c) => c.id === id),
      getQuiz: (id) => data.quizzes.find((q) => q.id === id),
      quizzesFor: (courseId) => data.quizzes.filter((q) => q.courseId === courseId),
      attemptsFor: (quizId) => data.attempts.filter((a) => a.quizId === quizId),
      createCourse,
      updateCourse,
      deleteCourse,
      setMaterials,
      toggleMaterialComplete,
      addTimeSpent,
      saveQuiz,
      deleteQuiz,
      recordAttempt,
    }),
    [
      data,
      loading,
      createCourse,
      updateCourse,
      deleteCourse,
      setMaterials,
      toggleMaterialComplete,
      addTimeSpent,
      saveQuiz,
      deleteQuiz,
      recordAttempt,
    ],
  );

  return <LmsContext.Provider value={value}>{children}</LmsContext.Provider>;
}

export function useLms(): LmsContextValue {
  const ctx = useContext(LmsContext);
  if (!ctx) throw new Error('useLms must be used inside <LmsProvider>');
  return ctx;
}
