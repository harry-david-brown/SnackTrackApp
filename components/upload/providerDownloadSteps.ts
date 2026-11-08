import type { ImageSourcePropType } from 'react-native';

export interface ProviderDownloadStep {
  title: string;
  description: string;
  image: ImageSourcePropType;
  imageLabel: string;
  fallback: string;
}

export type ProviderDownloadPlatform = 'uber' | 'doordash';

export const PROVIDER_DOWNLOAD_STEPS: Record<ProviderDownloadPlatform, ProviderDownloadStep[]> = {
  uber: [
    {
      title: 'Open Uber’s ready message',
      description: 'Find “Your Uber data is ready for download,” then tap the download-page link.',
      image: require('../../assets/UberDataTutorialScreenshots/2/1.webp'),
      imageLabel: 'Uber data-ready email with the download-page button highlighted',
      fallback: 'Check the inbox linked to your Uber Eats account for “Your Uber data is ready for download”. Open the email and tap its download-page link. If the link has expired, request a new download.',
    },
    {
      title: 'Download your archive',
      description: 'Sign in if asked, then tap Download Data. Download links expire, so do this promptly.',
      image: require('../../assets/UberDataTutorialScreenshots/2/2.webp'),
      imageLabel: 'Uber data download page with Download Data highlighted',
      fallback: 'Use the link in Uber’s ready email to open the download website in your browser. Sign in or verify your account if asked, then look for “Download Data”.',
    },
    {
      title: 'Confirm the ZIP download',
      description: 'When your browser asks, choose “Download” and wait for it to finish.',
      image: require('../../assets/UberDataTutorialScreenshots/2/3.webp'),
      imageLabel: 'Browser confirmation dialog with Download highlighted',
      fallback: 'If your browser asks, tap “Download”. If no prompt appears, check your browser’s downloads or the Downloads folder in your files app. Keep the file zipped, then return to SnackTrack.',
    },
  ],
  doordash: [
    {
      title: 'Open DoorDash’s ready message',
      description: 'Open DoorDash’s data-ready email or notification, then tap View Your Data Archive.',
      image: require('../../assets/DoorDashDataTutorialScreenshots/2/1.webp'),
      imageLabel: 'DoorDash archive-ready email with View Your Data Archive highlighted',
      fallback: 'Check the inbox linked to your DoorDash account for the archive-ready email. Open it and look for “View Your Data Archive”. If the link has expired, request a new archive.',
    },
    {
      title: 'Download your archive',
      description: 'Tap Download before the archive link expires.',
      image: require('../../assets/DoorDashDataTutorialScreenshots/2/2.webp'),
      imageLabel: 'DoorDash archive page with Download highlighted',
      fallback: 'Use “View Your Data Archive” in DoorDash’s ready email to open the website in your browser. Sign in if asked, then look for “Download”.',
    },
    {
      title: 'Confirm the ZIP download',
      description: 'When your browser asks, choose “Download” and wait for it to finish.',
      image: require('../../assets/DoorDashDataTutorialScreenshots/2/3.webp'),
      imageLabel: 'Browser confirmation dialog with Download highlighted',
      fallback: 'If your browser asks, tap “Download”. If no prompt appears, check your browser’s downloads or the Downloads folder in your files app. Keep the file zipped, then return to SnackTrack.',
    },
  ],
};
