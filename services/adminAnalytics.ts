import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { api } from './api/client';
import { getUserId } from '@utils/tokenManager';
import { getConfig } from '@config/env';

export type AdminAnalyticsEventName =
  | 'app_session_started'
  | 'onboarding_started'
  | 'onboarding_completed'
  | 'mailbox_provider_selected'
  | 'dashboard_viewed'
  | 'history_viewed'
  | 'history_filter_changed'
  | 'wrapped_started'
  | 'wrapped_slide_viewed'
  | 'wrapped_exited'
  | 'wrapped_completed'
  | 'wrapped_share_tapped'
  | 'wrapped_share_completed'
  | 'wrapped_share_failed'
  | 'export_offer_shown'
  | 'export_offer_clicked'
  | 'export_offer_dismissed'
  | 'ad_request_started'
  | 'ad_loaded'
  | 'ad_impression'
  | 'ad_clicked'
  | 'ad_load_failed'
  | 'ad_revenue_paid'
  | 'quick_setup_viewed'
  | 'setup_method_selected'
  | 'setup_completed'
  | 'useful_history_reached'
  | 'import_stage_viewed'
  | 'data_tracking_viewed'
  | 'data_source_action_selected'
  | 'upsell_example_viewed'
  | 'deeper_stats_selected'
  | 'fee_trend_displayed'
  | 'ad_suppressed';

type AnalyticsProperty = string | number | boolean | null;
interface QueuedEvent {
  eventId: string;
  eventName: AdminAnalyticsEventName;
  schemaVersion: 1;
  occurredAt: string;
  platform: 'ios' | 'android';
  appVersion?: string;
  provider?: 'gmail' | 'microsoft' | 'uber_eats' | 'doordash';
  environment: 'development' | 'preview' | 'staging' | 'production';
  sessionId: string;
  properties: Record<string, AnalyticsProperty>;
}

const QUEUE_PREFIX = '@snacktrack_admin_analytics_v1_';
const MAX_EVENTS = 200;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const locks = new Map<string, Promise<void>>();
const sessionId = createUuid();

function createUuid(): string {
  const randomUuid = globalThis.crypto?.randomUUID?.();
  if (randomUuid) return randomUuid;
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const value = Math.floor(Math.random() * 16);
    return (character === 'x' ? value : (value & 0x3) | 0x8).toString(16);
  });
}

const key = (userId: string) => `${QUEUE_PREFIX}${userId}`;
const current = (events: QueuedEvent[]) => events.filter((event) => {
  const occurredAt = Date.parse(event.occurredAt);
  return Number.isFinite(occurredAt) && occurredAt >= Date.now() - MAX_AGE_MS;
});
const read = async (userId: string): Promise<QueuedEvent[]> => {
  const raw = await AsyncStorage.getItem(key(userId));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? current(parsed as QueuedEvent[]) : [];
  } catch {
    return [];
  }
};
const write = (userId: string, events: QueuedEvent[]) =>
  AsyncStorage.setItem(key(userId), JSON.stringify(events.slice(-MAX_EVENTS)));

const serialized = (userId: string, operation: () => Promise<void>): Promise<void> => {
  const previous = locks.get(userId) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(operation);
  locks.set(userId, next);
  return next.finally(() => {
    if (locks.get(userId) === next) locks.delete(userId);
  });
};

export const trackAdminEvent = async (
  eventName: AdminAnalyticsEventName,
  options: {
    provider?: QueuedEvent['provider'];
    properties?: Record<string, AnalyticsProperty>;
  } = {},
): Promise<void> => {
  const userId = await getUserId();
  if (!userId || (Platform.OS !== 'ios' && Platform.OS !== 'android')) return;
  const event: QueuedEvent = {
    eventId: createUuid(),
    eventName,
    schemaVersion: 1,
    occurredAt: new Date().toISOString(),
    platform: Platform.OS,
    appVersion: Constants.expoConfig?.version,
    environment: getConfig().appEnv,
    sessionId,
    properties: options.properties ?? {},
    ...(options.provider ? { provider: options.provider } : {}),
  };
  await serialized(userId, async () => write(userId, [...await read(userId), event]));
};

export const flushAdminEvents = async (userId?: string | null): Promise<void> => {
  const ownerId = userId ?? await getUserId();
  if (!ownerId) return;
  await serialized(ownerId, async () => {
    let queued = await read(ownerId);
    while (queued.length > 0) {
      const batch = queued.slice(0, 50);
      await api.post('/analytics/events/batch', { events: batch });
      queued = queued.slice(batch.length);
      await write(ownerId, queued);
    }
  });
};

export const removeAdminAnalyticsForUser = async (userId: string): Promise<void> => {
  await AsyncStorage.removeItem(key(userId));
};

export const adminAnalyticsQueueKeyForTests = key;
