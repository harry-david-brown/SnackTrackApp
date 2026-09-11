import { act, render } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';
import { ImportNotificationController } from '@components/import/ImportNotificationController';
import { useUser } from '@contexts/UserContext';
import { useAppNavigation, type NavigationOutcome } from '@features/navigation';

let mockNotificationResponseListener: ((event: Notifications.NotificationResponse) => void) | undefined;

jest.mock('expo-device', () => ({ isDevice: true }));
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { extra: { eas: { projectId: 'project' } } } } }));
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn((listener) => {
    mockNotificationResponseListener = listener;
    return { remove: jest.fn() };
  }),
}));
jest.mock('@contexts/UserContext', () => ({ useUser: jest.fn() }));

describe('ImportNotificationController navigation', () => {
  const dispatchExternalNavigation = jest.fn<NavigationOutcome, []>(() => 'navigated');

  beforeEach(() => {
    jest.clearAllMocks();
    mockNotificationResponseListener = undefined;
    jest.mocked(useUser).mockReturnValue({
      state: { user: { id: 'user-1' } },
    } as ReturnType<typeof useUser>);
    jest.mocked(useAppNavigation).mockReturnValue({
      open: jest.fn(), replace: jest.fn(), backOr: jest.fn(), setParams: jest.fn(),
      dispatchExternalNavigation,
      registerExternalBlocker: jest.fn(() => () => undefined),
    });
  });

  it('sends a notification tap through the external navigation policy', () => {
    render(<ImportNotificationController />);
    act(() => {
      mockNotificationResponseListener?.({
        notification: { request: { content: { data: { type: 'import_operation', operationId: 'op-1' } } } },
      } as unknown as Notifications.NotificationResponse);
    });
    expect(dispatchExternalNavigation).toHaveBeenCalledWith({
      kind: 'import-result',
      source: 'notification',
      operationId: 'op-1',
    });
  });

  it('ignores unrelated notification payloads', () => {
    render(<ImportNotificationController />);
    act(() => {
      mockNotificationResponseListener?.({
        notification: { request: { content: { data: { type: 'other', operationId: 'op-1' } } } },
      } as unknown as Notifications.NotificationResponse);
    });
    expect(dispatchExternalNavigation).not.toHaveBeenCalled();
  });
});
