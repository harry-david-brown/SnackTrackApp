export type ImportReturnTo = 'home' | 'history' | 'summary' | 'settings' | 'ongoing_updates';

export const parseImportReturnTo = (value: unknown): ImportReturnTo => {
  const first = Array.isArray(value) ? value[0] : value;
  return first === 'ongoing_updates' || first === 'history' || first === 'summary' || first === 'settings' ? first : 'home';
};

export const importReturnDestination = (origin: ImportReturnTo) => ({
  ongoing_updates: '/ongoing-updates', home: '/(tabs)', history: '/(tabs)/history', summary: '/(tabs)/wrapped-journey', settings: '/settings/accounts-permissions',
} as const)[origin];

export const providerPreparationCopy = (provider: 'uber_eats' | 'doordash') => provider === 'uber_eats'
  ? 'Your file won’t be ready immediately. Uber will email you when you can download it.'
  : 'Preparation time varies. DoorDash will email you when your download is ready.';

export const DOWNLOAD_EXPIRY_HELP = 'Download links expire. Check the deadline in the provider’s email; request another download if the link no longer works.';
