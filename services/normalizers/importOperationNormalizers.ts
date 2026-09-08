import type { ImportJourneyContext, ImportOperation, ImportOperationKind, ImportOperationStatus, ImportTimeEstimate } from '@features/import-flow/contracts';

const kinds: readonly ImportOperationKind[] = ['gmail_historical','outlook_historical','manual_tracking','scheduled_tracking','export_file'];
const statuses: readonly ImportOperationStatus[] = ['awaiting_upload','pending_dispatch','queued','running','retrying','succeeded','failed','expired','superseded','cancelled'];
const journeyContexts: readonly ImportJourneyContext[] = ['onboarding','post_onboarding','routine','legacy'];
const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid import operation response');
  return value as Record<string, unknown>;
};
const string = (value: unknown): string => {
  if (typeof value !== 'string' || !value) throw new Error('Invalid import operation response');
  return value;
};
const nullableString = (value: unknown): string | null => value === null || value === undefined ? null : string(value);
const normalizeTimeEstimate = (value: unknown): ImportTimeEstimate | null => {
  if (value === null || value === undefined || typeof value !== 'object' || Array.isArray(value)) return null;
  const estimate = value as Record<string, unknown>;
  const kind = String(estimate.kind);
  const minimumMinutes = estimate.minimumMinutes === null ? null : Number(estimate.minimumMinutes);
  const maximumMinutes = estimate.maximumMinutes === null ? null : Number(estimate.maximumMinutes);
  const revision = Number(estimate.revision);
  if (!['total','remaining','retry_wait','finishing'].includes(kind) || !Number.isInteger(revision) || revision < 0) return null;
  if (kind === 'finishing') {
    return minimumMinutes === null && maximumMinutes === null
      ? { kind, minimumMinutes: null, maximumMinutes: null, revision }
      : null;
  }
  if (typeof minimumMinutes !== 'number' || typeof maximumMinutes !== 'number'
    || !Number.isInteger(minimumMinutes) || !Number.isInteger(maximumMinutes)
    || minimumMinutes < 1 || maximumMinutes < minimumMinutes) return null;
  return { kind: kind as Exclude<ImportTimeEstimate['kind'], 'finishing'>, minimumMinutes, maximumMinutes, revision };
};

export const normalizeImportOperation = (value: unknown): ImportOperation => {
  const data = object(value);
  const kind = string(data.kind);
  const status = string(data.status);
  const trigger = string(data.trigger);
  const journeyContext = data.journeyContext === undefined ? 'legacy' : string(data.journeyContext);
  if (!kinds.includes(kind as ImportOperationKind) || !statuses.includes(status as ImportOperationStatus) || !journeyContexts.includes(journeyContext as ImportJourneyContext) || (trigger !== 'user' && trigger !== 'scheduler')) {
    throw new Error('Invalid import operation response');
  }
  const progress = Number(data.progress);
  const attempts = Number(data.attempts);
  const provider = data.provider === null || data.provider === undefined ? null : string(data.provider);
  if (provider !== null && provider !== 'uber_eats' && provider !== 'doordash') throw new Error('Invalid import operation response');
  if (!Number.isInteger(progress) || progress < 0 || progress > 100 || !Number.isInteger(attempts) || attempts < 0) throw new Error('Invalid import operation response');
  if (data.result !== null && data.result !== undefined && (typeof data.result !== 'object' || Array.isArray(data.result))) throw new Error('Invalid import operation response');
  const presentationSource = data.presentation === null || data.presentation === undefined ? null : object(data.presentation);
  const discoveredOrderCount = presentationSource?.discoveredOrderCount === null || presentationSource?.discoveredOrderCount === undefined
    ? null
    : Number(presentationSource.discoveredOrderCount);
  const presentation: ImportOperation['presentation'] = presentationSource ? {
    mode: presentationSource.mode === 'delayed' ? 'delayed' as const : 'foreground' as const,
    expectedDurationBand: presentationSource.expectedDurationBand === 'under_5_minutes'
      ? 'under_5_minutes' : presentationSource.expectedDurationBand === 'over_5_minutes' ? 'over_5_minutes' : 'unknown',
    reason: ['normal','queue_backlog','workers_unavailable','queue_paused','retrying','elapsed_over_threshold'].includes(String(presentationSource.reason))
      ? presentationSource.reason as 'normal'|'queue_backlog'|'workers_unavailable'|'queue_paused'|'retrying'|'elapsed_over_threshold'
      : 'normal' as const,
    stage: ['waiting','discovering','building_history','preparing_recap'].includes(String(presentationSource.stage))
      ? presentationSource.stage as 'waiting'|'discovering'|'building_history'|'preparing_recap'
      : 'waiting' as const,
    discoveredOrderCount: discoveredOrderCount !== null && Number.isFinite(discoveredOrderCount) && discoveredOrderCount >= 0
      ? Math.floor(discoveredOrderCount)
      : null,
    timeEstimate: normalizeTimeEstimate(presentationSource.timeEstimate),
  } : null;
  return {
    id: string(data.id), kind: kind as ImportOperationKind, trigger, journeyContext: journeyContext as ImportJourneyContext, status: status as ImportOperationStatus,
    phase: string(data.phase), progress, attempts,
    provider,
    result: data.result ? data.result as Readonly<Record<string,unknown>> : null,
    errorCode: nullableString(data.errorCode), errorMessage: nullableString(data.errorMessage),
    createdAt: string(data.createdAt), queuedAt: nullableString(data.queuedAt), startedAt: nullableString(data.startedAt),
    completedAt: nullableString(data.completedAt), updatedAt: string(data.updatedAt),
    presentation,
  };
};

export const normalizeOperationEnvelope = (value: unknown): ImportOperation => normalizeImportOperation(object(value).operation);
export const normalizeNullableOperationEnvelope = (value: unknown): ImportOperation | null => {
  const operation = object(value).operation;
  return operation === null ? null : normalizeImportOperation(operation);
};
