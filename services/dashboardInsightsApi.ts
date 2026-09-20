import { normalizeHistoricalInvestment } from './historicalInvestment';
import api from './api';
import type {
  DashboardInsight,
  DashboardInsightCategory,
  DashboardInsightEdition,
  DashboardExportProvider,
  DashboardInsightIcon,
  DashboardInsightMethodology,
  DashboardInsightPeriod,
  DashboardInsightValueFormat,
  DashboardHeroInsight,
} from '@/types/api';
import { validateAndAuthorizeUserId } from '@utils/securityValidation';

type UnknownRecord = Record<string, unknown>;

const invalid = (field: string): never => { throw new Error(`Invalid dashboard insights response: ${field}`); };
const record = (value: unknown, field: string): UnknownRecord => value && typeof value === 'object' && !Array.isArray(value) ? value as UnknownRecord : invalid(field);
const string = (value: unknown, field: string) => typeof value === 'string' ? value : invalid(field);
const number = (value: unknown, field: string) => typeof value === 'number' && Number.isFinite(value) ? value : invalid(field);
const boolean = (value: unknown, field: string) => typeof value === 'boolean' ? value : invalid(field);
const optional = <T>(value: unknown, field: string, normalizer: (candidate: unknown, candidateField: string) => T) => value === undefined ? undefined : normalizer(value, field);
const member = <T extends string>(value: unknown, allowed: readonly T[], field: string): T => typeof value === 'string' && allowed.includes(value as T) ? value as T : invalid(field);
const isoDate = (value: unknown, field: string) => {
  const candidate = string(value, field);
  return Number.isNaN(Date.parse(candidate)) ? invalid(field) : candidate;
};
const localDate = (value: unknown, field: string) => {
  const candidate = string(value, field);
  return /^\d{4}-\d{2}-\d{2}$/.test(candidate) ? candidate : invalid(field);
};

const categories = ['favorites', 'habits', 'extremes', 'progress'] as const satisfies readonly DashboardInsightCategory[];
const icons = ['restaurant', 'time', 'calendar', 'moon', 'heart', 'receipt', 'meal', 'delivery', 'lock', 'repeat', 'trend', 'trophy', 'sparkles'] as const satisfies readonly DashboardInsightIcon[];
const valueFormats = ['currency', 'number', 'percent', 'minutes', 'hours', 'days'] as const satisfies readonly DashboardInsightValueFormat[];
const exportProviders = ['uber_eats', 'doordash'] as const satisfies readonly DashboardExportProvider[];

const normalizeMethodology = (value: unknown, field: string): DashboardInsightMethodology => {
  const source = record(value, field);
  const sampleSize = optional(source.sampleSize, `${field}.sampleSize`, number);
  if (sampleSize !== undefined && (!Number.isInteger(sampleSize) || sampleSize < 0)) invalid(`${field}.sampleSize`);
  return {
    estimated: optional(source.estimated, `${field}.estimated`, boolean),
    sampleSize,
    assumption: optional(source.assumption, `${field}.assumption`, string),
    disclaimer: optional(source.disclaimer, `${field}.disclaimer`, string),
  };
};

const normalizePeriod = (value: unknown, field: string): DashboardInsightPeriod => {
  const source = record(value, field);
  const startDate = localDate(source.startDate, `${field}.startDate`);
  const endDate = optional(source.endDate, `${field}.endDate`, localDate);
  if (endDate && endDate < startDate) invalid(`${field}.endDate`);
  return { startDate, endDate };
};

