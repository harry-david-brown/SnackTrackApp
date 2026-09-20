import { UserSummary } from '@/types/api';

// Gradient keys must match STORY_GRADIENTS in the wrapped event palette.
export type ArchetypeGradient =
  | 'forest'
  | 'ember'
  | 'berry'
  | 'indigo'
  | 'lagoon'
  | 'amber';

export interface ArchetypeTrait {
  emoji: string;
  label: string;
  value: string;
}

export interface Archetype {
  key: string;
  name: string;
  emoji: string;
  tagline: string;
  gradient: ArchetypeGradient;
  traits: ArchetypeTrait[];
}

type CurrencyFormatter = (amount: number) => string;

/**
 * Total distinct personalities a user can land on (all candidates plus The
 * Casual Craver fallback) — surfaced as "1 of N food personalities" on the
 * archetype card. Keep in sync when adding archetypes.
 */
export const ARCHETYPE_COUNT = 9;

interface Candidate {
  intensity: number;
  build: () => Archetype;
}

const clamp100 = (n: number) => Math.max(0, Math.min(100, n));

/**
 * Derives a single shareable "food personality" from a user's Wrapped data.
 *
 * Each candidate archetype reports an `intensity` (0-100) normalized from a
 * different raw signal, so they can be compared on the same scale. The strongest
 * signal wins; if nothing stands out, we fall back to The Casual Craver.
 * Fully deterministic for a given dataset — no randomness.
 */
