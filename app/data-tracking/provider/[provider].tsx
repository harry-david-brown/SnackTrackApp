import { Redirect, useLocalSearchParams } from 'expo-router';

export default function ProviderHistoryRoute() {
  const { provider, ...params } = useLocalSearchParams();
  return <Redirect href={{ pathname: '/data-tracking', params: { ...params, provider, focus: 'export', showExportTutorial: 'true' } }} />;
}
