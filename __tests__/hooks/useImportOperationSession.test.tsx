import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { AccessibilityInfo } from "react-native";
import { QueryClientProvider, QueryObserver } from "@tanstack/react-query";
import { createAppQueryClient } from "@lib/queryClient";
import { useImportOperation } from "@hooks/useImportOperation";
import { importOperationsApi } from "@services/importOperationsApi";
import {
  analyticsKeys,
  experienceKeys,
  importOperationKeys,
  importPreferenceKeys,
  receiptKeys,
} from "@lib/queryKeys";
import type { ImportOperation } from "@features/import-flow/contracts";

let mockUser: { id: string } | null = null;

jest.mock("@contexts/UserContext", () => ({
  useUser: () => ({ state: { user: mockUser } }),
}));

jest.mock("@services/importOperationsApi", () => ({
  importOperationsApi: {
    get: jest.fn(),
    getActive: jest.fn(),
  },
}));

const operation = (
  overrides: Partial<ImportOperation> = {},
): ImportOperation => ({
  id: "operation-1",
  kind: "export_file",
  trigger: "user",
  journeyContext: "post_onboarding",
  status: "pending_dispatch",
  phase: "waiting",
  progress: 0,
  result: null,
  errorCode: null,
  errorMessage: null,
  attempts: 0,
  provider: "doordash",
  createdAt: "2026-09-10T12:00:00.000Z",
  queuedAt: null,
  startedAt: null,
  completedAt: null,
  updatedAt: "2026-09-10T12:00:00.000Z",
  presentation: null,
  ...overrides,
});

beforeEach(() => {
  mockUser = null;
  jest.clearAllMocks();
});

