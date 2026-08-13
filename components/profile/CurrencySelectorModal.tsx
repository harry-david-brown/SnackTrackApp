import { Colors } from '@constants/theme';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SUPPORTED_CURRENCIES, CurrencyCode } from '@utils/currency';
import { modalShellStyles } from './profileModalStyles';

interface CurrencySelectorModalProps {
  visible: boolean;
  currency: CurrencyCode;
  onSelect: (currency: CurrencyCode) => void;
  onClose: () => void;
}

export function CurrencySelectorModal({
  visible,
  currency,
  onSelect,
  onClose,
}: CurrencySelectorModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={modalShellStyles.modalOverlay}>
        <View style={modalShellStyles.modalContent}>
          <View style={modalShellStyles.modalHeader}>
            <Text style={modalShellStyles.modalTitle}>Select Currency</Text>
            <TouchableOpacity onPress={onClose} style={modalShellStyles.closeButton}>
              <Ionicons name="close" size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={modalShellStyles.modalBody}>
            {Object.values(SUPPORTED_CURRENCIES).map((curr) => (
              <TouchableOpacity
                key={curr.code}
                style={[
                  styles.currencyItem,
                  currency === curr.code && styles.currencyItemSelected,
                ]}
                onPress={() => onSelect(curr.code)}
              >
                <View style={styles.currencyItemContent}>
                  <Text style={styles.currencySymbol}>{curr.symbol}</Text>
                  <View style={styles.currencyInfo}>
                    <Text style={styles.currencyCode}>{curr.code}</Text>
                    <Text style={styles.currencyName}>{curr.name}</Text>
                  </View>
                </View>
                {currency === curr.code && (
                  <Ionicons name="checkmark-circle" size={24} color={Colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  currencyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  currencyItemSelected: {
    backgroundColor: Colors.infoBg,
  },
  currencyItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginRight: 16,
    width: 40,
  },
  currencyInfo: {
    flex: 1,
  },
  currencyCode: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  currencyName: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
});

export default CurrencySelectorModal;
