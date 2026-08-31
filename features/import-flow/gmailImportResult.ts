import type { GmailImportResponse } from '@services/gmailApi';

export type GmailImportOutcome =
  | 'no_supported_receipts'
  | 'covered_by_exports'
  | 'already_current'
  | 'updated_orders'
  | 'new_orders'
  | 'completed_with_warnings';

export interface GmailImportResultPresentation {
  outcome: GmailImportOutcome;
  title: string;
  message: string;
}

export type GmailImportCompletionDecision =
  | { kind: 'open_wrapped' }
  | { kind: 'show_result'; presentation: GmailImportResultPresentation };

export const MIN_ORDERS_FOR_AUTOMATIC_WRAPPED = 3;

export function resolveGmailImportResult(
  result: GmailImportResponse,
): GmailImportResultPresentation {
  const newOrders = result.newOrders ?? 0;
  const updatedOrders = result.updatedOrders ?? 0;
  const unchangedOrders = result.unchangedOrders ?? 0;
  const warningSuffix = result.errors.length > 0
    ? ' Some messages could not be read, but your existing history is safe.'
    : '';

  if (newOrders > 0) {
    return {
      outcome: result.errors.length > 0 ? 'completed_with_warnings' : 'new_orders',
      title: 'New orders added',
      message: `${newOrders} new, ${updatedOrders} updated, and ${unchangedOrders} unchanged order${newOrders + updatedOrders + unchangedOrders === 1 ? '' : 's'} checked.${warningSuffix}`,
    };
  }

  if (updatedOrders > 0) {
    return {
      outcome: result.errors.length > 0 ? 'completed_with_warnings' : 'updated_orders',
      title: 'Your orders were updated',
      message: `${updatedOrders} existing order${updatedOrders === 1 ? '' : 's'} updated and ${unchangedOrders} already current.${warningSuffix}`,
    };
  }

  if (result.supportedReceiptsFound === 0) {
    return {
      outcome: 'no_supported_receipts',
      title: 'Email check complete',
      message: `No supported delivery receipt emails were found. Your existing history is unchanged.${warningSuffix}`,
    };
  }

  if (result.exportCoveredReceipts > 0 && result.eligibleReceipts === 0) {
    return {
      outcome: 'covered_by_exports',
      title: 'Your exports already cover these orders',
      message: `${result.exportCoveredReceipts} matching receipt${result.exportCoveredReceipts === 1 ? ' was' : 's were'} already included in your uploaded provider history. Nothing was duplicated.${warningSuffix}`,
    };
  }

  return {
    outcome: result.errors.length > 0 ? 'completed_with_warnings' : 'already_current',
    title: 'Your stats are already current',
    message: `${Math.max(unchangedOrders, result.deduplicatedReceipts)} matching order${Math.max(unchangedOrders, result.deduplicatedReceipts) === 1 ? ' was' : 's were'} checked with no changes.${warningSuffix}`,
  };
}

export function resolveGmailImportCompletion(
  result: GmailImportResponse,
  availableOrderCount: number,
): GmailImportCompletionDecision {
  if (result.success && availableOrderCount >= MIN_ORDERS_FOR_AUTOMATIC_WRAPPED) {
    return { kind: 'open_wrapped' };
  }

  const presentation = resolveGmailImportResult(result);
  if (availableOrderCount === 1 || availableOrderCount === 2) {
    return {
      kind: 'show_result',
      presentation: {
        ...presentation,
        title: availableOrderCount === 1 ? 'Only one order found' : 'Only a few orders found',
        message: `SnackTrack currently has ${availableOrderCount} orders to build your stats from. You can view them now or add another source for a more useful summary.`,
      },
    };
  }

  return { kind: 'show_result', presentation };
}
