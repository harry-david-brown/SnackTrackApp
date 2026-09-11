import { Redirect, useLocalSearchParams } from 'expo-router';
import { buildProviderHistoryDestination } from '@features/import-flow/providerHistoryNavigation';

export default function ProviderHistoryRoute() {
  const { provider, returnTo } = useLocalSearchParams();
  const value = Array.isArray(provider) ? provider[0] : provider;
  if (value !== 'uber_eats' && value !== 'doordash') {
    return <Redirect href={{ pathname: '/add-history', params: { intent: 'provider', returnTo: 'home' } }} />;
  }
  return <Redirect href={{ ...buildProviderHistoryDestination(value), params: { ...buildProviderHistoryDestination(value).params, returnTo: typeof returnTo === 'string' ? returnTo : 'home' } }} />;
}
