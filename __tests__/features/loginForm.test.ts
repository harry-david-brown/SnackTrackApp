import { act, renderHook } from '@testing-library/react-native';
import { useLoginForm } from '../../components/auth/useLoginForm';

const mockLogin = jest.fn();
const mockRegister = jest.fn();
const mockClearError = jest.fn();

jest.mock('../../contexts/UserContext', () => ({
  useUser: () => ({
    login: mockLogin,
    register: mockRegister,
    clearError: mockClearError,
    state: { error: null, isLoading: false },
  }),
}));

describe('useLoginForm', () => {
  beforeEach(() => jest.clearAllMocks());

  it('keeps invalid input local and does not call authentication', async () => {
    const { result } = renderHook(() => useLoginForm());
    await act(async () => { await result.current.submit(); });
    expect(result.current.error).toBe('Enter your email address to continue.');
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('normalizes an email login and reports success', async () => {
    const onSuccess = jest.fn();
    mockLogin.mockResolvedValue({});
    const { result } = renderHook(() => useLoginForm(onSuccess));
    act(() => {
      result.current.setEmail('Person@Example.com');
      result.current.setPassword('Password1');
    });
    await act(async () => { await result.current.submit(); });
    expect(mockLogin).toHaveBeenCalledWith('person@example.com', 'Password1');
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it('validates registration passwords before calling the API', async () => {
    const { result } = renderHook(() => useLoginForm());
    act(() => {
      result.current.setIsRegistering(true);
      result.current.setEmail('person@example.com');
      result.current.setPassword('weak');
    });
    await act(async () => { await result.current.submit(); });
    expect(result.current.error).toContain('Password must include');
    expect(mockRegister).not.toHaveBeenCalled();
  });
});
