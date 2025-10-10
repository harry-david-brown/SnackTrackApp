import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { testErrorScenarios, createFailingApi, runConsecutiveErrors, runRandomErrors } from '../utils/testErrorScenarios';

interface ErrorTestingPanelProps {
  onTestError: (errorType: string, testFunction: () => Promise<void>) => void;
  onTestApiError: (errorType: string, apiName: string) => void;
}

export const ErrorTestingPanel: React.FC<ErrorTestingPanelProps> = ({
  onTestError,
  onTestApiError,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  if (!__DEV__) {
    return null; // Only show in development
  }

  const errorTests = [
    { key: 'simulateNetworkError', label: 'Network Error', icon: 'wifi-outline' },
    { key: 'simulateTimeoutError', label: 'Timeout Error', icon: 'time-outline' },
    { key: 'simulateServerError', label: 'Server Error (500)', icon: 'server-outline' },
    { key: 'simulateValidationError', label: 'Validation Error', icon: 'alert-circle-outline' },
    { key: 'simulateRateLimitError', label: 'Rate Limit Error', icon: 'speedometer-outline' },
    { key: 'simulateAuthError', label: 'Auth Error', icon: 'lock-closed-outline' },
  ];

  const apiTests = [
    { name: 'getUserSummary', label: 'Analytics API' },
    { name: 'getTotalSpent', label: 'User API' },
    { name: 'importCsv', label: 'CSV Upload API' },
  ];

  const handleTestError = (errorKey: string) => {
    const testFunction = async () => {
      try {
        testErrorScenarios[errorKey as keyof typeof testErrorScenarios]();
      } catch (error) {
        throw error;
      }
    };
    onTestError(errorKey, testFunction);
  };

  const handleTestApiError = (errorType: string, apiName: string) => {
    onTestApiError(errorType, apiName);
  };

  if (!isVisible) {
    return (
      <TouchableOpacity
        style={styles.toggleButton}
        onPress={() => setIsVisible(true)}
      >
        <Ionicons name="bug" size={20} color="white" />
        <Text style={styles.toggleButtonText}>Test Errors</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🧪 Error Testing Panel</Text>
        <TouchableOpacity onPress={() => setIsVisible(false)}>
          <Ionicons name="close" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Direct Error Tests</Text>
          {errorTests.map((test) => (
            <TouchableOpacity
              key={test.key}
              style={styles.testButton}
              onPress={() => handleTestError(test.key)}
            >
              <Ionicons name={test.icon as any} size={20} color="#007AFF" />
              <Text style={styles.testButtonText}>{test.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>API Error Tests</Text>
          {apiTests.map((api) => (
            <View key={api.name} style={styles.apiGroup}>
              <Text style={styles.apiLabel}>{api.label}</Text>
              <View style={styles.apiButtons}>
                {errorTests.map((errorTest) => (
                  <TouchableOpacity
                    key={`${api.name}-${errorTest.key}`}
                    style={styles.apiTestButton}
                    onPress={() => handleTestApiError(errorTest.key, api.name)}
                  >
                    <Text style={styles.apiTestButtonText}>
                      {errorTest.label.split(' ')[0]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Stress Tests</Text>
          <Text style={styles.sectionDescription}>
            Test error resilience with multiple consecutive errors
          </Text>
          
          <TouchableOpacity
            style={[styles.testButton, styles.stressTestButton]}
            onPress={() => {
              onTestError('stress_network', () => runConsecutiveErrors('simulateNetworkError', 3, 1000));
            }}
          >
            <Ionicons name="warning-outline" size={20} color="#FF6B6B" />
            <Text style={styles.testButtonText}>3x Network Errors</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.testButton, styles.stressTestButton]}
            onPress={() => {
              onTestError('stress_server', () => runConsecutiveErrors('simulateServerError', 5, 800));
            }}
          >
            <Ionicons name="warning-outline" size={20} color="#FF6B6B" />
            <Text style={styles.testButtonText}>5x Server Errors</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.testButton, styles.chaosTestButton]}
            onPress={() => {
              onTestError('chaos', () => runRandomErrors(5));
            }}
          >
            <Ionicons name="flask-outline" size={20} color="#9C27B0" />
            <Text style={styles.testButtonText}>Chaos Test (5 Random)</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Manual Tests</Text>
          <TouchableOpacity
            style={styles.testButton}
            onPress={() => {
              Alert.alert(
                'Manual Network Test',
                'To test real network conditions:\n\n1. Turn off WiFi/mobile data\n2. Use airplane mode\n3. Try uploading CSV or refreshing data\n4. Observe network status indicator at top',
                [{ text: 'Got it' }]
              );
            }}
          >
            <Ionicons name="wifi-outline" size={20} color="#007AFF" />
            <Text style={styles.testButtonText}>Network Offline Instructions</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  toggleButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: '#FF6B6B',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  toggleButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'white',
    zIndex: 1001,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  stressTestButton: {
    borderColor: '#FFEBEE',
    backgroundColor: '#FFEBEE',
  },
  chaosTestButton: {
    borderColor: '#F3E5F5',
    backgroundColor: '#F3E5F5',
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  testButtonText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#333',
  },
  apiGroup: {
    marginBottom: 16,
  },
  apiLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8,
  },
  apiButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  apiTestButton: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bbdefb',
  },
  apiTestButtonText: {
    fontSize: 12,
    color: '#1976d2',
    fontWeight: '500',
  },
});

export default ErrorTestingPanel;
