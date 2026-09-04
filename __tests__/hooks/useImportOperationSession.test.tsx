import React from 'react';
import { act, renderHook } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { createAppQueryClient } from '@lib/queryClient';
import { useImportOperation } from '@hooks/useImportOperation';
import { importOperationsApi } from '@services/importOperationsApi';

jest.mock('@contexts/UserContext', () => ({
  useUser: () => ({ state: { user: null } }),
}));

jest.mock('@services/importOperationsApi', () => ({
  importOperationsApi: {
    get: jest.fn(),
    getActive: jest.fn(),
  },
}));

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
