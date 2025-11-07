import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';

const resolveAppEnv = () => {
  const extras =
    (Constants.expoConfig?.extra as Record<string, any> | undefined) ??
    ((Constants as any).manifest?.extra as Record<string, any> | undefined) ??
    ((Constants as any).manifest2?.extra as Record<string, any> | undefined) ??
    {};

  return extras.appEnv ?? process.env.EXPO_PUBLIC_APP_ENV ?? 'production';
};

export default function TabLayout() {
  const appEnv = resolveAppEnv();
  const showDevTabs = __DEV__ || appEnv === 'development';

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
        name="analytics"
        options={{
          title: 'Analytics',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'bar-chart' : 'bar-chart-outline'} size={24} color={color} />
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
      <Tabs.Screen
        name="wrapped-journey"
        options={{
          href: null, // Hide from tab bar
          title: 'Your Wrapped',
        }}
      />
    </Tabs>
  );
}
