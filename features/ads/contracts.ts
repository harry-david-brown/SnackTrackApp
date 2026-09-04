export type AdPlacement = 'dashboard_after_insights' | 'history_after_fifth_order';

export interface AdRuntimeConfiguration {
  enabled: boolean;
  placement: AdPlacement;
  placements: AdPlacement[];
  selectionStrategy: 'first_eligible';
  maxImpressionsPerSession: number;
  maxImpressionsPerDay: number;
  minimumReceiptCount: number;
  configurationVersion: number;
  refreshAfterSeconds: number;
}

export interface AdEligibilityInput {
  configuration: AdRuntimeConfiguration | null;
  configurationFresh: boolean;
  receiptCount: number | null;
  insightsReady: boolean;
  appActive: boolean;
  impressionsThisSession: number;
  impressionsToday?: number;
  placement?: AdPlacement;
  sessionSuppressed?: boolean;
}

export const isAdEligible = (input: AdEligibilityInput): boolean => Boolean(
  input.configuration?.enabled &&
  input.configurationFresh &&
  input.appActive &&
  input.insightsReady &&
  !input.sessionSuppressed &&
  (!input.placement || input.configuration.placements.includes(input.placement)) &&
  input.receiptCount !== null &&
  input.receiptCount >= input.configuration.minimumReceiptCount &&
  input.impressionsThisSession < input.configuration.maxImpressionsPerSession &&
  (input.impressionsToday ?? 0) < input.configuration.maxImpressionsPerDay
);
