import { Tabs } from 'expo-router';
import { Chrome as Home, History, User, ChartBar as BarChart3 } from 'lucide-react-native';
import { View, StyleSheet, Text } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

export default function TabLayout() {
  const { theme } = useTheme();

  return (
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