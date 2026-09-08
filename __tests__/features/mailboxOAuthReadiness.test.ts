import { waitForMailboxOAuthReadiness } from '@features/import-flow/mailboxOAuthReadiness';

describe('waitForMailboxOAuthReadiness', () => {
  it('waits through a stale projection and returns the first ready value', async () => {
    const read = jest.fn()
      .mockResolvedValueOnce({ connected: false })
      .mockResolvedValueOnce({ connected: true });

    await expect(waitForMailboxOAuthReadiness<{ connected: boolean }>(read, {
      isReady: value => value.connected,
      wait: async () => undefined,
    })).resolves.toEqual({ connected: true });
    expect(read).toHaveBeenCalledTimes(2);
  });

  it('stops immediately on a durable terminal state', async () => {
    const read = jest.fn().mockResolvedValue({ health: 'reconnect_required' });

    await expect(waitForMailboxOAuthReadiness<{ health: string }>(read, {
      isReady: () => false,
      isTerminal: value => value.health === 'reconnect_required',
      wait: async () => undefined,
    })).resolves.toEqual({ health: 'reconnect_required' });
    expect(read).toHaveBeenCalledTimes(1);
  });
});
