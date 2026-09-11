// Jest setup file

// Set up test environment variables before any imports
process.env.EXPO_PUBLIC_API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://test-api.example.com';
process.env.EXPO_PUBLIC_APP_ENV = process.env.EXPO_PUBLIC_APP_ENV || 'development';

// The native Sentry package starts a module-level cleanup interval as soon as
// it is imported. Tests exercise our adapter, not Sentry internals, so keep the
// suite deterministic and handle-free with a small adapter-compatible mock.
jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  setUser: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  withScope: (callback: (scope: { setTag: jest.Mock }) => void) => callback({ setTag: jest.fn() }),
  startSpan: (_options: unknown, callback: (span: object) => unknown) => callback({}),
}));

jest.mock('react-native-google-mobile-ads', () => {
  const React: typeof import('react') = jest.requireActual('react');
  const { View }: typeof import('react-native') = jest.requireActual('react-native');
  const wrapper = ({ children }: { children?: React.ReactNode }) => React.createElement(View, null, children);
  return {
    __esModule: true,
    default: () => ({ initialize: jest.fn().mockResolvedValue([]) }),
    AdsConsent: { gatherConsent: jest.fn().mockResolvedValue({ canRequestAds: false }) },
    NativeAd: { createForAdRequest: jest.fn() },
    NativeAdChoicesPlacement: { TOP_RIGHT: 1 },
    NativeAdEventType: { IMPRESSION: 'impression', CLICKED: 'clicked', PAID: 'paid' },
    NativeAdView: wrapper,
    NativeAsset: wrapper,
    NativeAssetType: { ICON: 'icon', HEADLINE: 'headline', ADVERTISER: 'advertiser', BODY: 'body', CALL_TO_ACTION: 'callToAction' },
    NativeMediaAspectRatio: { LANDSCAPE: 2 },
    NativeMediaView: wrapper,
    RevenuePrecisions: { UNKNOWN: 0, ESTIMATED: 1, PUBLISHER_PROVIDED: 2, PRECISE: 3 },
    TestIds: { NATIVE: 'test-native-ad' },
  };
});

// Mock Expo modules
const mockRouter = {
  push: jest.fn(),
  navigate: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  canGoBack: jest.fn(() => true),
  setParams: jest.fn(),
};

jest.mock('expo-router', () => ({
  router: mockRouter,
  useRouter: () => ({
    push: mockRouter.push,
    navigate: mockRouter.navigate,
    replace: mockRouter.replace,
    back: mockRouter.back,
    canGoBack: mockRouter.canGoBack,
    setParams: mockRouter.setParams,
  }),
  useLocalSearchParams: jest.fn(() => ({})),
  useGlobalSearchParams: jest.fn(() => ({})),
  usePathname: jest.fn(() => '/'),
  useSegments: jest.fn(() => ['(tabs)']),
  Redirect: () => null,
  Stack: Object.assign(
    ({ children }: { children: React.ReactNode }) => children,
    {
      Screen: () => null,
      Protected: ({ children }: { children: React.ReactNode }) => children,
    },
  ),
  Tabs: ({ children }: { children: React.ReactNode }) => children,
  Tab: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('@features/navigation', () => {
  const actual = jest.requireActual('@features/navigation');
  return {
    ...actual,
    useAppNavigation: jest.fn(() => ({
      open: (destination: unknown) => { mockRouter.navigate(destination); return 'navigated'; },
      replace: (destination: unknown) => { mockRouter.replace(destination); return 'navigated'; },
      backOr: (fallback: unknown) => {
        if (mockRouter.canGoBack()) mockRouter.back();
        else mockRouter.replace(fallback);
        return 'navigated';
      },
      setParams: (params: unknown) => mockRouter.setParams(params),
      dispatchExternalNavigation: (intent: {
        kind: 'import-result' | 'resume-export';
        source: 'background' | 'notification' | 'export-ready';
        operationId?: string;
        provider?: string;
        readyVersion?: string;
        showDownloadSteps?: boolean;
      }) => {
        const destination = intent.kind === 'import-result'
          ? { pathname: '/import-result', params: { operationId: intent.operationId, returnTo: 'home' } }
          : {
            pathname: '/add-history',
            params: {
              intent: 'resume_export',
              provider: intent.provider,
              returnTo: 'home',
              ...(intent.readyVersion ? { downloadedVersion: intent.readyVersion } : {}),
              ...(intent.showDownloadSteps ? { showDownloadSteps: 'true' } : {}),
            },
          };
        if (intent.source === 'background') mockRouter.replace(destination);
        else mockRouter.navigate(destination);
        return 'navigated';
      },
      registerExternalBlocker: () => () => undefined,
    })),
    useExternalNavigationBlocker: jest.fn(),
  };
});

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('expo-status-bar', () => ({
  StatusBar: 'StatusBar',
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

// Mock Expo Constants for environment config
jest.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      extra: {
        apiUrl: process.env.EXPO_PUBLIC_API_URL || 'https://test-api.example.com',
        appEnv: process.env.EXPO_PUBLIC_APP_ENV || 'development',
      },
    },
  },
}));

// Cleanup intervals after all tests to prevent open handles
afterAll(async () => {
  // Cleanup rate limiter interval
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- Jest teardown must only load this stateful module if a test initialized it.
    const rateLimiterModule = require('@utils/rateLimiter');
    if (rateLimiterModule.destroyRateLimiter) {
      rateLimiterModule.destroyRateLimiter();
    }
  } catch {
    // Ignore errors if module is not loaded
  }
  
  // Give time for cleanup to complete
  await new Promise(resolve => setTimeout(resolve, 100));
});

// Navigation is inspected through callbacks without requiring a native stack.
jest.mock('@react-navigation/native', () => ({ ...jest.requireActual('@react-navigation/native'), usePreventRemove: jest.fn() }));
