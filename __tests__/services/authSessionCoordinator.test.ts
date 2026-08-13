import {
  notifySessionExpired,
  registerSessionExpiredHandler,
} from '@services/authSessionCoordinator';

describe('auth session coordinator', () => {
  it('coalesces simultaneous terminal failures into one sign-out transition', async () => {
    let finish!: () => void;
    const handler = jest.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
    const unregister = registerSessionExpiredHandler(handler);

    const first = notifySessionExpired();
    const second = notifySessionExpired();
    expect(handler).toHaveBeenCalledTimes(1);

    finish();
    await Promise.all([first, second]);
    unregister();
  });

  it('stops notifying a handler after its provider unregisters', async () => {
    const handler = jest.fn();
    const unregister = registerSessionExpiredHandler(handler);
    unregister();

    await notifySessionExpired();
    expect(handler).not.toHaveBeenCalled();
  });
});
