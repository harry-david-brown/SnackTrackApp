import type { ImportOperation } from './contracts';
export interface ImportOperationResultSummary {
  readonly sourceName: string;
  readonly newOrders: number | null;
  readonly updatedOrders: number | null;
  readonly unchangedOrders: number | null;
  readonly changedOrders: number | null;
  readonly importedOrders: number | null;
}
const count = (value: unknown): number | null => {
  if (typeof value !== 'number' && (typeof value !== 'string' || value.trim() === '')) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : null;
};
/** Unknown counts remain unknown. Export importedCount does not establish which orders are new. */
export function resolveImportOperationResult(operation: ImportOperation): ImportOperationResultSummary {
  const result = operation.result ?? {};
  const newOrders = count(result.newOrders);
  const updatedOrders = count(result.updatedOrders);
  return {
    sourceName: operation.kind === 'gmail_historical' ? 'Gmail' : operation.kind === 'outlook_historical' ? 'Outlook' : operation.kind === 'manual_tracking' || operation.kind === 'scheduled_tracking' ? 'Email' : operation.provider === 'doordash' ? 'DoorDash' : 'Uber Eats',
    newOrders, updatedOrders, unchangedOrders: count(result.unchangedOrders),
    changedOrders: newOrders !== null && updatedOrders !== null ? newOrders + updatedOrders : null,
    importedOrders: count(result.importedCount),
  };
}
