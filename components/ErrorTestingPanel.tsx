import { Colors } from '@/constants/theme';
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { testErrorScenarios, runConsecutiveErrors, runRandomErrors } from '../utils/testErrorScenarios';
import { showAlert } from '../utils/platformAlert';

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
        <Ionicons name="bug" size={20} color={Colors.white} />
        <Text style={styles.toggleButtonText}>Test Errors</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🧪 Error Testing Panel</Text>
        <TouchableOpacity onPress={() => setIsVisible(false)}>
          <Ionicons name="close" size={24} color={Colors.textSecondary} />
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
              <Ionicons name={test.icon as any} size={20} color={Colors.primary} />
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
            <Ionicons name="warning-outline" size={20} color={Colors.errorBright} />
            <Text style={styles.testButtonText}>3x Network Errors</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.testButton, styles.stressTestButton]}
            onPress={() => {
              onTestError('stress_server', () => runConsecutiveErrors('simulateServerError', 5, 800));
            }}
          >
            <Ionicons name="warning-outline" size={20} color={Colors.errorBright} />
            <Text style={styles.testButtonText}>5x Server Errors</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.testButton, styles.chaosTestButton]}
            onPress={() => {
              onTestError('chaos', () => runRandomErrors(5));
            }}
          >
            <Ionicons name="flask-outline" size={20} color={Colors.purple} />
            <Text style={styles.testButtonText}>Chaos Test (5 Random)</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Manual Tests</Text>
          <TouchableOpacity
            style={styles.testButton}
            onPress={() => {
              showAlert(
                'Manual Network Test',
                'To test real network conditions:\n\n1. Turn off WiFi/mobile data\n2. Use airplane mode\n3. Try uploading CSV or refreshing data\n4. Observe network status indicator at top',
                [{ text: 'Got it' }]
              );
            }}
          >
            <Ionicons name="wifi-outline" size={20} color={Colors.primary} />
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
    backgroundColor: Colors.errorBright,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 1000,
    shadowColor: Colors.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  toggleButtonText: {
    color: Colors.white,
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
    backgroundColor: Colors.white,
    zIndex: 1001,
    shadowColor: Colors.black,
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
    borderBottomColor: Colors.divider,
    backgroundColor: Colors.background,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
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
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  stressTestButton: {
    borderColor: Colors.errorLegacySurface,
    backgroundColor: Colors.errorLegacySurface,
  },
  chaosTestButton: {
    borderColor: Colors.purpleSurface,
    backgroundColor: Colors.purpleSurface,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  testButtonText: {
    marginLeft: 12,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  apiGroup: {
    marginBottom: 16,
  },
  apiLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  apiButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  apiTestButton: {
    backgroundColor: Colors.infoSurface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.infoBorder,
  },
  apiTestButtonText: {
    fontSize: 12,
    color: Colors.infoDark,
    fontWeight: '500',
  },
});

export default ErrorTestingPanel;
