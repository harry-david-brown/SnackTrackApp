import React from 'react';
import { act, render, waitFor } from '@testing-library/react-native';
import { AdsConsent, NativeAd, NativeAdEventType } from 'react-native-google-mobile-ads';
import { DashboardAdPlacement } from './DashboardAdPlacement';
import { trackAdminEvent } from '@services/adminAnalytics';

jest.mock('@services/adminAnalytics', () => ({ trackAdminEvent: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@config/env', () => ({
  getConfig: () => ({
    isProduction: false,
    admobNativeIosAdUnitId: undefined,
    admobNativeAndroidAdUnitId: undefined,
  }),
}));

const consent = AdsConsent.gatherConsent as jest.Mock;
const createAd = NativeAd.createForAdRequest as jest.Mock;
const track = trackAdminEvent as jest.Mock;

const ad = () => {
  const listeners = new Map<string, (payload?: any) => void>();
  return {
    headline: 'A useful offer',
    advertiser: 'Example advertiser',
    body: 'Optional sponsored copy',
    callToAction: 'Learn more',
    icon: null,
    destroy: jest.fn(),
    addAdEventListener: jest.fn((event: string, listener: (payload?: any) => void) => {
      listeners.set(event, listener);
      return { remove: jest.fn() };
    }),
    listeners,
  };
};

describe('DashboardAdPlacement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    consent.mockResolvedValue({ canRequestAds: true });
  });

  it('shows no reserved space until loaded and records an SDK impression only once', async () => {
    const nativeAd = ad();
    createAd.mockResolvedValue(nativeAd);
    const onImpression = jest.fn();
    const screen = render(<DashboardAdPlacement
      placement="dashboard_after_insights"
      configurationVersion={7}
      onImpression={onImpression}
    />);

    expect(screen.queryByText('SPONSORED')).toBeNull();
    await waitFor(() => expect(screen.getByText('SPONSORED')).toBeTruthy());
    expect(track).toHaveBeenCalledWith('ad_request_started', expect.any(Object));
    expect(track).toHaveBeenCalledWith('ad_loaded', expect.any(Object));

    act(() => {
      nativeAd.listeners.get(NativeAdEventType.IMPRESSION)?.();
      nativeAd.listeners.get(NativeAdEventType.IMPRESSION)?.();
    });
    expect(onImpression).toHaveBeenCalledTimes(1);
    expect(track.mock.calls.filter(([name]) => name === 'ad_impression')).toHaveLength(1);

    screen.unmount();
    expect(nativeAd.destroy).toHaveBeenCalledTimes(1);
  });

  it('fails closed without an ad request when consent disallows ads', async () => {
    consent.mockResolvedValue({ canRequestAds: false });
    const screen = render(<DashboardAdPlacement
      placement="history_after_fifth_order"
      configurationVersion={8}
      onImpression={jest.fn()}
    />);

    await waitFor(() => expect(consent).toHaveBeenCalled());
    expect(createAd).not.toHaveBeenCalled();
    expect(screen.toJSON()).toBeNull();
  });

  it('reports a sanitized load failure and keeps the dashboard empty', async () => {
    createAd.mockRejectedValue({ code: 'network/error.url' });
    const screen = render(<DashboardAdPlacement
      placement="history_after_fifth_order"
      configurationVersion={9}
      onImpression={jest.fn()}
    />);

    await waitFor(() => expect(track).toHaveBeenCalledWith('ad_load_failed', {
      properties: expect.objectContaining({ errorCode: 'NETWORK_ERROR_URL' }),
    }));
    expect(screen.toJSON()).toBeNull();
  });
});
