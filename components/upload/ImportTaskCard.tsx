import { Colors } from '@constants/theme';
import { ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FadeInView } from '@components/ui/FadeInView';
import { Card } from '@components/ui/Card';
import { StatusBadge } from '@components/ui/StatusBadge';
import { IconSurface } from '@components/ui/IconSurface';
import type { StatusTone } from '@components/ui/StatusBadge';

export type ImportTaskId = 'connect_email' | 'gmail_import' | 'uber_export';

interface ImportTaskCardProps {
  id: ImportTaskId;
  title: string;
  description: string;
  iconName: keyof typeof Ionicons.glyphMap;
  statusLabel: string;
  statusTone: StatusTone;
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
  return (
    <Card style={isOpen && styles.taskCardOpen}>
      <TouchableOpacity
        style={styles.taskCardHeader}
        onPress={() => onPress(id)}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={`${title}. ${statusLabel}. ${description}`}
        accessibilityState={{ expanded: isOpen }}
      >
        <IconSurface icon={isComplete ? 'checkmark-circle' : iconName} color={isComplete ? Colors.secondary : Colors.primary} />
        <View style={styles.taskHeaderText}>
          <View style={styles.taskTitleRow}>
            <Text style={styles.taskTitle}>{title}</Text>
            <StatusBadge label={statusLabel} tone={statusTone} />
          </View>
          <Text style={styles.taskDescription}>{description}</Text>
        </View>
        <Ionicons
          name={isOpen ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={Colors.slate500}
        />
      </TouchableOpacity>

      {isOpen && (
        <FadeInView duration={250} style={styles.taskContent}>
          {children}
        </FadeInView>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  taskCardOpen: {
    borderWidth: 1,
    borderColor: Colors.chipActiveBg,
  },
  taskCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    gap: 12,
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
    color: Colors.textPrimary,
  },
  taskDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  taskContent: {
    borderTopWidth: 1,
    borderTopColor: Colors.slate100,
    padding: 16,
    paddingTop: 14,
  },
});

export default ImportTaskCard;
