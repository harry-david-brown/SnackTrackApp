import { Modal } from 'react-native';
import type { ProfileController } from '@hooks/useProfileController';
import UberDataTutorial from '@components/upload/UberDataTutorial';

type ProfileModalsProps = Pick<ProfileController,
  | 'activeModal'
  | 'closeModal'
  | 'settings'
  | 'completeTutorial'
  | 'tutorialReadyConfirmed'
  | 'tutorialStillWaiting'
  | 'tutorialArchiveDownloaded'
>;

export function ProfileModals(props: ProfileModalsProps) {
  return (
    <>
      <Modal
        visible={props.activeModal === 'tutorial'}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={props.closeModal}
      >
        <UberDataTutorial
          mode={props.settings.tutorialMode}
          initialPlatform={props.settings.tutorialPlatform}
          providerStatuses={props.settings.tutorialProviderStatuses}
          entryJob={props.settings.tutorialEntryJob}
          onRequestConfirmed={props.completeTutorial}
          onReadyConfirmed={props.tutorialReadyConfirmed}
          onStillWaiting={props.tutorialStillWaiting}
          onArchiveDownloaded={props.tutorialArchiveDownloaded}
          onClose={props.closeModal}
        />
      </Modal>
    </>
  );
}
