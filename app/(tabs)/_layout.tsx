import { Redirect, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { featureFlags } from '../../config/featureFlags';
import { useUser } from '../../contexts/UserContext';

export default function TabLayout() {
  const { state } = useUser();
  const showDevTabs = featureFlags.showTestErrors;

  // Declarative auth gate: any time the user is signed out (including after
  // logout from any tab), this layout redirects to the dedicated login route.
  // Do not redirect to "/" here: both app/index.tsx and (tabs)/index.tsx map
  // to that URL, which can resolve back into this layout and redirect forever.
  // Screens inside the tabs never need to navigate on logout themselves.
  if (!state.isLoading && !state.isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#1F4E3A',
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
