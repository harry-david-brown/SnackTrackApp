import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { MascotPlaceholder } from './mascot/MascotPlaceholder';

interface OnboardingScreenProps {
  onComplete: () => void;
}

const highlights = [
  {
    icon: 'mail-open-outline' as const,
    title: 'Start fast',
    description: 'Import receipts in minutes and get to your first insight quickly.',
  },
  {
    icon: 'bar-chart-outline' as const,
    title: 'See the patterns',
    description: 'Understand where your delivery spending goes over time.',
  },
  {
    icon: 'document-attach-outline' as const,
    title: 'Go deeper later',
    description: 'Upload a full export when you want more complete historical detail.',
  },
];

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={['#0E2A1F', '#1F4E3A', '#2E7D4F']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <StatusBar style="light" />

      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top + 24,
            paddingBottom: insets.bottom + 24,
          },
        ]}
      >
        <View style={styles.hero}>
          <View style={styles.badge}>
            <Ionicons name="receipt-outline" size={18} color="#E9F5E2" />
            <Text style={styles.badgeText}>SnackTrack</Text>
          </View>

          {/* MASCOT: hero greeting — double-bicep flex, sticker-outline variant */}
          <View style={styles.mascotWrap}>
            <MascotPlaceholder pose="flex" size={140} variant="outline" />
          </View>

          <Text style={styles.title}>See where your food delivery money actually goes</Text>
          <Text style={styles.subtitle}>
            Import your receipts, spot spending patterns, and turn everyday orders into useful
            insights.
          </Text>
        </View>

        <View style={styles.card}>
          {highlights.map((item) => (
            <View key={item.title} style={styles.highlightRow}>
              <View style={styles.iconWrap}>
                <Ionicons name={item.icon} size={20} color="#1F4E3A" />
              </View>
              <View style={styles.highlightText}>
                <Text style={styles.highlightTitle}>{item.title}</Text>
                <Text style={styles.highlightDescription}>{item.description}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.primaryButton} onPress={onComplete}>
            <Text style={styles.primaryButtonText}>Get Started</Text>
            <Ionicons name="arrow-forward" size={18} color="#222222" />
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  hero: {
    marginTop: 12,
  },
  mascotWrap: {
    alignItems: 'center',
    marginBottom: 20,
  },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    marginBottom: 24,
  },
  badgeText: {
    color: '#E9F5E2',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  title: {
    color: '#FAF8F4',
    fontSize: 36,
    fontWeight: '800',
    lineHeight: 42,
    marginBottom: 16,
  },
  subtitle: {
    color: 'rgba(248, 250, 252, 0.88)',
    fontSize: 17,
    lineHeight: 25,
    maxWidth: 540,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderRadius: 24,
    padding: 20,
    gap: 18,
  },
  highlightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#E9F5E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  highlightText: {
    flex: 1,
  },
  highlightTitle: {
    color: '#222222',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  highlightDescription: {
    color: '#6F756E',
    fontSize: 15,
    lineHeight: 22,
  },
  actions: {
    gap: 12,
  },
  primaryButton: {
    minHeight: 56,
    borderRadius: 18,
    backgroundColor: '#FAF8F4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
  },
  primaryButtonText: {
    color: '#222222',
    fontSize: 17,
    fontWeight: '800',
  },
});
