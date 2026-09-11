import React from 'react';
import { act, renderHook } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { createAppQueryClient } from '@lib/queryClient';
import { useImportOperation } from '@hooks/useImportOperation';
import { importOperationsApi } from '@services/importOperationsApi';
import { importOperationKeys } from '@lib/queryKeys';
import type { ImportOperation } from '@features/import-flow/contracts';

let mockUser: { id: string } | null = null;

jest.mock('@contexts/UserContext', () => ({
  useUser: () => ({ state: { user: mockUser } }),
}));

jest.mock('@services/importOperationsApi', () => ({
  importOperationsApi: {
    get: jest.fn(),
    getActive: jest.fn(),
  },
}));

const operation = (overrides: Partial<ImportOperation> = {}): ImportOperation => ({
  id: 'operation-1',
  kind: 'export_file',
  trigger: 'user',
  journeyContext: 'post_onboarding',
  status: 'pending_dispatch',
  phase: 'waiting',
  progress: 0,
  result: null,
  errorCode: null,
  errorMessage: null,
  attempts: 0,
  provider: 'doordash',
  createdAt: '2026-09-10T12:00:00.000Z',
  queuedAt: null,
  startedAt: null,
  completedAt: null,
  updatedAt: '2026-09-10T12:00:00.000Z',
  presentation: null,
  ...overrides,
});

beforeEach(() => {
  mockUser = null;
  jest.clearAllMocks();
});

test('a foreground transition does not fetch protected operations while signed out', async () => {
  const queryClient = createAppQueryClient({ forTests: true });
  const wrapper = ({ children }: React.PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  renderHook(() => useImportOperation(false), { wrapper });

  await act(async () => { await Promise.resolve(); });
  expect(importOperationsApi.getActive).not.toHaveBeenCalled();
  expect(importOperationsApi.get).not.toHaveBeenCalled();
});

test('retains the cached active operation while switching to detail monitoring', () => {
  mockUser = { id: 'user-1' };
  const queryClient = createAppQueryClient({ forTests: true });
  const accepted = operation();
  queryClient.setQueryData(importOperationKeys.active(mockUser.id), accepted);
  jest.mocked(importOperationsApi.get).mockReturnValue(new Promise(() => undefined));
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
