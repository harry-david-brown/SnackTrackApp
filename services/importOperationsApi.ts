import api from '@services/api';
import type { ImportJourneyContext, ImportOperation } from '@features/import-flow/contracts';
import { normalizeNullableOperationEnvelope, normalizeOperationEnvelope } from './normalizers/importOperationNormalizers';

export interface UploadIntent {
  readonly operation: ImportOperation;
  readonly uploadUrl: string;
  readonly headers: Readonly<Record<string,string>>;
  readonly expiresAt: string;
}

const uploadEnvelope = (value: unknown): UploadIntent => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid upload intent response');
  const data = value as Record<string,unknown>;
  if (typeof data.uploadUrl !== 'string' || typeof data.expiresAt !== 'string' || !data.headers || typeof data.headers !== 'object' || Array.isArray(data.headers)) throw new Error('Invalid upload intent response');
  const headers = data.headers as Record<string,unknown>;
  if (Object.values(headers).some((header) => typeof header !== 'string')) throw new Error('Invalid upload intent response');
  return { operation: normalizeOperationEnvelope({ operation: data.operation }), uploadUrl: data.uploadUrl, headers: headers as Readonly<Record<string,string>>, expiresAt: data.expiresAt };
};

const newIdempotencyKey = (kind: string): string => `${kind}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
const liveStatusRequest = { headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' } } as const;

export const importOperationsApi = {
  getActive: async (): Promise<ImportOperation|null> => normalizeNullableOperationEnvelope((await api.get<unknown>('/imports/active', liveStatusRequest)).data),
  get: async (id: string): Promise<ImportOperation> => normalizeOperationEnvelope((await api.get<unknown>(`/imports/${encodeURIComponent(id)}`, liveStatusRequest)).data),
  startGmail: async (journeyContext: ImportJourneyContext = 'legacy', automaticUpdates = false, idempotencyKey?: string): Promise<ImportOperation> => normalizeOperationEnvelope((await api.post<unknown>('/gmail/import', { journeyContext, ...(automaticUpdates ? { automaticUpdates: true } : {}) }, { headers: { 'Idempotency-Key': idempotencyKey ?? newIdempotencyKey('gmail') } })).data),
  startOutlook: async (journeyContext: ImportJourneyContext = 'legacy', automaticUpdates = false, idempotencyKey?: string): Promise<ImportOperation> => normalizeOperationEnvelope((await api.post<unknown>('/outlook/import', { journeyContext, ...(automaticUpdates ? { automaticUpdates: true } : {}) }, { headers: { 'Idempotency-Key': idempotencyKey ?? newIdempotencyKey('outlook') } })).data),
  startTracking: async (): Promise<ImportOperation> => normalizeOperationEnvelope((await api.post<unknown>('/gmail/tracking/check', {}, { headers: { 'Idempotency-Key': newIdempotencyKey('tracking') } })).data),
  createUberEatsUploadIntent: async (file: { name: string; type: string; size: number }, journeyContext: ImportJourneyContext = 'legacy'): Promise<UploadIntent> => uploadEnvelope((await api.post<unknown>('/imports/exports/uber-eats/upload-intent', { filename: file.name, contentType: file.type, contentLength: file.size, journeyContext }, { headers: { 'Idempotency-Key': newIdempotencyKey('export:uber_eats') } })).data),
  createDoorDashUploadIntent: async (file: { name: string; type: string; size: number }, journeyContext: ImportJourneyContext = 'legacy'): Promise<UploadIntent> => uploadEnvelope((await api.post<unknown>('/imports/exports/doordash/upload-intent', { filename: file.name, contentType: file.type, contentLength: file.size, journeyContext }, { headers: { 'Idempotency-Key': newIdempotencyKey('export:doordash') } })).data),
  refreshUploadIntent: async (id: string): Promise<UploadIntent> => uploadEnvelope((await api.post<unknown>(`/imports/${encodeURIComponent(id)}/upload-url`)).data),
  submitUpload: async (id: string): Promise<ImportOperation> => normalizeOperationEnvelope((await api.post<unknown>(`/imports/${encodeURIComponent(id)}/submit`)).data),
};
