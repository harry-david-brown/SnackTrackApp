import { redirectSystemPath } from '@/app/+native-intent';

describe('native intent routing', () => {
  it.each([
    'msauth://com.snacktrack.app/signature-hash?code=authorization-code&state=request-state',
    'snacktrack://com.snacktrack.app/signature-hash?code=authorization-code&state=request-state',
    'msauth://com.snacktrack.app/signature-hash?error=access_denied&state=request-state',
  ])('keeps Microsoft AuthSession callbacks on the entry route', (path) => {
    expect(redirectSystemPath({ path, initial: false })).toBe('/');
  });

  it.each([
    'snacktrack://receipts/receipt-id',
    '/receipts',
    'msauth://another.app/signature-hash?code=authorization-code&state=request-state',
    'msauth://com.snacktrack.app/signature-hash?code=authorization-code',
  ])('preserves non-Microsoft application routes', (path) => {
    expect(redirectSystemPath({ path, initial: false })).toBe(path);
  });
});
