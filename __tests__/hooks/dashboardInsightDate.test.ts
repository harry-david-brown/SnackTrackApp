import { getDeviceLocalDate } from '@hooks/queries/useAnalyticsQueries';

describe('dashboard edition query date', () => {
  it('uses the device-local date rather than the UTC date', () => {
    const original = process.env.TZ;
    process.env.TZ = 'America/Toronto';
    expect(getDeviceLocalDate(new Date('2026-08-14T02:00:00.000Z'))).toBe('2026-08-13');
    process.env.TZ = original;
  });
});
