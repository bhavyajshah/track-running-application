import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { X, User, Settings, Trophy, Target, ChartBar as BarChart3, CircleHelp as HelpCircle, LogOut } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import AnimatedButton from '@/components/AnimatedButton';
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');

interface SidebarProps {
  visible: boolean;
  onClose: () => void;
  translateX: Animated.SharedValue<number>;
  opacity: Animated.SharedValue<number>;
}

export default function Sidebar({ visible, onClose, translateX, opacity }: SidebarProps) {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { theme } = useTheme();

  const menuItems = [
    {
      id: 'profile',
      title: 'Profile',
      icon: User,
      route: '/(tabs)/profile',
      color: '#8B5CF6',
    },
    {
      id: 'achievements',
      title: 'Achievements',
      icon: Trophy,
      route: '/achievements',
      color: '#F59E0B',
    },
    {
      id: 'goals',
      title: 'Goals',
      icon: Target,
      route: '/goals',
      color: '#10B981',
    },
    {
      id: 'stats',
      title: 'Statistics',
      icon: BarChart3,
      route: '/(tabs)/stats',
      color: '#3B82F6',
    },
    {
      id: 'settings',
      title: 'Settings',
      icon: Settings,
      route: '/settings',
      color: '#6B7280',
    },
    {
      id: 'help',
      title: 'Help & Support',
      icon: HelpCircle,
      route: null,
      color: '#06B6D4',
    },
  ];

  const animatedSidebarStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  const animatedOverlayStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  const handleItemPress = (item: any) => {
    if (item.route) {
      router.push(item.route as any);
    }
    onClose();
  };

  const handleSignOut = () => {
    signOut();
    onClose();
  };

  if (!visible) return null;

  return (
    <View style={styles.container}>
      {/* Overlay */}
      <Animated.View style={[styles.overlay, animatedOverlayStyle]}>
        <TouchableOpacity style={styles.overlayTouchable} onPress={onClose} />
      </Animated.View>

      {/* Sidebar */}
      <Animated.View style={[styles.sidebar, animatedSidebarStyle]}>
        <BlurView intensity={100} style={[styles.blurContainer, { backgroundColor: theme.colors.surface + 'F0' }]}>
          {/* Header */}
          <View style={styles.header}>
            <AnimatedButton onPress={onClose} style={styles.closeButton} hapticType="light">
              <X size={24} color={theme.colors.textSecondary} />
            </AnimatedButton>
          </View>

          {/* User Info */}
          <View style={styles.userSection}>
            <Image
              source={{ uri: user?.avatar_url || 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=240&h=240&dpr=2' }}
              style={styles.avatar}
            />
            <Text style={[styles.userName, { color: theme.colors.text }]}>{user?.full_name || 'User'}</Text>
            <Text style={[styles.userEmail, { color: theme.colors.textSecondary }]}>{user?.email || 'user@example.com'}</Text>
          </View>

          {/* Menu Items */}
          <View style={styles.menuSection}>
            {menuItems.map((item) => {
              const IconComponent = item.icon;
              return (
                <AnimatedButton
                  key={item.id}
                  style={styles.menuItem}
                  onPress={() => handleItemPress(item)}
                >
                  <View style={[styles.menuIcon, { backgroundColor: `${item.color}20` }]}>
                    <IconComponent size={20} color={item.color} />
                  </View>
                  <Text style={[styles.menuText, { color: theme.colors.text }]}>{item.title}</Text>
                </AnimatedButton>
              );
            })}
          </View>

          {/* Sign Out */}
          <View style={styles.footerSection}>
            <AnimatedButton style={[styles.signOutButton, { backgroundColor: theme.colors.error + '20' }]} onPress={handleSignOut} hapticType="warning">
              <LogOut size={20} color="#EF4444" />
              <Text style={styles.signOutText}>Sign Out</Text>
            </AnimatedButton>
          </View>
        </BlurView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  overlayTouchable: {
    flex: 1,
  },
  sidebar: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: width * 0.8,
    maxWidth: 320,
  },
  blurContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  closeButton: {
    padding: 8,
  },
  userSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginHorizontal: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 16,
  },
  userName: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  menuSection: {
    flex: 1,
    paddingTop: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  menuText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
  footerSection: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 12,
  },
  signOutText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#EF4444',
  },
});