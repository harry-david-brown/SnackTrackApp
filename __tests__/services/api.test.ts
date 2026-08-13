// Simple smoke tests for API services
describe('API Services', () => {
  it('should expose the canonical onboarding reset service', () => {
    const { userApi } = require('@services/api');
    expect(userApi).toBeDefined();
    expect(typeof userApi.resetOnboarding).toBe('function');
  });

  it('should have csvApi with importCsv method', () => {
    const { csvApi } = require('@services/api');
    expect(csvApi).toBeDefined();
    expect(typeof csvApi.importCsv).toBe('function');
  });

  it('should have receiptApi with clearReceipts method', () => {
    const { receiptApi } = require('@services/api');
    expect(receiptApi).toBeDefined();
    expect(typeof receiptApi.clearReceipts).toBe('function');
  });
});