export function getArchetype(
  analytics: UserSummary,
  formatCurrency: CurrencyFormatter
): Archetype {
  const wrapped = analytics.wrappedAnalytics;
  const topSpot = analytics.topRestaurants?.[0]?.name;

  const first = Date.parse(wrapped?.coverage?.earliestOrderDate ?? '');
  const last = Date.parse(wrapped?.coverage?.latestOrderDate ?? '');
  const coveredDays = Number.isFinite(first) && Number.isFinite(last) ? Math.max(30, (last-first)/86400000+1) : 30;
  const candidates: Candidate[] = [];

  // 🌙 The 3AM Gremlin — late-night / night-owl ordering
  const nightOwl = wrapped?.flex.nightOwl;
  const lateNight = wrapped?.shame.lateNightOrders;
  if (nightOwl || lateNight) {
    const intensity = clamp100(
      Math.max(
        nightOwl?.percentage ?? 0,
        ((lateNight?.count ?? 0) / Math.max(1, analytics.totalReceipts)) * 100
      )
    );
    candidates.push({
      intensity,
      build: () => ({
        key: 'night-gremlin',
        name: 'The 3AM Gremlin',
        emoji: '🌙',
        tagline: 'The kitchen is closed. Your cravings are not.',
        gradient: 'indigo',
        traits: compact([
          lateNight && { emoji: '🌃', label: 'Late-night orders', value: `${lateNight.count}` },
          nightOwl && { emoji: '🦉', label: 'Orders 10pm–4am', value: `${nightOwl.percentage}%` },
          lateNight?.worstOffender && {
            emoji: '⏰',
            label: 'Latest hit',
            value: lateNight.worstOffender.time,
          },
        ]),
      }),
    });
  }

  // 💍 The Loyalist — heavily dependent on one chain
  const chain = wrapped?.shame.chainDependency;
  if (chain) {
    candidates.push({
      intensity: clamp100(chain.percentage),
      build: () => ({
        key: 'loyalist',
        name: 'The Loyalist',
        emoji: '💍',
        tagline: `Til death do you part from ${chain.worstOffender}.`,
        gradient: 'berry',
        traits: [
          { emoji: '🏪', label: 'One true love', value: chain.worstOffender },
          { emoji: '📊', label: 'Of all orders', value: `${chain.percentage}%` },
          { emoji: '🧾', label: 'Times ordered', value: `${chain.orderCount}` },
        ],
      }),
    });
  }

  // ☕ The Caffeine Fiend — coffee obsession
  const coffee = wrapped?.flex.coffeeAddiction;
  if (coffee) {
    candidates.push({
      intensity: clamp100((coffee.orderCount / Math.max(1, analytics.totalReceipts)) * 100),
      build: () => ({
        key: 'caffeine-fiend',
        name: 'The Caffeine Fiend',
        emoji: '☕',
        tagline: 'Blood type: cold brew.',
        gradient: 'amber',
        traits: compact([
          { emoji: '☕', label: 'Coffee runs', value: `${coffee.orderCount}` },
          coffee.totalSpent !== null && { emoji: '💸', label: 'Spent on caffeine', value: formatCurrency(coffee.totalSpent) },
          { emoji: '⭐', label: 'Go-to order', value: coffee.mostOrdered },
        ]),
      }),
    });
  }

  // 💸 The High Roller — big single orders / high average
  const expensive = wrapped?.flex.mostExpensiveOrder;
  if (expensive) {
    candidates.push({
      intensity: clamp100((analytics.averageOrderValue / 75) * 100),
      build: () => ({
        key: 'high-roller',
        name: 'The High Roller',
        emoji: '💸',
        tagline: 'Budget? Never heard of her.',
        gradient: 'ember',
        traits: compact([
          { emoji: '🍾', label: 'Priciest order', value: formatCurrency(expensive.amount) },
          { emoji: '📈', label: 'Avg per order', value: formatCurrency(analytics.averageOrderValue) },
          { emoji: '📍', label: 'Scene of the splurge', value: expensive.restaurant },
        ]),
      }),
    });
  }

  // 🎉 The Weekend Warrior — weekend-skewed spending
  const weekend = wrapped?.patterns.weekendWarrior;
  if (weekend && weekend.weekendSpending !== null && weekend.weekdaySpending !== null && !weekend.ratioBasis) {
    const weekendSpent = weekend.weekendSpending;
    const weekdaySpent = weekend.weekdaySpending;
    const total = weekend.weekendSpending / 2 + weekend.weekdaySpending / 5;
    const weekendShare = total > 0 ? (weekend.weekendSpending / 2) / total : 0;
    candidates.push({
      intensity: clamp100((weekendShare - 0.5) * 200),
      build: () => ({
        key: 'weekend-warrior',
        name: 'The Weekend Warrior',
        emoji: '🎉',
        tagline: 'Mon–Fri responsible. Sat–Sun feral.',
        gradient: 'berry',
        traits: [
          { emoji: '🥳', label: 'Weekend orders', value: `${weekend.weekendOrders}` },
          { emoji: '💰', label: 'Weekend spend', value: formatCurrency(weekendSpent) },
          { emoji: '💼', label: 'Weekday spend', value: formatCurrency(weekdaySpent) },
        ],
      }),
    });
  }

  // 🔁 The Creature of Habit — long ordering streaks
  const streak = wrapped?.shame.longestStreak;
  if (streak) {
    candidates.push({
      intensity: clamp100((streak.days / Math.min(30,coveredDays)) * 100),
      build: () => ({
        key: 'creature-of-habit',
        name: 'The Creature of Habit',
        emoji: '🔁',
        tagline: 'Cooking is a hobby for other people.',
        gradient: 'lagoon',
        traits: compact([
          { emoji: '🔥', label: 'Longest streak', value: `${streak.days} days` },
          { emoji: '📦', label: 'Total orders', value: `${analytics.totalReceipts}` },
          topSpot && { emoji: '🏆', label: 'Home base', value: topSpot },
        ]),
      }),
    });
  }

  // 🤏 The Solo Snacker — lots of single-item orders
  const solo = wrapped?.shame.singleItemOrders;
  if (solo) {
    candidates.push({
      intensity: clamp100((solo.count / Math.max(1, analytics.totalReceipts)) * 100),
      build: () => ({
        key: 'solo-snacker',
        name: 'The Solo Snacker',
        emoji: '🤏',
        tagline: 'One item. Full delivery fee. No regrets.',
        gradient: 'forest',
        traits: compact([
          { emoji: '🥡', label: 'Single-item orders', value: `${solo.count}` },
          { emoji: '⭐', label: 'Usual suspect', value: solo.mostCommon },
          solo.totalSpent !== null && { emoji: '💸', label: 'Spent solo', value: formatCurrency(solo.totalSpent) },
        ]),
      }),
    });
  }

  // 🐋 The Whale — sheer total spend (always a contender)
  candidates.push({
    intensity: clamp100((analytics.totalSpent / (coveredDays / 30) / 500) * 100),
    build: () => ({
      key: 'whale',
      name: 'The Whale',
      emoji: '🐋',
      tagline: 'Single-handedly keeping delivery apps profitable.',
      gradient: 'indigo',
      traits: compact([
        { emoji: '💸', label: 'Total damage', value: formatCurrency(analytics.totalSpent) },
        { emoji: '📦', label: 'Total orders', value: `${analytics.totalReceipts}` },
        topSpot && { emoji: '🏆', label: 'Top spot', value: topSpot },
      ]),
    }),
  });

  // Pick the strongest signal; require a meaningful intensity to "win".
  const winner = candidates
    .filter((c) => c.intensity >= 25)
    .sort((a, b) => b.intensity - a.intensity || a.build().key.localeCompare(b.build().key))[0];

  if (winner) {
    return winner.build();
  }

  // 🍟 The Casual Craver — nothing stands out
  return {
    key: 'casual-craver',
    name: 'The Casual Craver',
    emoji: '🍟',
    tagline: 'Balanced. Reasonable. Suspiciously well-adjusted.',
    gradient: 'amber',
    traits: compact([
      { emoji: '📦', label: 'Total orders', value: `${analytics.totalReceipts}` },
      { emoji: '💸', label: 'Total spent', value: formatCurrency(analytics.totalSpent) },
      topSpot && { emoji: '🏆', label: 'Top spot', value: topSpot },
    ]),
  };
}

function compact(
  items: (ArchetypeTrait | string | false | null | undefined)[]
): ArchetypeTrait[] {
  return items.filter((i): i is ArchetypeTrait => typeof i === 'object' && i !== null);
}
