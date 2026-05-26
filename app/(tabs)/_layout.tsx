import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { featureFlags } from '../../config/featureFlags';

export default function TabLayout() {
  const showDevTabs = featureFlags.showTestErrors;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#007AFF',
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="upload"
        options={{
          title: 'Upload',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'cloud-upload' : 'cloud-upload-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="wrapped-journey"
        options={{
          title: 'Summary',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'document-text' : 'document-text-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="test-errors"
        options={{
          title: 'Test Errors',
          href: showDevTabs ? undefined : null,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'bug' : 'bug-outline'} size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
