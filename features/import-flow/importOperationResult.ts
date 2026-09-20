import type { ImportOperation } from './contracts';
import type { ReceiptImportOutcome } from './receiptImportOutcome';
export interface ImportOperationResultSummary {
  readonly sourceName: string;
  readonly newOrders: number | null;
  readonly updatedOrders: number | null;
  readonly unchangedOrders: number | null;
  readonly changedOrders: number | null;
  readonly importedOrders: number | null;
  readonly unresolvedOrders?: number;
  readonly receiptOutcome?: ReceiptImportOutcome;
}
const count = (value: unknown): number | null => {
  if (typeof value !== 'number' && (typeof value !== 'string' || value.trim() === '')) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : null;
};
/** Unknown counts remain unknown. Export importedCount does not establish which orders are new. */
export function resolveImportOperationResult(operation: ImportOperation): ImportOperationResultSummary {
  const result = operation.result ?? {};
  const evidence = result.receiptOutcome;
  const newOrders = evidence?.newOrders ?? count(result.newOrders);
  const updatedOrders = evidence?.updatedOrders ?? count(result.updatedOrders);
  return {
    sourceName: operation.kind === 'gmail_historical' ? 'Gmail' : operation.kind === 'outlook_historical' ? 'Outlook' : ['manual_tracking','scheduled_tracking','gmail_push_tracking'].includes(operation.kind) ? 'Email' : operation.kind.startsWith('receipt_') ? 'History review' : operation.provider === 'doordash' ? 'DoorDash' : 'Uber Eats',
    newOrders, updatedOrders, unchangedOrders: evidence?.unchangedOrders ?? count(result.unchangedOrders),
    changedOrders: newOrders !== null && updatedOrders !== null ? newOrders + updatedOrders : null,
    importedOrders: evidence?.ordersProcessed ?? count(result.importedCount),
    ...(evidence ? { receiptOutcome: evidence, unresolvedOrders: evidence.unresolvedOrders } : count(result.unresolvedOrders) === null ? {} : {unresolvedOrders:count(result.unresolvedOrders)!}),
  };
}

export function importResultCopy(summary: ImportOperationResultSummary) {
  const nothingChanged = summary.changedOrders === 0;
  const needsMatching = (summary.unresolvedOrders ?? 0) > 0 || (summary.receiptOutcome?.unlinkedAdjustments ?? 0) > 0;
  const duplicatesOnly = nothingChanged && (summary.unchangedOrders ?? 0) > 0 && !needsMatching;
  const empty = nothingChanged && summary.unchangedOrders === 0 && !needsMatching;
  const title = nothingChanged && needsMatching ? 'Import complete' : duplicatesOnly ? 'These orders are already saved' : empty ? 'No supported orders found' : nothingChanged ? 'No orders added or updated' : summary.changedOrders === null ? 'Your history was imported' : `${summary.changedOrders} orders added or updated`;
  const body = nothingChanged && needsMatching ? 'Your receipts have been saved. Your order history is ready to view.' : duplicatesOnly ? `All ${summary.unchangedOrders} supported orders found were already in your history. They were not added twice.` : empty ? `We didn’t find supported delivery orders in this ${summary.sourceName} import. Try another inbox or an original provider download.` : nothingChanged ? 'Your existing order history is unchanged.' : summary.importedOrders !== null && summary.changedOrders === null ? `${summary.sourceName} imported ${summary.importedOrders} supported orders. View your history to explore them.` : `${summary.sourceName} has finished updating your history.`;
  return { title, body, nothingChanged, empty, needsMatching };
}
