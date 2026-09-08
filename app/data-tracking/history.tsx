import { Redirect, useLocalSearchParams } from 'expo-router';

export default function DetailedHistoryRoute() {
  const params = useLocalSearchParams();
  return <Redirect href={{ pathname: '/add-history', params: { ...params, intent: 'provider' } }} />;
}
