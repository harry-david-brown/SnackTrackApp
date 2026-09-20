import { normalizeGmailImportResponse } from '@services/normalizers/gmailNormalizers';

const result = { success: true, code: null, totalEmailsFound: 2, totalReceiptsProcessed: 2,
  emailsExamined: 2, supportedReceiptsFound: 2, exportCoveredReceipts: 0, eligibleReceipts: 2,
  deduplicatedReceipts: 0, totalReceiptsImported: 2, totalAmount: null, errors: [],
  newOrders: 2, updatedOrders: 0, unchangedOrders: 0, currencyCode: null,
  receiptOutcome: { policyVersion: 3, newOrders: 2, updatedOrders: 0, unchangedOrders: 0,
    ordersProcessed: 2, unresolvedOrders: 0, unlinkedAdjustments: 0, adjustedOrders: 0,
    cancellationsRecovered: 0, sourceDocuments: 2, currencies: [
      { currencyCode: 'CAD', netAmount: 10, pricedOrders: 1, unpricedOrders: 0, possibleAdditionalAmount: 0, unpricedPossibleOrders: 0 },
      { currencyCode: 'USD', netAmount: 20, pricedOrders: 1, unpricedOrders: 0, possibleAdditionalAmount: 0, unpricedPossibleOrders: 0 },
    ] },
};

it('retains canonical mailbox outcomes and nullable totals without adding different currencies', () => {
  expect(normalizeGmailImportResponse(result)).toEqual(result);
});
it('still accepts older single-total responses and rejects malformed canonical results', () => {
  const { receiptOutcome: _outcome, currencyCode: _currency, ...legacy } = result;
  expect(normalizeGmailImportResponse({ ...legacy, totalAmount: 30 }).totalAmount).toBe(30);
  expect(() => normalizeGmailImportResponse({ ...result, receiptOutcome: { ...result.receiptOutcome, ordersProcessed: 3 } })).toThrow();
  expect(() => normalizeGmailImportResponse({ ...result, totalAmount: '30' })).toThrow();
});
