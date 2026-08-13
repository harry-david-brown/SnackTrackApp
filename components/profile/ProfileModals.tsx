import { Modal } from 'react-native';
import type { ProfileController } from '@hooks/useProfileController';
import UberDataTutorial from '@components/upload/UberDataTutorial';
import { CurrencySelectorModal } from './CurrencySelectorModal';
import { HelpSupportModal } from './HelpSupportModal';

type ProfileModalsProps = Pick<ProfileController,
  | 'activeModal'
  | 'closeModal'
  | 'settings'
  | 'completeTutorial'
  | 'openPrivacyPolicy'
  | 'requestAccountDeletion'
  | 'isDeleting'
  | 'currency'
  | 'selectCurrency'
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
          onRequestConfirmed={props.completeTutorial}
          onClose={props.closeModal}
        />
      </Modal>
      <HelpSupportModal
        visible={props.activeModal === 'help'}
        onClose={props.closeModal}
        onPrivacyPolicy={props.openPrivacyPolicy}
        onDeleteAccount={props.requestAccountDeletion}
        isDeleting={props.isDeleting}
      />
      <CurrencySelectorModal
        visible={props.activeModal === 'currency'}
        currency={props.currency}
        onSelect={props.selectCurrency}
        onClose={props.closeModal}
      />
    </>
  );
}
