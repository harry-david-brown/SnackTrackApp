import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AnalyticsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>📊 Analytics</Text>
        <Text style={styles.subtitle}>Your spending insights</Text>
        
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Monthly Breakdown</Text>
          <Text style={styles.cardValue}>No data yet</Text>
        </View>
        
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Top Restaurants</Text>
          <Text style={styles.cardValue}>Upload CSV to see insights</Text>
        </View>
        
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Spending Trends</Text>
          <Text style={styles.cardValue}>Charts coming soon</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  card: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  cardValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
});
