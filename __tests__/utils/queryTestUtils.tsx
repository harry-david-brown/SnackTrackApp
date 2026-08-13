import React, { type PropsWithChildren } from 'react';
import { QueryClientProvider, notifyManager } from '@tanstack/react-query';
import { act } from '@testing-library/react-native';
import { createAppQueryClient } from '@lib/queryClient';

export const createQueryTestWrapper = () => {
  notifyManager.setNotifyFunction((callback) => { act(callback); });
  const queryClient = createAppQueryClient({ forTests: true });
  const Wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, Wrapper };
};
