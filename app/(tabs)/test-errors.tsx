import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ErrorMessage, ErrorType } from '../../components/ErrorMessage';
import { EmptyState } from '../../components/EmptyState';
import { ErrorTestingPanel } from '../../components/ErrorTestingPanel';
import { ErrorThrower } from '../../components/ErrorThrower';
import { parseApiError } from '../../utils/errorUtils';
import { testErrorScenarios, createFailingApi } from '../../utils/testErrorScenarios';

function TestErrorsScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<{ message: string; type: ErrorType } | null>(null);
  const [data, setData] = useState<any>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // Auto-scroll to top when error or data changes
  useEffect(() => {
    if (error || data) {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }
  }, [error, data]);

  // Only show this screen in development
  if (!__DEV__) {
    return null;
  }

  const simulateApiCall = async (errorType: string, testFunction: () => Promise<void>) => {
    setIsLoading(true);
    setError(null);
    setData(null);
    
    console.log(`🎯 Starting direct error test: ${errorType}`);
    
    try {
      // Execute the test function - this will throw an error
      await testFunction();
      
      // If we reach here, something's wrong (test should throw)
      setData({ 
        success: true, 
        message: 'Test completed without error (unexpected)',
        timestamp: new Date().toISOString() 
      });
      
    } catch (err) {
      // This is the REAL test - does our error parser handle it correctly?
      console.log(`✅ Direct error test - Error thrown:`, err);
      console.log(`🔍 Now testing error parser...`);
      
      const apiError = parseApiError(err);
      
      console.log(`📊 Parsed error result:`, {
        originalError: (err as Error).message,
        parsedMessage: apiError.message,
        parsedType: apiError.type,
        isRetryable: apiError.isRetryable
      });
      
      const errorData = {
        message: apiError.message,
        type: apiError.type,
      };
      setError(errorData);
    } finally {
      setIsLoading(false);
      console.log(`⏹️ Direct error test completed`);
    }
  };

  const simulateApiError = async (errorType: string, apiName: string) => {
    setIsLoading(true);
    setError(null);
    setData(null);
    
    console.log(`🎯 Starting API test: ${apiName} with ${errorType}`);
    
    try {
      // Use the failing API - this simulates a REAL API call that fails
      const failingApi = createFailingApi(errorType);
      await (failingApi as any)[apiName]('test-user-id', null);
      
      // If we reach here, the test passed (shouldn't happen)
      setData({
        success: true,
        message: `${apiName} completed unexpectedly without error`,
      });
      
    } catch (err) {
      // This is the REAL test - does our error handling work like production?
      console.log(`✅ API error test - Error thrown:`, err);
      console.log(`🔍 Testing error parser with API error...`);
      
      const apiError = parseApiError(err);
      
      console.log(`📊 Parsed API error result:`, {
        apiName,
        originalError: (err as any).message || err,
        parsedMessage: apiError.message,
        parsedType: apiError.type,
        isRetryable: apiError.isRetryable,
        statusCode: (err as any).response?.status
      });
      
      const errorData = {
        message: `${apiName}: ${apiError.message}`,
        type: apiError.type,
      };
      
      setError(errorData);
      console.log(`✅ Error state set, UI should update now`);
      
    } finally {
      setIsLoading(false);
      console.log(`⏹️ API error test completed`);
    }
  };

  const clearError = () => {
    setError(null);
    setData(null);
  };

  const simulateSuccess = async () => {
    setIsLoading(true);
    setError(null);
    
    // Simulate successful API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setData({
      success: true,
      message: 'API call successful!',
      timestamp: new Date().toISOString(),
    });
    setIsLoading(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#FF6B6B', '#FF8E8E']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>🧪 Error Testing</Text>
            <Text style={styles.headerSubtitle}>Test error handling features</Text>
          </View>
          <TouchableOpacity onPress={clearError} style={styles.clearButton}>
            <Ionicons name="refresh" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView ref={scrollViewRef} style={styles.content}>
        {/* Current State */}
        <View style={styles.stateContainer}>
          <Text style={styles.stateTitle}>Current State:</Text>
          
          {isLoading && (
            <View style={styles.stateItem}>
              <LoadingSpinner size="small" color="#FF6B6B" />
              <Text style={styles.stateText}>Loading...</Text>
            </View>
          )}
          
          {error && (
            <ErrorMessage
              error={error.message}
              type={error.type}
              onRetry={() => simulateSuccess()}
              onDismiss={() => setError(null)}
            />
          )}
          
          {data && !error && !isLoading && (
            <View style={styles.successContainer}>
              <Ionicons name="checkmark-circle" size={24} color="#34C759" />
              <Text style={styles.successText}>
                {data.message || 'Operation completed successfully!'}
              </Text>
            </View>
          )}
          
          {!data && !error && !isLoading && (
            <EmptyState
              icon="play-circle-outline"
              title="Ready to Test"
              message="Use the testing panel to simulate different error scenarios and see how the app handles them."
              actionText="Simulate Success"
              onAction={simulateSuccess}
            />
          )}
        </View>

        {/* Test Buttons */}
        <View style={styles.testContainer}>
          <Text style={styles.testTitle}>Quick Tests:</Text>
          
          <TouchableOpacity
            style={[styles.testButton, styles.successButton]}
            onPress={simulateSuccess}
            disabled={isLoading}
          >
            <Ionicons name="checkmark" size={20} color="white" />
            <Text style={styles.testButtonText}>Simulate Success</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.testButton, styles.errorButton]}
            onPress={() => simulateApiCall('Network Error', () => testErrorScenarios.simulateNetworkError())}
            disabled={isLoading}
          >
            <Ionicons name="wifi-outline" size={20} color="white" />
            <Text style={styles.testButtonText}>Network Error</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.testButton, styles.errorButton]}
            onPress={() => simulateApiCall('Server Error', () => testErrorScenarios.simulateServerError())}
            disabled={isLoading}
          >
            <Ionicons name="server-outline" size={20} color="white" />
            <Text style={styles.testButtonText}>Server Error</Text>
          </TouchableOpacity>
        </View>

        {/* Error Boundary Test */}
        <ErrorThrower />

        {/* Instructions */}
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsTitle}>How to Test:</Text>
          <Text style={styles.instructionsText}>
            • Use the floating "Test Errors" button to access more test scenarios
          </Text>
          <Text style={styles.instructionsText}>
            • Try different error types to see how they're categorized
          </Text>
          <Text style={styles.instructionsText}>
            • Test retry functionality by clicking "Try Again" on errors
          </Text>
          <Text style={styles.instructionsText}>
            • Turn off your internet to test network status indicator
          </Text>
          <Text style={styles.instructionsText}>
            • Check the network status bar at the top of the app
          </Text>
          <Text style={styles.instructionsText}>
            • Use "Throw React Error" to test the ErrorBoundary
          </Text>
        </View>
      </ScrollView>

      {/* Floating Error Testing Panel */}
      <ErrorTestingPanel
        onTestError={simulateApiCall}
        onTestApiError={simulateApiError}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    paddingTop: 10,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  clearButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    padding: 12,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  stateContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  stateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  stateItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stateText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#666',
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d4edda',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c3e6cb',
  },
  successText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#155724',
    fontWeight: '500',
  },
  testContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  testTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  successButton: {
    backgroundColor: '#34C759',
  },
  errorButton: {
    backgroundColor: '#FF6B6B',
  },
  testButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  instructionsContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  instructionsText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
});

export default TestErrorsScreen;
