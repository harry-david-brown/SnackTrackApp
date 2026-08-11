import { Colors, Radius, Shadows } from '@/constants/theme';
import React, { PropsWithChildren, useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MascotPlaceholder, MascotPose } from '../mascot/MascotPlaceholder';
import {
  AppAlertButton,
  AppAlertRequest,
  setAppAlertPresenter,
} from '../../utils/appAlert';

type AlertTone = 'error' | 'success' | 'warning' | 'info';

const includesAny = (value: string, words: string[]) =>
  words.some((word) => value.includes(word));

const getAlertTone = (request: AppAlertRequest): AlertTone => {
  const text = `${request.title} ${request.message ?? ''}`.toLowerCase();

  if (
    includesAny(text, [
      'error',
      'fail',
      'unable',
      'could not',
      "couldn't",
      'wrong',
      'invalid',
      'unavailable',
      'no internet',
      'not saved',
    ])
  ) {
    return 'error';
  }
  if (
    includesAny(text, [
      'success',
      'saved',
      'verified',
      'cleared',
      'deleted',
      'permission saved',
    ])
  ) {
    return 'success';
  }
  if (
    request.buttons.some((button) => button.style === 'destructive') ||
    includesAny(text, ['delete', 'disconnect', 'clear', 'reset', 'sign out', 'turn off'])
  ) {
    return 'warning';
  }
  return 'info';
};

const TONE_DETAILS: Record<
  AlertTone,
  { eyebrow: string; mascotPose: MascotPose; accent: string; surface: string }
> = {
  error: {
    eyebrow: 'Something went wrong',
    mascotPose: 'sad',
    accent: Colors.error,
    surface: Colors.errorSurface,
  },
  success: {
    eyebrow: 'All set',
    mascotPose: 'wink',
    accent: Colors.successDark,
    surface: Colors.successSurface,
  },
  warning: {
    eyebrow: 'Just checking',
    mascotPose: 'sheepish',
    accent: Colors.warningDeep,
    surface: Colors.warningSurface,
  },
  info: {
    eyebrow: 'SnackTrack',
    mascotPose: 'thinking',
    accent: Colors.primary,
    surface: Colors.infoBg,
  },
};

export function AppAlertProvider({ children }: PropsWithChildren) {
  const [queue, setQueue] = useState<AppAlertRequest[]>([]);
  const activeAlert = queue[0];

  useEffect(
    () =>
      setAppAlertPresenter((request) => {
        setQueue((currentQueue) => [...currentQueue, request]);
      }),
    []
  );

  const details = TONE_DETAILS[
    useMemo(() => (activeAlert ? getAlertTone(activeAlert) : 'info'), [activeAlert])
  ];

  const dismiss = (button?: AppAlertButton) => {
    setQueue((currentQueue) => currentQueue.slice(1));
    if (button?.onPress) {
      requestAnimationFrame(() => button.onPress?.());
    }
  };

  const cancelButton = activeAlert?.buttons.find((button) => button.style === 'cancel');

  return (
    <>
      {children}
      <Modal
        visible={Boolean(activeAlert)}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => dismiss(cancelButton)}
      >
        <View style={styles.backdrop}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss dialog"
            style={StyleSheet.absoluteFill}
            onPress={() => {
              if (cancelButton) dismiss(cancelButton);
            }}
          />
          {activeAlert ? (
            <View
              accessibilityRole="alert"
              accessibilityLabel={`${activeAlert.title}. ${activeAlert.message ?? ''}`}
              style={styles.card}
            >
              <View style={[styles.mascotSurface, { backgroundColor: details.surface }]}>
                <MascotPlaceholder pose={details.mascotPose} size={92} hideLabel />
              </View>
              <Text style={[styles.eyebrow, { color: details.accent }]}>
                {details.eyebrow}
              </Text>
              <Text style={styles.title}>{activeAlert.title}</Text>
              {activeAlert.message ? (
                <Text style={styles.message}>{activeAlert.message}</Text>
              ) : null}
              <View style={styles.actions}>
                {activeAlert.buttons.map((button, index) => {
                  const isPrimary =
                    button.style !== 'cancel' &&
                    (activeAlert.buttons.length === 1 ||
                      index === activeAlert.buttons.length - 1);
                  return (
                    <TouchableOpacity
                      key={`${button.text}-${index}`}
                      accessibilityRole="button"
                      style={[
                        styles.button,
                        isPrimary ? styles.primaryButton : styles.secondaryButton,
                        button.style === 'destructive' && styles.destructiveButton,
                      ]}
                      onPress={() => dismiss(button)}
                    >
                      <Text
                        style={[
                          styles.buttonText,
                          isPrimary ? styles.primaryButtonText : styles.secondaryButtonText,
                        ]}
                      >
                        {button.text}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ) : null}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: Colors.alpha(Colors.black, 0.56),
  },
  card: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    borderRadius: Radius.card,
    backgroundColor: Colors.surface,
    ...Shadows.card,
  },
  mascotSurface: {
    width: 112,
    height: 112,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderRadius: 56,
  },
  eyebrow: {
    marginBottom: 6,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 23,
    fontWeight: '800',
    lineHeight: 29,
    textAlign: 'center',
  },
  message: {
    marginTop: 10,
    color: Colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  actions: {
    width: '100%',
    gap: 10,
    marginTop: 22,
  },
  button: {
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    borderRadius: Radius.button,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
  },
  destructiveButton: {
    backgroundColor: Colors.error,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: Colors.buttonSecondaryBorder,
    backgroundColor: Colors.surface,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  primaryButtonText: {
    color: Colors.buttonPrimaryText,
  },
  secondaryButtonText: {
    color: Colors.buttonSecondaryText,
  },
});
