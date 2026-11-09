interface MailboxOAuthReadinessOptions<T> {
  readonly isReady: (value: T) => boolean;
  readonly isTerminal?: (value: T) => boolean;
  readonly isCancelled?: () => boolean;
  readonly attempts?: number;
  readonly retryDelayMs?: number;
  readonly wait?: (milliseconds: number) => Promise<void>;
}

const wait = (milliseconds: number) => new Promise<void>((resolve) => {
  setTimeout(resolve, milliseconds);
});

/**
 * Waits for the authoritative mailbox projection after an OAuth callback.
 * A request that started before authorization may still return the old
 * disconnected state, so callers must not treat the first read as final.
 */
export async function waitForMailboxOAuthReadiness<T>(
  read: () => Promise<T | null>,
  options: MailboxOAuthReadinessOptions<T>,
): Promise<T | null> {
  const attempts = options.attempts ?? 8;
  const retryDelayMs = options.retryDelayMs ?? 500;
  const pause = options.wait ?? wait;
  let latest: T | null = null;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (options.isCancelled?.()) return null;
    latest = await read();
    if (options.isCancelled?.()) return null;
    if (latest && (options.isReady(latest) || options.isTerminal?.(latest))) {
      return latest;
    }
    if (attempt < attempts - 1) await pause(retryDelayMs);
  }

  return latest;
}
