import { normalizeHistoricalInvestment } from './historicalInvestment';
import api from './api';
import {
  UserSummary,
  WrappedAnalytics,
} from '@/types/api';
import { validateAndAuthorizeUserId } from '@utils/securityValidation';
import { normalizeDeliveryDayRanking, normalizeOrderMetrics, normalizeOrderMetricPeriods, normalizeCurrencyOrderMetricList } from '@services/normalizers/orderMetricNormalizers';
import { normalizeWrappedPercentiles } from '@services/normalizers/orderComparisonNormalizers';
import { normalizeRecap } from '@services/normalizers/recapNormalizer';

type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown, field: string): UnknownRecord => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Invalid analytics response: ${field}`);
  }
  return value as UnknownRecord;
};

const asNumber = (value: unknown, field: string) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Invalid analytics response: ${field}`);
  }
  return value;
};

const asString = (value: unknown, field: string) => {
  if (typeof value !== 'string') {
    throw new Error(`Invalid analytics response: ${field}`);
  }
  return value;
};

const asStringArray = (value: unknown) =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

const asBoolean = (value: unknown, field: string) => {
  if (typeof value !== 'boolean') throw new Error(`Invalid analytics response: ${field}`);
  return value;
};

const asNullableString = (value: unknown, field: string) =>
  value === null ? null : asString(value, field);

const asNullableNumber = (value: unknown, field: string) =>
  value === null ? null : asNumber(value, field);

const optional = <T>(
  value: unknown,
  field: string,
  normalize: (value: unknown, field: string) => T,
): T | undefined => value === undefined ? undefined : normalize(value, field);

const moneyRecords = (value: unknown, field: string): Record<string, { total: number; count: number }> =>
  Object.fromEntries(Object.entries(asRecord(value, field)).map(([key, value]) => {
    const row = asRecord(value, `${field}.${key}`);
    return [key, { total: asNumber(row.total, `${field}.${key}.total`), count: asNumber(row.count, `${field}.${key}.count`) }];
  }));

const storySpending = (block: UnknownRecord, field: string) => {
  const totalSpent = asNullableNumber(block.totalSpent, `${field}.totalSpent`);
  const spending = optional(block.spending, `${field}.spending`, normalizeCurrencyOrderMetricList);
  if (spending !== undefined) {
    const one = spending.length === 1 ? spending[0] : undefined;
    const expected = one && one.currencyCode !== 'UNKNOWN' && one.unknownPriceOrders === 0 ? one.netSpend : null;
    if (totalSpent !== expected) throw new Error(`Invalid analytics response: ${field}.totalSpent`);
  }
  return { totalSpent, spending };
};

