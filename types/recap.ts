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
