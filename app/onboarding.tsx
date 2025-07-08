import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Image,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight, Play, Target, Trophy, Users } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolate,
  runOnJS,
} from 'react-native-reanimated';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import AnimatedButton from '@/components/AnimatedButton';
import AnimatedCard from '@/components/AnimatedCard';

const { width, height } = Dimensions.get('window');

interface OnboardingSlide {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  icon: React.ComponentType<any>;
  gradient: string[];
}

const slides: OnboardingSlide[] = [
  {
    id: 1,
    title: 'Track Your Runs',
    subtitle: 'Every Step Counts',
    description: 'Monitor your distance, pace, and calories burned with precision GPS tracking and real-time statistics.',
    image: 'https://images.pexels.com/photos/1089438/pexels-photo-1089438.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=2',
    icon: Play,
    gradient: ['#E0E7FF', '#C7D2FE'],
  },
  {
    id: 2,
    title: 'Set Goals',
    subtitle: 'Achieve More',
    description: 'Set weekly and monthly goals, track your progress, and celebrate your achievements along the way.',
    image: 'https://images.pexels.com/photos/1571019/pexels-photo-1571019.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=2',
    icon: Target,
    gradient: ['#D1FAE5', '#A7F3D0'],
  },
  {
    id: 3,
    title: 'Earn Achievements',
    subtitle: 'Unlock Rewards',
    description: 'Complete challenges, earn badges, and unlock new achievements as you progress on your fitness journey.',
    image: 'https://images.pexels.com/photos/1502904/pexels-photo-1502904.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=2',
    icon: Trophy,
    gradient: ['#FEF3C7', '#FDE68A'],
  },
  {
    id: 4,
    title: 'Join Community',
    subtitle: 'Run Together',
    description: 'Connect with fellow runners, share your progress, and get motivated by the community.',
    image: 'https://images.pexels.com/photos/1506905/pexels-photo-1506905.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=2',
    icon: Users,
    gradient: ['#DBEAFE', '#BFDBFE'],
  },
];

export default function OnboardingScreen() {
  const { completeOnboarding } = useAuth();
  const { theme } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollX = useSharedValue(0);
  const buttonScale = useSharedValue(1);

  const handleNext = async () => {
    if (currentIndex < slides.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      scrollViewRef.current?.scrollTo({
        x: nextIndex * width,
        animated: true,
      });
    } else {
      await completeOnboarding();
    }
  };

  const handleSkip = async () => {
    await completeOnboarding();
  };

  const onScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    scrollX.value = contentOffsetX;
    const index = Math.round(contentOffsetX / width);
    setCurrentIndex(index);
  };

  const animatedButtonStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: buttonScale.value }],
    };
  });

  const handleButtonPress = () => {
    buttonScale.value = withSpring(0.95, {}, () => {
      buttonScale.value = withSpring(1);
    });
    setTimeout(() => {
      runOnJS(handleNext)();
    }, 100);
  };

  const renderSlide = (slide: OnboardingSlide, index: number) => {
    const IconComponent = slide.icon;

    const slideOpacity = useSharedValue(0);
    const slideScale = useSharedValue(0.8);

    React.useEffect(() => {
      slideOpacity.value = withTiming(1, { duration: 800 });
      slideScale.value = withSpring(1, { damping: 15 });
    }, [index]);

    const animatedStyle = useAnimatedStyle(() => {
      const inputRange = [
        (index - 1) * width,
        index * width,
        (index + 1) * width,
      ];

      const opacity = interpolate(
        scrollX.value,
        inputRange,
        [0.3, 1, 0.3],
        Extrapolate.CLAMP
      );

      const scale = interpolate(
        scrollX.value,
        inputRange,
        [0.8, 1, 0.8],
        Extrapolate.CLAMP
      );

      const translateY = interpolate(
        scrollX.value,
        inputRange,
        [50, 0, 50],
        Extrapolate.CLAMP
      );

      return {
        opacity: slideOpacity.value,
        transform: [{ scale: slideScale.value }, { translateY }],
      };
    });

    return (
      <View key={slide.id} style={styles.slide}>
        <LinearGradient
          colors={slide.gradient}
          style={styles.slideGradient}
        >
          <SafeAreaView style={styles.slideContent}>
            <View style={styles.imageContainer}>
              <Image source={{ uri: slide.image }} style={styles.slideImage} />
              <View style={styles.iconOverlay}>
                <IconComponent size={40} color="#FFFFFF" />
              </View>
            </View>

            <View style={styles.textContainer}>
              <Text style={[styles.slideSubtitle, { color: '#6B7280' }]}>{slide.subtitle}</Text>
              <Text style={[styles.slideTitle, { color: '#111827' }]}>{slide.title}</Text>
              <Text style={[styles.slideDescription, { color: '#4B5563' }]}>{slide.description}</Text>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </View>
    );
  };

  const renderPagination = () => {
    return (
      <View style={styles.pagination}>
        {slides.map((_, index) => {
          const animatedDotStyle = useAnimatedStyle(() => {
            const inputRange = [
              (index - 1) * width,
              index * width,
              (index + 1) * width,
            ];

            const scale = interpolate(
              scrollX.value,
              inputRange,
              [0.8, 1.2, 0.8],
              Extrapolate.CLAMP
            );

            const opacity = interpolate(
              scrollX.value,
              inputRange,
              [0.4, 1, 0.4],
              Extrapolate.CLAMP
            );

            return {
              transform: [{ scale }],
              opacity,
            };
          });

          return (
            <Animated.View
              key={index}
              style={[
                styles.paginationDot,
                index === currentIndex && styles.paginationDotActive,
                animatedDotStyle,
              ]}
            />
          );
        })}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
      >
        {slides.map((slide, index) => renderSlide(slide, index))}
      </ScrollView>

      <View style={styles.footer}>
        {renderPagination()}

        <View style={styles.buttonContainer}>
          <AnimatedButton onPress={handleSkip} style={styles.skipButton}>
            <Text style={styles.skipButtonText}>Skip</Text>
          </AnimatedButton>

          <AnimatedButton onPress={handleButtonPress} style={styles.nextButton}>
              <Text style={styles.nextButtonText}>
                {currentIndex === slides.length - 1 ? 'Get Started' : 'Next'}
              </Text>
              <ChevronRight size={20} color="#FFFFFF" />
          </AnimatedButton>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  slide: {
    width,
    height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slideGradient: {
    flex: 1,
  },
  slideContent: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  imageContainer: {
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 40,
    position: 'relative',
  },
  slideImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  iconOverlay: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  slideSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    marginBottom: 8,
    textAlign: 'center',
  },
  slideTitle: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  slideDescription: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingBottom: 40,
    paddingTop: 20,
    paddingHorizontal: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D1D5DB',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: '#8B5CF6',
    width: 32,
    borderRadius: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  skipButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 25,
    minWidth: 140,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginLeft: 'auto',
  },
  nextButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});