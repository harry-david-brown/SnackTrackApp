import { useLocalSearchParams } from 'expo-router';
import { OngoingUpdatesScreen } from '@components/import/OngoingUpdatesScreen';
export default function OngoingUpdatesRoute() {
  const { manage, automatic } = useLocalSearchParams<{ manage?: string; automatic?: string }>();
  return <OngoingUpdatesScreen reconsider={manage === 'true'} automatic={automatic === 'true'} />;
}
