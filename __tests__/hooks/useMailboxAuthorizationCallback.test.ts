import { renderHook, waitFor } from '@testing-library/react-native';
import { useUser } from '@contexts/UserContext';
import { finishMailboxAuthorization } from '@services/mailboxAuthorization';
import { useMailboxAuthorizationCallback } from '@hooks/useMailboxAuthorizationCallback';

jest.mock('@contexts/UserContext', () => ({ useUser: jest.fn() }));
jest.mock('@services/mailboxAuthorization', () => ({ finishMailboxAuthorization: jest.fn() }));

it('keeps the cold-start callback pending until the authenticated account is restored', async () => {
  const user = jest.mocked(useUser);
  user.mockReturnValue({ state: { user: null, isLoading: false, isAuthenticated: false } } as ReturnType<typeof useUser>);
  jest.mocked(finishMailboxAuthorization).mockResolvedValue();
  const { result, rerender } = renderHook(() => useMailboxAuthorizationCallback('gmail', 'pending', 'a'.repeat(64)));
  expect(result.current.completing).toBe(true);
  expect(finishMailboxAuthorization).not.toHaveBeenCalled();
  user.mockReturnValue({ state: { user: { id: 'account-a' }, isLoading: false, isAuthenticated: true } } as ReturnType<typeof useUser>);
  rerender({});
  await waitFor(() => expect(result.current.status).toBe('success'));
  expect(finishMailboxAuthorization).toHaveBeenCalledWith('gmail', 'account-a', 'a'.repeat(64));
});