export const normalizeWrappedAnalytics = (value: unknown): WrappedAnalytics => {
  const wrapped = asRecord(value, 'wrappedAnalytics');
  const shame = asRecord(wrapped.shame, 'wrappedAnalytics.shame');
  const flex = asRecord(wrapped.flex, 'wrappedAnalytics.flex');
  const comparative = asRecord(wrapped.comparative, 'wrappedAnalytics.comparative');
  const patterns = asRecord(wrapped.patterns, 'wrappedAnalytics.patterns');

  const normalizeLateNight = (candidate: unknown, field: string) => {
    const block = asRecord(candidate, field);
    return {
      count: asNumber(block.count, `${field}.count`),
      ...storySpending(block, field),
      latestOrder: asString(block.latestOrder, `${field}.latestOrder`),
      worstOffender: optional(block.worstOffender, `${field}.worstOffender`, (value, offenderField) => {
        const offender = asRecord(value, offenderField);
        return {
        restaurant: asString(offender.restaurant, `${field}.worstOffender.restaurant`),
        time: asString(offender.time, `${field}.worstOffender.time`),
        amount: asNumber(offender.amount, `${field}.worstOffender.amount`),
        items: Array.isArray(offender.items)
          ? offender.items.map((item, index) => asString(item, `${field}.worstOffender.items.${index}`))
          : (() => { throw new Error(`Invalid analytics response: ${field}.worstOffender.items`); })(),
        };
      }),
    };
  };
  const normalizeLaziestDay = (candidate: unknown, field: string) => {
    const block = asRecord(candidate, field);
    if (!Array.isArray(block.restaurants)) throw new Error(`Invalid analytics response: ${field}.restaurants`);
    return {
      date: asString(block.date, `${field}.date`), dayOfWeek: asString(block.dayOfWeek, `${field}.dayOfWeek`),
      orderCount: asNumber(block.orderCount, `${field}.orderCount`), ...storySpending(block, field),
      restaurants: block.restaurants.map((item, index) => asString(item, `${field}.restaurants.${index}`)),
      message: asString(block.message, `${field}.message`),
    };
  };
  const normalizeLongestStreak = (candidate: unknown, field: string) => {
    const block = asRecord(candidate, field);
    return { days: asNumber(block.days, `${field}.days`), startDate: asString(block.startDate, `${field}.startDate`), endDate: asString(block.endDate, `${field}.endDate`), ...storySpending(block, field), message: asString(block.message, `${field}.message`) };
  };
  const normalizeSingleItems = (candidate: unknown, field: string) => {
    const block = asRecord(candidate, field);
    return { count: asNumber(block.count, `${field}.count`), ...storySpending(block, field), averageAmount: asNumber(block.averageAmount, `${field}.averageAmount`), message: asString(block.message, `${field}.message`), mostCommon: asString(block.mostCommon, `${field}.mostCommon`) };
  };
  const normalizeChain = (candidate: unknown, field: string) => {
    const block = asRecord(candidate, field);
    if (!Array.isArray(block.allChains)) throw new Error(`Invalid analytics response: ${field}.allChains`);
    return {
      worstOffender: asString(block.worstOffender, `${field}.worstOffender`), orderCount: asNumber(block.orderCount, `${field}.orderCount`),
      ...storySpending(block, field), percentage: asNumber(block.percentage, `${field}.percentage`), message: asString(block.message, `${field}.message`),
      allChains: block.allChains.map((item, index) => {
        const chainField = `${field}.allChains.${index}`;
        const chain = asRecord(item, chainField);
        return { name: asString(chain.name, `${chainField}.name`), count: asNumber(chain.count, `${chainField}.count`), spent: asNullableNumber(chain.spent, `${chainField}.spent`), spending: optional(chain.spending, `${chainField}.spending`, normalizeCurrencyOrderMetricList) };
      }),
    };
  };
  const normalizeExpensiveOrder = (candidate: unknown, field: string) => {
    const block = asRecord(candidate, field);
    if (!Array.isArray(block.items)) throw new Error(`Invalid analytics response: ${field}.items`);
    return {
      amount: asNumber(block.amount, `${field}.amount`), restaurant: asString(block.restaurant, `${field}.restaurant`), date: asString(block.date, `${field}.date`),
      currencyCode: optional(block.currencyCode, `${field}.currencyCode`, asString),
      includesEstimates: optional(block.includesEstimates, `${field}.includesEstimates`, asBoolean),
      items: block.items.map((item, index) => {
        const itemField = `${field}.items.${index}`;
        const orderItem = asRecord(item, itemField);
        return { name: asString(orderItem.name, `${itemField}.name`), price: asNumber(orderItem.price, `${itemField}.price`) };
      }),
      message: asString(block.message, `${field}.message`),
    };
  };
  const normalizeCoffee = (candidate: unknown, field: string) => {
    const block = asRecord(candidate, field);
    return { orderCount: asNumber(block.orderCount, `${field}.orderCount`), totalSpent: asNullableNumber(block.totalSpent, `${field}.totalSpent`), averagePrice: asNullableNumber(block.averagePrice, `${field}.averagePrice`), mostOrdered: asString(block.mostOrdered, `${field}.mostOrdered`), message: asString(block.message, `${field}.message`), disclaimer: optional(block.disclaimer, `${field}.disclaimer`, asString) };
  };
  const normalizeNightOwl = (candidate: unknown, field: string) => {
    const block = asRecord(candidate, field);
    return { percentage: asNumber(block.percentage, `${field}.percentage`), count: asNumber(block.count, `${field}.count`), ...storySpending(block, field), latestOrder: asString(block.latestOrder, `${field}.latestOrder`), message: asString(block.message, `${field}.message`) };
  };
  const normalizeSpentYear = (candidate: unknown, field: string) => {
    const block = asRecord(candidate, field);
    return { ...storySpending(block, field), year: asNumber(block.year, `${field}.year`), orderCount: asNumber(block.orderCount, `${field}.orderCount`), averagePerOrder: asNullableNumber(block.averagePerOrder, `${field}.averagePerOrder`), message: asString(block.message, `${field}.message`) };
  };
  const normalizeCouldHaveBought = (candidate: unknown, field: string) => {
    const block = asRecord(candidate, field);
    if (!Array.isArray(block.comparisons)) throw new Error(`Invalid analytics response: ${field}.comparisons`);
    return { totalSpent: asNumber(block.totalSpent, `${field}.totalSpent`), comparisons: block.comparisons.map((item, index) => {
      const itemField = `${field}.comparisons.${index}`;
      const comparison = asRecord(item, itemField);
      return { item: asString(comparison.item, `${itemField}.item`), quantity: asNumber(comparison.quantity, `${itemField}.quantity`), message: asString(comparison.message, `${itemField}.message`) };
    }) };
  };
  const normalizeInvestment = (candidate: unknown, field: string) => {
    const block = asRecord(candidate, field);
    return { amountSpent: asNumber(block.amountSpent, `${field}.amountSpent`), firstOrderDate: asString(block.firstOrderDate, `${field}.firstOrderDate`), daysElapsed: asNumber(block.daysElapsed, `${field}.daysElapsed`), sp500Return: asNumber(block.sp500Return, `${field}.sp500Return`), wouldBeWorth: asNumber(block.wouldBeWorth, `${field}.wouldBeWorth`), missedGains: asNumber(block.missedGains, `${field}.missedGains`), message: asString(block.message, `${field}.message`) };
  };
  const normalizeCostPerMeal = (candidate: unknown, field: string) => {
    const block = asRecord(candidate, field);
    return { totalDeliveryFees: asNumber(block.totalDeliveryFees, `${field}.totalDeliveryFees`), averageDeliveryFee: asNumber(block.averageDeliveryFee, `${field}.averageDeliveryFee`), averageDeliveryFeePerMeal: asNumber(block.averageDeliveryFeePerMeal, `${field}.averageDeliveryFeePerMeal`), totalOrders: asNumber(block.totalOrders, `${field}.totalOrders`), message: asString(block.message, `${field}.message`) };
  };
  const normalizeFeeTrend = (candidate: unknown, field: string) => {
    const block = asRecord(candidate, field);
    const basis = optional(block.basis, `${field}.basis`, (value, key): 'unadjusted_deliveries' => {
      if (value !== 'unadjusted_deliveries') throw new Error(`Invalid analytics response: ${key}`);
      return value;
    });
    const period = (value: unknown, periodField: string) => {
      const item = asRecord(value, periodField);
      return { quarter: asString(item.quarter, `${periodField}.quarter`), orderCount: asNumber(item.orderCount, `${periodField}.orderCount`), averageDeliveryFee: asNumber(item.averageDeliveryFee, `${periodField}.averageDeliveryFee`), averageServiceFee: asNumber(item.averageServiceFee, `${periodField}.averageServiceFee`), averageCompanyFees: asNumber(item.averageCompanyFees, `${periodField}.averageCompanyFees`) };
    };
    if (!Array.isArray(block.series)) throw new Error(`Invalid analytics response: ${field}.series`);
    const trend = asString(block.trend, `${field}.trend`);
    if (!['increased', 'decreased', 'flat'].includes(trend)) throw new Error(`Invalid analytics response: ${field}.trend`);
    return { basis, currency: asString(block.currency, `${field}.currency`), coveredOrderCount: asNumber(block.coveredOrderCount, `${field}.coveredOrderCount`), coverageStart: asString(block.coverageStart, `${field}.coverageStart`), coverageEnd: asString(block.coverageEnd, `${field}.coverageEnd`), earliestPeriod: period(block.earliestPeriod, `${field}.earliestPeriod`), latestPeriod: period(block.latestPeriod, `${field}.latestPeriod`), deliveryFeeChangePercent: asNumber(block.deliveryFeeChangePercent, `${field}.deliveryFeeChangePercent`), companyFeeChangePercent: asNumber(block.companyFeeChangePercent, `${field}.companyFeeChangePercent`), trend: trend as 'increased'|'decreased'|'flat', series: block.series.map((item, index) => period(item, `${field}.series.${index}`)) };
  };
  const normalizePeakHour = (candidate: unknown, field: string) => {
    const block = asRecord(candidate, field);
    return { hour: asNumber(block.hour, `${field}.hour`), hourDisplay: asString(block.hourDisplay, `${field}.hourDisplay`), orderCount: asNumber(block.orderCount, `${field}.orderCount`), percentageOfTotal: asNumber(block.percentageOfTotal, `${field}.percentageOfTotal`), message: asString(block.message, `${field}.message`) };
  };
  const normalizeWeekend = (candidate: unknown, field: string) => {
    const block = asRecord(candidate, field);
    const ratioBasis = optional(block.ratioBasis, `${field}.ratioBasis`, (value, key): 'deliveries_per_day' => {
      if (value !== 'deliveries_per_day') throw new Error(`Invalid analytics response: ${key}`);
      return value;
    });
    return { weekendOrders: asNumber(block.weekendOrders, `${field}.weekendOrders`), weekdayOrders: asNumber(block.weekdayOrders, `${field}.weekdayOrders`), weekendSpending: asNullableNumber(block.weekendSpending, `${field}.weekendSpending`), weekdaySpending: asNullableNumber(block.weekdaySpending, `${field}.weekdaySpending`), ratio: asNullableNumber(block.ratio, `${field}.ratio`), ratioBasis, weekendCosts: optional(block.weekendCosts, `${field}.weekendCosts`, normalizeCurrencyOrderMetricList), weekdayCosts: optional(block.weekdayCosts, `${field}.weekdayCosts`, normalizeCurrencyOrderMetricList), message: asString(block.message, `${field}.message`) };
  };
  const normalizeDeliveryWaits = (candidate: unknown, field: string) => {
    const block = asRecord(candidate, field);
    const normalizeLongest = (item: unknown, itemField: string) => {
      const wait = asRecord(item, itemField);
      return { minutes: asNumber(wait.minutes, `${itemField}.minutes`), restaurant: asString(wait.restaurant, `${itemField}.restaurant`), amount: asNullableNumber(wait.amount, `${itemField}.amount`), currencyCode: optional(wait.currencyCode, `${itemField}.currencyCode`, asString), message: asString(wait.message, `${itemField}.message`) };
    };
    const normalizeFastest = (item: unknown, itemField: string) => {
      const wait = asRecord(item, itemField);
      return { minutes: asNumber(wait.minutes, `${itemField}.minutes`), restaurant: asString(wait.restaurant, `${itemField}.restaurant`) };
    };
    return { totalMinutes: asNumber(block.totalMinutes, `${field}.totalMinutes`), averageMinutes: asNumber(block.averageMinutes, `${field}.averageMinutes`), totalOrders: asNumber(block.totalOrders, `${field}.totalOrders`), longestWait: optional(block.longestWait, `${field}.longestWait`, normalizeLongest), fastestDelivery: optional(block.fastestDelivery, `${field}.fastestDelivery`, normalizeFastest) };
  };

  const normalizeCoverage = (candidate: unknown, field: string) => {
    const block = asRecord(candidate, field);
    if (!Array.isArray(block.dataSources)) throw new Error(`Invalid analytics response: ${field}.dataSources`);
    return { orderCount: asNumber(block.orderCount, `${field}.orderCount`), earliestOrderDate: asNullableString(block.earliestOrderDate, `${field}.earliestOrderDate`), latestOrderDate: asNullableString(block.latestOrderDate, `${field}.latestOrderDate`), dataSources: block.dataSources.map((item, index) => asString(item, `${field}.dataSources.${index}`)), hasExportData: asBoolean(block.hasExportData, `${field}.hasExportData`) };
  };
  const coverage = normalizeCoverage(wrapped.coverage, 'wrappedAnalytics.coverage');
  const percentiles = optional(wrapped.percentiles, 'wrappedAnalytics.percentiles', normalizeWrappedPercentiles);

  return {
    coverage,
    recap: optional(wrapped.recap, 'wrappedAnalytics.recap', normalizeRecap),
    behaviorPolicyVersion: optional(wrapped.behaviorPolicyVersion, 'wrappedAnalytics.behaviorPolicyVersion', (value, field): 1 => {
      if (value !== 1) throw new Error(`Invalid analytics response: ${field}`);
      return value;
    }),
    percentiles,
    orderMetrics: optional(wrapped.orderMetrics, 'wrappedAnalytics.orderMetrics', normalizeOrderMetrics),
    deliveryDayRanking: optional(wrapped.deliveryDayRanking, 'wrappedAnalytics.deliveryDayRanking', normalizeDeliveryDayRanking),
    currencyCode: optional(wrapped.currencyCode, 'wrappedAnalytics.currencyCode', asString),
    totalsByCurrency: optional(wrapped.totalsByCurrency, 'wrappedAnalytics.totalsByCurrency', moneyRecords),
    shame: {
      lateNightOrders: optional(shame.lateNightOrders, 'wrappedAnalytics.shame.lateNightOrders', normalizeLateNight),
      laziestDay: optional(shame.laziestDay, 'wrappedAnalytics.shame.laziestDay', normalizeLaziestDay),
      longestStreak: optional(shame.longestStreak, 'wrappedAnalytics.shame.longestStreak', normalizeLongestStreak),
      singleItemOrders: optional(shame.singleItemOrders, 'wrappedAnalytics.shame.singleItemOrders', normalizeSingleItems),
      chainDependency: optional(shame.chainDependency, 'wrappedAnalytics.shame.chainDependency', normalizeChain),
    },
    flex: {
      mostExpensiveOrder: optional(flex.mostExpensiveOrder, 'wrappedAnalytics.flex.mostExpensiveOrder', normalizeExpensiveOrder),
      coffeeAddiction: optional(flex.coffeeAddiction, 'wrappedAnalytics.flex.coffeeAddiction', normalizeCoffee),
      nightOwl: optional(flex.nightOwl, 'wrappedAnalytics.flex.nightOwl', normalizeNightOwl),
    },
    comparative: {
      spentThisYear: optional(comparative.spentThisYear, 'wrappedAnalytics.comparative.spentThisYear', normalizeSpentYear),
      couldHaveBought: optional(comparative.couldHaveBought, 'wrappedAnalytics.comparative.couldHaveBought', normalizeCouldHaveBought),
      historicalInvestment: optional(comparative.historicalInvestment, 'wrappedAnalytics.comparative.historicalInvestment', normalizeHistoricalInvestment),
      missedInvestment: optional(comparative.missedInvestment, 'wrappedAnalytics.comparative.missedInvestment', normalizeInvestment),
      costPerMeal: optional(comparative.costPerMeal, 'wrappedAnalytics.comparative.costPerMeal', normalizeCostPerMeal),
      deliveryFeeTrend: optional(comparative.deliveryFeeTrend, 'wrappedAnalytics.comparative.deliveryFeeTrend', normalizeFeeTrend),
    },
    patterns: {
      peakHungerHour: optional(patterns.peakHungerHour, 'wrappedAnalytics.patterns.peakHungerHour', normalizePeakHour),
      weekendWarrior: optional(patterns.weekendWarrior, 'wrappedAnalytics.patterns.weekendWarrior', normalizeWeekend),
      deliveryWaits: optional(patterns.deliveryWaits, 'wrappedAnalytics.patterns.deliveryWaits', normalizeDeliveryWaits),
    },
  };
};

