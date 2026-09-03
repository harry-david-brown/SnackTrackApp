import { exportImportApi, receiptApi, userApi } from '@services/api';

// Simple smoke tests for API services
describe('API Services', () => {
  it('should expose the canonical onboarding reset service', () => {
    expect(userApi).toBeDefined();
    expect(typeof userApi.resetOnboarding).toBe('function');
  });

  it('should expose the canonical export import service', () => {
    expect(exportImportApi).toBeDefined();
    expect(typeof exportImportApi.importUberEatsFile).toBe('function');
    expect(typeof exportImportApi.importDoorDashFile).toBe('function');
  });

  it('should have receiptApi with clearReceipts method', () => {
    expect(receiptApi).toBeDefined();
    expect(typeof receiptApi.clearReceipts).toBe('function');
  });
});
