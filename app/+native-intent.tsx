const MICROSOFT_ANDROID_CALLBACK_HOST = 'com.snacktrack.app';

/**
 * OAuth callbacks are consumed by expo-auth-session. Expo Router also observes
 * native links, so keep Microsoft callbacks on the entry route instead of
 * interpreting the Android signature hash as an application pathname.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    const url = new URL(path, 'snacktrack://app');
    const isMicrosoftCallback =
      (url.protocol === 'msauth:' || url.protocol === 'snacktrack:') &&
      url.hostname === MICROSOFT_ANDROID_CALLBACK_HOST &&
      url.searchParams.has('state') &&
      (url.searchParams.has('code') || url.searchParams.has('error'));

    return isMicrosoftCallback ? '/' : path;
  } catch {
    return path;
  }
}
