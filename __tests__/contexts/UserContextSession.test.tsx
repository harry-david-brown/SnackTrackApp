import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Text, TouchableOpacity } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { UserProvider, useUser } from '@contexts/UserContext';
import { createAppQueryClient } from '@lib/queryClient';
import { notifySessionExpired } from '@services/authSessionCoordinator';
import { authApi } from '@services/authApi';
import { logger } from '@utils/logger';
import * as tokenManager from '@utils/tokenManager';

jest.mock('@services/authApi', () => ({
  authApi: {
    validateSession: jest.fn(),
    login: jest.fn(),
    logout: jest.fn(),
    deleteAccount: jest.fn(),
  },
}));

jest.mock('@utils/tokenManager');

const userId = '123e4567-e89b-42d3-a456-426614174000';

function SessionHarness() {
  const { state, login, deleteAccount } = useUser();
  return (
    <>
      <Text>{state.isAuthenticated ? 'signed-in' : 'signed-out'}</Text>
      <TouchableOpacity onPress={() => { void login('person@example.com', 'Password1'); }}>
        <Text>Sign in</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => { void deleteAccount().catch(() => undefined); }}>
        <Text>Delete account</Text>
      </TouchableOpacity>
    </>
  );
}

describe('UserContext terminal session handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (tokenManager.isAuthenticated as jest.Mock).mockResolvedValue(true);
    (tokenManager.getUserId as jest.Mock).mockResolvedValue(userId);
    (tokenManager.getUserData as jest.Mock).mockResolvedValue({
      id: userId,
      email: 'person@example.com',
      createdAt: '2026-08-13T00:00:00.000Z',
    });
    (tokenManager.clearAuthTokens as jest.Mock).mockResolvedValue(undefined);
    (authApi.validateSession as jest.Mock).mockResolvedValue(true);
    (authApi.login as jest.Mock).mockResolvedValue({
      userId,
      email: 'person@example.com',
      accessToken: 'sensitive-access-token',
      refreshToken: 'sensitive-refresh-token',
      user: { id: userId, email: 'person@example.com', createdAt: '2026-08-13T00:00:00.000Z' },
    });
    (authApi.deleteAccount as jest.Mock).mockResolvedValue({
      success: true,
      message: 'deleted',
    });
  });

  it('clears authentication and query data after a terminal refresh failure', async () => {
    const queryClient = createAppQueryClient({ forTests: true });
    queryClient.setQueryData(['analytics', userId, 'summary'], { totalReceipts: 12 });
    render(
      <QueryClientProvider client={queryClient}>
        <UserProvider><SessionHarness /></UserProvider>
      </QueryClientProvider>
    );

    await waitFor(() => expect(screen.getByText('signed-in')).toBeTruthy());

    await act(async () => {
      await notifySessionExpired();
    });

    await waitFor(() => expect(screen.getByText('signed-out')).toBeTruthy());
    expect(queryClient.getQueryData(['analytics', userId, 'summary'])).toBeUndefined();
    expect(tokenManager.clearAuthTokens).toHaveBeenCalled();
  });

  it('does not log authentication response tokens or email addresses', async () => {
    const debug = jest.spyOn(logger, 'debug');
    const info = jest.spyOn(logger, 'info');
    const queryClient = createAppQueryClient({ forTests: true });
    render(
      <QueryClientProvider client={queryClient}>
        <UserProvider><SessionHarness /></UserProvider>
      </QueryClientProvider>
    );

    await waitFor(() => expect(screen.getByText('signed-in')).toBeTruthy());
    fireEvent.press(screen.getByText('Sign in'));
    await waitFor(() => expect(authApi.login).toHaveBeenCalledTimes(1));

    const logOutput = JSON.stringify([...debug.mock.calls, ...info.mock.calls]);
    expect(logOutput).not.toContain('sensitive-access-token');
    expect(logOutput).not.toContain('sensitive-refresh-token');
    expect(logOutput).not.toContain('person@example.com');
  });

  it('retains credentials and query state when authoritative account deletion fails', async () => {
    (authApi.deleteAccount as jest.Mock).mockRejectedValueOnce(new Error('deletion unavailable'));
    const queryClient = createAppQueryClient({ forTests: true });
    queryClient.setQueryData(['analytics', userId, 'summary'], { totalReceipts: 12 });
    render(
      <QueryClientProvider client={queryClient}>
        <UserProvider><SessionHarness /></UserProvider>
      </QueryClientProvider>
    );
    await waitFor(() => expect(screen.getByText('signed-in')).toBeTruthy());
    fireEvent.press(screen.getByText('Delete account'));
    await waitFor(() => expect(authApi.deleteAccount).toHaveBeenCalledTimes(1));
    expect(screen.getByText('signed-in')).toBeTruthy();
    expect(queryClient.getQueryData(['analytics', userId, 'summary'])).toEqual({ totalReceipts: 12 });
    expect(tokenManager.clearAuthTokens).not.toHaveBeenCalled();
  });

  it('clears credentials and all query state only after confirmed account deletion', async () => {
    const queryClient = createAppQueryClient({ forTests: true });
    queryClient.setQueryData(['analytics', userId, 'summary'], { totalReceipts: 12 });
    render(
      <QueryClientProvider client={queryClient}>
        <UserProvider><SessionHarness /></UserProvider>
      </QueryClientProvider>
    );
    await waitFor(() => expect(screen.getByText('signed-in')).toBeTruthy());
    fireEvent.press(screen.getByText('Delete account'));
    await waitFor(() => expect(screen.getByText('signed-out')).toBeTruthy());
    expect(queryClient.getQueryData(['analytics', userId, 'summary'])).toBeUndefined();
    expect(tokenManager.clearAuthTokens).toHaveBeenCalled();
  });
});
