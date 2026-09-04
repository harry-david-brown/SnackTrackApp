import { Radius, type AppTheme } from '@constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  Image,
  ImageSourcePropType,
  Linking,
  Modal,
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

export type DataPlatform = 'uber' | 'doordash';
export type DataTutorialMode = 'request' | 'download';

interface TutorialStep {
  title: string;
  description: string;
  image: ImageSourcePropType;
  imageLabel: string;
}

const REQUEST_STEPS: Record<DataPlatform, TutorialStep[]> = {
  uber: [
    {
      title: 'Sign in on Uber’s website',
      description: 'The button on the final step opens Uber’s website directly to the data-request page. Sign in there with the account you use for Uber Eats—do not open the Uber app.',
      image: require('../../assets/UberDataTutorialScreenshots/request-web/1.png'),
      imageLabel: 'Uber sign-in page asking for a phone number or email',
    },
    {
      title: 'Find Additional data',
      description: 'After signing in through our link, scroll down on the Your Uber data page. Under Additional data, tap Request download.',
      image: require('../../assets/UberDataTutorialScreenshots/request-web/2.png'),
      imageLabel: 'Your Uber data page with Request download highlighted under Additional data',
    },
    {
      title: 'Request your data',
      description: 'Tap Request Your Data. Uber will email or text you when the archive is ready to download.',
      image: require('../../assets/UberDataTutorialScreenshots/request-web/3.png'),
      imageLabel: 'Uber Download your data page with Request Your Data highlighted',
    },
  ],
  doordash: [
    {
      title: 'Sign in on DoorDash’s website',
      description: 'The button on the final step opens DoorDash’s account-management page. Sign in with the phone number or account you use for DoorDash.',
      image: require('../../assets/DoorDashDataTutorialScreenshots/request-web/1.png'),
      imageLabel: 'DoorDash sign-in page asking for a phone number or social account',
    },
    {
      title: 'Request your archive',
      description: 'On the Manage Account page, find Account Data and tap Request Archive. DoorDash will notify you when the archive is ready.',
      image: require('../../assets/DoorDashDataTutorialScreenshots/request-web/2.png'),
      imageLabel: 'DoorDash Manage Account page with Request Archive highlighted',
    },
  ],
};

const DOWNLOAD_STEPS: Record<DataPlatform, TutorialStep[]> = {
  uber: [
    {
      title: 'Open the notification',
      description: 'Open Uber’s “Your Uber data is ready for download” email or text, then tap Go to Download Page. The link is available for 7 days.',
      image: require('../../assets/UberDataTutorialScreenshots/2/1.webp'),
      imageLabel: 'Uber data-ready email with the download-page button highlighted',
    },
    {
      title: 'Download your archive',
      description: 'Sign in if asked, then tap Download Data. Download links expire, so do this promptly.',
      image: require('../../assets/UberDataTutorialScreenshots/2/2.webp'),
      imageLabel: 'Uber data download page with Download Data highlighted',
    },
    {
      title: 'Confirm the download',
      description: 'Approve the ZIP download when your browser asks.',
      image: require('../../assets/UberDataTutorialScreenshots/2/3.webp'),
      imageLabel: 'Browser confirmation dialog with Download highlighted',
    },
    {
      title: 'Choose your downloaded ZIP',
      description: 'Return to SnackTrack and choose your downloaded Uber ZIP file.',
      image: require('../../assets/UberDataTutorialScreenshots/3/1.webp'),
      imageLabel: 'SnackTrack history-file chooser highlighted',
    },
    {
      title: 'Select the ZIP',
      description: 'Pick the Uber archive from Recents or your Downloads folder. Keep the file zipped.',
      image: require('../../assets/UberDataTutorialScreenshots/3/2.webp'),
      imageLabel: 'Device file picker with an Uber ZIP archive highlighted',
    },
  ],
  doordash: [
    {
      title: 'Open the notification',
      description: 'Open DoorDash’s data-ready email or notification, then tap View Your Data Archive.',
      image: require('../../assets/DoorDashDataTutorialScreenshots/2/1.webp'),
      imageLabel: 'DoorDash archive-ready email with View Your Data Archive highlighted',
    },
    {
      title: 'Download your archive',
      description: 'Tap Download before the archive link expires.',
      image: require('../../assets/DoorDashDataTutorialScreenshots/2/2.webp'),
      imageLabel: 'DoorDash archive page with Download highlighted',
    },
    {
      title: 'Confirm the download',
      description: 'Approve the ZIP download when your browser asks.',
      image: require('../../assets/DoorDashDataTutorialScreenshots/2/3.webp'),
      imageLabel: 'Browser confirmation dialog with Download highlighted',
    },
    {
      title: 'Choose your downloaded ZIP',
      description: 'Return to SnackTrack and choose your downloaded DoorDash ZIP file.',
      image: require('../../assets/DoorDashDataTutorialScreenshots/3/1.webp'),
      imageLabel: 'SnackTrack history-file chooser highlighted',
    },
    {
      title: 'Select the ZIP',
      description: 'Pick data_archive.zip from Recents or your Downloads folder. Keep the file zipped.',
      image: require('../../assets/DoorDashDataTutorialScreenshots/3/2.webp'),
      imageLabel: 'Device file picker with a DoorDash ZIP archive highlighted',
    },
  ],
};

