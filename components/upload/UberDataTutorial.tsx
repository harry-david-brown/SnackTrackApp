import { usePreventRemove } from '@react-navigation/native';
import { Radius, type AppTheme } from '@constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  AppState,
  Image,
  ImageSourcePropType,
  Linking,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { showSimpleAlert } from '@utils/platformAlert';
import { resolveProviderTutorialEntry, type ProviderTutorialJob } from '@features/import-flow/providerTutorialEntry';
import { useAppTheme } from '@contexts/AppearanceContext';
import { PROVIDER_DOWNLOAD_STEPS } from './providerDownloadSteps';

export type DataPlatform = 'uber' | 'doordash';
export type DataTutorialMode = 'request' | 'download';

interface TutorialStep {
  title: string;
  description: string;
  image: ImageSourcePropType;
  imageLabel: string;
  fallback: string;
}

const REQUEST_STEPS: Record<DataPlatform, TutorialStep[]> = {
  uber: [
    {
      title: 'Sign in if Uber asks',
      description: 'Use the phone number, email, or sign-in method connected to your Uber Eats account.',
      image: require('../../assets/UberDataTutorialScreenshots/request-web/1.png'),
      imageLabel: 'Uber sign-in page asking for a phone number or email',
      fallback: 'If you’re already signed in, Uber may skip this page.',
    },
    {
      title: 'Find Additional data',
      description: 'On the “Your Uber data” page, scroll down until you see this dark section.',
      image: require('../../assets/UberDataTutorialScreenshots/request-web/2.png'),
      imageLabel: 'Your Uber data page with Request download highlighted under Additional data',
      fallback: 'Uber’s page may look slightly different. Look for the words “Request download.”',
    },
    {
      title: 'Tap “Request Your Data”',
      description: 'Uber will send you an email or text when the download is ready.',
      image: require('../../assets/UberDataTutorialScreenshots/request-web/3.png'),
      imageLabel: 'Uber Download your data page with Request Your Data highlighted',
      fallback: 'The final button opens Uber. You can return to these steps if you get stuck.',
    },
  ],
  doordash: [
    {
      title: 'Sign in if DoorDash asks',
      description: 'Use the phone number or sign-in method connected to your DoorDash account.',
      image: require('../../assets/DoorDashDataTutorialScreenshots/request-web/1.png'),
      imageLabel: 'DoorDash sign-in page asking for a phone number or social account',
      fallback: 'If you’re already signed in, DoorDash may skip this page.',
    },
    {
      title: 'Tap “Request Archive”',
      description: 'On Manage Account, find Account Data and request your archive.',
      image: require('../../assets/DoorDashDataTutorialScreenshots/request-web/2.png'),
      imageLabel: 'DoorDash Manage Account page with Request Archive highlighted',
      fallback: 'DoorDash’s page may look slightly different. Look for “Account Data” and “Request Archive.”',
    },
  ],
};

const platformDetailsForTheme = (theme: AppTheme) => ({
  uber: {
    name: 'Uber Eats',
    shortName: 'Uber',
    accent: theme.colors.uberDark,
    surface: theme.colors.successBg,
    icon: 'car-outline' as const,
    requestUrl: 'https://myprivacy.uber.com/privacy/exploreyourdata/download',
  },
  doordash: {
    name: 'DoorDash',
    shortName: 'DoorDash',
    accent: theme.colors.doorDash,
    surface: theme.colors.errorSurface,
    icon: 'bag-handle-outline' as const,
    requestUrl: 'https://www.doordash.com/consumer/privacy/manage_account',
  },
});

interface UberDataTutorialProps {
  mode?: DataTutorialMode;
  skipRequestOverview?: boolean;
  initialPlatform?: DataPlatform;
  providerStatuses?: Partial<Record<DataPlatform, string>>;
  entryJob?: ProviderTutorialJob;
  onRequestConfirmed: (platform: DataPlatform) => Promise<boolean>;
  onRequestNotSubmitted?: (platform: DataPlatform) => void;
  onOpenRequest?: (platform: DataPlatform) => Promise<void>;
  onStillWaiting?: (platform: DataPlatform) => void;
  onArchiveDownloaded?: (platform: DataPlatform) => void;
  onReadyConfirmed?: (platform: DataPlatform) => void;
  returnToParentOnBack?: boolean;
  onClose: () => void;
}

