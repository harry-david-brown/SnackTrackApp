import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ChartContainerProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onShare?: () => void;
  shareable?: boolean;
}

export default function ChartContainer({ 
  title, 
  subtitle, 
  children, 
  onShare,
  shareable = true 
}: ChartContainerProps) {
  const handleShare = async () => {
    if (onShare) {
      onShare();
      return;
    }

    try {
      // Default share functionality
      const shareText = `🥡 ${title} - Check out my spending insights with Snack Track!`;
      
      await Share.share({
        message: shareText,
        title: `Snack Track - ${title}`,
      });
    } catch (error) {
      // Silently fail - user can try again
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
        {shareable && (
          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <Ionicons name="share-outline" size={20} color="#007AFF" />
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.chartContent}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 20,
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  shareButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    padding: 8,
  },
  chartContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
});
