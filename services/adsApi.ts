import { Platform } from 'react-native';
import { api } from '@services/api';
import type { AdPlacement, AdRuntimeConfiguration } from '@features/ads/contracts';

const placements = new Set<AdPlacement>(['dashboard_after_insights', 'history_after_fifth_order']);
const invalid = (field: string): never => { throw new Error(`Invalid ad configuration: ${field}`); };
const integer = (value: unknown, field: string, minimum: number, maximum: number): number => {
  if (!Number.isSafeInteger(value) || Number(value) < minimum || Number(value) > maximum) invalid(field);
  return Number(value);
};

export const normalizeAdRuntimeConfiguration = (value: unknown): AdRuntimeConfiguration => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid('response');
  const source = value as Record<string, unknown>;
  if (typeof source.enabled !== 'boolean') invalid('enabled');
  const configuredPlacements = Array.isArray(source.placements)
    ? source.placements.filter((placement): placement is AdPlacement => typeof placement === 'string' && placements.has(placement as AdPlacement))
    : ['dashboard_after_insights' as const];
  if (configuredPlacements.length === 0) invalid('placements');
  if (source.placement !== 'dashboard_after_insights' && source.placement !== 'dashboard_footer') invalid('placement');
  const legacyPlacement: AdPlacement = 'dashboard_after_insights';
  return {
    enabled: source.enabled as boolean,
    placement: legacyPlacement,
    placements: configuredPlacements,
    selectionStrategy: 'first_eligible',
    maxImpressionsPerSession: integer(source.maxImpressionsPerSession, 'maxImpressionsPerSession', 1, 3),
    maxImpressionsPerDay: integer(source.maxImpressionsPerDay ?? 2, 'maxImpressionsPerDay', 1, 10),
    minimumReceiptCount: integer(source.minimumReceiptCount, 'minimumReceiptCount', 1, 100),
    configurationVersion: integer(source.configurationVersion, 'configurationVersion', 1, Number.MAX_SAFE_INTEGER),
    refreshAfterSeconds: integer(source.refreshAfterSeconds, 'refreshAfterSeconds', 30, 300),
  };
};

export const adsApi = {
  async getRuntime(): Promise<AdRuntimeConfiguration> {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') invalid('platform');
    const response = await api.get(`/ads/runtime?platform=${Platform.OS}`);
    return normalizeAdRuntimeConfiguration(response.data);
  },
};
