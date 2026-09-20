import api from '@services/api';
import { dashboardInsightsApi, normalizeDashboardInsightEdition } from '@services/dashboardInsightsApi';
import orderEventFixture from '@/__tests__/fixtures/order-event-dashboard.json';
import coreOrderEventFixture from '@/__tests__/fixtures/order-event-dashboard-core.json';

jest.mock('@services/api');
jest.mock('@utils/securityValidation', () => ({
  validateAndAuthorizeUserId: jest.fn((userId: string) => Promise.resolve(userId)),
}));

const base = {
  localDate: '2026-08-13',
  timezone: 'America/Toronto',
  generatedAt: '2026-08-13T15:00:00.000Z',
  nextRefreshAt: '2026-08-14T04:00:00.000Z',
  metricVersion: 'daily-v1',
  availableCandidateCount: 12,
};

const cards = [
  { id: 'hero', presentation: 'hero', category: 'habits', icon: 'calendar', eyebrow: 'Test', title: 'Hero', value: 3, valueFormat: 'number', period: { startDate: '2026-07-01', endDate: '2026-07-08' } },
  { id: 'comparison', presentation: 'comparison', category: 'progress', icon: 'trend', eyebrow: 'Test', title: 'Comparison', comparison: { variant: 'investment', current: 2, previous: 3, delta: -1, percentDelta: -33, direction: 'down', valueFormat: 'number', currentLabel: 'Recent price', previousLabel: 'Earlier price', subject: { kind: 'item', name: 'Classic Burger', restaurant: 'Burger Lab', occurrences: 3 } } },
  { id: 'ranking', presentation: 'ranking', category: 'favorites', icon: 'restaurant', eyebrow: 'Test', title: 'Ranking', rows: [{ label: 'Creamy Garlic', count: 3, context: 'Test Kitchen' }] },
  { id: 'order', presentation: 'order', category: 'extremes', icon: 'receipt', eyebrow: 'Test', title: 'Order', order: { restaurant: 'Comma, Kitchen', restaurants: ['Comma, Kitchen', 'Second Place'], amount: 30, orderedAt: '2026-08-01T12:00:00.000Z', items: [] } },
  { id: 'timeline', presentation: 'timeline', category: 'favorites', icon: 'trophy', eyebrow: 'Test', title: 'Timeline', events: [{ label: 'Then', value: 'Place' }] },
  { id: 'yearly', presentation: 'yearly-champions', category: 'favorites', icon: 'trophy', eyebrow: 'Test', title: 'Yearly', years: [{ year: 2024, winners: ['Place A'], orderCount: 4, currentYear: false }, { year: 2025, winners: ['Place B', 'Place C'], orderCount: 5, currentYear: false }, { year: 2026, winners: ['Place D'], orderCount: 3, currentYear: true }] },
  { id: 'locked', presentation: 'locked', category: 'favorites', icon: 'lock', eyebrow: 'Test', title: 'Locked', action: 'open_export' },
];

