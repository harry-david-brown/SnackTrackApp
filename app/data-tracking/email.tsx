import { Redirect, useLocalSearchParams } from 'expo-router';

export default function EmailDataRoute() {
  const params = useLocalSearchParams();
  return <Redirect href={{ pathname: '/add-history', params: { ...params, intent: 'email' } }} />;
}
