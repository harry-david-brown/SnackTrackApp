import type { NativeUploadFile } from '@services/api';
import type { ImportOperation } from './contracts';

/** Accepted is a handoff response, not an independent job-status cache. */
export type FileSubmissionState =
  | { phase: 'empty'; file: null }
  | { phase: 'choosing'; file: NativeUploadFile | null }
  | { phase: 'selected' | 'submitting' | 'uncertain'; file: NativeUploadFile }
  | { phase: 'accepted'; file: null; operation: ImportOperation };

export const emptyFileSubmission: FileSubmissionState = {
  phase: 'empty',
  file: null,
};