export default function UberDataTutorial({
  mode = 'request',
  skipRequestOverview = false,
  initialPlatform,
  providerStatuses,
  entryJob,
  onRequestConfirmed,
  onOpenRequest,
  onRequestNotSubmitted,
  onArchiveDownloaded,
  onReadyConfirmed,
  returnToParentOnBack = false,
  onClose,
}: UberDataTutorialProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const platformDetails = useMemo(() => platformDetailsForTheme(theme), [theme]);
  const [platform, setPlatform] = useState<DataPlatform>(initialPlatform ?? 'uber');
  const [hasChosenPlatform, setHasChosenPlatform] = useState(Boolean(initialPlatform));
  const initialProviderStatus = initialPlatform ? providerStatuses?.[initialPlatform] : undefined;
  const initialEntry = entryJob
    ? { job: entryJob, mode }
    : resolveProviderTutorialEntry(initialProviderStatus);
  const [tutorialMode, setTutorialMode] = useState<DataTutorialMode>(initialEntry.mode);
  const [activeJob, setActiveJob] = useState<ProviderTutorialJob>(initialEntry.job);
  const [showProviderOverview, setShowProviderOverview] = useState(Boolean(!skipRequestOverview && initialPlatform && initialEntry.mode === 'request' && initialEntry.job === 'request'));
  const [showProgressQuestion, setShowProgressQuestion] = useState(false);
  const [showRequestedQuestion, setShowRequestedQuestion] = useState(initialEntry.job === 'waiting');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [zoomedImage, setZoomedImage] = useState<TutorialStep | null>(null);
  const [awaitingVendorReturn, setAwaitingVendorReturn] = useState(false);
  const [showRequestConfirmation, setShowRequestConfirmation] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const confirmationInFlight = useRef(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const appState = useRef(AppState.currentState);
  const carouselRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  useEffect(() => {
    setPlatform(initialPlatform ?? 'uber');
    setHasChosenPlatform(Boolean(initialPlatform));
    const nextEntry = entryJob
      ? { job: entryJob, mode }
      : resolveProviderTutorialEntry(initialProviderStatus);
    setTutorialMode(nextEntry.mode);
    setActiveJob(nextEntry.job);
    setShowProviderOverview(Boolean(!skipRequestOverview && initialPlatform && nextEntry.mode === 'request' && nextEntry.job === 'request'));
    setShowProgressQuestion(false);
    setShowRequestedQuestion(nextEntry.job === 'waiting');
    setCurrentIndex(0);
    setAwaitingVendorReturn(false);
    setShowRequestConfirmation(false);
  }, [entryJob, initialPlatform, initialProviderStatus, mode, skipRequestOverview]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const returnedToApp = appState.current !== 'active' && nextState === 'active';
      appState.current = nextState;
      if (tutorialMode === 'request' && awaitingVendorReturn && returnedToApp) {
        setAwaitingVendorReturn(false);
        setShowRequestConfirmation(true);
      }
    });
    return () => subscription.remove();
  }, [awaitingVendorReturn, tutorialMode]);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => subscription.remove();
  }, []);

  const details = platformDetails[platform];
  const steps = tutorialMode === 'request' ? REQUEST_STEPS[platform] : PROVIDER_DOWNLOAD_STEPS[platform];
  const currentStep = steps[currentIndex];
  const isLastStep = currentIndex === steps.length - 1;
  const carouselImageHeight = Math.min(Math.max(windowHeight * 0.32, 220), 340);

  const choosePlatform = (nextPlatform: DataPlatform) => {
    const nextEntry = resolveProviderTutorialEntry(providerStatuses?.[nextPlatform]);
    setPlatform(nextPlatform);
    setCurrentIndex(0);
    setHasChosenPlatform(true);
    setTutorialMode(nextEntry.mode);
    setActiveJob(nextEntry.job);
    setShowProviderOverview(nextEntry.mode === 'request' && nextEntry.job === 'request');
    setShowProgressQuestion(false);
    setShowRequestedQuestion(nextEntry.job === 'waiting');
  };

  const showRequestedStatusQuestion = () => {
    setAwaitingVendorReturn(false);
    setShowRequestConfirmation(false);
    setShowProgressQuestion(false);
    setShowRequestedQuestion(true);
    setActiveJob('waiting');
  };

  const goToStep = (index: number) => {
    const nextIndex = Math.max(0, Math.min(index, steps.length - 1));
    setCurrentIndex(nextIndex);
    carouselRef.current?.scrollTo({ x: nextIndex * windowWidth, animated: !reduceMotion });
  };

  const handleCarouselSettled = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / windowWidth);
    setCurrentIndex(Math.max(0, Math.min(nextIndex, steps.length - 1)));
  };

  const goBack = () => {
    if (confirming) return;
    if (currentIndex > 0) {
      goToStep(currentIndex - 1);
    } else if (initialPlatform) {
      const returningFromDownloadGuide = tutorialMode === 'download';
      if (skipRequestOverview && returnToParentOnBack) { onClose(); return; }
      if (!returningFromDownloadGuide && activeJob === 'request') {
        setShowProviderOverview(true);
        return;
      }
      setTutorialMode('request');
      setShowProgressQuestion(!returningFromDownloadGuide);
      setShowRequestedQuestion(returningFromDownloadGuide);
      setActiveJob(returningFromDownloadGuide ? 'waiting' : activeJob);
    } else {
      setHasChosenPlatform(false);
    }
  };

  const goForward = () => {
    if (!isLastStep) {
      goToStep(currentIndex + 1);
      return;
    }
    if (tutorialMode === 'request') {
      setShowRequestConfirmation(true);
    } else {
      onArchiveDownloaded?.(platform);
      if (!onArchiveDownloaded) onClose();
    }
  };

  const confirmAcceptedRequest = async () => {
    if (confirmationInFlight.current) return;
    confirmationInFlight.current = true;
    setConfirming(true);
    try {
      const saved = await onRequestConfirmed(platform);
      if (saved) setShowRequestConfirmation(false);
    } catch {
      showSimpleAlert('Could not save your request', 'Please try saving again. Your request may still be with the delivery service.');
    } finally { confirmationInFlight.current = false; setConfirming(false); }
  };
  const confirmStillWaiting = () => { if (!confirmationInFlight.current) setShowRequestConfirmation(true); };

  const showCurrentStepHelp = () => {
    showSimpleAlert(
      `Can’t find this on ${details.shortName}?`,
      currentStep.fallback,
    );
  };

  const openVendorRequest = async () => {
    setAwaitingVendorReturn(true);
    try {
      if (onOpenRequest) await onOpenRequest(platform);
      else await Linking.openURL(details.requestUrl);
    } catch {
      setAwaitingVendorReturn(false);
      showSimpleAlert(
        'Could not open the request page',
        `Open ${details.name} and follow the steps shown here.`
      );
    }
  };

  if (!hasChosenPlatform) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.header}>
          <View style={styles.headerSpacer} />
          <Text style={styles.headerTitle}>
            {mode === 'request' ? 'Request your data' : 'Download and add'}
          </Text>
          <TouchableOpacity accessibilityLabel="Close tutorial" style={styles.headerButton} onPress={onClose}>
            <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.platformContent}>
          <Text style={styles.platformEyebrow}>
            {mode === 'request' ? 'GET THE FULL PICTURE' : 'YOUR HISTORY IS READY'}
          </Text>
          <Text style={styles.platformTitle}>
            {mode === 'request' ? 'Where do most of your orders live?' : 'Which history are you bringing in?'}
          </Text>
          <Text style={styles.platformBody}>
            {mode === 'request'
              ? 'Choose a provider to fill in missing orders and unlock richer statistics. We’ll guide you from here.'
              : 'Choose the provider that sent your archive and we’ll guide you through downloading and adding it.'}
          </Text>
          <View style={styles.platformStack}>
            {(Object.keys(platformDetails) as DataPlatform[]).map((option) => {
              const optionDetails = platformDetails[option];
              const providerStatus = providerStatuses?.[option];
              const statusDescription = providerStatus === 'completed'
                ? 'Imported — update with a newer archive'
                : providerStatus === 'requested'
                  ? 'Requested — check what to do next'
                  : providerStatus === 'file_ready'
                    ? 'Ready — continue to download and add'
                    : providerStatus === 'import_processing'
                      ? 'Import is processing'
                      : providerStatus === 'failed'
                        ? 'Needs attention — review or retry'
                        : mode === 'request' ? 'Show me the request steps' : 'Show me the download steps';
              return (
                <TouchableOpacity
                  key={option}
                  style={[styles.platformCard, { backgroundColor: optionDetails.surface }]}
                  onPress={() => choosePlatform(option)}
                  accessibilityRole="button"
                  accessibilityLabel={`Choose ${optionDetails.name}. ${statusDescription}`}
                >
                  <View style={[styles.platformIcon, { backgroundColor: optionDetails.accent }]}>
                    <Ionicons name={optionDetails.icon} size={25} color={theme.colors.white} />
                  </View>
                  <View style={styles.platformCardText}>
                    <Text style={styles.platformName}>{optionDetails.name}</Text>
                    <Text style={styles.platformDescription}>
                      {statusDescription}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={22} color={optionDetails.accent} />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    );
  }

  if (activeJob === 'processing') {
    return (
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.header}>
          <View style={styles.headerSpacer} />
          <View style={[styles.providerChip, { backgroundColor: details.surface }]}>
            <Text style={[styles.providerChipText, { color: details.accent }]}>{details.name}</Text>
          </View>
          <TouchableOpacity accessibilityLabel="Close tutorial" style={styles.headerButton} onPress={onClose}>
            <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.questionContent}>
          <Text style={[styles.platformEyebrow, { color: details.accent }]}>IMPORT IN PROGRESS</Text>
          <Text style={styles.platformTitle}>Your {details.name} archive is processing</Text>
          <Text style={styles.platformBody}>SnackTrack is adding this provider’s history. You do not need to add the file again.</Text>
          <TouchableOpacity style={[styles.primaryButton, { backgroundColor: details.accent }]} onPress={onClose} accessibilityRole="button">
            <Text style={styles.primaryButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (showRequestConfirmation) {
    return <ProviderRequestConfirmation platform={platform} onBack={() => setShowRequestConfirmation(false)} pending={confirming} onConfirm={() => { void confirmAcceptedRequest(); }} onShowSteps={() => { onRequestNotSubmitted?.(platform); setShowRequestConfirmation(false); }} />;
  }

  if (showProviderOverview) {
    const leaveOverview = () => {
      if (returnToParentOnBack) {
        onClose();
        return;
      }
      setShowProviderOverview(false);
      setHasChosenPlatform(false);
    };
    return (
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <TutorialHeader trailingLabel="PART 1 OF 3" onBack={leaveOverview} />
        <ScrollView contentContainerStyle={styles.overviewContent} showsVerticalScrollIndicator={false}>
          <View style={styles.decisionIcon}><Ionicons name="download-outline" size={30} color={theme.colors.primary} /></View>
          <Text style={styles.overviewEyebrow}>GET YOUR {details.name.toUpperCase()} DATA</Text>
          <Text style={styles.overviewTitle}>First, ask {details.name} for your history</Text>
          <Text style={styles.overviewBody}>We’ll show you exactly what to tap, then open {details.shortName}’s official data page.</Text>
          <View style={styles.overviewSurface}>
            <OverviewRow number="1" title="Follow the visual guide" body="A few short screens show you what to look for." />
            <OverviewRow divided number="2" title="Request your history" body={`Sign in to ${details.shortName} and submit the request.`} />
            <OverviewRow divided number="3" title="Come back when it’s ready" body={`Your place is saved while ${details.shortName} prepares it.`} />
          </View>
          <View style={styles.safeToLeaveNote}>
            <Ionicons name="shield-checkmark-outline" size={20} color={theme.colors.primary} />
            <Text style={styles.safeToLeaveText}>You’ll briefly leave SnackTrack. Your progress will stay saved.</Text>
          </View>
          <View style={styles.overviewActions}>
            <TouchableOpacity style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]} onPress={() => setShowProviderOverview(false)} accessibilityRole="button">
              <Text style={styles.primaryButtonText}>Start the guided request</Text>
              <Ionicons name="arrow-forward" size={21} color={theme.colors.white} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.notYetButton} onPress={showRequestedStatusQuestion} accessibilityRole="button">
              <Text style={styles.notYetText}>I already requested it</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  if (showProgressQuestion || showRequestedQuestion) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.header}>
          <TouchableOpacity
            accessibilityLabel="Go back"
            style={styles.headerButton}
            onPress={() => {
              if (showRequestedQuestion) {
                if (returnToParentOnBack && entryJob === 'waiting') {
                  onClose();
                  return;
                }
                setShowRequestedQuestion(false);
                setShowProgressQuestion(true);
              } else {
                setHasChosenPlatform(false);
                setShowProgressQuestion(false);
              }
            }}
          >
            <Ionicons name="arrow-back" size={23} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <View style={[styles.providerChip, { backgroundColor: details.surface }]}>
            <Text style={[styles.providerChipText, { color: details.accent }]}>{details.name}</Text>
          </View>
          <TouchableOpacity accessibilityLabel="Close tutorial" style={styles.headerButton} onPress={onClose}>
            <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.questionContent}>
          <Text style={[styles.platformEyebrow, { color: details.accent }]}>LET’S FIND YOUR NEXT STEP</Text>
          <Text style={styles.platformTitle}>
            {showRequestedQuestion ? 'Where are you in the process?' : 'Have you requested your data yet?'}
          </Text>
          <Text style={styles.platformBody}>
            {showRequestedQuestion
              ? `Choose the option that matches what happened with ${details.shortName}. We’ll take you to the right next step.`
              : 'No digging around for a file you do not have yet. We’ll only ask you to choose a file when it makes sense.'}
          </Text>
          <View style={styles.answerStack}>
            {showRequestedQuestion ? (
              <>
                <JourneyAnswer
                  icon="time-outline"
                  title={`I’m waiting for ${details.shortName}`}
                  description="I requested my data, but it isn’t ready yet."
                  accent={details.accent}
                  onPress={() => { void confirmStillWaiting(); }}
                />
                <JourneyAnswer
                  icon="mail-unread-outline"
                  title={`${details.shortName} said it’s ready`}
                  description="I received the email or notification."
                  accent={details.accent}
                  onPress={() => {
                    onReadyConfirmed?.(platform);
                    setActiveJob('download');
                    setTutorialMode('download');
                    setCurrentIndex(0);
                    setShowRequestedQuestion(false);
                  }}
                />
                {onArchiveDownloaded ? (
                  <JourneyAnswer
                    icon="checkmark-circle-outline"
                    title="I downloaded it"
                    description={`The ${details.shortName} download is saved on this device.`}
                    accent={details.accent}
                    onPress={() => onArchiveDownloaded(platform)}
                  />
                ) : null}
              </>
            ) : (
              <>
                <JourneyAnswer
                  icon="document-text-outline"
                  title="No, help me request it"
                  description={`Walk me through the official ${details.name} request.`}
                  accent={details.accent}
                  onPress={() => setShowProgressQuestion(false)}
                />
                <JourneyAnswer
                  icon="checkmark-circle-outline"
                  title="Yes, I already requested it"
                  description="Help me figure out what comes next."
                  accent={details.accent}
                  onPress={showRequestedStatusQuestion}
                />
              </>
            )}
          </View>
          {showRequestedQuestion ? (
            <TouchableOpacity
              style={styles.notYetButton}
              onPress={() => {
                setShowRequestedQuestion(false);
                setActiveJob('request');
                setTutorialMode('request');
                setShowProviderOverview(true);
              }}
              accessibilityRole="button"
            >
              <Text style={styles.notYetText}>I haven’t requested it yet</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <TutorialHeader providerName={details.name} onBack={goBack} />

      <View style={styles.carouselIntro}>
        <Text style={[styles.stepEyebrow, { color: details.accent }]}>
          {tutorialMode === 'request' ? 'REQUEST YOUR DATA' : 'DOWNLOAD YOUR DATA'}
        </Text>
        <Text style={styles.carouselTitle}>
          {tutorialMode === 'request'
            ? `Follow these steps on ${details.shortName}`
            : `Save your ${details.shortName} archive`}
        </Text>
        <Text style={styles.carouselBody}>Swipe or tap Next to move through each step.</Text>
        <View style={styles.carouselProgressRow}>
          <View style={styles.carouselDots}>
            {steps.map((step, index) => (
              <TouchableOpacity
                key={step.title}
                style={styles.carouselDotTarget}
                onPress={() => goToStep(index)}
                accessibilityRole="button"
                accessibilityLabel={`Show step ${index + 1}: ${step.title}`}
                accessibilityState={{ selected: index === currentIndex }}
              >
                <View style={[styles.carouselDot, index === currentIndex && styles.carouselDotActive]} />
              </TouchableOpacity>
            ))}
          </View>
          <Text
            style={styles.carouselCount}
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 1, max: steps.length, now: currentIndex + 1 }}
            accessibilityLiveRegion="polite"
          >
            {currentIndex + 1} of {steps.length}
          </Text>
        </View>
      </View>

      <ScrollView
        key={`${platform}-${tutorialMode}`}
        testID="provider-tutorial-carousel"
        ref={carouselRef}
        horizontal
        pagingEnabled
        directionalLockEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleCarouselSettled}
        style={styles.carousel}
        accessibilityLabel={`${details.name} ${tutorialMode} tutorial slides`}
      >
        {steps.map((step, index) => (
          <ScrollView
            key={step.title}
            style={{ width: windowWidth }}
            contentContainerStyle={styles.carouselSlideContent}
            showsVerticalScrollIndicator={false}
            accessibilityElementsHidden={index !== currentIndex}
            importantForAccessibility={index === currentIndex ? 'auto' : 'no-hide-descendants'}
          >
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.carouselImageButton}
              onPress={() => setZoomedImage(step)}
              accessibilityRole="imagebutton"
              accessibilityLabel={`${step.imageLabel}. Tap to enlarge.`}
            >
              <Image
                source={step.image}
                style={[styles.carouselScreenshot, { height: carouselImageHeight }]}
                resizeMode="contain"
                accessibilityIgnoresInvertColors
              />
              <View style={styles.zoomHint}>
                <Ionicons name="expand-outline" size={15} color={theme.colors.textSecondary} />
                <Text style={styles.zoomHintText}>Tap to enlarge</Text>
              </View>
            </TouchableOpacity>
            <Text style={styles.carouselStepTitle} accessibilityLiveRegion={index === currentIndex ? 'polite' : 'none'}>
              {step.title}
            </Text>
            <Text style={styles.carouselStepDescription}>{step.description}</Text>
            <View style={styles.stepFallback}>
              <Ionicons name="information-circle-outline" size={18} color={theme.colors.primary} />
              <Text style={styles.stepFallbackText}>{step.fallback}</Text>
            </View>
          </ScrollView>
        ))}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}
          onPress={isLastStep && tutorialMode === 'request' ? openVendorRequest : goForward}
          accessibilityRole={isLastStep && tutorialMode === 'request' ? 'link' : 'button'}
          accessibilityLabel={isLastStep && tutorialMode === 'request' ? `Open ${details.name} website to submit the data request` : undefined}
        >
          <Text style={styles.primaryButtonText}>
            {isLastStep
              ? tutorialMode === 'request'
                ? `Open ${details.shortName}’s data page`
                : 'I downloaded the ZIP'
              : 'Next'}
          </Text>
          <Ionicons name={isLastStep && tutorialMode === 'request' ? 'open-outline' : isLastStep ? 'checkmark' : 'arrow-forward'} size={21} color={theme.colors.white} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.notYetButton} onPress={showCurrentStepHelp} accessibilityRole="button">
          <Text style={styles.notYetText}>I can’t find this</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={Boolean(zoomedImage)} transparent animationType="fade" onRequestClose={() => setZoomedImage(null)}>
        <View style={styles.zoomBackdrop}>
          <TouchableOpacity style={[styles.zoomClose, { top: insets.top + 12 }]} onPress={() => setZoomedImage(null)}>
            <Ionicons name="close" size={28} color={theme.colors.white} />
          </TouchableOpacity>
          {zoomedImage ? (
            <Image source={zoomedImage.image} style={styles.zoomedImage} resizeMode="contain" />
          ) : null}
        </View>
      </Modal>

    </View>
  );
}

