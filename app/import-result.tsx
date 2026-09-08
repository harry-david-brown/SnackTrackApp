import { parseImportReturnTo } from '@features/import-flow/importNavigation';
import { useLocalSearchParams } from 'expo-router';
import { ImportResultScreen } from '@components/import/ImportResultScreen';

export default function ImportResultRoute() {
  const { operationId, returnTo } = useLocalSearchParams<{ operationId?: string; returnTo?: string }>();
  return <ImportResultScreen returnTo={parseImportReturnTo(returnTo)} operationId={Array.isArray(operationId) ? operationId[0] : operationId} />;
}
