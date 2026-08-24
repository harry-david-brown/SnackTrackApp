type RawRestartToken = string | string[] | undefined;

export const createWrappedRestartHref = (now = Date.now()) => ({
  pathname: '/(tabs)/wrapped-journey' as const,
  params: { restart: String(now) },
});

export const resolveWrappedJourneyInstanceKey = (
  dataUpdatedAt: number,
  rawRestartToken: RawRestartToken,
) => {
  const restartToken = Array.isArray(rawRestartToken) ? rawRestartToken[0] : rawRestartToken;
  return `${dataUpdatedAt}:${restartToken || 'resume'}`;
};
