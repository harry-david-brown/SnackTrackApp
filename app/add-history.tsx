import { useLocalSearchParams } from 'expo-router';
import { PostOnboardingImportScreen } from '@components/import/PostOnboardingImportScreen';
import { parsePostOnboardingImportRoute } from '@features/import-flow/postOnboardingImportRoute';

export default function AddHistoryRoute() {
  const params = useLocalSearchParams();
  return <PostOnboardingImportScreen route={parsePostOnboardingImportRoute(params)} />;
}
