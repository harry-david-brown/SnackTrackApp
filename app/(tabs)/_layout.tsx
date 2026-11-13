import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSystemFontScale } from '@hooks/useSystemFontScale';
import { AppText } from '@components/ui/AppText';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { I18nManager, Platform, useWindowDimensions } from 'react-native';
import { Motion } from '@constants/motion';
import { useAppReducedMotion } from '@contexts/MotionContext';
import { useAppTheme } from '@contexts/AppearanceContext';

export default function TabLayout() {
  const theme = useAppTheme();
  const reduceMotion = useAppReducedMotion();
  const { width } = useWindowDimensions();
  const fontScale = useSystemFontScale();
  const insets = useSafeAreaInsets();
  const androidTabs = Platform.OS === 'android';
  const slideWidth = I18nManager.isRTL ? -width : width;

  return (
    <Tabs
      screenOptions={{
        animation: reduceMotion ? 'none' : 'shift',
        transitionSpec: { animation: 'timing', config: { duration: reduceMotion ? 0 : Motion.page, easing: Motion.easing } },
        // Crossfading a whole scene blends elevated cards and their shadows.
        // Slide opaque pages fully offscreen instead of using the preset's alpha fade.
        sceneStyleInterpolator: ({ current }) => ({
          sceneStyle: {
            transform: [{
              translateX: current.progress.interpolate({
                inputRange: [-1, 0, 1],
                outputRange: [-slideWidth, 0, slideWidth],
                extrapolate: 'clamp',
              }),
            }],
          },
        }),
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.gray500,
        tabBarStyle: {
          minHeight: androidTabs ? 64 + Math.max(0, fontScale - 1) * 30 + insets.bottom : 64,
          paddingTop: 7,
          paddingBottom: androidTabs ? Math.max(8, insets.bottom) : 8,
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.divider,
          borderTopWidth: 1,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarAllowFontScaling: true,
        tabBarLabel: androidTabs ? ({ color, children }) => (
          <AppText variant="metadata" adjustsFontSizeToFit minimumFontScale={0.8} numberOfLines={1} style={{ color, fontFamily: theme.typography.medium, fontSize: 10, lineHeight: 13 }}>{children}</AppText>
        ) : undefined,
        tabBarLabelStyle: { fontFamily: theme.typography.medium, fontSize: 10, lineHeight: 13 },
        sceneStyle: { backgroundColor: theme.colors.background, overflow: 'hidden' },
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
