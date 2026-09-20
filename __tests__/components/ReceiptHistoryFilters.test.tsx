import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { ReceiptHistoryScreen } from "@components/receipts/ReceiptHistoryScreen";
import { useReceiptsQuery } from "@hooks/queries/useReceiptsQuery";
import { normalizeReceipt } from "@services/api/receiptApi";
import { normalizeOrderMetrics } from "@services/normalizers/orderMetricNormalizers";
import historyFixture from "@/__tests__/fixtures/order-event-history.json";
import metricsFixture from "@/__tests__/fixtures/order-event-metrics.json";

jest.mock("@services/api/client");
jest.mock("@hooks/queries/useReceiptsQuery");
jest.mock("@hooks/queries/useAnalyticsQueries", () => ({
  useAnalyticsQuery: jest.fn(),
}));
jest.mock("@contexts/UserContext", () => ({
  useUser: () => ({ state: { user: { id: "test-account" } } }),
}));
jest.mock("@contexts/CurrencyContext", () => ({
  useCurrency: () => ({ formatCurrency: (n: number) => `$${n.toFixed(2)}` }),
}));
jest.mock("@hooks/useImportPreferences", () => ({
  useImportPreferences: () => ({ preferences: null }),
}));
jest.mock("@features/navigation", () => ({
  useAppNavigation: () => ({ open: jest.fn(), backOr: jest.fn() }),
  appDestinations: { history: { type: "history" } },
  addHistoryDestination: jest.fn(),
}));
jest.mock("@services/adminAnalytics", () => ({
  trackAdminEvent: jest.fn(async () => undefined),
}));
jest.mock("@features/ads/useAdRuntimeConfiguration", () => ({
  useAdRuntimeConfiguration: () => ({
    configuration: null,
    configurationFresh: false,
    appActive: false,
  }),
}));
jest.mock("@features/ads/adSession", () => ({
  claimAdOpportunity: () => false,
  getDailyAdImpressions: async () => 0,
  getSessionAdImpressions: () => 0,
  isAdSessionSuppressed: () => true,
  recordDailyAdImpression: async () => 0,
  recordSessionAdImpression: () => 0,
}));

const { useAnalyticsQuery } = jest.requireMock(
  "@hooks/queries/useAnalyticsQueries",
);
const records = historyFixture.map((value) => normalizeReceipt(value));

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  jest.spyOn(console, "warn").mockImplementation((message) => {
    if (
      !String(message).startsWith(
        "[Mascot] Using approved prop-receipt fallback",
      )
    )
      throw new Error(String(message));
  });
  useAnalyticsQuery.mockReturnValue({
    data: {
      totalReceipts: 5,
      totalSpent: 157.02,
      currencyCode: "CAD",
      monthlyBreakdown: [],
      orderMetrics: normalizeOrderMetrics(metricsFixture.metrics),
    },
    refetch: jest.fn(async () => undefined),
  });
  jest.mocked(useReceiptsQuery).mockImplementation((_userId, options) => {
    const outcome = options?.filters?.outcome;
    const items =
      outcome === "canceled"
        ? [records[1]]
        : outcome === "needs_review"
          ? []
          : records;
    // This seam models query state only; the real query-key and transport tests cover paging.
    return {
      data: { pages: [{ items, pageInfo: { total: items.length } }] },
      isPending: false,
      isError: false,
      isRefetching: false,
      isFetchingNextPage: false,
      hasNextPage: false,
      refetch: jest.fn(),
      fetchNextPage: jest.fn(),
    } as unknown as ReturnType<typeof useReceiptsQuery>;
  });
});

afterEach(async () => {
  await act(async () => {
    jest.runOnlyPendingTimers();
  });
  jest.useRealTimers();
  jest.restoreAllMocks();
});

it("composes outcome and provider filters, keeps the selected outcome visible for empty results and clears all filters", async () => {
  const screen = render(<ReceiptHistoryScreen />);
  await waitFor(() =>
    expect(screen.getByText('5 orders · All time')).toBeTruthy(),
  );
  expect(screen.getByText('$157.02 tracked')).toBeTruthy();
  fireEvent.press(screen.getByRole("button", { name: "Filter orders" }));
  const canceled = screen.getByRole("button", { name: "Filter: Canceled" });
  fireEvent.press(canceled);
  expect(
    screen.getByRole("button", { name: "Filter: Canceled" }).props
      .accessibilityState.selected,
  ).toBe(true);
  expect(screen.getByText(/1 matching record/)).toBeTruthy();
  fireEvent.press(screen.getByRole("button", { name: "Filter: Uber Eats" }));
  expect(jest.mocked(useReceiptsQuery).mock.calls.at(-1)?.[1]?.filters).toEqual(
    { receiptType: "uber_eats", outcome: "canceled" },
  );
  fireEvent.press(screen.getByRole("button", { name: "Filter: Needs review" }));
  expect(screen.getByText("No matching records")).toBeTruthy();
  expect(
    screen.getByRole("button", { name: "Filter: Needs review" }).props
      .accessibilityState.selected,
  ).toBe(true);
  fireEvent.press(screen.getByRole("button", { name: "Clear filters" }));
  expect(jest.mocked(useReceiptsQuery).mock.calls.at(-1)?.[1]?.filters).toEqual(
    {},
  );
  expect(
    screen.getByRole("button", { name: "Filter: All activity" }).props
      .accessibilityState.selected,
  ).toBe(true);
  screen.unmount();
});

