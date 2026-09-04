import api from './api';
import {
  UserSummary,
  WrappedAnalytics,
} from '@/types/api';
import { validateAndAuthorizeUserId } from '@utils/securityValidation';

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

const optional = <T>(
  value: unknown,
  field: string,
  normalize: (value: unknown, field: string) => T,
): T | undefined => value === undefined ? undefined : normalize(value, field);

const normalizeStanding = (value: unknown, field: string) => {
  const standing = asRecord(value, field);
  return {
    percentile: asNumber(standing.percentile, `${field}.percentile`),
    topPercent: asNumber(standing.topPercent, `${field}.topPercent`),
  };
};

export const normalizeWrappedAnalytics = (value: unknown): WrappedAnalytics => {
  const wrapped = asRecord(value, 'wrappedAnalytics');
  const shame = asRecord(wrapped.shame, 'wrappedAnalytics.shame');
  const flex = asRecord(wrapped.flex, 'wrappedAnalytics.flex');
  const comparative = asRecord(wrapped.comparative, 'wrappedAnalytics.comparative');
  const patterns = asRecord(wrapped.patterns, 'wrappedAnalytics.patterns');

  const normalizeLateNight = (candidate: unknown, field: string) => {
    const block = asRecord(candidate, field);
    const offender = asRecord(block.worstOffender, `${field}.worstOffender`);
    return {
      count: asNumber(block.count, `${field}.count`),
      totalSpent: asNumber(block.totalSpent, `${field}.totalSpent`),
      latestOrder: asString(block.latestOrder, `${field}.latestOrder`),
      worstOffender: {
        restaurant: asString(offender.restaurant, `${field}.worstOffender.restaurant`),
        time: asString(offender.time, `${field}.worstOffender.time`),
        amount: asNumber(offender.amount, `${field}.worstOffender.amount`),
        items: Array.isArray(offender.items)
          ? offender.items.map((item, index) => asString(item, `${field}.worstOffender.items.${index}`))
          : (() => { throw new Error(`Invalid analytics response: ${field}.worstOffender.items`); })(),
      },
    };
  };
  const normalizeLaziestDay = (candidate: unknown, field: string) => {
    const block = asRecord(candidate, field);
    if (!Array.isArray(block.restaurants)) throw new Error(`Invalid analytics response: ${field}.restaurants`);
    return {
      date: asString(block.date, `${field}.date`), dayOfWeek: asString(block.dayOfWeek, `${field}.dayOfWeek`),
      orderCount: asNumber(block.orderCount, `${field}.orderCount`), totalSpent: asNumber(block.totalSpent, `${field}.totalSpent`),
      restaurants: block.restaurants.map((item, index) => asString(item, `${field}.restaurants.${index}`)),
      message: asString(block.message, `${field}.message`),
    };
  };
  const normalizeLongestStreak = (candidate: unknown, field: string) => {
    const block = asRecord(candidate, field);
    return { days: asNumber(block.days, `${field}.days`), startDate: asString(block.startDate, `${field}.startDate`), endDate: asString(block.endDate, `${field}.endDate`), totalSpent: asNumber(block.totalSpent, `${field}.totalSpent`), message: asString(block.message, `${field}.message`) };
  };
  const normalizeSingleItems = (candidate: unknown, field: string) => {
    const block = asRecord(candidate, field);
    return { count: asNumber(block.count, `${field}.count`), totalSpent: asNumber(block.totalSpent, `${field}.totalSpent`), averageAmount: asNumber(block.averageAmount, `${field}.averageAmount`), message: asString(block.message, `${field}.message`), mostCommon: asString(block.mostCommon, `${field}.mostCommon`) };
  };
  const normalizeChain = (candidate: unknown, field: string) => {
    const block = asRecord(candidate, field);
    if (!Array.isArray(block.allChains)) throw new Error(`Invalid analytics response: ${field}.allChains`);
    return {
      worstOffender: asString(block.worstOffender, `${field}.worstOffender`), orderCount: asNumber(block.orderCount, `${field}.orderCount`),
      totalSpent: asNumber(block.totalSpent, `${field}.totalSpent`), percentage: asNumber(block.percentage, `${field}.percentage`), message: asString(block.message, `${field}.message`),
      allChains: block.allChains.map((item, index) => {
        const chainField = `${field}.allChains.${index}`;
        const chain = asRecord(item, chainField);
        return { name: asString(chain.name, `${chainField}.name`), count: asNumber(chain.count, `${chainField}.count`), spent: asNumber(chain.spent, `${chainField}.spent`) };
      }),
    };
  };
  const normalizeExpensiveOrder = (candidate: unknown, field: string) => {
    const block = asRecord(candidate, field);
    if (!Array.isArray(block.items)) throw new Error(`Invalid analytics response: ${field}.items`);
    return {
      amount: asNumber(block.amount, `${field}.amount`), restaurant: asString(block.restaurant, `${field}.restaurant`), date: asString(block.date, `${field}.date`),
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
    return { orderCount: asNumber(block.orderCount, `${field}.orderCount`), totalSpent: asNumber(block.totalSpent, `${field}.totalSpent`), averagePrice: asNumber(block.averagePrice, `${field}.averagePrice`), mostOrdered: asString(block.mostOrdered, `${field}.mostOrdered`), message: asString(block.message, `${field}.message`) };
  };
  const normalizeNightOwl = (candidate: unknown, field: string) => {
    const block = asRecord(candidate, field);
    return { percentage: asNumber(block.percentage, `${field}.percentage`), count: asNumber(block.count, `${field}.count`), totalSpent: asNumber(block.totalSpent, `${field}.totalSpent`), latestOrder: asString(block.latestOrder, `${field}.latestOrder`), message: asString(block.message, `${field}.message`) };
  };
  const normalizeSpentYear = (candidate: unknown, field: string) => {
    const block = asRecord(candidate, field);
    return { totalSpent: asNumber(block.totalSpent, `${field}.totalSpent`), year: asNumber(block.year, `${field}.year`), orderCount: asNumber(block.orderCount, `${field}.orderCount`), averagePerOrder: asNumber(block.averagePerOrder, `${field}.averagePerOrder`), message: asString(block.message, `${field}.message`) };
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
    const period = (value: unknown, periodField: string) => {
      const item = asRecord(value, periodField);
      return { quarter: asString(item.quarter, `${periodField}.quarter`), orderCount: asNumber(item.orderCount, `${periodField}.orderCount`), averageDeliveryFee: asNumber(item.averageDeliveryFee, `${periodField}.averageDeliveryFee`), averageServiceFee: asNumber(item.averageServiceFee, `${periodField}.averageServiceFee`), averageCompanyFees: asNumber(item.averageCompanyFees, `${periodField}.averageCompanyFees`) };
    };
    if (!Array.isArray(block.series)) throw new Error(`Invalid analytics response: ${field}.series`);
    const trend = asString(block.trend, `${field}.trend`);
    if (!['increased', 'decreased', 'flat'].includes(trend)) throw new Error(`Invalid analytics response: ${field}.trend`);
    return { currency: asString(block.currency, `${field}.currency`), coveredOrderCount: asNumber(block.coveredOrderCount, `${field}.coveredOrderCount`), coverageStart: asString(block.coverageStart, `${field}.coverageStart`), coverageEnd: asString(block.coverageEnd, `${field}.coverageEnd`), earliestPeriod: period(block.earliestPeriod, `${field}.earliestPeriod`), latestPeriod: period(block.latestPeriod, `${field}.latestPeriod`), deliveryFeeChangePercent: asNumber(block.deliveryFeeChangePercent, `${field}.deliveryFeeChangePercent`), companyFeeChangePercent: asNumber(block.companyFeeChangePercent, `${field}.companyFeeChangePercent`), trend: trend as 'increased'|'decreased'|'flat', series: block.series.map((item, index) => period(item, `${field}.series.${index}`)) };
  };
  const normalizePeakHour = (candidate: unknown, field: string) => {
    const block = asRecord(candidate, field);
    return { hour: asNumber(block.hour, `${field}.hour`), hourDisplay: asString(block.hourDisplay, `${field}.hourDisplay`), orderCount: asNumber(block.orderCount, `${field}.orderCount`), percentageOfTotal: asNumber(block.percentageOfTotal, `${field}.percentageOfTotal`), message: asString(block.message, `${field}.message`) };
  };
  const normalizeWeekend = (candidate: unknown, field: string) => {
    const block = asRecord(candidate, field);
    return { weekendOrders: asNumber(block.weekendOrders, `${field}.weekendOrders`), weekdayOrders: asNumber(block.weekdayOrders, `${field}.weekdayOrders`), weekendSpending: asNumber(block.weekendSpending, `${field}.weekendSpending`), weekdaySpending: asNumber(block.weekdaySpending, `${field}.weekdaySpending`), ratio: asNumber(block.ratio, `${field}.ratio`), message: asString(block.message, `${field}.message`) };
  };
  const normalizeDeliveryWaits = (candidate: unknown, field: string) => {
    const block = asRecord(candidate, field);
    const normalizeLongest = (item: unknown, itemField: string) => {
      const wait = asRecord(item, itemField);
      return { minutes: asNumber(wait.minutes, `${itemField}.minutes`), restaurant: asString(wait.restaurant, `${itemField}.restaurant`), amount: asNumber(wait.amount, `${itemField}.amount`), message: asString(wait.message, `${itemField}.message`) };
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
  const percentiles = optional(wrapped.percentiles, 'wrappedAnalytics.percentiles', (candidate, field) => {
    const block = asRecord(candidate, field);
    return { sampleSize: asNumber(block.sampleSize, `${field}.sampleSize`), totalSpent: optional(block.totalSpent, `${field}.totalSpent`, normalizeStanding), orderCount: optional(block.orderCount, `${field}.orderCount`, normalizeStanding), nightOwl: optional(block.nightOwl, `${field}.nightOwl`, normalizeStanding) };
  });

  return {
    coverage,
    percentiles,
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
        'Review any refunded receipts for accuracy',
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
  getUserSummary: async (userId: string, includeWrapped: boolean = false): Promise<UserSummary> => {
    const validatedUserId = await validateAndAuthorizeUserId(userId);
    const params = includeWrapped ? '?includeWrapped=true' : '';
    const response = await api.get(`/users/${validatedUserId}/summary${params}`);
    return normalizeUserSummary(response.data, includeWrapped);
  },

};

export default analyticsApi;