const normalizeBusyDay = (value: unknown, field: string): NonNullable<DashboardHeroInsight['busyDay']> => {
  const source = record(value, field);
  const date = localDate(source.date, `${field}.date`);
  const parsedDate = new Date(`${date}T12:00:00Z`);
  if (!Number.isFinite(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date) invalid(`${field}.date`);
  if (!Array.isArray(source.spending)) return invalid(`${field}.spending`);
  const spending = source.spending.map((entry: unknown, index: number) => {
    const rowField = `${field}.spending.${index}`;
    const row = record(entry, rowField);
    const amount = number(row.amount, `${rowField}.amount`);
    if (amount < 0) invalid(`${rowField}.amount`);
    return { currencyCode: member(row.currencyCode, ['CAD', 'USD', 'EUR', 'GBP'] as const, `${rowField}.currencyCode`), amount };
  });
  if (new Set(spending.map(row => row.currencyCode)).size !== spending.length) invalid(`${field}.spending`);
  return { date, spending };
};

const normalizeOrderEvidence = (value: unknown, field: string) => {
  const count = number(record(value, field).count, `${field}.count`);
  if (!Number.isSafeInteger(count) || count < 1) invalid(`${field}.count`);
  return { count };
};

const normalizeBase = (source: UnknownRecord, field: string) => ({
  historicalInvestment: optional(source.historicalInvestment, `${field}.historicalInvestment`, normalizeHistoricalInvestment),
  currencyCode: optional(source.currencyCode, `${field}.currencyCode`, string),
  orderEvidence: optional(source.orderEvidence, `${field}.orderEvidence`, normalizeOrderEvidence),
  id: string(source.id, `${field}.id`),
  category: member(source.category, categories, `${field}.category`),
  icon: member(source.icon, icons, `${field}.icon`),
  eyebrow: string(source.eyebrow, `${field}.eyebrow`),
  title: string(source.title, `${field}.title`),
  detail: optional(source.detail, `${field}.detail`, string),
  methodology: optional(source.methodology, `${field}.methodology`, normalizeMethodology),
  period: optional(source.period, `${field}.period`, normalizePeriod),
});

export const normalizeDashboardInsight = (value: unknown, index = 0): DashboardInsight => {
  const field = `insights.${index}`;
  const source = record(value, field);
  const base = normalizeBase(source, field);
  const presentation = member(source.presentation, ['hero', 'comparison', 'ranking', 'order', 'timeline', 'yearly-champions', 'locked'] as const, `${field}.presentation`);
  if (presentation === 'hero') {
    const value = number(source.value, `${field}.value`);
    const valueFormat = member(source.valueFormat, valueFormats, `${field}.valueFormat`);
    const busyDay = optional(source.busyDay, `${field}.busyDay`, normalizeBusyDay);
    const spendingConcentration = optional(source.spendingConcentration, `${field}.spendingConcentration`, (candidate, candidateField) => {
      const orderCount = number(record(candidate, candidateField).orderCount, `${candidateField}.orderCount`);
      if (!Number.isSafeInteger(orderCount) || orderCount < 1 || valueFormat !== 'percent' || value < 0 || value > 100) invalid(candidateField);
      return { orderCount };
    });
    if (busyDay && (valueFormat !== 'number' || !Number.isInteger(value) || value < 1)) invalid(`${field}.value`);
    return {
      ...base,
      presentation,
      value,
      valueFormat,
      headline: optional(source.headline, `${field}.headline`, string),
      ...(busyDay ? { busyDay } : {}),
      ...(spendingConcentration ? { spendingConcentration } : {}),
    };
  }
  if (presentation === 'comparison') {
    const comparisonField = `${field}.comparison`;
    const comparison = record(source.comparison, comparisonField);
    const subject = comparison.subject === undefined ? undefined : record(comparison.subject, `${comparisonField}.subject`);
    const occurrences = subject === undefined ? undefined : number(subject.occurrences, `${comparisonField}.subject.occurrences`);
    if (occurrences !== undefined && (!Number.isInteger(occurrences) || occurrences < 2)) invalid(`${comparisonField}.subject.occurrences`);
    return {
      ...base,
      presentation,
      comparison: {
        variant: optional(comparison.variant, `${comparisonField}.variant`, (candidate, candidateField) => member(candidate, ['investment'] as const, candidateField)),
        current: number(comparison.current, `${comparisonField}.current`),
        previous: number(comparison.previous, `${comparisonField}.previous`),
        delta: number(comparison.delta, `${comparisonField}.delta`),
        percentDelta: comparison.percentDelta === null ? null : number(comparison.percentDelta, `${comparisonField}.percentDelta`),
        direction: member(comparison.direction, ['up', 'down', 'flat'] as const, `${comparisonField}.direction`),
        valueFormat: member(comparison.valueFormat, ['currency', 'number'] as const, `${comparisonField}.valueFormat`),
        currentLabel: string(comparison.currentLabel, `${comparisonField}.currentLabel`),
        previousLabel: string(comparison.previousLabel, `${comparisonField}.previousLabel`),
        driver: optional(comparison.driver, `${comparisonField}.driver`, (candidate, candidateField) => member(candidate, ['frequency', 'basket', 'outlier', 'mixed'] as const, candidateField)),
        subject: subject === undefined ? undefined : {
          kind: member(subject.kind, ['meal', 'item'] as const, `${comparisonField}.subject.kind`),
          name: string(subject.name, `${comparisonField}.subject.name`),
          restaurant: optional(subject.restaurant, `${comparisonField}.subject.restaurant`, string),
          occurrences: occurrences!,
        },
      },
    };
  }
  if (presentation === 'ranking') {
    if (!Array.isArray(source.rows) || source.rows.length === 0) invalid(`${field}.rows`);
    const rows = source.rows as unknown[];
    return {
      ...base,
      presentation,
      rows: rows.map((value, rowIndex) => {
        const rowField = `${field}.rows.${rowIndex}`;
        const row = record(value, rowField);
        return {
          label: string(row.label, `${rowField}.label`),
          count: number(row.count, `${rowField}.count`),
          amount: optional(row.amount, `${rowField}.amount`, number),
          context: optional(row.context, `${rowField}.context`, string),
        };
      }),
    };
  }
  if (presentation === 'order') {
    const orderField = `${field}.order`;
    const order = record(source.order, orderField);
    if (!Array.isArray(order.items)) invalid(`${orderField}.items`);
    if (order.restaurants !== undefined && (!Array.isArray(order.restaurants) || order.restaurants.length === 0)) invalid(`${orderField}.restaurants`);
    const items = order.items as unknown[];
    const restaurants = order.restaurants as unknown[] | undefined;
    return {
      ...base,
      presentation,
      order: {
        restaurant: string(order.restaurant, `${orderField}.restaurant`),
        restaurants: restaurants?.map((restaurant, restaurantIndex) => string(restaurant, `${orderField}.restaurants.${restaurantIndex}`)),
        amount: number(order.amount, `${orderField}.amount`),
        orderedAt: optional(order.orderedAt, `${orderField}.orderedAt`, isoDate),
        items: items.map((item, itemIndex) => string(item, `${orderField}.items.${itemIndex}`)),
      },
    };
  }
  if (presentation === 'timeline') {
    if (!Array.isArray(source.events) || source.events.length === 0) invalid(`${field}.events`);
    const events = source.events as unknown[];
    return {
      ...base,
      presentation,
      events: events.map((value, eventIndex) => {
        const eventField = `${field}.events.${eventIndex}`;
        const event = record(value, eventField);
        const eventValue = typeof event.value === 'string' ? event.value : number(event.value, `${eventField}.value`);
        if (event.valueFormat !== undefined && typeof eventValue !== 'number') invalid(`${eventField}.value`);
        return {
          label: string(event.label, `${eventField}.label`),
          value: eventValue,
          valueFormat: optional(event.valueFormat, `${eventField}.valueFormat`, (candidate, candidateField) => member(candidate, valueFormats, candidateField)),
          detail: optional(event.detail, `${eventField}.detail`, string),
        };
      }),
    };
  }
  if (presentation === 'yearly-champions') {
    if (!Array.isArray(source.years) || source.years.length < 3) invalid(`${field}.years`);
    const years = source.years as unknown[];
    return {
      ...base,
      presentation,
      years: years.map((value, yearIndex) => {
        const yearField = `${field}.years.${yearIndex}`;
        const year = record(value, yearField);
        if (!Array.isArray(year.winners) || year.winners.length === 0) invalid(`${yearField}.winners`);
        const calendarYear = number(year.year, `${yearField}.year`);
        const orderCount = number(year.orderCount, `${yearField}.orderCount`);
        if (!Number.isInteger(calendarYear) || calendarYear < 2000 || calendarYear > 2100) invalid(`${yearField}.year`);
        if (!Number.isInteger(orderCount) || orderCount < 1) invalid(`${yearField}.orderCount`);
        return {
          year: calendarYear,
          winners: (year.winners as unknown[]).map((winner, winnerIndex) => string(winner, `${yearField}.winners.${winnerIndex}`)),
          orderCount,
          currentYear: boolean(year.currentYear, `${yearField}.currentYear`),
        };
      }),
    };
  }
  return { ...base, presentation: 'locked', action: member(source.action, ['open_export'] as const, `${field}.action`) };
};

export const normalizeDashboardInsightEdition = (value: unknown): DashboardInsightEdition => {
  const source = record(value, 'edition');
  if (!Array.isArray(source.insights)) invalid('edition.insights');
  const insightValues = source.insights as unknown[];
  const localDate = string(source.localDate, 'edition.localDate');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(localDate)) invalid('edition.localDate');
  const availableCandidateCount = number(source.availableCandidateCount, 'edition.availableCandidateCount');
  if (!Number.isInteger(availableCandidateCount) || availableCandidateCount < 0) invalid('edition.availableCandidateCount');
  const insights = insightValues.map(normalizeDashboardInsight);
  if (insights.length > 7) invalid('edition.insights');
  if (availableCandidateCount < insights.length) invalid('edition.availableCandidateCount');
  if (new Set(insights.map(insight => insight.id)).size !== insights.length) invalid('edition.insights');
  if (insights.filter(insight => insight.presentation === 'locked').length > 1) invalid('edition.insights');
  return {
    localDate,
    timezone: string(source.timezone, 'edition.timezone'),
    generatedAt: isoDate(source.generatedAt, 'edition.generatedAt'),
    nextRefreshAt: isoDate(source.nextRefreshAt, 'edition.nextRefreshAt'),
    metricVersion: string(source.metricVersion, 'edition.metricVersion'),
    availableCandidateCount,
    partialExportProvider: optional(source.partialExportProvider, 'edition.partialExportProvider', (candidate, candidateField) => member(candidate, exportProviders, candidateField)),
    insights,
  };
};

export const dashboardInsightsApi = {
  getEdition: async (userId: string, devDayOffset = 0): Promise<DashboardInsightEdition> => {
    const validatedUserId = await validateAndAuthorizeUserId(userId);
    if (!Number.isInteger(devDayOffset) || devDayOffset < 0 || devDayOffset > 365) {
      throw new Error('Dashboard insight day offset must be a whole number from 0 to 365.');
    }
    const endpoint = `/users/${validatedUserId}/dashboard-insights`;
    const response = __DEV__ && devDayOffset > 0
      ? await api.get(endpoint, { params: { devDayOffset } })
      : await api.get(endpoint);
    return normalizeDashboardInsightEdition(response.data);
  },
};

export default dashboardInsightsApi;
