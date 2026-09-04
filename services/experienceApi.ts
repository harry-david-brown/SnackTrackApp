import { api } from '@services/api';
import type { ExperienceState, SetupCompletionMethod } from '@features/experience/contracts';

const invalid = (field: string): never => { throw new Error(`Invalid experience state: ${field}`); };
const object = (value: unknown, field: string): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid(field);
  return value as Record<string, unknown>;
};
const nullableString = (value: unknown, field: string): string | null => {
  if (value === null) return null;
  if (typeof value !== 'string') invalid(field);
  return value as string;
};

export const normalizeExperienceState = (value: unknown): ExperienceState => {
  const root = object(value, 'response');
  const setup = object(root.setup, 'setup');
  const recap = object(root.firstRecap, 'firstRecap');
  const setupState = setup.state;
  const recapState = recap.state;
  const method = setup.completionMethod;
  const receiptCount = Number(root.receiptCount);
  if (!['required', 'importing', 'complete'].includes(String(setupState))) invalid('setup.state');
  if (!['ineligible', 'ready', 'seen'].includes(String(recapState))) invalid('firstRecap.state');
  if (method !== null && !['email_receipts', 'provider_history_request', 'provider_archive'].includes(String(method))) invalid('setup.completionMethod');
  if (!Number.isInteger(receiptCount) || receiptCount < 0) invalid('receiptCount');
  if (recap.minimumOrderCount !== 3 || recap.version !== 'lifetime-v1') invalid('firstRecap.version');
  return {
    setup: {
      state: setupState as ExperienceState['setup']['state'],
      completedAt: nullableString(setup.completedAt, 'setup.completedAt'),
      completionMethod: method as SetupCompletionMethod | null,
      activeOperationId: nullableString(setup.activeOperationId, 'setup.activeOperationId'),
    },
    firstRecap: {
      state: recapState as ExperienceState['firstRecap']['state'],
      minimumOrderCount: 3,
      version: 'lifetime-v1',
      seenAt: nullableString(recap.seenAt, 'firstRecap.seenAt'),
    },
    receiptCount,
  };
};

export const experienceApi = {
  async getState(): Promise<ExperienceState> {
    const response = await api.get('/experience/state');
    return normalizeExperienceState(response.data);
  },
  async markFirstRecapSeen(): Promise<ExperienceState> {
    const response = await api.put('/experience/first-recap/seen', { version: 'lifetime-v1' });
    return normalizeExperienceState(response.data);
  },
};
