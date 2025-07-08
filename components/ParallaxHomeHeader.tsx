import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Settings, Bell, Menu } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import AnimatedButton from '@/components/AnimatedButton';

const { width, height } = Dimensions.get('window');
const HEADER_HEIGHT = 350;

interface ParallaxHomeHeaderProps {
  scrollY: Animated.SharedValue<number>;
  onMenuPress: () => void;
  onSettingsPress: () => void;
}

export default function ParallaxHomeHeader({ 
  scrollY, 
  onMenuPress, 
  onSettingsPress 
}: ParallaxHomeHeaderProps) {
  const { user } = useAuth();
  const { theme } = useTheme();

  const animatedHeaderImageStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      scrollY.value,
      [0, HEADER_HEIGHT],
      [0, -HEADER_HEIGHT * 0.3],
      Extrapolate.CLAMP
    );

    const scale = interpolate(
      scrollY.value,
      [-100, 0],
      [1.2, 1],
      Extrapolate.CLAMP
    );

    return {
      transform: [{ translateY }, { scale }],
    };
  });

  const animatedOverlayStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [0, HEADER_HEIGHT * 0.3],
      [0.2, 0.6],
      Extrapolate.CLAMP
    );

    return { opacity };
  });

  const animatedHeaderStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [0, HEADER_HEIGHT * 0.2],
      [1, 0],
      Extrapolate.CLAMP
    );

    return { opacity };
  });

  const animatedStatsStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      scrollY.value,
      [0, HEADER_HEIGHT * 0.15],
      [0, -20],
      Extrapolate.CLAMP
    );

    const opacity = interpolate(
      scrollY.value,
      [0, HEADER_HEIGHT * 0.15],
      [1, 0],
      Extrapolate.CLAMP
    );

    return {
      transform: [{ translateY }],
      opacity,
    };
  });

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <View style={styles.container}>
      {/* Background Image */}
      <Animated.Image
        source={{ 
          uri: 'https://images.pexels.com/photos/1089438/pexels-photo-1089438.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2' 
        }}
        style={[styles.backgroundImage, animatedHeaderImageStyle]}
      />

      {/* Dynamic Gradient Overlay */}
      <Animated.View style={[styles.gradientOverlay, animatedOverlayStyle]}>
        <LinearGradient
          colors={['rgba(139, 92, 246, 0.4)', 'rgba(168, 85, 247, 0.6)', 'rgba(192, 132, 252, 0.8)']}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>

      {/* Header Content */}
      <Animated.View style={[styles.headerContent, animatedHeaderStyle]}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          <AnimatedButton onPress={onMenuPress} style={styles.menuButton} hapticType="light">
            <Image
              source={{ 
                uri: user?.avatar_url || 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=120&h=120&dpr=2' 
              }}
              style={styles.avatar}
            />
          </AnimatedButton>

          <View style={styles.headerActions}>
            <AnimatedButton style={styles.headerButton} hapticType="light">
              <Bell color="#FFFFFF" size={20} />
            </AnimatedButton>
            <AnimatedButton style={styles.headerButton} onPress={onSettingsPress} hapticType="light">
              <Settings color="#FFFFFF" size={20} />
            </AnimatedButton>
          </View>
        </View>

        {/* Greeting */}
        <View style={styles.greetingSection}>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.userName}>{user?.full_name?.split(' ')[0] || 'Runner'}</Text>
          <Text style={styles.motivationalText}>Ready to crush your goals today?</Text>
        </View>

        {/* Quick Stats */}
        <Animated.View style={[styles.quickStatsContainer, animatedStatsStyle]}>
          <BlurView intensity={20} tint="dark" style={styles.quickStats}>
            <View style={styles.quickStatItem}>
              <Text style={styles.quickStatValue}>0</Text>
              <Text style={styles.quickStatLabel}>Today's km</Text>
            </View>
            <View style={styles.quickStatDivider} />
            <View style={styles.quickStatItem}>
              <Text style={styles.quickStatValue}>{user?.weekly_goal || 50}</Text>
              <Text style={styles.quickStatLabel}>Weekly goal</Text>
            </View>
            <View style={styles.quickStatDivider} />
            <View style={styles.quickStatItem}>
              <Text style={styles.quickStatValue}>🔥</Text>
              <Text style={styles.quickStatLabel}>On fire!</Text>
            </View>
          </BlurView>
        </Animated.View>
      </Animated.View>

      {/* Floating Elements */}
      <View style={styles.floatingElements}>
        <Animated.View style={[styles.floatingCircle, styles.circle1]} />
        <Animated.View style={[styles.floatingCircle, styles.circle2]} />
        <Animated.View style={[styles.floatingCircle, styles.circle3]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: HEADER_HEIGHT,
    overflow: 'hidden',
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  headerContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
    zIndex: 2,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 40,
  },
  menuButton: {
    padding: 4,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  greetingSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  greeting: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 8,
  },
  userName: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  motivationalText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  quickStatsContainer: {
    alignItems: 'center',
  },
  quickStats: {
    flexDirection: 'row',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
  },
  quickStatItem: {
    alignItems: 'center',
    minWidth: 60,
  },
  quickStatValue: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  quickStatLabel: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  quickStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 16,
  },
  floatingElements: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: 1,
  },
  floatingCircle: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 50,
  },
  circle1: {
    width: 100,
    height: 100,
    top: 50,
    right: -30,
  },
  circle2: {
    width: 60,
    height: 60,
    top: 150,
    left: -20,
  },
  circle3: {
    width: 80,
    height: 80,
    bottom: 50,
    right: 20,
  },
});