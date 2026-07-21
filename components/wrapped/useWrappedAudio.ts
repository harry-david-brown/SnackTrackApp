/**
 * Ambient music bed for the Wrapped journey.
 *
 * - Loops a soft synth pad for the whole session (expo-av; the asset is a
 *   generated placeholder — swap assets/audio/wrapped-loop.wav for a licensed
 *   track without touching this hook).
 * - Respects the iOS silent switch (playsInSilentModeIOS stays false).
 * - Pauses when the app backgrounds, resumes on foreground.
 * - Mute toggle persists across sessions. Muting keeps the sound playing
 *   silently (setIsMutedAsync) so unmuting stays in sync with no restart.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MUTE_PREF_KEY = 'wrapped_audio_muted';

export function useWrappedAudio(): { isMuted: boolean; toggleMuted: () => void } {
  const soundRef = useRef<Audio.Sound | null>(null);
  const isMountedRef = useRef(true);
  const [isMuted, setIsMuted] = useState(false);
  const isMutedRef = useRef(isMuted);
  isMutedRef.current = isMuted;

  useEffect(() => {
    isMountedRef.current = true;

    const start = async () => {
      let muted = false;
      try {
        muted = (await AsyncStorage.getItem(MUTE_PREF_KEY)) === 'true';
      } catch {
        // Preference unavailable — default to audible.
      }
      if (!isMountedRef.current) {
        return;
      }
      setIsMuted(muted);

      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: false,
          staysActiveInBackground: false,
        });
        const { sound } = await Audio.Sound.createAsync(
          require('../../assets/audio/wrapped-loop.wav'),
          { isLooping: true, volume: 0.45, isMuted: muted }
        );
        if (!isMountedRef.current) {
          await sound.unloadAsync().catch(() => {});
          return;
        }
        soundRef.current = sound;
        await sound.playAsync();
      } catch {
        // Audio is a garnish — never let it break the journey.
      }
    };

    void start();

    const subscription = AppState.addEventListener('change', (state) => {
      const sound = soundRef.current;
      if (!sound) {
        return;
      }
      if (state === 'active') {
        sound.playAsync().catch(() => {});
      } else {
        sound.pauseAsync().catch(() => {});
      }
    });

    return () => {
      isMountedRef.current = false;
      subscription.remove();
      const sound = soundRef.current;
      soundRef.current = null;
      sound?.unloadAsync().catch(() => {});
    };
  }, []);

  const toggleMuted = useCallback(() => {
    const next = !isMutedRef.current;
    setIsMuted(next);
    soundRef.current?.setIsMutedAsync(next).catch(() => {});
    AsyncStorage.setItem(MUTE_PREF_KEY, String(next)).catch(() => {});
  }, []);

  return { isMuted, toggleMuted };
}
