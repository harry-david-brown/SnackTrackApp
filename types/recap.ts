export interface RecapDayOrder {
  id: string;
  restaurant: string;
  /** Local placement time (HH:mm); absent for date-only evidence. */
  localTime?: string;
}

export interface RecapEvidenceOrder extends RecapDayOrder {
  date?: string;
  amount?: number;
  approximate?: boolean;
  items?: { name: string; quantity: number }[];
}

export interface RecapEvidence {
  kind: 'receipt' | 'items' | 'late-night' | 'spending' | 'single-items' | 'streak';
  orders: RecapEvidenceOrder[];
  total: number;
}

export interface RecapStory {
  id: string;
  category: 'perspective' | 'trend' | 'places' | 'habit' | 'pattern' | 'extreme-moment';
  family: string;
  subject?: string;
  overlaps: string[];
  specificity: number;
  score: number;
  title: string;
  value: number | string;
  format: 'number' | 'money' | 'text';
  label: string;
  detail: string;
  punchline: string;
  approximate?: boolean;
  orders?: RecapDayOrder[];
  evidence?: RecapEvidence;
  supportingMoney?: { amount: number; approximate: boolean; label: string };
  startDate?: string;
  endDate?: string;
  fallbackOrder?: number;
  protected?: boolean;
}
export interface RecapStoryCollection {
  version: 1;
  currency: 'CAD' | 'USD' | 'EUR' | 'GBP';
  rateSnapshot: string;
  spending: { amount: number; approximate: boolean; pricedOrders: number; missingPrices: number; assumedCurrencies: number };
  stories: RecapStory[];
}
