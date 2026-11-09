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
  const alreadySaved = nothingChanged && (summary.unchangedOrders ?? 0) > 0;
  const empty = nothingChanged && summary.unchangedOrders === 0 && !needsMatching;
  const orderLabel = (value: number) => `${value} ${value === 1 ? 'order' : 'orders'}`;
  const mailboxImport = summary.sourceName === 'Gmail' || summary.sourceName === 'Outlook';
  const title = alreadySaved
    ? `${orderLabel(summary.unchangedOrders!)} already saved`
    : empty ? mailboxImport ? 'No Uber Eats or DoorDash orders found' : 'No orders found in this file'
      : summary.changedOrders !== null && summary.changedOrders > 0
        ? `${orderLabel(summary.changedOrders)} added or updated`
        : 'Import finished';
  const resultBody = alreadySaved
    ? 'No new orders were added.'
    : empty
      ? mailboxImport ? `We checked ${summary.sourceName}, but didn’t find delivery receipts we could add. Try the inbox that receives your Uber Eats or DoorDash order emails, or add orders from either delivery app.` : 'Choose the original order-history file you downloaded from Uber Eats or DoorDash. We couldn’t find orders we could add in this file.'
      : nothingChanged ? 'No orders were added or updated.'
        : summary.changedOrders === null
          ? summary.importedOrders !== null
            ? `${summary.sourceName} imported ${orderLabel(summary.importedOrders)}. View your history to explore them.`
            : 'View your order history to see what is saved.'
          : `${summary.sourceName} has finished updating your history.`;
  const body = needsMatching
    ? `${resultBody} Some receipts still need matching before they appear in your totals.`
    : resultBody;
  return { title, body, nothingChanged, empty, needsMatching };
}

export interface MailboxOutcome {
  mailbox: 'gmail' | 'outlook'; email: string | null; success: boolean; errorCode: string | null;
}
export function resolveMailboxOutcomes(operation: ImportOperation): MailboxOutcome[] {
  const outcomes = operation.result?.mailboxOutcomes;
  if (!Array.isArray(outcomes)) return [];
  return outcomes.flatMap(value => {
    if (!value || typeof value !== 'object' || !['gmail', 'outlook'].includes(value.mailbox) || typeof value.success !== 'boolean') return [];
    return [{ mailbox: value.mailbox, email: typeof value.email === 'string' ? value.email : null,
      success: value.success, errorCode: typeof value.errorCode === 'string' ? value.errorCode : null }];
  });
}
