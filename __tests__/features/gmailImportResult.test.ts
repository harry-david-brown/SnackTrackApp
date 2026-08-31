import {
  resolveGmailImportCompletion,
  resolveGmailImportResult,
} from '@features/import-flow/gmailImportResult';
import type { GmailImportResponse } from '@services/gmailApi';

const result = (overrides: Partial<GmailImportResponse> = {}): GmailImportResponse => ({
  success: true,
  totalEmailsFound: 0,
  totalReceiptsProcessed: 0,
  emailsExamined: 0,
  supportedReceiptsFound: 0,
  exportCoveredReceipts: 0,
  eligibleReceipts: 0,
  deduplicatedReceipts: 0,
  totalReceiptsImported: 0,
  totalAmount: 0,
  errors: [],
  newOrders: 0,
  updatedOrders: 0,
  unchangedOrders: 0,
  ...overrides,
});

describe('resolveGmailImportResult', () => {
  it('distinguishes no supported messages from export-covered matches', () => {
    expect(resolveGmailImportResult(result()).outcome).toBe('no_supported_receipts');
    expect(resolveGmailImportResult(result({
      supportedReceiptsFound: 3,
      exportCoveredReceipts: 3,
    })).outcome).toBe('covered_by_exports');
  });

  it('distinguishes unchanged, updated, and new orders', () => {
    expect(resolveGmailImportResult(result({ supportedReceiptsFound: 2, eligibleReceipts: 2, unchangedOrders: 2 })).outcome).toBe('already_current');
    expect(resolveGmailImportResult(result({ supportedReceiptsFound: 1, eligibleReceipts: 1, updatedOrders: 1 })).outcome).toBe('updated_orders');
    expect(resolveGmailImportResult(result({ supportedReceiptsFound: 1, eligibleReceipts: 1, newOrders: 1 })).outcome).toBe('new_orders');
  });
});

describe('resolveGmailImportCompletion', () => {
  it('opens Wrapped immediately when enough orders are available', () => {
    expect(resolveGmailImportCompletion(result({
      newOrders: 257,
      errors: ['One message could not be converted'],
    }), 257)).toEqual({ kind: 'open_wrapped' });
  });

  it('keeps low-count imports on an explanatory result', () => {
    expect(resolveGmailImportCompletion(result({ newOrders: 2 }), 2)).toEqual(expect.objectContaining({
      kind: 'show_result',
      presentation: expect.objectContaining({ title: 'Only a few orders found' }),
    }));
  });

  it('keeps zero-result imports on their specific result', () => {
    expect(resolveGmailImportCompletion(result(), 0)).toEqual(expect.objectContaining({
      kind: 'show_result',
      presentation: expect.objectContaining({ outcome: 'no_supported_receipts' }),
    }));
  });
});
