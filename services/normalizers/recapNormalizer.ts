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
    if (s.orders !== undefined) {
      if (!Array.isArray(s.orders)) return invalid();
      result.orders = s.orders.map(value => {
        const order = obj(value);
        const id = text(order.id), restaurant = text(order.restaurant);
        if (!id.trim() || !restaurant.trim()) return invalid();
        const localTime = order.localTime === undefined ? undefined : text(order.localTime);
        if (localTime !== undefined && !/^([01]\d|2[0-3]):[0-5]\d$/.test(localTime)) return invalid();
        return { id, restaurant, localTime };
      });
      if (new Set(result.orders.map(order => order.id)).size !== result.orders.length) return invalid();
      if (result.id === 'most-deliveries-day' && result.orders.length !== result.value) return invalid();
    }
    if (s.evidence !== undefined) {
      const evidence = obj(s.evidence);
      const kind = choice(evidence.kind, ['receipt', 'items', 'late-night', 'spending', 'single-items', 'streak'] as const);
      if (!Array.isArray(evidence.orders) || !evidence.orders.length || evidence.orders.length > 7) return invalid();
      const orders = evidence.orders.map(value => {
        const order = obj(value);
        const id = text(order.id), restaurant = text(order.restaurant);
        if (!id.trim() || !restaurant.trim()) return invalid();
        const localTime = order.localTime === undefined ? undefined : text(order.localTime);
        if (localTime !== undefined && !/^([01]\d|2[0-3]):[0-5]\d$/.test(localTime)) return invalid();
        const items = order.items === undefined ? undefined : Array.isArray(order.items) ? order.items.map(value => {
          const item = obj(value), name = text(item.name), quantity = num(item.quantity);
          if (!name.trim() || quantity <= 0) return invalid();
          return { name, quantity };
        }) : invalid();
        return { id, restaurant, localTime, items,
          date: order.date === undefined ? undefined : date(order.date),
          amount: order.amount === undefined ? undefined : num(order.amount),
          approximate: order.approximate === undefined ? undefined : bool(order.approximate),
        };
      });
      const total = num(evidence.total);
      if (!Number.isInteger(total) || total < orders.length || new Set(orders.map(o => o.id)).size !== orders.length) return invalid();
      result.evidence = { kind, orders, total };
    }
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