test("a foreground transition does not fetch protected operations while signed out", async () => {
  const queryClient = createAppQueryClient({ forTests: true });
  const wrapper = ({ children }: React.PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  renderHook(() => useImportOperation(false), { wrapper });

  await act(async () => {
    await Promise.resolve();
  });
  expect(importOperationsApi.getActive).not.toHaveBeenCalled();
  expect(importOperationsApi.get).not.toHaveBeenCalled();
});

test("retains the cached active operation while switching to detail monitoring", () => {
  mockUser = { id: "user-1" };
  const queryClient = createAppQueryClient({ forTests: true });
  const accepted = operation();
  queryClient.setQueryData(importOperationKeys.active(mockUser.id), accepted);
  jest
    .mocked(importOperationsApi.get)
    .mockReturnValue(new Promise(() => undefined));
  const wrapper = ({ children }: React.PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  const { result } = renderHook(
    () => useImportOperation(true, false, accepted.id),
    { wrapper },
  );

  expect(result.current.operation).toEqual(accepted);
  expect(result.current.isLoading).toBe(false);
});

test.each<ImportOperation["kind"]>([
  "gmail_historical",
  "outlook_historical",
  "export_file",
  "manual_tracking",
  "scheduled_tracking",
  "gmail_push_tracking",
  "receipt_publish",
  "receipt_rollback",
])(
  "a silent successful %s refreshes canonical reads, without touching another account",
  async (kind) => {
    mockUser = { id: "user-1" };
    const queryClient = createAppQueryClient({ forTests: true });
    const complete = operation({
      kind,
      status: "succeeded",
      completedAt: "2026-09-10T12:01:00.000Z",
    });
    jest.mocked(importOperationsApi.get).mockResolvedValue(complete);
    const announce = jest
      .spyOn(AccessibilityInfo, "announceForAccessibility")
      .mockImplementation(() => undefined);
    const currentKeys = [
      receiptKeys.list(mockUser.id, {}),
      analyticsKeys.summary(mockUser.id),
      analyticsKeys.wrapped(mockUser.id),
      analyticsKeys.dashboardInsights(mockUser.id, "2026-09-10"),
      importPreferenceKeys.current(mockUser.id),
      experienceKeys.state(mockUser.id),
    ];
    const otherKey = analyticsKeys.summary("other-user");
    const inactiveKey = receiptKeys.list(mockUser.id, {
      provider: "uber_eats",
    });
    queryClient.setQueryData(inactiveKey, "before");
    const observed = [...currentKeys, otherKey].map((queryKey) => {
      queryClient.setQueryData(queryKey, "before");
      const queryFn = jest.fn(async () => "after");
      const observer = new QueryObserver(queryClient, { queryKey, queryFn });
      return {
        queryKey,
        queryFn,
        unsubscribe: observer.subscribe(() => undefined),
      };
    });
    const wrapper = ({ children }: React.PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { unmount, rerender } = renderHook(
      () => useImportOperation(true, false, complete.id),
      { wrapper },
    );
    try {
      await waitFor(() =>
        currentKeys.forEach((key) =>
          expect(queryClient.getQueryData(key)).toBe("after"),
        ),
      );
      expect(queryClient.getQueryState(inactiveKey)?.isInvalidated).toBe(true);
      expect(queryClient.getQueryData(otherKey)).toBe("before");
      expect(observed.at(-1)?.queryFn).not.toHaveBeenCalled();
      expect(announce).not.toHaveBeenCalled();
      rerender({});
      await act(async () => {
        await Promise.resolve();
      });
      observed
        .slice(0, -1)
        .forEach(({ queryFn }) => expect(queryFn).toHaveBeenCalledTimes(1));
    } finally {
      unmount();
      observed.forEach(({ unsubscribe }) => unsubscribe());
      queryClient.clear();
      announce.mockRestore();
    }
  },
);

test.each<ImportOperation["status"]>([
  "failed",
  "cancelled",
  "expired",
  "superseded",
])(
  "a silent %s result invalidates partially committed pages and connection state",
  async (status) => {
    mockUser = { id: "user-1" };
    const queryClient = createAppQueryClient({ forTests: true });
    const terminal = operation({ status });
    jest.mocked(importOperationsApi.get).mockResolvedValue(terminal);
    const keys = [
      receiptKeys.list(mockUser.id, {}),
      analyticsKeys.wrapped(mockUser.id),
      importPreferenceKeys.current(mockUser.id),
    ];
    keys.forEach((key) => queryClient.setQueryData(key, "cached"));
    const wrapper = ({ children }: React.PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { unmount } = renderHook(
      () => useImportOperation(true, false, terminal.id),
      { wrapper },
    );
    await waitFor(() =>
      keys.forEach((key) =>
        expect(queryClient.getQueryState(key)?.isInvalidated).toBe(true),
      ),
    );
    unmount();
    queryClient.clear();
  },
);

test("disabled monitoring does not invalidate from a cached result; enabling it does", async () => {
  mockUser = { id: "user-1" };
  const queryClient = createAppQueryClient({ forTests: true });
  const complete = operation({ status: "succeeded" });
  const receiptKey = receiptKeys.list(mockUser.id, {});
  queryClient.setQueryData(receiptKey, "cached");
  queryClient.setQueryData(
    importOperationKeys.detail(mockUser.id, complete.id),
    complete,
  );
  jest.mocked(importOperationsApi.get).mockResolvedValue(complete);
  const wrapper = ({ children }: React.PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const { unmount, rerender } = renderHook(
    ({ enabled }) => useImportOperation(enabled, false, complete.id),
    {
      wrapper,
      initialProps: { enabled: false },
    },
  );
  expect(queryClient.getQueryState(receiptKey)?.isInvalidated).toBe(false);
  rerender({ enabled: true });
  await waitFor(() =>
    expect(queryClient.getQueryState(receiptKey)?.isInvalidated).toBe(true),
  );
  unmount();
  queryClient.clear();
});

test("a retried operation ending in the same status refreshes its new committed pages", async () => {
  mockUser = { id: "user-1" };
  const queryClient = createAppQueryClient({ forTests: true });
  const failed = operation({
    status: "failed",
    completedAt: "2026-09-10T12:01:00.000Z",
  });
  const receiptKey = receiptKeys.list(mockUser.id, {});
  queryClient.setQueryData(receiptKey, "cached");
  jest.mocked(importOperationsApi.get).mockResolvedValue(failed);
  const wrapper = ({ children }: React.PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const { result, unmount } = renderHook(
    () => useImportOperation(true, false, failed.id),
    { wrapper },
  );
  await waitFor(() =>
    expect(queryClient.getQueryState(receiptKey)?.isInvalidated).toBe(true),
  );
  queryClient.setQueryData(receiptKey, "after first attempt");
  jest
    .mocked(importOperationsApi.get)
    .mockResolvedValue({ ...failed, completedAt: "2026-09-10T12:03:00.000Z" });
  await act(async () => {
    await result.current.refresh();
  });
  await waitFor(() =>
    expect(queryClient.getQueryState(receiptKey)?.isInvalidated).toBe(true),
  );
  unmount();
  queryClient.clear();
});
