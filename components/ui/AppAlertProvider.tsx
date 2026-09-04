import { FontFamily, Radius, type AppTheme } from '@constants/theme';
import React, { PropsWithChildren, useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Mascot, MascotPose } from '@components/mascot/Mascot';
import { useAppTheme } from '@contexts/AppearanceContext';
import { AppText } from './AppText';
import {
  AppAlertButton,
  AppAlertRequest,
  setAppAlertPresenter,
} from '@utils/appAlert';

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

const toneDetails = (theme: AppTheme): Record<
  AlertTone,
  { eyebrow: string; mascotPose: MascotPose; accent: string; surface: string }
> => ({
  error: {
    eyebrow: 'Something went wrong',
    mascotPose: 'sad',
    accent: theme.colors.error,
    surface: theme.colors.errorSurface,
  },
  success: {
    eyebrow: 'All set',
    mascotPose: 'wink',
    accent: theme.colors.successDark,
    surface: theme.colors.successSurface,
  },
  warning: {
    eyebrow: 'Just checking',
    mascotPose: 'sheepish',
    accent: theme.colors.warningDeep,
    surface: theme.colors.warningSurface,
  },
  info: {
    eyebrow: 'SnackTrack',
    mascotPose: 'thinking',
    accent: theme.colors.primary,
    surface: theme.colors.infoBg,
  },
});

export function AppAlertProvider({ children }: PropsWithChildren) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [queue, setQueue] = useState<AppAlertRequest[]>([]);
  const activeAlert = queue[0];

  useEffect(
    () =>
      setAppAlertPresenter((request) => {
        setQueue((currentQueue) => [...currentQueue, request]);
      }),
    []
  );

  const details = toneDetails(theme)[
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
                <Mascot pose={details.mascotPose} size={92} accessibilityLabel={`SnackTrack mascot (${details.mascotPose})`} />
              </View>
              <AppText variant="eyebrow" style={[styles.eyebrow, { color: details.accent }]}>
                {details.eyebrow}
              </AppText>
              <AppText variant="pageTitle" style={styles.title}>{activeAlert.title}</AppText>
              {activeAlert.message ? (
                <AppText variant="body" style={styles.message}>{activeAlert.message}</AppText>
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
                      <AppText
                        variant="button"
                        style={[
                          styles.buttonText,
                          isPrimary ? styles.primaryButtonText : styles.secondaryButtonText,
                        ]}
                      >
                        {button.text}
                      </AppText>
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

const createStyles = (theme: AppTheme) => StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: theme.colors.alpha(theme.colors.black, 0.56),
  },
  card: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    borderRadius: Radius.card,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.card,
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
  },
  title: {
    textAlign: 'center',
  },
  message: {
    marginTop: 10,
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
    backgroundColor: theme.colors.primary,
  },
  destructiveButton: {
    backgroundColor: theme.colors.error,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: theme.colors.buttonSecondaryBorder,
    backgroundColor: theme.colors.surface,
  },
  buttonText: {
    fontFamily: FontFamily.medium,
    textAlign: 'center',
  },
  primaryButtonText: {
    color: theme.colors.buttonPrimaryText,
  },
  secondaryButtonText: {
    color: theme.colors.buttonSecondaryText,
  },
});
