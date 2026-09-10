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
      fallback: 'Check the download deadline in Uber’s email. Request a new download if the link has expired.',
    },
    {
      title: 'Download your archive',
      description: 'Sign in if asked, then tap Download Data. Download links expire, so do this promptly.',
      image: require('../../assets/UberDataTutorialScreenshots/2/2.webp'),
      imageLabel: 'Uber data download page with Download Data highlighted',
      fallback: 'Uber may ask you to verify your account again before showing the button.',
    },
    {
      title: 'Confirm the ZIP download',
      description: 'When your browser asks, choose “Download” and wait for it to finish.',
      image: require('../../assets/UberDataTutorialScreenshots/2/3.webp'),
      imageLabel: 'Browser confirmation dialog with Download highlighted',
      fallback: 'Keep the file zipped. SnackTrack handles the contents for you.',
    },
  ],
  doordash: [
    {
      title: 'Open DoorDash’s ready message',
      description: 'Open DoorDash’s data-ready email or notification, then tap View Your Data Archive.',
      image: require('../../assets/DoorDashDataTutorialScreenshots/2/1.webp'),
      imageLabel: 'DoorDash archive-ready email with View Your Data Archive highlighted',
      fallback: 'The archive link expires, so download it promptly.',
    },
    {
      title: 'Download your archive',
      description: 'Tap Download before the archive link expires.',
      image: require('../../assets/DoorDashDataTutorialScreenshots/2/2.webp'),
      imageLabel: 'DoorDash archive page with Download highlighted',
      fallback: 'DoorDash may ask you to sign in again before showing the download.',
    },
    {
      title: 'Confirm the ZIP download',
      description: 'When your browser asks, choose “Download” and wait for it to finish.',
      image: require('../../assets/DoorDashDataTutorialScreenshots/2/3.webp'),
      imageLabel: 'Browser confirmation dialog with Download highlighted',
      fallback: 'Keep the file zipped. SnackTrack handles the contents for you.',
    },
  ],
};
