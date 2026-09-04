import { Redirect, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@contexts/UserContext';
import { useAppTheme } from '@contexts/AppearanceContext';

export default function TabLayout() {
  const { state } = useUser();
  const theme = useAppTheme();

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
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.gray500,
        tabBarStyle: {
          minHeight: 64,
          paddingTop: 7,
          paddingBottom: 8,
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.divider,
          borderTopWidth: 1,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: { fontFamily: theme.typography.medium, fontSize: 10, lineHeight: 13 },
        sceneStyle: { backgroundColor: theme.colors.background },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={18} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'receipt' : 'receipt-outline'} size={18} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="upload" options={{ href: null, title: 'Data & tracking' }} />
      <Tabs.Screen
        name="wrapped-journey"
        options={{
          title: 'Summary',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'sparkles' : 'sparkles-outline'} size={18} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'You',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={18} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
