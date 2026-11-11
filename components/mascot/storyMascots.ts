import type { MascotPose } from './Mascot';

interface StoryMascot {
  mascotPose: MascotPose;
  accentEmoji?: string;
  accentEmojiCount?: 2;
}

// The phone, menu, receipt, drink and takeaway bags are part of the illustrations.
// Floating accents supply the context for the two flex poses and the busy day.
const bedtime: StoryMascot = { mascotPose: 'prop-bedtime-phone' };
const receipt: StoryMascot = { mascotPose: 'prop-first-receipt' };
const splurge: StoryMascot = { mascotPose: 'prop-money-flex', accentEmoji: '💰', accentEmojiCount: 2 };
const busyDay: StoryMascot = { mascotPose: 'prop-delivery-haul', accentEmoji: '🔔', accentEmojiCount: 2 };
const repeatMenu: StoryMascot = { mascotPose: 'prop-repeat-menu' };
const soloDrink: StoryMascot = { mascotPose: 'prop-solo-drink' };
const streak: StoryMascot = { mascotPose: 'prop-celebrating-haul' };
const stopwatch: StoryMascot = { mascotPose: 'prop-stopwatch' };
const investmentTeacher: StoryMascot = { mascotPose: 'prop-investment-teacher' };

const stories = new Map<string, StoryMascot>([
  ['missed-investment', investmentTeacher],
  ['historical-investment', investmentTeacher],
  ['delivery-waits', stopwatch],
  ['most-expensive-order', splurge],
  ['spending-burst', { mascotPose: 'flex', accentEmoji: '🔥', accentEmojiCount: 2 }],
  ['most-deliveries-day', busyDay],
  ['laziest-day', busyDay],
  ['late-night-orders', bedtime],
  ['night-owl', bedtime],
  ['history-first', receipt],
  ['history-latest', receipt],
  ['repeated-basket', repeatMenu],
  ['single-item-orders', soloDrink],
  ['longest-streak', streak],
]);

export function recapMascot(storyId: string) {
  return stories.get(storyId);
}

const dashboardStories = new Map<string, StoryMascot>([
  ['accumulated-delivery-time', stopwatch],
  ['biggest-splurge', splurge],
  ['detailed-biggest-order', splurge],
  ['multi-order-day', busyDay],
  ['night-owl', bedtime],
  ['latest-ever-order', bedtime],
  ['favourite-late-night-restaurant', bedtime],
  ['favourite-late-night-item', bedtime],
  ['first-order-anniversary', receipt],
  ['exact-basket-soulmate', repeatMenu],
  ['most-predictable-order', repeatMenu],
  ['most-ordered-meal', repeatMenu],
  ['item-obsession-recurring-item', repeatMenu],
  ['item-obsession-coffee', soloDrink],
  ['current-order-streak', streak],
  ['longest-order-streak', streak],
]);

export function dashboardMascot(insightId: string): StoryMascot | undefined {
  // The API adds a rank suffix to runners-up for the same statistic.
  return dashboardStories.get(insightId.replace(/-rank-\d+$/, ''));
}
