import type { ImportOperation, ImportOperationKind, ImportOperationStatus } from '@features/import-flow/contracts';

const kinds: readonly ImportOperationKind[] = ['gmail_historical','outlook_historical','manual_tracking','scheduled_tracking','export_file'];
const statuses: readonly ImportOperationStatus[] = ['awaiting_upload','pending_dispatch','queued','running','retrying','succeeded','failed','expired','superseded','cancelled'];
const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid import operation response');
  return value as Record<string, unknown>;
};
const string = (value: unknown): string => {
  if (typeof value !== 'string' || !value) throw new Error('Invalid import operation response');
  return value;
};
const nullableString = (value: unknown): string | null => value === null || value === undefined ? null : string(value);

export const normalizeImportOperation = (value: unknown): ImportOperation => {
  const data = object(value);
  const kind = string(data.kind);
  const status = string(data.status);
  const trigger = string(data.trigger);
  if (!kinds.includes(kind as ImportOperationKind) || !statuses.includes(status as ImportOperationStatus) || (trigger !== 'user' && trigger !== 'scheduler')) {
    throw new Error('Invalid import operation response');
  }
  const progress = Number(data.progress);
  const attempts = Number(data.attempts);
  const provider = data.provider === null || data.provider === undefined ? null : string(data.provider);
  if (provider !== null && provider !== 'uber_eats' && provider !== 'doordash') throw new Error('Invalid import operation response');
  if (!Number.isInteger(progress) || progress < 0 || progress > 100 || !Number.isInteger(attempts) || attempts < 0) throw new Error('Invalid import operation response');
  if (data.result !== null && data.result !== undefined && (typeof data.result !== 'object' || Array.isArray(data.result))) throw new Error('Invalid import operation response');
  return {
    id: string(data.id), kind: kind as ImportOperationKind, trigger, status: status as ImportOperationStatus,
    phase: string(data.phase), progress, attempts,
    provider,
    result: data.result ? data.result as Readonly<Record<string,unknown>> : null,
    errorCode: nullableString(data.errorCode), errorMessage: nullableString(data.errorMessage),
    createdAt: string(data.createdAt), queuedAt: nullableString(data.queuedAt), startedAt: nullableString(data.startedAt),
    completedAt: nullableString(data.completedAt), updatedAt: string(data.updatedAt),
  };
};

export const normalizeOperationEnvelope = (value: unknown): ImportOperation => normalizeImportOperation(object(value).operation);
export const normalizeNullableOperationEnvelope = (value: unknown): ImportOperation | null => {
  const operation = object(value).operation;
  return operation === null ? null : normalizeImportOperation(operation);
};
