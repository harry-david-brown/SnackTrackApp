import { Colors, Radius, Shadows } from '@constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import {
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
      title: 'Open your account',
      description: 'In Uber Eats, tap the Account icon in the bottom-right corner.',
      image: require('../../assets/UberDataTutorialScreenshots/1/1.webp'),
      imageLabel: 'Uber Eats home screen with the account navigation highlighted',
    },
    {
      title: 'Open Privacy',
      description: 'Scroll down through your account menu and choose Privacy.',
      image: require('../../assets/UberDataTutorialScreenshots/1/2.webp'),
      imageLabel: 'Uber account menu with Privacy highlighted',
    },
    {
      title: 'Choose Request',
      description: 'In the Privacy Center, find the personal-data card and tap Request.',
      image: require('../../assets/UberDataTutorialScreenshots/1/3.webp'),
      imageLabel: 'Uber Privacy Center with the personal-data Request button highlighted',
    },
    {
      title: 'Submit the request',
      description: 'Tap Request Your Data. Uber may ask you to verify your identity.',
      image: require('../../assets/UberDataTutorialScreenshots/1/4.webp'),
      imageLabel: 'Uber Download your data page with Request Your Data highlighted',
    },
  ],
  doordash: [
    {
      title: 'Open your account',
      description: 'In DoorDash, tap the Account icon near the top of the home screen.',
      image: require('../../assets/DoorDashDataTutorialScreenshots/1/1.webp'),
      imageLabel: 'DoorDash home screen with the account icon highlighted',
    },
    {
      title: 'Open Settings',
      description: 'From your account page, choose Settings.',
      image: require('../../assets/DoorDashDataTutorialScreenshots/1/2.webp'),
      imageLabel: 'DoorDash account page with Settings highlighted',
    },
    {
      title: 'Choose Manage Account',
      description: 'Scroll to Account Settings and select Manage Account.',
      image: require('../../assets/DoorDashDataTutorialScreenshots/1/3.webp'),
      imageLabel: 'DoorDash settings page with Manage Account highlighted',
    },
    {
      title: 'Continue to account management',
      description: 'Tap the Manage Account button to open DoorDash account tools.',
      image: require('../../assets/DoorDashDataTutorialScreenshots/1/4.webp'),
      imageLabel: 'DoorDash profile page with Manage Account highlighted',
    },
    {
      title: 'Choose Request Archive',
      description: 'Under Account Data, select Request Archive.',
      image: require('../../assets/DoorDashDataTutorialScreenshots/1/5.webp'),
      imageLabel: 'DoorDash account page with Request Archive highlighted',
    },
    {
      title: 'Submit the request',
      description: 'Confirm Request Archive. DoorDash may ask you to verify your identity.',
      image: require('../../assets/DoorDashDataTutorialScreenshots/1/6.webp'),
      imageLabel: 'DoorDash archive options with Request Archive highlighted',
    },
  ],
};

const DOWNLOAD_STEPS: Record<DataPlatform, TutorialStep[]> = {
  uber: [
    {
      title: 'Open the notification',
      description: 'In Gmail, open “Your Uber data is ready for download” from noreply@uber.com, then tap Go to Download Page. The link is available for 7 days.',
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
      title: 'Choose your export file',
      description: 'Return to SnackTrack and choose your downloaded Uber ZIP file.',
      image: require('../../assets/UberDataTutorialScreenshots/3/1.webp'),
      imageLabel: 'SnackTrack export upload control highlighted',
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
      description: 'DoorDash will email you when the archive is ready. Tap View Your Data Archive.',
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
      title: 'Choose your export file',
      description: 'Return to SnackTrack and choose your downloaded DoorDash ZIP file.',
      image: require('../../assets/DoorDashDataTutorialScreenshots/3/1.webp'),
      imageLabel: 'SnackTrack export upload control highlighted',
    },
    {
      title: 'Select the ZIP',
      description: 'Pick data_archive.zip from Recents or your Downloads folder. Keep the file zipped.',
      image: require('../../assets/DoorDashDataTutorialScreenshots/3/2.webp'),
      imageLabel: 'Device file picker with a DoorDash ZIP archive highlighted',
    },
  ],
};

const PLATFORM_DETAILS = {
  uber: {
    name: 'Uber Eats',
    accent: Colors.uberDark,
    surface: Colors.successSurface,
    icon: 'car-outline' as const,
    requestUrl: 'https://myprivacy.uber.com/privacy/exploreyourdata/download',
  },
  doordash: {
    name: 'DoorDash',
    accent: Colors.doorDash,
    surface: Colors.errorSurface,
    icon: 'bag-handle-outline' as const,
    requestUrl: 'https://www.doordash.com/consumer/privacy/manage_account',
  },
};

