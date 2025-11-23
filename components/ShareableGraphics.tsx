import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { UserSummary } from '../types/api';
import { useCurrency } from '../contexts/CurrencyContext';

interface ShareableGraphicsProps {
  analytics: UserSummary;
  onShare?: (uri: string) => void;
}

export default function ShareableGraphics({ analytics, onShare }: ShareableGraphicsProps) {
  const { formatCurrency } = useCurrency();
  const viewShotRef = useRef<ViewShot>(null);

  const captureAndShare = async () => {
    try {
      if (!viewShotRef.current) return;

      // Capture the view
      const uri = await viewShotRef.current?.capture?.();
      
      if (!uri) {
        alert('Failed to capture image');
        return;
      }

      // Open native share sheet
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Share your Snack Track Analytics',
          UTI: 'public.png',
        });
        onShare?.(uri);
      } else {
        alert('Sharing is not available on this device');
      }
    } catch {
      alert('Failed to capture image. Please try again.');
    }
  };

  const getTopRestaurant = () => {
    return analytics.topRestaurants[0] || { name: 'No data yet', amount: 0 };
  };

  const getInsightMessage = () => {
    if (analytics.totalSpent === 0) {
      return "Start tracking your meals to unlock insights!";
    }
    
    if (analytics.averageOrderValue > 25) {
      return "You love premium dining experiences!";
    } else if (analytics.averageOrderValue > 15) {
      return "You enjoy quality meals on the go!";
    } else {
      return "You're a smart spender with great taste!";
    }
  };

  return (
    <View style={styles.container}>
      {/* Shareable Graphic Preview */}
      <ViewShot
        ref={viewShotRef}
        options={{
          fileName: `snack-track-analytics-${Date.now()}`,
          format: 'png',
          quality: 1.0,
        }}
        style={styles.graphicContainer}
      >
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.graphicBackground}
        >
          {/* Header */}
          <View style={styles.graphicHeader}>
            <Text style={styles.graphicTitle}>🥡 Snack Track Analytics</Text>
            <Text style={styles.graphicSubtitle}>Your food spending insights</Text>
          </View>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{formatCurrency(analytics.totalSpent)}</Text>
              <Text style={styles.statLabel}>Total Spent</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{analytics.totalReceipts}</Text>
              <Text style={styles.statLabel}>Orders</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{formatCurrency(analytics.averageOrderValue)}</Text>
              <Text style={styles.statLabel}>Avg Order</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{getTopRestaurant().name}</Text>
              <Text style={styles.statLabel}>Top Restaurant</Text>
            </View>
          </View>

          {/* Insight Message */}
          <View style={styles.insightContainer}>
            <Text style={styles.insightText}>{getInsightMessage()}</Text>
          </View>

          {/* Footer */}
          <View style={styles.graphicFooter}>
            <Text style={styles.footerText}>Track your meals with Snack Track</Text>
            <Text style={styles.footerSubtext}>snacktrack.app</Text>
          </View>
        </LinearGradient>
      </ViewShot>

      {/* Share Button */}
      <TouchableOpacity style={styles.shareButton} onPress={captureAndShare}>
        <LinearGradient
          colors={['#007AFF', '#5856D6']}
          style={styles.shareButtonGradient}
        >
          <Ionicons name="share-outline" size={24} color="white" />
          <Text style={styles.shareButtonText}>Share Analytics</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: 20,
  },
  graphicContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  graphicBackground: {
    padding: 24,
    minHeight: 400,
    justifyContent: 'space-between',
  },
  graphicHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  graphicTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 8,
  },
  graphicSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  statCard: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  insightContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    alignItems: 'center',
  },
  insightText: {
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 22,
  },
  graphicFooter: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '600',
  },
  shareButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  shareButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  shareButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