const platformDetailsForTheme = (theme: AppTheme) => ({
  uber: {
    name: 'Uber Eats',
    accent: theme.colors.uberDark,
    surface: theme.colors.successBg,
    icon: 'car-outline' as const,
    requestUrl: 'https://myprivacy.uber.com/privacy/exploreyourdata/download',
  },
  doordash: {
    name: 'DoorDash',
    accent: theme.colors.doorDash,
    surface: theme.colors.errorSurface,
    icon: 'bag-handle-outline' as const,
    requestUrl: 'https://www.doordash.com/consumer/privacy/manage_account',
  },
});

interface UberDataTutorialProps {
  mode?: DataTutorialMode;
  initialPlatform?: DataPlatform;
  providerStatuses?: Partial<Record<DataPlatform, string>>;
  entryJob?: ProviderTutorialJob;
  onRequestConfirmed: (platform: DataPlatform) => void;
  onStillWaiting?: (platform: DataPlatform) => void;
  onArchiveDownloaded?: (platform: DataPlatform) => void;
  onReadyConfirmed?: (platform: DataPlatform) => void;
  onClose: () => void;
}

export default function UberDataTutorial({
  mode = 'request',
  initialPlatform,
  providerStatuses,
  entryJob,
  onRequestConfirmed,
  onStillWaiting,
  onArchiveDownloaded,
  onReadyConfirmed,
  onClose,
}: UberDataTutorialProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const platformDetails = useMemo(() => platformDetailsForTheme(theme), [theme]);
  const [platform, setPlatform] = useState<DataPlatform>(initialPlatform ?? 'uber');
  const [hasChosenPlatform, setHasChosenPlatform] = useState(Boolean(initialPlatform));
  const initialProviderStatus = initialPlatform ? providerStatuses?.[initialPlatform] : undefined;
  const initialEntry = entryJob ?? resolveProviderTutorialEntry(initialProviderStatus).job;
  const [tutorialMode, setTutorialMode] = useState<DataTutorialMode>(mode);
  const [activeJob, setActiveJob] = useState<ProviderTutorialJob>(initialEntry);
  const [showProviderOverview, setShowProviderOverview] = useState(Boolean(initialPlatform && mode === 'request' && initialEntry === 'request'));
  const [showProgressQuestion, setShowProgressQuestion] = useState(false);
  const [showRequestedQuestion, setShowRequestedQuestion] = useState(initialEntry === 'waiting');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [zoomedImage, setZoomedImage] = useState<TutorialStep | null>(null);
  const [awaitingVendorReturn, setAwaitingVendorReturn] = useState(false);
  const [showRequestConfirmation, setShowRequestConfirmation] = useState(false);
  const appState = useRef(AppState.currentState);
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  useEffect(() => {
    setPlatform(initialPlatform ?? 'uber');
    setHasChosenPlatform(Boolean(initialPlatform));
    setTutorialMode(mode);
    const nextJob = entryJob ?? resolveProviderTutorialEntry(initialProviderStatus).job;
    setActiveJob(nextJob);
    setShowProviderOverview(Boolean(initialPlatform && mode === 'request' && nextJob === 'request'));
    setShowProgressQuestion(false);
    setShowRequestedQuestion(nextJob === 'waiting');
    setCurrentIndex(0);
    setAwaitingVendorReturn(false);
    setShowRequestConfirmation(false);
  }, [entryJob, initialPlatform, initialProviderStatus, mode]);

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

  const details = platformDetails[platform];
  const steps = tutorialMode === 'request' ? REQUEST_STEPS[platform] : DOWNLOAD_STEPS[platform];
  const currentStep = steps[currentIndex];
  const isLastStep = currentIndex === steps.length - 1;

  const imageSize = useMemo(() => {
    if (!currentStep) return { width: 0, height: 0 };
    const resolved = Image.resolveAssetSource(currentStep.image);
    const aspectRatio = resolved.width / resolved.height;
    const maxWidth = Math.min(windowWidth - 40, 520);
    const maxHeight = Math.min(windowHeight * 0.5, 520);
    let displayWidth = maxWidth;
    let displayHeight = displayWidth / aspectRatio;
    if (displayHeight > maxHeight) {
      displayHeight = maxHeight;
      displayWidth = displayHeight * aspectRatio;
    }
    return { width: displayWidth, height: displayHeight };
  }, [currentStep, windowHeight, windowWidth]);

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

  const goBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex((index) => index - 1);
    } else if (initialPlatform) {
      const returningFromDownloadGuide = tutorialMode === 'download';
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
      setCurrentIndex((index) => index + 1);
      return;
    }
    if (tutorialMode === 'request') {
      onRequestConfirmed(platform);
    } else {
      onArchiveDownloaded?.(platform);
      if (!onArchiveDownloaded) onClose();
    }
  };

  const openVendorRequest = async () => {
    setAwaitingVendorReturn(true);
    try {
      await Linking.openURL(details.requestUrl);
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

  if (showProviderOverview) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.overviewHeader}>
          <TouchableOpacity accessibilityLabel="Choose another source" style={styles.headerButton} onPress={() => {
            setShowProviderOverview(false);
            setHasChosenPlatform(false);
          }}>
            <Ionicons name="arrow-back" size={23} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.overviewProvider}>{details.name} · 1 of 3</Text>
          <TouchableOpacity accessibilityLabel="Close tutorial" style={styles.headerButton} onPress={onClose}>
            <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.overviewContent}>
          <Text style={styles.overviewEyebrow}>UNLOCK DEEPER STATS</Text>
          <Text style={styles.overviewTitle}>First, ask {details.name} for your history</Text>
          <Text style={styles.overviewBody}>We’ll open the right page. Sign in, request your data, then come back here.</Text>
          <View style={styles.overviewSurface}>
            <Text style={styles.overviewSurfaceTitle}>What happens next</Text>
            <OverviewRow number="1" title="Request your history" body={`SnackTrack opens ${details.name}’s official privacy page.`} />
            <OverviewRow divided number="2" title="Wait for the ready message" body={`${details.name} will email or notify you when it’s available.`} />
            <OverviewRow divided number="3" title="Bring it back to SnackTrack" body="We’ll add the details and refresh your recap." />
          </View>
          <View style={styles.overviewActions}>
            <TouchableOpacity style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]} onPress={() => setShowProviderOverview(false)} accessibilityRole="button">
              <Text style={styles.primaryButtonText}>Show me how</Text>
              <Ionicons name="arrow-forward" size={21} color={theme.colors.white} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.overviewSecondaryButton} onPress={() => {
              setShowProviderOverview(false);
              setHasChosenPlatform(false);
            }} accessibilityRole="button">
              <Text style={styles.overviewSecondaryText}>Choose another source</Text>
            </TouchableOpacity>
          </View>
        </View>
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
            {showRequestedQuestion ? 'What happened after you requested it?' : 'Have you requested your data yet?'}
          </Text>
          <Text style={styles.platformBody}>
            {showRequestedQuestion
              ? `Choose the option that matches where you are with ${details.name}.`
              : 'No digging around for a file you do not have yet. We’ll only ask you to choose a file when it makes sense.'}
          </Text>
          <View style={styles.answerStack}>
            {showRequestedQuestion ? (
              <>
                <JourneyAnswer
                  icon="time-outline"
                  title="I’m still waiting"
                  description={`${details.name} has not said it’s ready yet.`}
                  accent={details.accent}
                  onPress={() => (onStillWaiting ?? onRequestConfirmed)(platform)}
                />
                <JourneyAnswer
                  icon="mail-unread-outline"
                  title="They said it’s ready"
                  description="Show me how to download the archive."
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
                    title="The ZIP is downloaded"
                    description="Open the file picker so I can import it now."
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
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity accessibilityLabel="Previous tutorial step" style={styles.headerButton} onPress={goBack}>
          <Ionicons name="arrow-back" size={23} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.providerChip, { backgroundColor: details.surface }]}
          onPress={() => setHasChosenPlatform(false)}
          accessibilityRole="button"
          accessibilityLabel={`Change provider from ${details.name}`}
        >
          <Text style={[styles.providerChipText, { color: details.accent }]}>{details.name}</Text>
          <Ionicons name="chevron-down" size={15} color={details.accent} />
        </TouchableOpacity>
        <TouchableOpacity accessibilityLabel="Close tutorial" style={styles.headerButton} onPress={onClose}>
          <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.stepContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.stepEyebrow, { color: details.accent }]}>
          {tutorialMode === 'request' ? 'REQUEST YOUR ARCHIVE' : 'DOWNLOAD AND IMPORT'} · {currentIndex + 1}/{steps.length}
        </Text>
        <Text style={styles.stepTitle}>{currentStep.title}</Text>
        <Text style={styles.stepDescription}>{currentStep.description}</Text>

        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.imageButton}
          onPress={() => setZoomedImage(currentStep)}
          accessibilityRole="imagebutton"
          accessibilityLabel={`${currentStep.imageLabel}. Tap to enlarge.`}
        >
          <Image
            source={currentStep.image}
            style={[styles.screenshot, imageSize]}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
          <View style={styles.zoomHint}>
            <Ionicons name="expand-outline" size={15} color={theme.colors.textSecondary} />
            <Text style={styles.zoomHintText}>Tap to enlarge</Text>
          </View>
        </TouchableOpacity>

      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.progressTrack}>
          {steps.map((_, index) => (
            <View
              key={index}
              style={[
                styles.progressSegment,
                index <= currentIndex && { backgroundColor: details.accent },
              ]}
            />
          ))}
        </View>
        <View style={styles.footerActions}>
          <TouchableOpacity
            style={styles.previousButton}
            onPress={goBack}
            accessibilityRole="button"
            accessibilityLabel="Previous instruction"
          >
            <Ionicons name="arrow-back" size={20} color={theme.colors.textPrimary} />
            <Text style={styles.previousButtonText}>Previous</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.primaryButton, styles.footerPrimaryButton, { backgroundColor: details.accent }]}
            onPress={isLastStep && tutorialMode === 'request' ? openVendorRequest : goForward}
            accessibilityRole={isLastStep && tutorialMode === 'request' ? 'link' : 'button'}
            accessibilityLabel={isLastStep && tutorialMode === 'request' ? `Open ${details.name} website to submit the data request` : undefined}
          >
            <Text style={styles.primaryButtonText}>
              {isLastStep
                ? tutorialMode === 'request'
                  ? platform === 'uber' ? 'Open Uber Data Page' : `Open ${details.name} Website`
                  : onArchiveDownloaded ? 'I Downloaded the ZIP' : 'Back to Import'
                : 'Next'}
            </Text>
            <Ionicons name={isLastStep ? tutorialMode === 'request' ? 'open-outline' : 'checkmark' : 'arrow-forward'} size={21} color={theme.colors.white} />
          </TouchableOpacity>
        </View>
        {isLastStep && tutorialMode === 'request' ? (
          <>
            <TouchableOpacity style={styles.notYetButton} onPress={showRequestedStatusQuestion}>
              <Text style={styles.notYetText}>I’ve already requested it</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.notYetButton} onPress={() => setHasChosenPlatform(false)}>
              <Text style={styles.notYetText}>Choose another provider</Text>
            </TouchableOpacity>
          </>
        ) : null}
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

      <Modal visible={showRequestConfirmation} transparent animationType="fade" onRequestClose={() => setShowRequestConfirmation(false)}>
        <View style={styles.confirmBackdrop}>
          <View style={styles.confirmCard} accessibilityViewIsModal>
            <View style={[styles.confirmIcon, { backgroundColor: details.surface }]}>
              <Ionicons name="document-text-outline" size={26} color={details.accent} />
            </View>
            <Text style={styles.confirmTitle}>Did you submit the request?</Text>
            <Text style={styles.confirmBody}>Confirm only after {details.name} accepted your data request.</Text>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: details.accent }]}
              onPress={() => {
                setShowRequestConfirmation(false);
                onRequestConfirmed(platform);
              }}
              accessibilityRole="button"
            >
              <Text style={styles.primaryButtonText}>Yes, I Requested It</Text>
              <Ionicons name="checkmark" size={21} color={theme.colors.white} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.notYetButton} onPress={() => setShowRequestConfirmation(false)} accessibilityRole="button">
              <Text style={styles.notYetText}>Not yet</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  overviewHeader: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14 },
  overviewProvider: { color: theme.colors.textSecondary, fontSize: 11, fontWeight: '500' },
  overviewContent: { flex: 1, paddingHorizontal: 18, paddingBottom: 6 },
  overviewEyebrow: { marginTop: 10, color: theme.colors.primary, fontSize: 12, fontWeight: '500', letterSpacing: 1.1 },
  overviewTitle: { marginTop: 6, color: theme.colors.textPrimary, fontSize: 28, lineHeight: 31, fontWeight: '500', letterSpacing: -0.4 },
  overviewBody: { marginTop: 9, color: theme.colors.textSecondary, fontSize: 15, lineHeight: 22 },
  overviewSurface: { marginTop: 18, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 5, borderRadius: Radius.card, borderWidth: 1, borderColor: theme.colors.divider, backgroundColor: theme.colors.surface, ...theme.shadows.card },
  overviewSurfaceTitle: { color: theme.colors.textPrimary, fontSize: 16, lineHeight: 20, fontWeight: '500' },
  overviewRow: { minHeight: 68, flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 11 },
  overviewRowDivided: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.divider },
  overviewNumber: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: theme.colors.chipActiveBg },
  overviewNumberText: { color: theme.colors.primary, fontSize: 14, fontWeight: '500' },
  overviewRowCopy: { flex: 1 },
  overviewRowTitle: { color: theme.colors.textPrimary, fontSize: 14, lineHeight: 18, fontWeight: '500' },
  overviewRowBody: { marginTop: 3, color: theme.colors.textSecondary, fontSize: 12, lineHeight: 16 },
  overviewActions: { marginTop: 'auto', gap: 10, paddingTop: 18 },
  overviewSecondaryButton: { minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.button, borderWidth: 1, borderColor: theme.colors.buttonSecondaryBorder, backgroundColor: theme.colors.surface },
  overviewSecondaryText: { color: theme.colors.buttonSecondaryText, fontSize: 14, fontWeight: '500' },
  confirmBackdrop: { flex: 1, backgroundColor: theme.colors.alpha(theme.colors.black, 0.55), alignItems: 'center', justifyContent: 'center', padding: 24 },
  confirmCard: { width: '100%', maxWidth: 440, backgroundColor: theme.colors.surface, borderRadius: Radius.card, padding: 24, ...theme.shadows.card },
  confirmIcon: { width: 52, height: 52, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  confirmTitle: { color: theme.colors.textPrimary, fontSize: 22, fontWeight: '600', marginBottom: 8 },
  confirmBody: { color: theme.colors.textSecondary, fontSize: 15, lineHeight: 22, marginBottom: 20 },
  providerChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 13, paddingVertical: 8, borderRadius: 999 },
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
  scrollView: { flex: 1 },
  stepContent: { alignItems: 'center', paddingHorizontal: 20, paddingTop: 24, paddingBottom: 28 },
  stepEyebrow: { fontSize: 11, fontWeight: '500', letterSpacing: 0.9, textAlign: 'center' },
  stepTitle: { marginTop: 8, color: theme.colors.textPrimary, fontSize: 29, lineHeight: 35, fontWeight: '600', textAlign: 'center' },
  stepDescription: { maxWidth: 520, marginTop: 10, color: theme.colors.textSecondary, fontSize: 16, lineHeight: 23, textAlign: 'center' },
  imageButton: { alignItems: 'center', marginTop: 22, padding: 10, borderRadius: Radius.card, backgroundColor: theme.colors.surface, ...theme.shadows.card },
  screenshot: { borderRadius: 14, backgroundColor: theme.colors.white },
  zoomHint: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 9 },
  zoomHintText: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '600' },
  footer: { paddingTop: 12, paddingHorizontal: 20, borderTopWidth: 1, borderTopColor: theme.colors.divider, backgroundColor: theme.colors.surface },
  footerActions: { flexDirection: 'row', gap: 10 },
  footerPrimaryButton: { flex: 1 },
  previousButton: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 16, borderWidth: 1, borderColor: theme.colors.divider, borderRadius: Radius.button, backgroundColor: theme.colors.surface },
  previousButtonText: { color: theme.colors.textPrimary, fontSize: 15, fontWeight: '600' },
  progressTrack: { flexDirection: 'row', gap: 5, marginBottom: 12 },
  progressSegment: { flex: 1, height: 4, borderRadius: 2, backgroundColor: theme.colors.gray200 },
  primaryButton: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, borderRadius: Radius.button },
  primaryButtonText: { color: theme.colors.white, fontSize: 17, fontWeight: '600' },
  notYetButton: { alignItems: 'center', paddingTop: 13, paddingBottom: 2 },
  notYetText: { color: theme.colors.textSecondary, fontSize: 15, fontWeight: '500' },
  zoomBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: theme.colors.alpha(theme.colors.black, 0.94) },
  zoomClose: { position: 'absolute', right: 16, zIndex: 1, width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24, backgroundColor: theme.colors.alpha(theme.colors.white, 0.14) },
  zoomedImage: { width: '100%', height: '88%' },
});
