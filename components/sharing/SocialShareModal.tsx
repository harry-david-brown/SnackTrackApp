import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { UserSummary } from '../../types/api';
import { useCurrency } from '../../contexts/CurrencyContext';

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

      // Check if we're on web
      if (Platform.OS === 'web') {
        // Web fallback - capture and download
        const uri = await viewShotRef.current?.capture?.();
        
        if (!uri) {
          Alert.alert('Error', 'Failed to capture image');
          return;
        }
        
        // Create download link for web
        const link = document.createElement('a');
        link.href = uri;
        link.download = `snack-track-${template}-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        Alert.alert('Success!', 'Image downloaded to your device. You can now share it manually!');
        onClose();
        return;
      }

      // Capture the view
      const uri = await viewShotRef.current?.capture?.();
      
      if (!uri) {
        Alert.alert('Error', 'Failed to capture image');
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
        Alert.alert('Error', 'Sharing is not available on this device');
      }
    } catch {
      Alert.alert('Error', 'Failed to capture image. Please try again.');
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
      return "You fat fuck :)";
    } else if (analytics.averageOrderValue < 25) {
      return "High volume, lots of small orders";
    } else {
      return "Fuck you";
    }
  };

  const renderSummaryTemplate = () => (
    <LinearGradient
      colors={['#667eea', '#764ba2']}
      style={styles.templateContainer}
    >
      <View style={styles.templateHeader}>
        <Text style={styles.templateTitle}>🥡 SnackTrack Analytics</Text>
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
      colors={['#f093fb', '#f5576c']}
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
      colors={['#4facfe', '#00f2fe']}
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
            <Ionicons name="close" size={24} color="#666" />
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
            colors={['#007AFF', '#5856D6']}
            style={styles.shareButtonGradient}
          >
            <Ionicons name="share-outline" size={24} color="white" />
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
    backgroundColor: '#f8f9fa',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 8,
  },
  templateSelector: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
  },
  templateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  templateButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  templateButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  templateButtonTextActive: {
    color: 'white',
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
    color: 'white',
    textAlign: 'center',
    marginBottom: 8,
  },
  templateSubtitle: {
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
  templateFooter: {
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
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 4,
    marginBottom: 8,
    minHeight: 8,
  },
  trendBarLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
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
    color: 'white',
    marginBottom: 4,
  },
  trendStatLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
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
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  restaurantRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  restaurantRankText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
  },
  restaurantInfo: {
    flex: 1,
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 4,
  },
  restaurantAmount: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  restaurantFooter: {
    alignItems: 'center',
    marginBottom: 24,
  },
  restaurantFooterText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
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
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