export function ProviderRequestConfirmation({ platform, onBack, onConfirm, onShowSteps, showStepsLabel = 'Check the last step again', pending = false }: {
  platform: DataPlatform;
  onBack: () => void;
  onConfirm: () => void;
  onShowSteps: () => void;
  showStepsLabel?: string;
  pending?: boolean;
}) {
  usePreventRemove(pending, () => showSimpleAlert('Saving your progress', 'Please wait for the request to be saved.'));
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const details = platformDetailsForTheme(theme)[platform];
  return (
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <TutorialHeader providerName={details.name} onBack={() => { if (!pending) onBack(); }} />
        <ScrollView contentContainerStyle={styles.decisionContent} showsVerticalScrollIndicator={false}>
          <View style={styles.decisionIcon}><Ionicons name="clipboard-outline" size={30} color={theme.colors.primary} /></View>
          <Text accessibilityRole="header" style={styles.decisionTitle}>Was your data request submitted?</Text>
          <Text style={styles.decisionBody}>If {details.shortName} showed a confirmation that your request was submitted, you can continue.</Text>
          {platform === 'uber' ? (
            <View style={[styles.decisionSurface, styles.requestEmailCard]}>
              <View style={styles.requestEmailHeading}>
                <Ionicons name="mail-outline" size={22} color={theme.colors.primary} />
                <Text accessibilityRole="header" style={styles.requestEmailTitle}>Want to double-check?</Text>
              </View>
              <Text style={styles.requestEmailBody}>Look for a confirmation email from Uber with the subject:</Text>
              <View style={styles.requestEmailSubjectSurface}>
                <Text style={styles.requestEmailSubjectLabel}>EMAIL SUBJECT</Text>
                <Text selectable style={styles.requestEmailSubject}>Uber data request received</Text>
              </View>
              <Text style={styles.requestEmailBody}>This confirms Uber received your request. A separate email will tell you when your data is ready to download.</Text>
            </View>
          ) : (
            <View style={styles.decisionSurface}>
              <DecisionRow icon="checkmark-circle-outline" title="What success looks like" body={`${details.shortName} confirms the request and says it will notify you when the data is ready.`} />
            </View>
          )}
          <View style={styles.decisionActions}>
            <TouchableOpacity style={styles.primaryButton} onPress={onConfirm} disabled={pending} accessibilityState={{ busy: pending, disabled: pending }} accessibilityRole="button">
              <Text style={styles.primaryButtonText}>{pending ? 'Saving your progress…' : 'Yes, my request was submitted'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={onShowSteps} disabled={pending} accessibilityRole="button">
              <Text style={styles.secondaryButtonText}>{showStepsLabel}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
  );
}

function TutorialHeader({ providerName, trailingLabel, onBack }: { providerName?: string; trailingLabel?: string; onBack: () => void }) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={styles.journeyHeader}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" style={styles.journeyBack} onPress={onBack}>
        <Ionicons name="arrow-back" size={22} color={theme.colors.primary} />
        <Text style={styles.journeyBackText}>Back</Text>
      </TouchableOpacity>
      {providerName ? <View style={styles.providerChip}><Text style={styles.journeyChipText}>{providerName}</Text></View> : <Text style={styles.journeyStepLabel}>{trailingLabel}</Text>}
    </View>
  );
}

