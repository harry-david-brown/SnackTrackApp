import api from '@services/api';
import { importOperationsApi } from '@services/importOperationsApi';
jest.mock('@services/api', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));
jest.mock('@services/normalizers/importOperationNormalizers', () => ({
  normalizeOperationEnvelope: (value: unknown) => value,
  normalizeNullableOperationEnvelope: (value: unknown) => value,
}));

beforeEach(() => { jest.clearAllMocks(); (api.post as jest.Mock).mockResolvedValue({ data: {} }); });
it.each(['startGmail', 'startOutlook'] as const)('%s sends only the explicitly reviewed automatic-update choice', async method => {
  for (const journeyContext of ['onboarding', 'post_onboarding'] as const) {
    await importOperationsApi[method](journeyContext, true);
    expect(api.post).toHaveBeenLastCalledWith(expect.any(String), { journeyContext, automaticUpdates: true }, expect.any(Object));
    await importOperationsApi[method](journeyContext);
    expect(api.post).toHaveBeenLastCalledWith(expect.any(String), { journeyContext }, expect.any(Object));
  }
});

it('bypasses HTTP caches when polling live import status', async () => {
  (api.get as jest.Mock).mockResolvedValue({ data: { operation: null } });
  await importOperationsApi.getActive();
  await importOperationsApi.get('job/1');
  expect(api.get).toHaveBeenNthCalledWith(1, '/imports/active', { headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' } });
  expect(api.get).toHaveBeenNthCalledWith(2, '/imports/job%2F1', { headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' } });
});
