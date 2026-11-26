import type { FileCategory } from '../types/file';

export const CATEGORY_LABEL: Record<FileCategory, string> = {
  presentation: 'Presentation',
  exercise: 'Exercise',
};

export const ALLOWED_EXTENSIONS: Record<FileCategory, readonly string[]> = {
  presentation: ['ppt', 'pptx', 'pdf'],
  exercise: ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt', 'xls', 'xlsx', 'csv'],
};

export const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: 'application/pdf',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  txt: 'text/plain',
  rtf: 'application/rtf',
  odt: 'application/vnd.oasis.opendocument.text',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv',
};
