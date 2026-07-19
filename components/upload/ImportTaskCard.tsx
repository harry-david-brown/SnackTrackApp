import { ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FadeInView } from '../ui/FadeInView';

export type ImportTaskId = 'connect_email' | 'gmail_import' | 'uber_export';

interface ImportTaskCardProps {
  id: ImportTaskId;
  title: string;
  description: string;
  iconName: keyof typeof Ionicons.glyphMap;
  statusLabel: string;
  statusTone: 'complete' | 'recommended' | 'optional';
  isComplete: boolean;
  isOpen: boolean;
  onPress: (id: ImportTaskId) => void;
  children: ReactNode;
}

/** Collapsible checklist card used by the Upload screen's import tasks. */
export function ImportTaskCard({
  id,
  title,
  description,
  iconName,
  statusLabel,
  statusTone,
  isComplete,
  isOpen,
  onPress,
  children,
}: ImportTaskCardProps) {
  const statusBadgeStyle = {
    complete: styles.taskStatusBadgeComplete,
    recommended: styles.taskStatusBadgeRecommended,
    optional: styles.taskStatusBadgeOptional,
  }[statusTone];
  const statusTextStyle = {
    complete: styles.taskStatusTextComplete,
    recommended: styles.taskStatusTextRecommended,
    optional: styles.taskStatusTextOptional,
  }[statusTone];

  return (
    <View style={[styles.taskCard, isOpen && styles.taskCardOpen]}>
      <TouchableOpacity
        style={styles.taskCardHeader}
        onPress={() => onPress(id)}
        activeOpacity={0.85}
      >
        <View style={styles.taskIcon}>
          <Ionicons
            name={isComplete ? 'checkmark-circle' : iconName}
            size={24}
            color={isComplete ? '#2E7D4F' : '#1F4E3A'}
          />
        </View>
        <View style={styles.taskHeaderText}>
          <View style={styles.taskTitleRow}>
            <Text style={styles.taskTitle}>{title}</Text>
            <View style={[styles.taskStatusBadge, statusBadgeStyle]}>
              <Text style={[styles.taskStatusText, statusTextStyle]}>
                {statusLabel}
              </Text>
            </View>
          </View>
          <Text style={styles.taskDescription}>{description}</Text>
        </View>
        <Ionicons
          name={isOpen ? 'chevron-up' : 'chevron-down'}
          size={20}
          color="#94a3b8"
        />
      </TouchableOpacity>

      {isOpen && (
        <FadeInView duration={250} style={styles.taskContent}>
          {children}
        </FadeInView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  taskCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  taskCardOpen: {
    borderWidth: 1,
    borderColor: '#E9F5E2',
  },
  taskCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
  },
  taskIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#E9F5E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  taskHeaderText: {
    flex: 1,
    marginRight: 10,
  },
  taskTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  taskTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#222222',
  },
  taskDescription: {
    fontSize: 14,
    color: '#6F756E',
    lineHeight: 20,
  },
  taskStatusBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  taskStatusBadgeComplete: {
    backgroundColor: '#dcfce7',
  },
  taskStatusBadgeRecommended: {
    backgroundColor: '#E9F5E2',
  },
  taskStatusBadgeOptional: {
    backgroundColor: '#f1f5f9',
  },
  taskStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  taskStatusTextComplete: {
    color: '#15803d',
  },
  taskStatusTextRecommended: {
    color: '#1F4E3A',
  },
  taskStatusTextOptional: {
    color: '#6F756E',
  },
  taskContent: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    padding: 16,
    paddingTop: 14,
  },
});

export default ImportTaskCard;
