import { Tabs } from 'expo-router';
import { Chrome as Home, History, User, ChartBar as BarChart3 } from 'lucide-react-native';
import { View, StyleSheet, Text, Dimensions, PanResponder } from 'react-native';
import { useRouter } from 'expo-router';
import { useRef } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

const { width } = Dimensions.get('window');

export default function TabLayout() {
  const { theme } = useTheme();
  const router = useRouter();

  // Create pan responder for swipe gestures
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 20;
      },
      onPanResponderMove: (evt, gestureState) => {
        // Optional: Add visual feedback during swipe
      },
      onPanResponderRelease: (evt, gestureState) => {
        const { dx, vx } = gestureState;
        const swipeThreshold = width * 0.25; // 25% of screen width
        const velocityThreshold = 0.5;

        // Determine if it's a valid swipe
        if (Math.abs(dx) > swipeThreshold || Math.abs(vx) > velocityThreshold) {
          const currentRoute = router.pathname;

          if (dx > 0) {
            // Swipe right - go to previous tab
            if (currentRoute === '/(tabs)/profile') {
              router.push('/(tabs)/stats');
            } else if (currentRoute === '/(tabs)/stats') {
              router.push('/(tabs)/history');
            } else if (currentRoute === '/(tabs)/history') {
              router.push('/(tabs)');
            }
          } else {
            // Swipe left - go to next tab
            if (currentRoute === '/(tabs)' || currentRoute === '/(tabs)/index') {
              router.push('/(tabs)/history');
            } else if (currentRoute === '/(tabs)/history') {
              router.push('/(tabs)/stats');
            } else if (currentRoute === '/(tabs)/stats') {
              router.push('/(tabs)/profile');
            }
          }
        }
      },
    })
  ).current;

  return (
    <View style={{ flex: 1 }} {...panResponder.panHandlers}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: [styles.tabBar, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }],
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.textSecondary,
          tabBarShowLabel: true,
          tabBarLabelStyle: [styles.tabBarLabel, { color: theme.colors.textSecondary }],
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, size, focused }) => (
              <View style={[
                styles.iconContainer,
                focused && [styles.iconContainerActive, { backgroundColor: theme.colors.primary + '20' }]
              ]}>
                <Home color={color} size={size} />
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: 'History',
            tabBarIcon: ({ color, size, focused }) => (
              <View style={[
                styles.iconContainer,
                focused && [styles.iconContainerActive, { backgroundColor: theme.colors.primary + '20' }]
              ]}>
                <History color={color} size={size} />
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="stats"
          options={{
            title: 'Statistics',
            tabBarIcon: ({ color, size, focused }) => (
              <View style={[
                styles.iconContainer,
                focused && [styles.iconContainerActive, { backgroundColor: theme.colors.primary + '20' }]
              ]}>
                <BarChart3 color={color} size={size} />
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, size, focused }) => (
              <View style={[
                styles.iconContainer,
                focused && [styles.iconContainerActive, { backgroundColor: theme.colors.primary + '20' }]
              ]}>
                <User color={color} size={size} />
              </View>
            ),
          }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    borderTopWidth: 0,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    height: 80,
    paddingBottom: 20,
    paddingTop: 10,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  iconContainerActive: {
  },
  tabBarLabel: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    marginTop: 4,
  },
});