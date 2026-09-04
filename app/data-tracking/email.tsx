import { Redirect, useLocalSearchParams } from 'expo-router';

export default function EmailDataRoute() {
  const params = useLocalSearchParams();
  return <Redirect href={{ pathname: '/data-tracking', params: { ...params, focus: 'gmail' } }} />;
}
