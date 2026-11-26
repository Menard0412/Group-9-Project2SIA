import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '../lib/supabase';
import type { StoredFile } from '../types/file';
import type { QuizQuestion } from '../types/lms';
import type {
  ClassAttempt,
  ClassMaterial,
  ClassQuiz,
  ClassQuizQuestion,
  MaterialProgressRow,
} from '../types/classwork';
import { createId } from '../utils/id';

const BUCKET = 'class-materials';

function base64ToBytes(base64: string): Uint8Array {
  const decode = (globalThis as unknown as { atob: (data: string) => string }).atob;
  const binary = decode(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

type Row = Record<string, unknown>;

const str = (value: unknown, fallback = ''): string => (typeof value === 'string' ? value : fallback);
const num = (value: unknown): number => (typeof value === 'number' ? value : Number(value) || 0);

function rowOf(value: unknown): Row | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Row) : null;
}

function rowsOf(value: unknown): Row[] {
  if (!Array.isArray(value)) return [];
  return value.filter((r): r is Row => typeof r === 'object' && r !== null);
}

function embedded(value: unknown): Row | null {
  return rowOf(Array.isArray(value) ? value[0] : value);
}

function fail(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

// ------------------------------------------------------------- materials
function mapMaterial(row: Row): ClassMaterial {
  return {
    id: str(row.id),
    classId: str(row.class_id),
    name: str(row.name),
    extension: str(row.extension),
    mimeType: str(row.mime_type, 'application/octet-stream'),
    size: num(row.size),
    storagePath: str(row.storage_path),
    createdAt: str(row.created_at),
  };
}

export async function listMaterials(classId: string): Promise<ClassMaterial[]> {
  const { data, error } = await supabase
    .from('class_materials')
    .select('id, class_id, name, extension, mime_type, size, storage_path, created_at')
    .eq('class_id', classId)
    .order('created_at', { ascending: true });
  fail(error);
  return rowsOf(data).map(mapMaterial);
}

/** Uploads a file from the local library to the class's cloud storage. */
export async function uploadMaterial(classId: string, uploaderId: string, file: StoredFile): Promise<void> {
  const info = await FileSystem.getInfoAsync(file.localUri);
  if (!info.exists) throw new Error('This file is missing from your device.');
  const base64 = await FileSystem.readAsStringAsync(file.localUri, { encoding: FileSystem.EncodingType.Base64 });
  const bytes = base64ToBytes(base64);
  const path = `${classId}/${createId()}.${file.extension}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: file.mimeType, upsert: false });
  if (uploadError) throw new Error(uploadError.message);

  const { error } = await supabase.from('class_materials').insert({
    class_id: classId,
    uploader_id: uploaderId,
    name: file.name,
    extension: file.extension,
    mime_type: file.mimeType,
    size: file.size,
    storage_path: path,
  });
  if (error) {
    await supabase.storage.from(BUCKET).remove([path]);
    throw new Error(error.message);
  }
}

export async function deleteMaterial(material: ClassMaterial): Promise<void> {
  const { error: removeError } = await supabase.storage.from(BUCKET).remove([material.storagePath]);
  if (removeError) throw new Error(removeError.message);
  const { error } = await supabase.from('class_materials').delete().eq('id', material.id);
  fail(error);
}

export interface DownloadedMaterial {
  name: string;
  localUri: string;
  mimeType: string;
}

/** Downloads a material into the cache (reusing an earlier download) so it can be opened. */
export async function downloadMaterial(material: ClassMaterial): Promise<DownloadedMaterial> {
  const cache = FileSystem.cacheDirectory;
  if (!cache) throw new Error('This device does not provide storage for downloads.');
  const directory = `${cache}class-materials/`;
  const directoryInfo = await FileSystem.getInfoAsync(directory);
  if (!directoryInfo.exists) await FileSystem.makeDirectoryAsync(directory, { intermediates: true });

  const target = `${directory}${material.id}.${material.extension || 'bin'}`;
  const result: DownloadedMaterial = { name: material.name, localUri: target, mimeType: material.mimeType };
  const existing = await FileSystem.getInfoAsync(target);
  if (existing.exists && existing.size > 0) return result;

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(material.storagePath, 600);
  if (error || !data) throw new Error(error?.message ?? 'Could not get a download link.');
  const download = await FileSystem.downloadAsync(data.signedUrl, target);
  if (download.status !== 200) {
    await FileSystem.deleteAsync(target, { idempotent: true }).catch(() => undefined);
    throw new Error(`The download failed (status ${download.status}).`);
  }
  return result;
}

// -------------------------------------------------------------- progress
export async function listMyCompleted(classId: string, learnerId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('material_progress')
    .select('material_id')
    .eq('class_id', classId)
    .eq('learner_id', learnerId);
  fail(error);
  return rowsOf(data).map((r) => str(r.material_id));
}

export async function setMaterialCompleted(material: ClassMaterial, learnerId: string, done: boolean): Promise<void> {
  if (done) {
    const { error } = await supabase
      .from('material_progress')
      .insert({ material_id: material.id, learner_id: learnerId, class_id: material.classId });
    if (error && error.code !== '23505') throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from('material_progress')
      .delete()
      .eq('material_id', material.id)
      .eq('learner_id', learnerId);
    fail(error);
  }
}

/** Instructor view: every learner's completed materials (learners only receive their own rows). */
export async function listClassProgress(classId: string): Promise<MaterialProgressRow[]> {
  const { data, error } = await supabase
    .from('material_progress')
    .select('material_id, learner_id')
    .eq('class_id', classId);
  fail(error);
  return rowsOf(data).map((r) => ({ materialId: str(r.material_id), learnerId: str(r.learner_id) }));
}

// --------------------------------------------------------------- quizzes
function mapQuestions(value: unknown): ClassQuizQuestion[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const q = rowOf(item);
    const options = Array.isArray(q?.options) ? q.options.filter((o): o is string => typeof o === 'string') : [];
    return { prompt: str(q?.prompt), options };
  });
}

function mapQuiz(row: Row): ClassQuiz {
  return {
    id: str(row.id),
    classId: str(row.class_id),
    title: str(row.title),
    questions: mapQuestions(row.questions),
    createdAt: str(row.created_at),
  };
}

export async function listClassQuizzes(classId: string): Promise<ClassQuiz[]> {
  const { data, error } = await supabase
    .from('class_quizzes')
    .select('id, class_id, title, questions, created_at')
    .eq('class_id', classId)
    .order('created_at', { ascending: false });
  fail(error);
  return rowsOf(data).map(mapQuiz);
}

export async function getClassQuiz(id: string): Promise<ClassQuiz | null> {
  const { data, error } = await supabase
    .from('class_quizzes')
    .select('id, class_id, title, questions, created_at')
    .eq('id', id)
    .maybeSingle();
  fail(error);
  const row = rowOf(data);
  return row ? mapQuiz(row) : null;
}

export async function createClassQuiz(classId: string, title: string, questions: QuizQuestion[]): Promise<void> {
  const { error } = await supabase.rpc('create_class_quiz', {
    p_class: classId,
    p_title: title,
    p_questions: questions.map((q) => ({ prompt: q.prompt, options: q.options, correctIndex: q.correctIndex })),
  });
  fail(error);
}

export async function deleteClassQuiz(id: string): Promise<void> {
  const { error } = await supabase.from('class_quizzes').delete().eq('id', id);
  fail(error);
}

export interface SubmitResult {
  score: number;
  total: number;
  correct: number[];
}

/** The database grades the attempt, so answer keys never reach the learner's device before submitting. */
export async function submitClassAttempt(quizId: string, answers: number[]): Promise<SubmitResult> {
  const { data, error } = await supabase.rpc('submit_quiz_attempt', { p_quiz: quizId, p_answers: answers });
  fail(error);
  const row = rowOf(data);
  const correct = Array.isArray(row?.correct) ? row.correct.map((c: unknown) => num(c)) : [];
  return { score: num(row?.score), total: num(row?.total), correct };
}

/** Learners receive their own attempts; instructors receive everyone's. */
export async function listAttempts(classId: string): Promise<ClassAttempt[]> {
  const { data, error } = await supabase
    .from('quiz_attempts')
    .select('id, quiz_id, learner_id, score, total, taken_at, learner:profiles!learner_id(display_name)')
    .eq('class_id', classId)
    .order('taken_at', { ascending: false });
  fail(error);
  return rowsOf(data).map((row) => ({
    id: str(row.id),
    quizId: str(row.quiz_id),
    learnerId: str(row.learner_id),
    learnerName: str(embedded(row.learner)?.display_name, 'Learner'),
    score: num(row.score),
    total: num(row.total),
    takenAt: str(row.taken_at),
  }));
}

/** Removes every uploaded file of a class from storage (call before deleting the class). */
export async function removeAllMaterialFiles(classId: string): Promise<void> {
  const materials = await listMaterials(classId);
  if (materials.length === 0) return;
  const { error } = await supabase.storage.from(BUCKET).remove(materials.map((m) => m.storagePath));
  if (error) throw new Error(error.message);
}

/** Instructor only: loads a published quiz together with its correct answers so it can be edited. */
export async function getQuizForEdit(quizId: string): Promise<{ title: string; questions: QuizQuestion[] }> {
  const { data, error } = await supabase.rpc('get_quiz_for_edit', { p_quiz: quizId });
  fail(error);
  const row = rowOf(data);
  const questions: QuizQuestion[] = Array.isArray(row?.questions)
    ? row.questions.map((item: unknown) => {
        const q = rowOf(item);
        return {
          id: createId(),
          prompt: str(q?.prompt),
          options: Array.isArray(q?.options) ? q.options.filter((o): o is string => typeof o === 'string') : [],
          correctIndex: num(q?.correctIndex),
        };
      })
    : [];
  return { title: str(row?.title), questions };
}

export async function updateClassQuiz(quizId: string, title: string, questions: QuizQuestion[]): Promise<void> {
  const { error } = await supabase.rpc('update_class_quiz', {
    p_quiz: quizId,
    p_title: title,
    p_questions: questions.map((q) => ({ prompt: q.prompt, options: q.options, correctIndex: q.correctIndex })),
  });
  fail(error);
}
