import type { RecapStory, RecapStoryCollection } from '@/types/recap';
const invalid = (): never => { throw new Error('Invalid recap story response'); };
const obj = (v: unknown): Record<string, unknown> => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : invalid();
const text = (v: unknown): string => typeof v === 'string' ? v : invalid();
const num = (v: unknown): number => typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : invalid();
const bool = (v: unknown): boolean => typeof v === 'boolean' ? v : invalid();
const choice = <T extends string>(v: unknown, choices: readonly T[]): T => typeof v === 'string' && choices.includes(v as T) ? v as T : invalid();
const date = (v: unknown): string => {
  const s = text(v), d = new Date(`${s}T12:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || !Number.isFinite(d.getTime()) || d.toISOString().slice(0, 10) !== s) invalid();
  return s;
};
export function normalizeRecap(value: unknown): RecapStoryCollection {
  const root = obj(value), spending = obj(root.spending);
  if (root.version !== 1 || !Array.isArray(root.stories)) return invalid();
  const stories = root.stories.map((value): RecapStory => {
    const s = obj(value), format = choice(s.format, ['number', 'money', 'text'] as const);
    if (!Array.isArray(s.overlaps)) return invalid();
    const score = num(s.score);
    if (score > 100) return invalid();
    const result: RecapStory = { id: text(s.id), category: choice(s.category, ['perspective', 'trend', 'places', 'habit', 'pattern', 'extreme-moment'] as const), family: text(s.family), overlaps: s.overlaps.map(text), specificity: num(s.specificity), score, title: text(s.title), value: format === 'text' ? text(s.value) : num(s.value), format, label: text(s.label), detail: text(s.detail), punchline: text(s.punchline) };
    if (s.subject !== undefined) result.subject = text(s.subject);
    if (s.startDate !== undefined) result.startDate = date(s.startDate);
    if (s.endDate !== undefined) result.endDate = date(s.endDate);
    if (result.endDate && (!result.startDate || result.endDate < result.startDate)) return invalid();
    if (s.fallbackOrder !== undefined) result.fallbackOrder = num(s.fallbackOrder);
    if (s.protected !== undefined) result.protected = bool(s.protected);
    if (s.approximate !== undefined) result.approximate = bool(s.approximate);
    if (s.supportingMoney !== undefined) { const m = obj(s.supportingMoney); result.supportingMoney = { amount: num(m.amount), approximate: bool(m.approximate), label: text(m.label) }; }
    return result;
  });
  if (new Set(stories.map(s => s.id)).size !== stories.length) return invalid();
  return { version: 1, currency: choice(root.currency, ['CAD', 'USD', 'EUR', 'GBP'] as const), rateSnapshot: text(root.rateSnapshot), spending: { amount: num(spending.amount), approximate: bool(spending.approximate), pricedOrders: num(spending.pricedOrders), missingPrices: num(spending.missingPrices), assumedCurrencies: num(spending.assumedCurrencies) }, stories };
}
