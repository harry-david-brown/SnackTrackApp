import { Colors } from '@/constants/theme';
/** Shared bottom-sheet shell styles for Profile screen modals. */
import { StyleSheet } from 'react-native';

export const modalShellStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.alpha(Colors.black, 0.5),
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
});