interface UberDataTutorialProps {
  mode?: DataTutorialMode;
  initialPlatform?: DataPlatform;
  onRequestConfirmed: (platform: DataPlatform) => void;
  onClose: () => void;
}

export default function UberDataTutorial({
  mode = 'request',
  initialPlatform,
  onRequestConfirmed,
  onClose,
}: UberDataTutorialProps) {
  const [platform, setPlatform] = useState<DataPlatform>(initialPlatform ?? 'uber');
  const [hasChosenPlatform, setHasChosenPlatform] = useState(Boolean(initialPlatform));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [zoomedImage, setZoomedImage] = useState<TutorialStep | null>(null);
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  useEffect(() => {
    setPlatform(initialPlatform ?? 'uber');
    setHasChosenPlatform(Boolean(initialPlatform));
    setCurrentIndex(0);
  }, [initialPlatform, mode]);

  const details = PLATFORM_DETAILS[platform];
  const steps = mode === 'request' ? REQUEST_STEPS[platform] : DOWNLOAD_STEPS[platform];
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
    setPlatform(nextPlatform);
    setCurrentIndex(0);
    setHasChosenPlatform(true);
  };

  const goBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex((index) => index - 1);
    } else {
      setHasChosenPlatform(false);
    }
  };

  const goForward = () => {
    if (!isLastStep) {
      setCurrentIndex((index) => index + 1);
      return;
    }
    if (mode === 'request') {
      onRequestConfirmed(platform);
    } else {
      onClose();
    }
  };

  const openVendorRequest = async () => {
    try {
      await Linking.openURL(details.requestUrl);
    } catch {
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
            {mode === 'request' ? 'Request your data' : 'Download and upload'}
          </Text>
          <TouchableOpacity accessibilityLabel="Close tutorial" style={styles.headerButton} onPress={onClose}>
            <Ionicons name="close" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.platformContent}>
          <Text style={styles.platformEyebrow}>
            {mode === 'request' ? 'COMPLETE YOUR HISTORY' : 'YOUR ARCHIVE IS READY'}
          </Text>
          <Text style={styles.platformTitle}>
            {mode === 'request' ? 'Where do you want to import from?' : 'Which archive are you importing?'}
          </Text>
          <Text style={styles.platformBody}>
            {mode === 'request'
              ? 'Choose a provider and SnackTrack will guide you through requesting its official data archive.'
              : 'Choose the provider that sent your archive and we’ll guide you through downloading and uploading it.'}
          </Text>
          <View style={styles.platformStack}>
            {(Object.keys(PLATFORM_DETAILS) as DataPlatform[]).map((option) => {
              const optionDetails = PLATFORM_DETAILS[option];
              return (
                <TouchableOpacity
                  key={option}
                  style={[styles.platformCard, { backgroundColor: optionDetails.surface }]}
                  onPress={() => choosePlatform(option)}
                  accessibilityRole="button"
                  accessibilityLabel={`Choose ${optionDetails.name}`}
                >
                  <View style={[styles.platformIcon, { backgroundColor: optionDetails.accent }]}>
                    <Ionicons name={optionDetails.icon} size={25} color={Colors.white} />
                  </View>
                  <View style={styles.platformCardText}>
                    <Text style={styles.platformName}>{optionDetails.name}</Text>
                    <Text style={styles.platformDescription}>
                      {mode === 'request' ? 'Show me the request steps' : 'Show me the download steps'}
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

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity accessibilityLabel="Previous tutorial step" style={styles.headerButton} onPress={goBack}>
          <Ionicons name="arrow-back" size={23} color={Colors.textPrimary} />
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
          <Ionicons name="close" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.stepContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.stepEyebrow, { color: details.accent }]}>
          {mode === 'request' ? 'REQUEST YOUR ARCHIVE' : 'DOWNLOAD AND IMPORT'} · {currentIndex + 1}/{steps.length}
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
            <Ionicons name="expand-outline" size={15} color={Colors.textSecondary} />
            <Text style={styles.zoomHintText}>Tap to enlarge</Text>
          </View>
        </TouchableOpacity>

        {mode === 'request' ? (
          <TouchableOpacity style={styles.vendorButton} onPress={openVendorRequest} accessibilityRole="link">
            <Ionicons name="open-outline" size={19} color={details.accent} />
            <Text style={[styles.vendorButtonText, { color: details.accent }]}>Open {details.name}</Text>
          </TouchableOpacity>
        ) : null}
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
        <TouchableOpacity style={[styles.primaryButton, { backgroundColor: details.accent }]} onPress={goForward}>
          <Text style={styles.primaryButtonText}>
            {isLastStep
              ? mode === 'request' ? "I've requested it" : 'Back to Import'
              : 'Next'}
          </Text>
          <Ionicons name={isLastStep ? 'checkmark' : 'arrow-forward'} size={21} color={Colors.white} />
        </TouchableOpacity>
        {isLastStep && mode === 'request' ? (
          <TouchableOpacity style={styles.notYetButton} onPress={onClose}>
            <Text style={styles.notYetText}>I’ll do this later</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <Modal visible={Boolean(zoomedImage)} transparent animationType="fade" onRequestClose={() => setZoomedImage(null)}>
        <View style={styles.zoomBackdrop}>
          <TouchableOpacity style={[styles.zoomClose, { top: insets.top + 12 }]} onPress={() => setZoomedImage(null)}>
            <Ionicons name="close" size={28} color={Colors.white} />
          </TouchableOpacity>
          {zoomedImage ? (
            <Image source={zoomedImage.image} style={styles.zoomedImage} resizeMode="contain" />
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    backgroundColor: Colors.surface,
  },
  headerButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerSpacer: { width: 44 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary },
  providerChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 13, paddingVertical: 8, borderRadius: 999 },
  providerChipText: { fontSize: 14, fontWeight: '800' },
  platformContent: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, paddingBottom: 40 },
  platformEyebrow: { color: Colors.primary, fontSize: 12, fontWeight: '800', letterSpacing: 1.1, textAlign: 'center' },
  platformTitle: { marginTop: 10, color: Colors.textPrimary, fontSize: 29, lineHeight: 35, fontWeight: '800', textAlign: 'center' },
  platformBody: { marginTop: 12, color: Colors.textSecondary, fontSize: 16, lineHeight: 23, textAlign: 'center' },
  platformStack: { marginTop: 30, gap: 14 },
  platformCard: { minHeight: 84, flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: Radius.card, ...Shadows.card },
  platformIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  platformCardText: { flex: 1, marginHorizontal: 14 },
  platformName: { color: Colors.textPrimary, fontSize: 18, fontWeight: '800' },
  platformDescription: { marginTop: 3, color: Colors.textSecondary, fontSize: 14 },
  scrollView: { flex: 1 },
  stepContent: { alignItems: 'center', paddingHorizontal: 20, paddingTop: 24, paddingBottom: 28 },
  stepEyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 0.9, textAlign: 'center' },
  stepTitle: { marginTop: 8, color: Colors.textPrimary, fontSize: 27, lineHeight: 33, fontWeight: '800', textAlign: 'center' },
  stepDescription: { maxWidth: 520, marginTop: 10, color: Colors.textSecondary, fontSize: 16, lineHeight: 23, textAlign: 'center' },
  imageButton: { alignItems: 'center', marginTop: 22, padding: 10, borderRadius: Radius.card, backgroundColor: Colors.surface, ...Shadows.card },
  screenshot: { borderRadius: 14, backgroundColor: Colors.white },
  zoomHint: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 9 },
  zoomHintText: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600' },
  vendorButton: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20, paddingHorizontal: 18, paddingVertical: 12, borderWidth: 1, borderColor: Colors.divider, borderRadius: Radius.button, backgroundColor: Colors.surface },
  vendorButtonText: { fontSize: 15, fontWeight: '800' },
  footer: { paddingTop: 12, paddingHorizontal: 20, borderTopWidth: 1, borderTopColor: Colors.divider, backgroundColor: Colors.surface },
  progressTrack: { flexDirection: 'row', gap: 5, marginBottom: 12 },
  progressSegment: { flex: 1, height: 4, borderRadius: 2, backgroundColor: Colors.gray200 },
  primaryButton: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, borderRadius: Radius.button },
  primaryButtonText: { color: Colors.white, fontSize: 17, fontWeight: '800' },
  notYetButton: { alignItems: 'center', paddingTop: 13, paddingBottom: 2 },
  notYetText: { color: Colors.textSecondary, fontSize: 15, fontWeight: '700' },
  zoomBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: Colors.alpha(Colors.black, 0.94) },
  zoomClose: { position: 'absolute', right: 16, zIndex: 1, width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24, backgroundColor: Colors.alpha(Colors.white, 0.14) },
  zoomedImage: { width: '100%', height: '88%' },
});
