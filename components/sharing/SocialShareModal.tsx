import { Colors } from '@constants/theme';
import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { UserSummary } from '@/types/api';
import { useCurrency } from '@contexts/CurrencyContext';
import { MascotPlaceholder } from '@components/mascot/MascotPlaceholder';
import { showAlert } from '@utils/platformAlert';

interface SocialShareModalProps {
  visible: boolean;
  onClose: () => void;
  analytics: UserSummary;
}

const { width: screenWidth } = Dimensions.get('window');

export default function SocialShareModal({ visible, onClose, analytics }: SocialShareModalProps) {
  const { formatCurrency } = useCurrency();
  const viewShotRef = useRef<ViewShot>(null);

  const captureAndShare = async (template: string) => {
    try {
      if (!viewShotRef.current) return;

      // Capture the view
      const uri = await viewShotRef.current?.capture?.();
      
      if (!uri) {
        showAlert('Error', 'Failed to capture image');
        return;
      }

      // Open native share sheet (Instagram, Twitter, Messages, etc.)
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Share your SnackTrack Analytics',
          UTI: 'public.png', // For iOS Instagram/Stories compatibility
        });
        onClose();
      } else {
        showAlert('Error', 'Sharing is not available on this device');
      }
    } catch {
      showAlert('Error', 'Failed to capture image. Please try again.');
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
      return "Big-ticket orders only. No notes.";
    } else if (analytics.averageOrderValue < 25) {
      return "High volume, lots of small orders";
    } else {
      return "Exactly average. Suspiciously precise.";
    }
  };

  const renderSummaryTemplate = () => (
    <LinearGradient
      colors={[Colors.primary, Colors.secondary]}
      style={styles.templateContainer}
    >
      <View style={styles.templateHeader}>
        {/* MASCOT: share-template brand mark — sunglasses, outline variant */}
        <MascotPlaceholder pose="sunglasses" size={64} variant="outline" hideLabel />
        <Text style={styles.templateTitle}>SnackTrack Analytics</Text>
        <Text style={styles.templateSubtitle}>Your food spending insights</Text>
      </View>

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

      <View style={styles.insightContainer}>
        <Text style={styles.insightText}>{getInsightMessage()}</Text>
      </View>

      <View style={styles.templateFooter}>
        <Text style={styles.footerText}>Track your meals with SnackTrack</Text>
        <Text style={styles.footerSubtext}>snacktrack.app</Text>
      </View>
    </LinearGradient>
  );

  // Reserved for future template selection feature
  /*
  const renderTrendTemplate = () => (
    <LinearGradient
      colors={[Colors.sharePink, Colors.shareCoral]}
      style={styles.templateContainer}
    >
      <View style={styles.templateHeader}>
        <Text style={styles.templateTitle}>📈 Spending Trend</Text>
        <Text style={styles.templateSubtitle}>Your monthly spending pattern</Text>
      </View>

      <View style={styles.trendContainer}>
        <View style={styles.trendChart}>
          {analytics.monthlyBreakdown.slice(0, 6).map((month, index) => (
            <View key={index} style={styles.trendBar}>
              <View 
                style={[
                  styles.trendBarFill, 
                  { height: `${Math.max(10, (month.totalSpent / Math.max(...analytics.monthlyBreakdown.map(m => m.totalSpent))) * 100)}%` }
                ]} 
              />
              <Text style={styles.trendBarLabel}>{month.month.substring(0, 3)}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.trendStats}>
        <View style={styles.trendStat}>
          <Text style={styles.trendStatValue}>{formatCurrency(analytics.totalSpent)}</Text>
          <Text style={styles.trendStatLabel}>Total Spent</Text>
        </View>
        <View style={styles.trendStat}>
          <Text style={styles.trendStatValue}>{analytics.totalReceipts}</Text>
          <Text style={styles.trendStatLabel}>Total Orders</Text>
        </View>
      </View>

      <View style={styles.templateFooter}>
        <Text style={styles.footerText}>Track your meals with SnackTrack</Text>
        <Text style={styles.footerSubtext}>snacktrack.app</Text>
      </View>
    </LinearGradient>
  );

  const renderRestaurantTemplate = () => (
    <LinearGradient
      colors={[Colors.shareSky, Colors.shareCyan]}
      style={styles.templateContainer}
    >
      <View style={styles.templateHeader}>
        <Text style={styles.templateTitle}>🍽️ Restaurant Breakdown</Text>
        <Text style={styles.templateSubtitle}>Your favorite places to eat</Text>
      </View>

      <View style={styles.restaurantList}>
        {analytics.topRestaurants.slice(0, 4).map((restaurant, index) => (
          <View key={index} style={styles.restaurantItem}>
            <View style={styles.restaurantRank}>
              <Text style={styles.restaurantRankText}>#{index + 1}</Text>
            </View>
            <View style={styles.restaurantInfo}>
              <Text style={styles.restaurantName}>{restaurant.name}</Text>
              <Text style={styles.restaurantAmount}>{formatCurrency(restaurant.totalSpent)}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.restaurantFooter}>
        <Text style={styles.restaurantFooterText}>
          Total spent at {analytics.topRestaurants.length} restaurants
        </Text>
      </View>

      <View style={styles.templateFooter}>
        <Text style={styles.footerText}>Track your meals with SnackTrack</Text>
        <Text style={styles.footerSubtext}>snacktrack.app</Text>
      </View>
    </LinearGradient>
  );
  */

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        {/* Header */}
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Share Your Analytics</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Template Preview */}
        <View style={styles.previewContainer}>
          <ViewShot
            ref={viewShotRef}
            options={{
              fileName: `snack-track-summary-${Date.now()}`,
              format: 'png',
              quality: 1.0,
            }}
          >
            {renderSummaryTemplate()}
          </ViewShot>
        </View>

        {/* Share Button */}
        <TouchableOpacity
          style={styles.shareButton}
          onPress={() => captureAndShare('summary')}
        >
          <LinearGradient
            colors={[Colors.primary, Colors.secondary]}
            style={styles.shareButtonGradient}
          >
            <Ionicons name="share-outline" size={24} color={Colors.white} />
            <Text style={styles.shareButtonText}>Share This Graphic</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  closeButton: {
    padding: 8,
  },
  templateSelector: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.white,
  },
  templateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  templateButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  templateButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  templateButtonTextActive: {
    color: Colors.white,
  },
  previewContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  templateContainer: {
    width: screenWidth - 40,
    maxHeight: 550,
    borderRadius: 16,
    padding: 24,
    justifyContent: 'space-between',
  },
  templateHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  templateTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.white,
    textAlign: 'center',
    marginBottom: 8,
  },
  templateSubtitle: {
    fontSize: 16,
    color: Colors.alpha(Colors.white, 0.8),
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
    backgroundColor: Colors.alpha(Colors.white, 0.15),
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 4,
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: Colors.alpha(Colors.white, 0.8),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  insightContainer: {
    backgroundColor: Colors.alpha(Colors.white, 0.15),
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    alignItems: 'center',
  },
  insightText: {
    fontSize: 16,
    color: Colors.white,
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 22,
  },
  templateFooter: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: Colors.alpha(Colors.white, 0.8),
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 12,
    color: Colors.alpha(Colors.white, 0.6),
    fontWeight: '600',
  },
  // Trend template styles
  trendContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  trendChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 120,
    gap: 8,
  },
  trendBar: {
    alignItems: 'center',
    flex: 1,
  },
  trendBarFill: {
    width: 24,
    backgroundColor: Colors.alpha(Colors.white, 0.8),
    borderRadius: 4,
    marginBottom: 8,
    minHeight: 8,
  },
  trendBarLabel: {
    fontSize: 12,
    color: Colors.alpha(Colors.white, 0.8),
    fontWeight: '500',
  },
  trendStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  trendStat: {
    alignItems: 'center',
  },
  trendStatValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 4,
  },
  trendStatLabel: {
    fontSize: 12,
    color: Colors.alpha(Colors.white, 0.8),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Restaurant template styles
  restaurantList: {
    flex: 1,
    marginBottom: 32,
  },
  restaurantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.alpha(Colors.white, 0.15),
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  restaurantRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.alpha(Colors.white, 0.3),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  restaurantRankText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.white,
  },
  restaurantInfo: {
    flex: 1,
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
    marginBottom: 4,
  },
  restaurantAmount: {
    fontSize: 14,
    color: Colors.alpha(Colors.white, 0.8),
  },
  restaurantFooter: {
    alignItems: 'center',
    marginBottom: 24,
  },
  restaurantFooterText: {
    fontSize: 14,
    color: Colors.alpha(Colors.white, 0.8),
    textAlign: 'center',
  },
  shareButton: {
    margin: 20,
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
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
