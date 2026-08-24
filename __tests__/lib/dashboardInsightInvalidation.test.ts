import { createAppQueryClient } from '@lib/queryClient';
import { analyticsKeys } from '@lib/queryKeys';
import { invalidateReceiptDerivedData } from '@lib/queryInvalidation';

describe('dashboard insight invalidation', () => {
  it('invalidates daily editions with the rest of receipt-derived analytics', async () => {
    const queryClient = createAppQueryClient({ forTests: true });
    const key = analyticsKeys.dashboardInsights('user-id', '2026-08-13');
    queryClient.setQueryData(key, { localDate: '2026-08-13' });
    await invalidateReceiptDerivedData(queryClient, 'user-id');
    expect(queryClient.getQueryState(key)?.isInvalidated).toBe(true);
    queryClient.clear();
  });
});
