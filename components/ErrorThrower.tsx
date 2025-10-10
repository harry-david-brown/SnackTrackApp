import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ErrorThrowerProps {
  onThrowError?: () => void;
}

export const ErrorThrower: React.FC<ErrorThrowerProps> = ({ onThrowError }) => {
  const [shouldThrow, setShouldThrow] = useState(false);

  // This will cause the ErrorBoundary to catch the error
  if (shouldThrow) {
    throw new Error('Test error thrown by ErrorThrower component');
  }

  const handleThrowError = () => {
    setShouldThrow(true);
    onThrowError?.();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Error Boundary Test</Text>
      <Text style={styles.description}>
        This button will throw a React error to test the ErrorBoundary component.
      </Text>
      
      <TouchableOpacity style={styles.button} onPress={handleThrowError}>
        <Ionicons name="warning" size={20} color="white" />
        <Text style={styles.buttonText}>Throw React Error</Text>
      </TouchableOpacity>
      
      <Text style={styles.warning}>
        ⚠️ This will crash the current screen and show the ErrorBoundary fallback
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    margin: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  warning: {
    fontSize: 12,
    color: '#FF9500',
    fontStyle: 'italic',
    textAlign: 'center',
  },
});

export default ErrorThrower;