it('keeps selected filters after collapsing, removes one without resetting the others, and clears search with Clear all', async () => {
  const screen = render(<ReceiptHistoryScreen />);
  await waitFor(() => expect(screen.getByText('History')).toBeTruthy());
  fireEvent.changeText(screen.getByLabelText('Search restaurants'), 'Burger');
  fireEvent.press(screen.getByRole('button', { name: 'Filter orders' }));
  fireEvent.press(screen.getByRole('button', { name: 'Filter: Uber Eats' }));
  fireEvent.press(screen.getByRole('button', { name: 'Filter: This month' }));
  fireEvent.press(screen.getByRole('button', { name: 'Filter: Canceled' }));
  fireEvent.press(screen.getByRole('button', { name: 'Show 1 record' }));

  expect(screen.getByRole('button', { name: 'Filter orders' }).props.accessibilityState.expanded).toBe(false);
  expect(screen.queryByRole('button', { name: 'Filter: Canceled' })).toBeNull();
  expect(screen.getByRole('button', { name: 'Remove Canceled filter' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Remove This month filter' })).toBeTruthy();
  expect(screen.getByLabelText('Search restaurants').props.value).toBe('Burger');
  expect(screen.getByText('5 orders · All time')).toBeTruthy();

  fireEvent.press(screen.getByRole('button', { name: 'Remove Uber Eats filter' }));
  expect(jest.mocked(useReceiptsQuery).mock.calls.at(-1)?.[1]?.filters).toEqual({
    restaurantName: 'Burger', outcome: 'canceled', startDate: expect.stringMatching(/^\d{4}-\d{2}-01$/),
  });
  expect(screen.queryByRole('button', { name: 'Remove Uber Eats filter' })).toBeNull();
  fireEvent.press(screen.getByRole('button', { name: 'Clear all' }));
  expect(jest.mocked(useReceiptsQuery).mock.calls.at(-1)?.[1]?.filters).toEqual({});
  expect(screen.getByLabelText('Search restaurants').props.value).toBe('');
  expect(screen.queryByRole('button', { name: 'Remove Canceled filter' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Remove This month filter' })).toBeNull();
  screen.unmount();
});

it('keeps every activity choice available and shows refund guidance on demand', async () => {
  const screen = render(<ReceiptHistoryScreen />);
  await waitFor(() => expect(screen.getByText('History')).toBeTruthy());
  fireEvent.press(screen.getByRole('button', { name: 'Filter orders' }));
  expect(screen.getByRole('button', { name: 'Filter: Possible refunds' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Filter: Unknown cost' })).toBeTruthy();
  expect(screen.queryByText(/Refunds require receipt evidence/)).toBeNull();
  fireEvent.press(screen.getByRole('button', { name: 'About refund records' }));
  expect(screen.getByText(/Refunds require receipt evidence/)).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: 'About refund records' }));
  expect(screen.queryByText(/Refunds require receipt evidence/)).toBeNull();
  screen.unmount();
});

it.each(['loading', 'error'] as const)('keeps search and filter recovery available during %s without claiming zero results', async state => {
  jest.mocked(useReceiptsQuery).mockReturnValue({
    data: undefined,
    isPending: state === 'loading',
    isError: state === 'error',
    isRefetching: false,
    isFetchingNextPage: false,
    hasNextPage: false,
    refetch: jest.fn(),
  } as unknown as ReturnType<typeof useReceiptsQuery>);
  const screen = render(<ReceiptHistoryScreen />);
  await waitFor(() => expect(screen.getByLabelText('Search restaurants')).toBeTruthy());
  fireEvent.press(screen.getByRole('button', { name: 'Filter orders' }));
  fireEvent.press(screen.getByRole('button', { name: 'Filter: Canceled' }));
  expect(screen.getByRole('button', { name: 'Show results' })).toBeTruthy();
  expect(screen.queryByText('0 matching records')).toBeNull();
  fireEvent.press(screen.getByRole('button', { name: 'Show results' }));
  expect(screen.getByRole('button', { name: 'Remove Canceled filter' })).toBeTruthy();
  screen.unmount();
});

it("keeps outcome filters out of the legacy-only view instead of claiming old zero receipts are confirmed refunds", async () => {
  useAnalyticsQuery.mockReturnValue({
    data: { totalReceipts: 1, totalSpent: 0, monthlyBreakdown: [] },
  });
  jest
    .mocked(useReceiptsQuery)
    .mockReturnValue({
      data: {
        pages: [
          {
            items: [{ ...records[0], orderOutcome: undefined }],
            pageInfo: { total: 1 },
          },
        ],
      },
      isPending: false,
      isError: false,
      isRefetching: false,
    } as unknown as ReturnType<typeof useReceiptsQuery>);
  const screen = render(<ReceiptHistoryScreen />);
  await waitFor(() => expect(screen.getByText("History")).toBeTruthy());
  fireEvent.press(screen.getByRole("button", { name: "Filter orders" }));
  expect(
    screen.queryByRole("button", { name: "Filter: Confirmed refunds" }),
  ).toBeNull();
  screen.unmount();
});
