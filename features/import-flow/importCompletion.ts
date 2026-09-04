export type ImportCompletionNextAction =
  | { kind: 'provider'; provider: 'uber' | 'doordash'; label: string }
  | { kind: 'tracking'; label: string }
  | { kind: 'done'; label: string };

export interface ImportCompletionSummary {
  sourceName: string;
  orderCount: number;
  title: string;
  message: string;
  nextAction: ImportCompletionNextAction;
  emptyHistory?: boolean;
}
