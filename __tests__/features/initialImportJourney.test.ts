import { resolveInitialImportJourney } from '@features/import-flow/initialImportJourney';

type JourneyInput = Parameters<typeof resolveInitialImportJourney>[0];

const makeFlow = (overrides: Partial<JourneyInput> = {}): JourneyInput => ({
  hasImportedEmailData: false,
  hasAnyExportData: false,
  gmailConnected: false,
  outlookConnected: false,
  gmailEmail: null,
  outlookEmail: null,
  canImportFromGmail: false,
  canImportFromOutlook: false,
  gmailNeedsReconnect: false,
  outlookNeedsReconnect: false,
  gmailTemporarilyUnavailable: false,
  outlookTemporarilyUnavailable: false,
  exportProviderProgress: {
    importedCount: 0,
    uberEats: { imported: false, receiptCount: 0, status: 'not_started' },
    doorDash: { imported: false, receiptCount: 0, status: 'not_started' },
  },
  ...overrides,
});

describe('resolveInitialImportJourney', () => {
  it('starts with method selection for a fresh account', () => {
    expect(resolveInitialImportJourney(makeFlow(), null)).toEqual({ kind: 'choose_method' });
  });

  it('routes none of the above to delivery-app selection', () => {
    expect(resolveInitialImportJourney(makeFlow(), 'alternative')).toEqual({ kind: 'choose_provider' });
  });

  it('keeps an explicitly requested source picker visible when history already exists', () => {
    expect(resolveInitialImportJourney(makeFlow({ hasAnyExportData: true }), 'alternative')).toEqual({ kind: 'choose_provider' });
  });

  it('reviews consent before scanning a connected Gmail account', () => {
    expect(resolveInitialImportJourney(makeFlow({
      gmailConnected: true,
      gmailEmail: 'orders@example.com',
      canImportFromGmail: true,
    }), 'gmail')).toMatchObject({
      kind: 'review_email_scan',
      provider: 'gmail',
      email: 'orders@example.com',
      canImport: true,
    });
  });

  it('reviews the registered Outlook address before scanning it', () => {
    expect(resolveInitialImportJourney(makeFlow({
      outlookConnected: true,
      outlookEmail: 'orders@outlook.com',
      canImportFromOutlook: true,
    }), 'outlook')).toMatchObject({
      kind: 'review_email_scan',
      provider: 'outlook',
      email: 'orders@outlook.com',
      canImport: true,
    });
  });

  it('infers the only connected provider without skipping scan review', () => {
    expect(resolveInitialImportJourney(makeFlow({
      outlookConnected: true,
      canImportFromOutlook: true,
    }), null)).toMatchObject({
      kind: 'review_email_scan',
      provider: 'outlook',
    });
  });

  it('resumes a provider request instead of returning to method selection', () => {
    const flow = makeFlow({
      exportProviderProgress: {
        importedCount: 0,
        uberEats: { imported: false, receiptCount: 0, status: 'requested' },
        doorDash: { imported: false, receiptCount: 0, status: 'not_started' },
      },
    });
    expect(resolveInitialImportJourney(flow, null)).toEqual({ kind: 'provider_resume' });
  });

  it('leaves onboarding once any durable history exists', () => {
    expect(resolveInitialImportJourney(makeFlow({ hasAnyExportData: true }), null)).toEqual({ kind: 'complete' });
  });
});
