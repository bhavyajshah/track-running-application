import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Bell, Shield, Globe, Moon, Smartphone, CircleHelp as HelpCircle, Info, LogOut, ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import AnimatedButton from '@/components/AnimatedButton';
import PermissionManager from '@/components/PermissionManager';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';

interface SettingItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ComponentType<any>;
  type: 'toggle' | 'navigation' | 'action';
  value?: boolean;
  onPress?: () => void;
  onToggle?: (value: boolean) => void;
  color?: string;
}

export default function SettingsScreen() {
  const router = useRouter();
  const { user, signOut, updateUser } = useAuth();
  const { theme, isDark, toggleTheme } = useTheme();
  const [notifications, setNotifications] = useState(user?.preferences?.notifications ?? true);
  const [privacy, setPrivacy] = useState(user?.preferences?.privacy ?? true);
  const [showPermissions, setShowPermissions] = useState(false);

  const buttonScale = useSharedValue(1);

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive', 
          onPress: () => signOut() 
        }
      ]
    );
  };

  const handleNotificationToggle = (value: boolean) => {
    setNotifications(value);
    if (user) {
      updateUser({
        preferences: {
          ...user.preferences,
          notifications: value,
        }
      });
    }
  };

  const handlePrivacyToggle = (value: boolean) => {
    setPrivacy(value);
    if (user) {
      updateUser({
        preferences: {
          ...user.preferences,
          privacy: value,
        }
      });
    }
  };

  const handleThemeToggle = () => {
    toggleTheme();
  };

  const settingSections = [
    {
      title: 'Preferences',
      items: [
        {
          id: 'notifications',
          title: 'Push Notifications',
          subtitle: 'Receive workout reminders and achievements',
          icon: Bell,
          type: 'toggle' as const,
          value: notifications,
          onToggle: handleNotificationToggle,
          color: '#F59E0B',
        },
        {
          id: 'privacy',
          title: 'Data Privacy',
          subtitle: 'Control your data sharing preferences',
          icon: Shield,
          type: 'toggle' as const,
          value: privacy,
          onToggle: handlePrivacyToggle,
          color: '#10B981',
        },
        {
          id: 'theme',
          title: 'Dark Mode',
          subtitle: 'Switch between light and dark themes',
          icon: Moon,
          type: 'toggle' as const,
          value: isDark,
          onToggle: handleThemeToggle,
          color: '#6366F1',
        },
      ],
    },
    {
      title: 'General',
      items: [
        {
          id: 'units',
          title: 'Units',
          subtitle: 'Metric (km, kg)',
          icon: Globe,
          type: 'navigation' as const,
          onPress: () => console.log('Units settings'),
          color: '#3B82F6',
        },
        {
          id: 'devices',
          title: 'Connected Devices',
          subtitle: 'Location & permissions',
          icon: Smartphone,
          type: 'navigation' as const,
          onPress: () => setShowPermissions(true),
          color: '#8B5CF6',
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          id: 'help',
          title: 'Help & Support',
          subtitle: 'Get help and contact support',
          icon: HelpCircle,
          type: 'navigation' as const,
          onPress: () => console.log('Help'),
          color: '#06B6D4',
        },
        {
          id: 'about',
          title: 'About',
          subtitle: 'App version and information',
          icon: Info,
          type: 'navigation' as const,
          onPress: () => console.log('About'),
          color: '#84CC16',
        },
      ],
    },
    {
      title: 'Account',
      items: [
        {
          id: 'logout',
          title: 'Sign Out',
          subtitle: 'Sign out of your account',
          icon: LogOut,
          type: 'action' as const,
          onPress: handleLogout,
          color: '#EF4444',
        },
      ],
    },
  ];

  const animatedButtonStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: buttonScale.value }],
    };
  });

  const handleItemPress = (item: SettingItem) => {
    buttonScale.value = withSpring(0.95, {}, () => {
      buttonScale.value = withSpring(1);
    });

    if (item.onPress) {
      runOnJS(item.onPress)();
    }
  };

  const renderSettingItem = (item: SettingItem) => {
    const IconComponent = item.icon;

    return (
      <Animated.View key={item.id} style={animatedButtonStyle}>
        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => handleItemPress(item)}
          disabled={item.type === 'toggle'}
        >
          <View style={styles.settingItemLeft}>
            <View style={[styles.settingIcon, { backgroundColor: `${item.color}20` }]}>
              <IconComponent size={20} color={item.color} />
            </View>
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingTitle, { color: theme.colors.text }]}>
                {item.title}
              </Text>
              {item.subtitle && (
                <Text style={[styles.settingSubtitle, { color: theme.colors.textSecondary }]}>
                  {item.subtitle}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.settingItemRight}>
            {item.type === 'toggle' && (
              <Switch
                value={item.value}
                onValueChange={item.onToggle}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                thumbColor={item.value ? '#FFFFFF' : '#F3F4F6'}
              />
            )}
            {item.type === 'navigation' && (
              <ChevronRight size={20} color={theme.colors.textSecondary} />
            )}
            {item.type === 'action' && item.id === 'logout' && (
              <ChevronRight size={20} color={item.color} />
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <LinearGradient
        colors={['#8B5CF6', '#A855F7', '#C084FC']}
        style={styles.header}
      >
        <SafeAreaView>
          <View style={styles.headerContent}>
            <AnimatedButton onPress={() => router.back()} hapticType="light">
              <ArrowLeft color="#FFFFFF" size={24} />
            </AnimatedButton>
            <Text style={styles.headerTitle}>Settings</Text>
            <View style={{ width: 24 }} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {settingSections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
              {section.title}
            </Text>
            <View style={[styles.sectionContent, { backgroundColor: theme.colors.surface }]}>
              {section.items.map((item, index) => (
                <View key={item.id}>
                  <AnimatedButton
                    style={styles.settingItem}
                    onPress={() => handleItemPress(item)}
                    disabled={item.type === 'toggle'}
                  >
                    <View style={styles.settingItemLeft}>
                      <View style={[styles.settingIcon, { backgroundColor: `${item.color}20` }]}>
                        <item.icon size={20} color={item.color} />
                      </View>
                      <View style={styles.settingTextContainer}>
                        <Text style={[styles.settingTitle, { color: theme.colors.text }]}>
                          {item.title}
                        </Text>
                        {item.subtitle && (
                          <Text style={[styles.settingSubtitle, { color: theme.colors.textSecondary }]}>
                            {item.subtitle}
                          </Text>
                        )}
                      </View>
                    </View>

                    <View style={styles.settingItemRight}>
                      {item.type === 'toggle' && (
                        <Switch
                          value={item.value}
                          onValueChange={item.onToggle}
                          trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                          thumbColor={item.value ? '#FFFFFF' : '#F3F4F6'}
                        />
                      )}
                      {item.type === 'navigation' && (
                        <ChevronRight size={20} color={theme.colors.textSecondary} />
                      )}
                      {item.type === 'action' && item.id === 'logout' && (
                        <ChevronRight size={20} color={item.color} />
                      )}
                    </View>
                  </AnimatedButton>
                  {index < section.items.length - 1 && (
                    <View style={[styles.separator, { backgroundColor: theme.colors.border }]} />
                  )}
                </View>
              ))}
            </View>
          </View>
        ))}

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>
            RunTracker v1.0.0
          </Text>
          <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>
            Made with ❤️ for runners
          </Text>
        </View>
        
        {/* Permissions Modal */}
        {showPermissions && (
          <View style={styles.permissionsOverlay}>
            <View style={styles.permissionsModal}>
              <View style={styles.permissionsHeader}>
                <Text style={[styles.permissionsTitle, { color: theme.colors.text }]}>
                  Permissions
                </Text>
                <TouchableOpacity onPress={() => setShowPermissions(false)}>
                  <Text style={[styles.closeButton, { color: theme.colors.textSecondary }]}>✕</Text>
                </TouchableOpacity>
              </View>
              <PermissionManager 
                onPermissionsComplete={() => setShowPermissions(false)} 
              />
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionContent: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  settingItemRight: {
    marginLeft: 12,
  },
  separator: {
    height: 1,
    marginLeft: 68,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 4,
  },
  footerText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  permissionsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  permissionsModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    margin: 20,
    maxHeight: '80%',
    width: '90%',
  },
  permissionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  permissionsTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
  },
  closeButton: {
    fontSize: 24,
    fontFamily: 'Inter-Regular',
  },
});