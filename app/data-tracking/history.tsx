import { Redirect, useLocalSearchParams } from 'expo-router';

export default function DetailedHistoryRoute() {
  const params = useLocalSearchParams();
  return <Redirect href={{ pathname: '/data-tracking', params: { ...params, focus: 'export' } }} />;
}
