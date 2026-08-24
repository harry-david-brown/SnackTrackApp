import api from '@services/api';
import { dashboardInsightsApi, normalizeDashboardInsightEdition } from '@services/dashboardInsightsApi';

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
  beforeEach(() => jest.clearAllMocks());

  it('strictly normalizes every presentation and fetches the dedicated resource', async () => {
    const payload = { ...base, insights: cards };
    (api.get as jest.Mock).mockResolvedValue({ data: payload });
    const edition = await dashboardInsightsApi.getEdition('user-id');
    expect(api.get).toHaveBeenCalledWith('/users/user-id/dashboard-insights');
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
  });
});
