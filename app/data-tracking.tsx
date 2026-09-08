import { Redirect, useLocalSearchParams } from 'expo-router';
import { parsePostOnboardingImportRoute } from '@features/import-flow/postOnboardingImportRoute';

export default function DataTrackingRoute() {
  const params = useLocalSearchParams();
  const route = parsePostOnboardingImportRoute(params);
  if (route.operationId) return <Redirect href={{ pathname: '/import-result', params: { operationId: route.operationId, returnTo: route.returnTo } }} />;
  return <Redirect href={{ pathname: '/add-history', params: { ...params, returnTo: route.returnTo, intent: route.intent, ...(route.provider ? { provider: route.provider } : {}), ...(route.downloadedVersion ? { downloadedVersion: route.downloadedVersion } : {}) } }} />;
}