function DecisionRow({ icon, title, body, divided = false }: { icon: React.ComponentProps<typeof Ionicons>['name']; title: string; body: string; divided?: boolean }) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={[styles.decisionRow, divided && styles.decisionRowDivided]}>
      <Ionicons name={icon} size={22} color={theme.colors.primary} />
      <View style={styles.decisionRowCopy}><Text style={styles.decisionRowTitle}>{title}</Text><Text style={styles.decisionRowBody}>{body}</Text></View>
    </View>
  );
}

function JourneyAnswer({
  icon,
  title,
  description,
  accent,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  description: string;
  accent: string;
  onPress: () => void;
}) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <TouchableOpacity
      style={styles.answerCard}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${description}`}
    >
      <View style={[styles.answerIcon, { backgroundColor: theme.colors.alpha(accent, 0.1) }]}>
        <Ionicons name={icon} size={24} color={accent} />
      </View>
      <View style={styles.answerText}>
        <Text style={styles.answerTitle}>{title}</Text>
        <Text style={styles.answerDescription}>{description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={22} color={accent} />
    </TouchableOpacity>
  );
}

function OverviewRow({ number, title, body, divided = false }: { number: string; title: string; body: string; divided?: boolean }) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={[styles.overviewRow, divided && styles.overviewRowDivided]}>
      <View style={styles.overviewNumber}><Text style={styles.overviewNumberText}>{number}</Text></View>
      <View style={styles.overviewRowCopy}>
        <Text style={styles.overviewRowTitle}>{title}</Text>
        <Text style={styles.overviewRowBody}>{body}</Text>
      </View>
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
    backgroundColor: theme.colors.surface,
  },
  headerButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerSpacer: { width: 44 },
  headerTitle: { fontSize: 17, fontWeight: '600', color: theme.colors.textPrimary },
  overviewContent: { flexGrow: 1, paddingHorizontal: 18, paddingBottom: 20 },
  overviewEyebrow: { marginTop: 2, color: theme.colors.primary, fontSize: 12, fontWeight: '500', letterSpacing: 1.1 },
  overviewTitle: { marginTop: 6, color: theme.colors.textPrimary, fontSize: 28, lineHeight: 31, fontWeight: '500', letterSpacing: -0.4 },
  overviewBody: { marginTop: 9, color: theme.colors.textSecondary, fontSize: 15, lineHeight: 22 },
  overviewSurface: { marginTop: 18, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 5, borderRadius: Radius.card, borderWidth: 1, borderColor: theme.colors.divider, backgroundColor: theme.colors.surface, ...theme.shadows.card },
  overviewRow: { minHeight: 68, flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 11 },
  overviewRowDivided: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.divider },
  overviewNumber: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: theme.colors.chipActiveBg },
  overviewNumberText: { color: theme.colors.primary, fontSize: 14, fontWeight: '500' },
  overviewRowCopy: { flex: 1 },
  overviewRowTitle: { color: theme.colors.textPrimary, fontSize: 14, lineHeight: 18, fontWeight: '500' },
  overviewRowBody: { marginTop: 3, color: theme.colors.textSecondary, fontSize: 12, lineHeight: 16 },
  overviewActions: { marginTop: 'auto', gap: 8, paddingTop: 18 },
  safeToLeaveNote: { marginTop: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 9, padding: 13, borderRadius: Radius.input, backgroundColor: theme.colors.successBg },
  safeToLeaveText: { flex: 1, color: theme.colors.textSecondary, fontSize: 13, lineHeight: 18 },
  providerChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 13, paddingVertical: 8, borderRadius: 999, backgroundColor: theme.colors.successBg },
  providerChipText: { fontSize: 14, fontWeight: '500' },
  platformContent: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, paddingBottom: 40 },
  platformEyebrow: { color: theme.colors.primary, fontSize: 12, fontWeight: '500', letterSpacing: 1.1, textAlign: 'center' },
  platformTitle: { marginTop: 10, color: theme.colors.textPrimary, fontSize: 31, lineHeight: 37, fontWeight: '600', letterSpacing: -0.4, textAlign: 'center' },
  platformBody: { marginTop: 12, color: theme.colors.textSecondary, fontSize: 16, lineHeight: 23, textAlign: 'center' },
  platformStack: { marginTop: 30, gap: 14 },
  questionContent: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, paddingBottom: 30 },
  answerStack: { marginTop: 28, gap: 12 },
  answerCard: { minHeight: 82, flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: Radius.card, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.divider, ...theme.shadows.card },
  answerIcon: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  answerText: { flex: 1, marginHorizontal: 13 },
  answerTitle: { color: theme.colors.textPrimary, fontSize: 16, lineHeight: 21, fontWeight: '600' },
  answerDescription: { marginTop: 3, color: theme.colors.textSecondary, fontSize: 13, lineHeight: 18 },
  platformCard: { minHeight: 84, flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: Radius.card, ...theme.shadows.card },
  platformIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  platformCardText: { flex: 1, marginHorizontal: 14 },
  platformName: { color: theme.colors.textPrimary, fontSize: 18, fontWeight: '600' },
  platformDescription: { marginTop: 3, color: theme.colors.textSecondary, fontSize: 14 },
  stepEyebrow: { fontSize: 11, fontWeight: '500', letterSpacing: 0.9 },
  carouselIntro: { paddingHorizontal: 18, paddingTop: 4 },
  carouselTitle: { marginTop: 6, color: theme.colors.textPrimary, fontSize: 28, lineHeight: 31, fontWeight: '500', letterSpacing: -0.4 },
  carouselBody: { marginTop: 7, color: theme.colors.textSecondary, fontSize: 14, lineHeight: 20 },
  carouselProgressRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  carouselDots: { flexDirection: 'row', alignItems: 'center' },
  carouselDotTarget: { width: 32, height: 44, alignItems: 'center', justifyContent: 'center' },
  carouselDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.gray200 },
  carouselDotActive: { width: 22, backgroundColor: theme.colors.primary },
  carouselCount: { color: theme.colors.textSecondary, fontSize: 12, lineHeight: 16, fontWeight: '500' },
  carousel: { flex: 1 },
  carouselSlideContent: { paddingHorizontal: 18, paddingBottom: 16 },
  carouselImageButton: { alignItems: 'center', padding: 9, borderRadius: Radius.card, borderWidth: 1, borderColor: theme.colors.divider, backgroundColor: theme.colors.surface, ...theme.shadows.card },
  carouselScreenshot: { width: '100%', borderRadius: 14, backgroundColor: theme.colors.white },
  carouselStepTitle: { marginTop: 14, color: theme.colors.textPrimary, fontSize: 20, lineHeight: 24, fontWeight: '500', letterSpacing: -0.2 },
  carouselStepDescription: { marginTop: 4, color: theme.colors.textSecondary, fontSize: 14, lineHeight: 20 },
  zoomHint: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 9 },
  zoomHintText: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '500' },
  stepFallback: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 11 },
  stepFallbackText: { flex: 1, color: theme.colors.textSecondary, fontSize: 12, lineHeight: 17 },
  footer: { paddingTop: 10, paddingHorizontal: 18, backgroundColor: theme.colors.background },
  primaryButton: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, borderRadius: Radius.button, backgroundColor: theme.colors.primary },
  primaryButtonText: { color: theme.colors.white, fontSize: 14, fontWeight: '500' },
  secondaryButton: { minHeight: 52, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, borderRadius: Radius.button, borderWidth: 1, borderColor: theme.colors.buttonSecondaryBorder, backgroundColor: theme.colors.surface },
  secondaryButtonText: { color: theme.colors.buttonSecondaryText, fontSize: 14, fontWeight: '500', textAlign: 'center' },
  notYetButton: { alignItems: 'center', paddingTop: 13, paddingBottom: 2 },
  notYetText: { color: theme.colors.textSecondary, fontSize: 15, fontWeight: '500' },
  zoomBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: theme.colors.alpha(theme.colors.black, 0.94) },
  zoomClose: { position: 'absolute', right: 16, zIndex: 1, width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24, backgroundColor: theme.colors.alpha(theme.colors.white, 0.14) },
  zoomedImage: { width: '100%', height: '88%' },
  journeyHeader: { minHeight: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18 },
  journeyBack: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 7, paddingRight: 8 },
  journeyBackText: { color: theme.colors.primary, fontSize: 14, fontWeight: '500' },
  journeyChipText: { color: theme.colors.primary, fontSize: 12, fontWeight: '500' },
  journeyStepLabel: { color: theme.colors.textSecondary, fontSize: 11, fontWeight: '500', letterSpacing: 0.8 },
  decisionContent: { flexGrow: 1, alignItems: 'center', paddingHorizontal: 18, paddingBottom: 22 },
  decisionIcon: { width: 66, height: 66, alignItems: 'center', justifyContent: 'center', borderRadius: 22, marginTop: 8, marginBottom: 16, backgroundColor: theme.colors.successBg },
  decisionTitle: { maxWidth: 350, marginTop: 6, color: theme.colors.textPrimary, fontSize: 28, lineHeight: 31, fontWeight: '500', letterSpacing: -0.5, textAlign: 'center' },
  decisionBody: { maxWidth: 340, marginTop: 9, color: theme.colors.textSecondary, fontSize: 15, lineHeight: 22, textAlign: 'center' },
  decisionSurface: { alignSelf: 'stretch', marginTop: 18, paddingHorizontal: 16, paddingVertical: 4, borderRadius: Radius.card, borderWidth: 1, borderColor: theme.colors.divider, backgroundColor: theme.colors.surface, ...theme.shadows.card },
  requestEmailCard: { paddingHorizontal: 16, paddingVertical: 16, gap: 12, shadowOpacity: 0, elevation: 0 },
  requestEmailHeading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  requestEmailTitle: { flex: 1, color: theme.colors.textPrimary, fontSize: 16, lineHeight: 20, fontWeight: '500' },
  requestEmailBody: { color: theme.colors.textSecondary, fontSize: 13, lineHeight: 18 },
  requestEmailSubjectSurface: { padding: 14, gap: 8, borderRadius: Radius.input, backgroundColor: theme.colors.successBg },
  requestEmailSubjectLabel: { color: theme.colors.primary, fontSize: 12, lineHeight: 16, fontWeight: '500', letterSpacing: 1 },
  requestEmailSubject: { color: theme.colors.textPrimary, fontSize: 16, lineHeight: 22, fontWeight: '500' },
  decisionRow: { minHeight: 72, flexDirection: 'row', alignItems: 'flex-start', gap: 11, paddingVertical: 14 },
  decisionRowDivided: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.divider },
  decisionRowCopy: { flex: 1 },
  decisionRowTitle: { color: theme.colors.textPrimary, fontSize: 14, lineHeight: 18, fontWeight: '500' },
  decisionRowBody: { marginTop: 3, color: theme.colors.textSecondary, fontSize: 12, lineHeight: 16 },
  decisionActions: { alignSelf: 'stretch', marginTop: 'auto', gap: 9, paddingTop: 24 },
});
