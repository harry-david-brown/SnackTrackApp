import { ReceiptHistoryScreen } from '@components/receipts/ReceiptHistoryScreen';
import { useLocalSearchParams } from 'expo-router';

export default function HistoryTab() {
  const params = useLocalSearchParams<{
    insightId?: string | string[];
    insightDate?: string | string[];
    insightLabel?: string | string[];
    insightSnapshot?: string | string[];
  }>();
  const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
  const insightId = first(params.insightId);
  const insightDate = first(params.insightDate);
  const insightFilter = insightId && insightDate && /^\d{4}-\d{2}-\d{2}$/.test(insightDate)
    ? { id: insightId, localDate: insightDate, snapshotId: first(params.insightSnapshot), label: first(params.insightLabel) || 'Dashboard stat' }
    : undefined;
  return <ReceiptHistoryScreen insightFilter={insightFilter} />;
}
