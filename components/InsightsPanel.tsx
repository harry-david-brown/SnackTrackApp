import React, { useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { UserSummary } from '../types/api';
import { useCurrency } from '../contexts/CurrencyContext';

interface InsightsPanelProps {
  analytics: UserSummary;
}

export default function InsightsPanel({ analytics }: InsightsPanelProps) {
  const { formatCurrency } = useCurrency();

  const generateInsights = useCallback(() => {
    const insights = [];

    // Top restaurant insight
    if (analytics.topRestaurants.length > 0) {
      const topRestaurant = analytics.topRestaurants[0];
      const percentage = ((topRestaurant.totalSpent / analytics.totalSpent) * 100).toFixed(1);
      
      insights.push({
        icon: 'trophy-outline',
        iconColor: '#FFD700',
        title: 'Restaurant Champion',
        description: `${topRestaurant.name} is your go-to spot! You've spent ${formatCurrency(topRestaurant.totalSpent)} (${percentage}%) there.`,
        type: 'achievement',
      });
    }

    // Spending pattern insight
    const avgOrderValue = analytics.averageOrderValue;
    if (avgOrderValue > 25) {
      insights.push({
        icon: 'trending-up-outline',
        iconColor: '#FF6B6B',
        title: 'Premium Eater',
        description: `Your average order of ${formatCurrency(avgOrderValue)} shows you enjoy quality dining experiences!`,
        type: 'pattern',
      });
    } else if (avgOrderValue < 15) {
      insights.push({
        icon: 'wallet-outline',
        iconColor: '#34C759',
        title: 'Smart Spender',
        description: `Great job keeping your average order at ${formatCurrency(avgOrderValue)}! You're making every dollar count.`,
        type: 'pattern',
      });
    }

    // Order frequency insight
    const totalOrders = analytics.totalReceipts;
    if (totalOrders > 100) {
      insights.push({
        icon: 'restaurant-outline',
        iconColor: '#007AFF',
        title: 'Foodie Status',
        description: `Wow! ${totalOrders} orders shows you're a true food enthusiast. That's dedication!`,
        type: 'achievement',
      });
    } else if (totalOrders < 20) {
      insights.push({
        icon: 'home-outline',
        iconColor: '#FF9500',
        title: 'Home Chef',
        description: `With ${totalOrders} orders, you prefer home cooking. Consider treating yourself more often!`,
        type: 'suggestion',
      });
    }

    // Category diversity insight
    const uniqueCategories = new Set();
    analytics.topRestaurants.forEach(restaurant => {
      const name = restaurant.name.toLowerCase();
      if (name.includes('pizza')) uniqueCategories.add('pizza');
      else if (name.includes('burger') || name.includes('mcdonald')) uniqueCategories.add('fast food');
      else if (name.includes('chinese') || name.includes('thai')) uniqueCategories.add('asian');
      else if (name.includes('mexican')) uniqueCategories.add('mexican');
      else uniqueCategories.add('other');
    });

    if (uniqueCategories.size >= 4) {
      insights.push({
        icon: 'globe-outline',
        iconColor: '#5856D6',
        title: 'Culinary Explorer',
        description: `You've tried ${uniqueCategories.size} different food categories! Your taste buds are adventurous.`,
        type: 'achievement',
      });
    }

    // Monthly spending insight
    if (analytics.monthlyBreakdown.length > 0) {
      const monthlySpending = analytics.monthlyBreakdown.map(m => m.totalSpent);
      const maxMonth = Math.max(...monthlySpending);
      const minMonth = Math.min(...monthlySpending);
      const variation = ((maxMonth - minMonth) / minMonth) * 100;

      if (variation > 100) {
        insights.push({
          icon: 'pulse-outline',
          iconColor: '#FF2D92',
          title: 'Variable Spender',
          description: `Your monthly spending varies by ${variation.toFixed(0)}%. Consider setting a monthly food budget!`,
          type: 'suggestion',
        });
      }
    }

    return insights.slice(0, 4); // Show top 4 insights
  }, [analytics, formatCurrency]);

  const insights = useMemo(() => generateInsights(), [generateInsights]);

  if (insights.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>💡 Insights</Text>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Keep using Snack Track to unlock personalized insights!</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>💡 Insights</Text>
      {insights.map((insight, index) => (
        <TouchableOpacity key={index} style={styles.insightCard}>
          <LinearGradient
            colors={
              insight.type === 'achievement' 
                ? ['#FFD700', '#FFA500']
                : insight.type === 'suggestion'
                ? ['#FF6B6B', '#FF8E8E']
                : ['#007AFF', '#5856D6']
            }
            style={styles.insightGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.insightContent}>
              <View style={styles.insightHeader}>
                <View style={styles.iconContainer}>
                  <Ionicons name={insight.icon as any} size={24} color="white" />
                </View>
                <View style={styles.insightTextContainer}>
                  <Text style={styles.insightTitle}>{insight.title}</Text>
                  <Text style={styles.insightDescription}>{insight.description}</Text>
                </View>
              </View>
              <View style={styles.insightBadge}>
                <Text style={styles.insightBadgeText}>
                  {insight.type === 'achievement' ? '🏆' : insight.type === 'suggestion' ? '💡' : '📊'}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  emptyContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  insightCard: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  insightGradient: {
    padding: 16,
  },
  insightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    padding: 8,
    marginRight: 12,
  },
  insightTextContainer: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  insightDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 18,
  },
  insightBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    padding: 8,
    minWidth: 32,
    alignItems: 'center',
  },
  insightBadgeText: {
    fontSize: 16,
  },
});
