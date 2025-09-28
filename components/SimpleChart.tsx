import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface SimpleChartProps {
  title: string;
  subtitle?: string;
  data: { label: string; value: number }[];
  maxValue: number;
}

export default function SimpleChart({ title, subtitle, data, maxValue }: SimpleChartProps) {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#007AFF', '#5856D6']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.chartContainer}>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          
          <View style={styles.chartArea}>
            {data.map((item, index) => {
              const percentage = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
              return (
                <View key={index} style={styles.barContainer}>
                  <View style={styles.barWrapper}>
                    <View style={styles.barBackground}>
                      <View 
                        style={[
                          styles.barFill, 
                          { 
                            width: `${Math.max(percentage, 5)}%`,
                            backgroundColor: `hsl(${(index * 60) % 360}, 70%, 60%)`
                          }
                        ]} 
                      />
                    </View>
                    <Text style={styles.barLabel}>{item.label}</Text>
                  </View>
                  <Text style={styles.barValue}>
                    ${item.value.toFixed(0)}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  gradient: {
    padding: 20,
  },
  chartContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 16,
  },
  chartArea: {
    gap: 12,
  },
  barContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  barWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  barBackground: {
    width: 100,
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 10,
    overflow: 'hidden',
    marginRight: 12,
  },
  barFill: {
    height: '100%',
    borderRadius: 10,
    minWidth: 4,
  },
  barLabel: {
    fontSize: 12,
    color: 'white',
    flex: 1,
  },
  barValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
  },
});
