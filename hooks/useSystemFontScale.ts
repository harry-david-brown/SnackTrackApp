import { useSyncExternalStore } from 'react';
import { DeviceEventEmitter, Dimensions, NativeModules, Platform } from 'react-native';

export const androidTextSize: { getFontScale(): number; toDp(sp: number): number } | undefined =
  Platform.OS === 'android' ? NativeModules.AndroidTextSize : undefined;

let currentScale = androidTextSize?.getFontScale() ?? Dimensions.get('window').fontScale;
const listeners = new Set<() => void>();
let subscription: { remove(): void } | undefined;

function update(scale: number) {
  if (scale === currentScale) return;
  currentScale = scale;
  listeners.forEach(listener => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!subscription) {
    subscription = androidTextSize
      ? DeviceEventEmitter.addListener('androidTextScaleChanged', update)
      : Dimensions.addEventListener('change', ({ window }) => update(window.fontScale));
    update(androidTextSize?.getFontScale() ?? Dimensions.get('window').fontScale);
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size) {
      subscription?.remove();
      subscription = undefined;
    }
  };
}

const snapshot = () => currentScale;
export const useSystemFontScale = () => useSyncExternalStore(subscribe, snapshot, snapshot);
