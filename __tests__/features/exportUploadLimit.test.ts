import { resolveExportUploadLimitNotice } from '@features/import-flow/exportUploadLimit';

it('builds provider-specific come-back-tomorrow copy from the API contract', () => {
  expect(resolveExportUploadLimitNotice({
    code: 'EXPORT_UPLOAD_RATE_LIMITED',
    details: { provider: 'uber_eats', retryAt: '2026-09-10T14:30:00.000Z' },
  }, 'uber_eats')).toEqual({
    provider: 'uber_eats',
    retryAt: '2026-09-10T14:30:00.000Z',
    title: 'Today’s Uber Eats import limit is reached',
    message: 'You’ve started several Uber Eats imports recently. Your selected file is still here. Come back tomorrow to try again.',
  });
});

it('does not turn unrelated failures into an upload-limit notice', () => {
  expect(resolveExportUploadLimitNotice({ code: 'IMPORT_QUEUE_FULL' }, 'doordash')).toBeNull();
});
