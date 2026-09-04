import { useLocalSearchParams } from 'expo-router';
import ImportProgressScreen from '@components/import/ImportProgressScreen';

export default function ImportProgressRoute() {
  const params = useLocalSearchParams<{ operationId?: string | string[] }>();
  const operationId = Array.isArray(params.operationId) ? params.operationId[0] : params.operationId;
  return <ImportProgressScreen operationId={operationId} />;
}
