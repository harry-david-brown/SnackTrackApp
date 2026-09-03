import * as Haptics from 'expo-haptics';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { useCallback, useEffect, useRef } from 'react';
import type ViewShot from 'react-native-view-shot';
import { showAlert } from '@utils/platformAlert';
import { trackAdminEvent } from '@services/adminAnalytics';

export function useWrappedSharing(targetIndex: number, cacheVersion: unknown) {
  const captureRef = useRef<ViewShot | null>(null);
  const imageCache = useRef<Map<number, string>>(new Map());

  useEffect(() => {
    imageCache.current.clear();
  }, [cacheVersion]);

  const captureImage = useCallback(async (): Promise<string | null> => {
    const cached = imageCache.current.get(targetIndex);
    if (cached) return cached;
    const uri = await captureRef.current?.capture?.();
    if (uri) imageCache.current.set(targetIndex, uri);
    return uri ?? null;
  }, [targetIndex]);

  useEffect(() => {
    if (imageCache.current.has(targetIndex)) return;
    const timer = setTimeout(() => {
      void captureImage().catch(() => undefined);
    }, 400);
    return () => clearTimeout(timer);
  }, [captureImage, targetIndex]);

  const share = useCallback(async function retryableShare(): Promise<void> {
    void trackAdminEvent('wrapped_share_tapped').catch(() => undefined);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    try {
      const uri = await captureImage();
      if (!uri) throw new Error('Share image capture failed');
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share your SnackTrack Wrapped' });
        void trackAdminEvent('wrapped_share_completed', { properties: { method: 'system_share' } }).catch(() => undefined);
      } else {
        void trackAdminEvent('wrapped_share_failed', { properties: { errorCode: 'sharing_unavailable' } }).catch(() => undefined);
        showAlert('Sharing unavailable', "Sharing isn't supported on this device.");
      }
    } catch {
      void trackAdminEvent('wrapped_share_failed', { properties: { errorCode: 'share_failed' } }).catch(() => undefined);
      showAlert('Sharing failed', "Couldn't create your share image.", [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Try Again', onPress: () => void retryableShare() },
      ]);
    }
  }, [captureImage]);

  const saveToPhotos = useCallback(async function retryableSave(): Promise<void> {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    try {
      const { granted } = await MediaLibrary.requestPermissionsAsync(true);
      if (!granted) {
        showAlert('Permission needed', 'Allow photo access to save your Wrapped card.');
        return;
      }
      const uri = await captureImage();
      if (!uri) throw new Error('Share image capture failed');
      await MediaLibrary.saveToLibraryAsync(uri);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      showAlert('Saved', 'Your Wrapped card is in your Photos.');
    } catch {
      showAlert('Save failed', "Couldn't save the image to your Photos.", [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Try Again', onPress: () => void retryableSave() },
      ]);
    }
  }, [captureImage]);

  return { captureRef, share, saveToPhotos };
}