describe('dashboard insights API boundary', () => {
  it('preserves a positive exact-order evidence count without exposing identities', () => {
    const edition = normalizeDashboardInsightEdition({
      ...base,
      insights: [{ ...cards[0], orderEvidence: { count: 3 } }],
    });
    expect(edition.insights[0].orderEvidence).toEqual({ count: 3 });
  });

  it.each([0, -1, 1.5, '3'])('rejects invalid order evidence counts: %s', count => {
    expect(() => normalizeDashboardInsightEdition({
      ...base,
      insights: [{ ...cards[0], orderEvidence: { count } }],
    })).toThrow('insights.0.orderEvidence.count');
  });

  it('preserves the server-calculated big-order count', () => {
    const edition = normalizeDashboardInsightEdition({ ...base, insights: [{ ...cards[0], value: 22, valueFormat: 'percent', spendingConcentration: { orderCount: 95 } }] });
    expect(edition.insights[0]).toMatchObject({ spendingConcentration: { orderCount: 95 } });
  });

  it.each([0, -1, 1.5, '95', Infinity])('rejects invalid big-order counts: %s', orderCount => {
    expect(() => normalizeDashboardInsightEdition({ ...base, insights: [{ ...cards[0], valueFormat: 'percent', spendingConcentration: { orderCount } }] })).toThrow();
  });

  it('preserves structured busy-day facts', () => {
    const busyDay = { date: '2024-11-19', spending: [{ currencyCode: 'CAD', amount: 124.8 }] };
    const edition = normalizeDashboardInsightEdition({ ...base, insights: [{ ...cards[0], busyDay }] });
    expect(edition.insights[0]).toMatchObject({ busyDay });
  });

  it.each([
    { date: '2024-02-30', spending: [] },
    { date: '2024-99-01', spending: [] },
    { date: '2024-11-19', spending: [{ currencyCode: 'UNKNOWN', amount: 1 }] },
    { date: '2024-11-19', spending: [{ currencyCode: 'CAD', amount: -1 }] },
    { date: '2024-11-19', spending: [{ currencyCode: 'CAD', amount: Infinity }] },
    { date: '2024-11-19', spending: [{ currencyCode: 'CAD', amount: 1 }, { currencyCode: 'CAD', amount: 2 }] },
  ])('rejects malformed busy-day facts %j', busyDay => {
    expect(() => normalizeDashboardInsightEdition({ ...base, insights: [{ ...cards[0], busyDay }] })).toThrow();
  });

  beforeEach(() => jest.clearAllMocks());

  it('decodes the actual policy-3 December API edition without re-counting receipt documents', () => {
    const edition = normalizeDashboardInsightEdition(orderEventFixture);
    expect(edition.metricVersion).toBe('daily-v17');
    expect(edition.insights.find(i => i.id === 'accumulated-delivery-time')).toMatchObject({
      value: 2.3, detail: '4 valid deliveries, averaging 34 minutes from order to arrival.',
    });
    const core = normalizeDashboardInsightEdition(coreOrderEventFixture);
    expect(core.insights.find(i => i.id === 'multi-order-day')).toMatchObject({
      presentation: 'hero', title: 'Most deliveries in a day', value: 4,
      detail: expect.stringContaining('CAD 113.76 net cost'),
    });
    expect(core.insights.find(i => i.id === 'net-order-costs')).toMatchObject({
      presentation: 'timeline', events: expect.arrayContaining([expect.objectContaining({ label: 'CAD', value: '157.02' })]),
    });
    expect(JSON.stringify(edition)).not.toContain('198.97');
  });

  it('strictly normalizes every presentation and fetches the dedicated resource', async () => {
    const payload = { ...base, partialExportProvider: 'uber_eats', insights: cards };
    (api.get as jest.Mock).mockResolvedValue({ data: payload });
    const edition = await dashboardInsightsApi.getEdition('user-id');
    expect(api.get).toHaveBeenCalledWith('/users/user-id/dashboard-insights');
    expect(edition.partialExportProvider).toBe('uber_eats');
    expect(edition.insights.map(insight => insight.presentation)).toEqual(['hero', 'comparison', 'ranking', 'order', 'timeline', 'yearly-champions', 'locked']);
    expect(edition.insights[0]).toMatchObject({ period: { startDate: '2026-07-01', endDate: '2026-07-08' } });
    expect(edition.insights[1]).toMatchObject({ presentation: 'comparison', comparison: { variant: 'investment', subject: { kind: 'item', name: 'Classic Burger', restaurant: 'Burger Lab', occurrences: 3 } } });
    expect(edition.insights[2]).toMatchObject({ presentation: 'ranking', rows: [{ label: 'Creamy Garlic', count: 3, amount: undefined, context: 'Test Kitchen' }] });
    expect(edition.insights[3]).toMatchObject({ presentation: 'order', order: { restaurants: ['Comma, Kitchen', 'Second Place'] } });
  });

  it('sends a validated development day offset only when previewing the future', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: { ...base, insights: cards } });
    await dashboardInsightsApi.getEdition('user-id', 4);
    expect(api.get).toHaveBeenCalledWith('/users/user-id/dashboard-insights', { params: { devDayOffset: 4 } });

    await expect(dashboardInsightsApi.getEdition('user-id', 366)).rejects.toThrow('whole number from 0 to 365');
  });

  it.each([
    ['unsupported presentation', { ...cards[0], presentation: 'mystery' }, 'insights.0.presentation'],
    ['missing hero value', { ...cards[0], value: undefined }, 'insights.0.value'],
    ['invalid comparison occurrence count', { ...cards[1], comparison: { ...cards[1].comparison, subject: { kind: 'item', name: 'Burger', occurrences: 1 } } }, 'insights.0.comparison.subject.occurrences'],
    ['malformed ranking rows', { ...cards[2], rows: 'nope' }, 'insights.0.rows'],
    ['malformed restaurant list', { ...cards[3], order: { ...cards[3].order, restaurants: [] } }, 'insights.0.order.restaurants'],
    ['reversed insight period', { ...cards[0], period: { startDate: '2026-07-08', endDate: '2026-07-01' } }, 'insights.0.period.endDate'],
    ['malformed yearly winners', { id: 'yearly', presentation: 'yearly-champions', category: 'favorites', icon: 'trophy', eyebrow: 'Test', title: 'Yearly', years: [{ year: 2024, winners: [], orderCount: 4, currentYear: false }, { year: 2025, winners: ['Place B'], orderCount: 5, currentYear: false }, { year: 2026, winners: ['Place C'], orderCount: 3, currentYear: true }] }, 'insights.0.years.0.winners'],
    ['invalid locked action', { ...cards[6], action: '/private-route' }, 'insights.0.action'],
  ])('rejects %s', (_label, card, field) => {
    expect(() => normalizeDashboardInsightEdition({ ...base, insights: [card] })).toThrow(field);
  });

  it('rejects invalid metadata and editions larger than seven', () => {
    expect(() => normalizeDashboardInsightEdition({ ...base, localDate: 'Thursday', insights: [] })).toThrow('edition.localDate');
    expect(() => normalizeDashboardInsightEdition({ ...base, insights: Array.from({ length: 8 }, (_, index) => ({ ...cards[0], id: String(index) })) })).toThrow('edition.insights');
    expect(() => normalizeDashboardInsightEdition({ ...base, partialExportProvider: 'grubhub', insights: [] })).toThrow('edition.partialExportProvider');
  });
});