export const normalizeUserSummary = (value: unknown, includeWrapped = false): UserSummary => {
  const root = asRecord(value, 'root');
  const user = asRecord(root.user, 'user');
  const statistics = asRecord(root.statistics, 'statistics');
  const validation = asRecord(root.validation, 'validation');
  const restaurants = Array.isArray(statistics.topRestaurants) ? statistics.topRestaurants : [];
  const months = asRecord(statistics.monthlyBreakdown ?? {}, 'statistics.monthlyBreakdown');

  const summary: UserSummary = {
    ...(statistics.orderMetrics === undefined ? {} : { orderMetrics: normalizeOrderMetrics(statistics.orderMetrics, 'statistics.orderMetrics') }),
    ...(statistics.orderMetricPeriods === undefined ? {} : { orderMetricPeriods: normalizeOrderMetricPeriods(statistics.orderMetricPeriods, 'statistics.orderMetricPeriods') }),
    ...(statistics.unresolvedReceiptCount === undefined ? {} : {unresolvedReceiptCount:asNumber(statistics.unresolvedReceiptCount,'statistics.unresolvedReceiptCount')}),
    ...(statistics.currencyCode === undefined ? {} : { currencyCode: asString(statistics.currencyCode, 'currencyCode') }),
    ...(statistics.amountBasis === undefined ? {} : { amountBasis: asString(statistics.amountBasis, 'amountBasis') }),
    ...(statistics.totalsByCurrency === undefined ? {} : { totalsByCurrency: moneyRecords(statistics.totalsByCurrency, 'totalsByCurrency') }),
    ...(statistics.dailyBreakdown === undefined ? {} : { dailyBreakdown: moneyRecords(statistics.dailyBreakdown, 'dailyBreakdown') }),
    userId: asString(user.id, 'user.id'),
    totalSpent: asNumber(statistics.totalSpent, 'statistics.totalSpent'),
    totalReceipts: asNumber(statistics.totalReceipts, 'statistics.totalReceipts'),
    averageOrderValue: asNumber(statistics.averageSpent, 'statistics.averageSpent'),
    topRestaurants: restaurants.map((item, index) => {
      const restaurant = asRecord(item, `statistics.topRestaurants.${index}`);
      return {
        name: asString(restaurant.name, `statistics.topRestaurants.${index}.name`),
        count: asNumber(restaurant.count, `statistics.topRestaurants.${index}.count`),
        totalSpent: asNumber(restaurant.total, `statistics.topRestaurants.${index}.total`),
      };
    }),
    monthlyBreakdown: Object.entries(months)
      .map(([month, item]) => {
        const monthly = asRecord(item, `statistics.monthlyBreakdown.${month}`);
        return {
          month,
          ...(monthly.pricedCount === undefined ? {} : { averageOrderValue: asNumber(monthly.pricedCount, 'pricedCount') > 0 ? asNumber(monthly.total, 'total') / asNumber(monthly.pricedCount, 'pricedCount') : 0 }),
          totalSpent: asNumber(monthly.total, `statistics.monthlyBreakdown.${month}.total`),
          receiptCount: asNumber(monthly.count, `statistics.monthlyBreakdown.${month}.count`),
        };
      })
      .sort((a, b) => a.month.localeCompare(b.month)),
    refundedReceipts: asNumber(validation.refundedReceipts, 'validation.refundedReceipts'),
    dataQuality: {
      issues: asStringArray(validation.issues),
      recommendations: [
        'Consider uploading more recent data for better insights',
        'Matched receipts can improve exported totals',
      ],
    },
  };

  if (includeWrapped && root.wrappedAnalytics) {
    summary.wrappedAnalytics = normalizeWrappedAnalytics(root.wrappedAnalytics);
  }
  return summary;
};

export const analyticsApi = {
  /**
   * Get user summary with analytics data
   * @param userId - The user ID to get analytics for
   * @param includeWrapped - Whether to include wrapped analytics (Spotify Wrapped-style insights)
   * @returns Promise resolving to UserSummary with analytics data
   * @throws {Error} If API request fails
   */
  getUserSummary: async (userId: string, includeWrapped: boolean = false, displayCurrency?: string): Promise<UserSummary> => {
    const validatedUserId = await validateAndAuthorizeUserId(userId);
    const params = includeWrapped ? `?includeWrapped=true${displayCurrency ? `&displayCurrency=${encodeURIComponent(displayCurrency)}` : ''}` : '';
    const response = await api.get(`/users/${validatedUserId}/summary${params}`);
    return normalizeUserSummary(response.data, includeWrapped);
  },

};

export default analyticsApi;
