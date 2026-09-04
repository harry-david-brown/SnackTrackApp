import { Colors } from '@constants/theme';
import { Redirect, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@contexts/UserContext';

export default function TabLayout() {
  const { state } = useUser();

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
        tabBarActiveTintColor: Colors.primary,
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'receipt' : 'receipt-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="upload" options={{ href: null, title: 'Data & tracking' }} />
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
          title: 'You',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
