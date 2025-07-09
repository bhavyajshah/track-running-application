import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Image,
  ScrollView,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight, Play, Target, Trophy, Users, MapPin, Zap, Heart, Award, TrendingUp } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
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
  features: string[];
}

const slides: OnboardingSlide[] = [
  {
    id: 1,
    title: 'Track Your Runs',
    subtitle: 'GPS Precision',
    description: 'Monitor your distance, pace, and calories burned with real-time GPS tracking and detailed statistics.',
    image: 'https://images.pexels.com/photos/2803158/pexels-photo-2803158.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&dpr=2',
    icon: MapPin,
    gradient: ['#4F46E5', '#7C3AED'],
    features: ['Live GPS tracking', 'Route mapping', 'Pace calculation', 'Elevation tracking'],
  },
  {
    id: 2,
    title: 'Set Your Goals',
    subtitle: 'Achieve More',
    description: 'Create personalized running goals, track your progress, and celebrate every achievement along the way.',
    image: 'https://images.pexels.com/photos/3621183/pexels-photo-3621183.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&dpr=2',
    icon: Target,
    gradient: ['#059669', '#10B981'],
    features: ['Weekly goals', 'Monthly targets', 'Visual progress', 'Completion tracking'],
  },
  {
    id: 3,
    title: 'Earn Rewards',
    subtitle: 'Achievement System',
    description: 'Unlock badges, earn points, and track your personal records as you progress on your fitness journey.',
    image: 'https://images.pexels.com/photos/2827392/pexels-photo-2827392.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&dpr=2',
    icon: Trophy,
    gradient: ['#D97706', '#F59E0B'],
    features: ['Achievement badges', 'Personal records', 'Point system', 'Milestone tracking'],
  },
  {
    id: 4,
    title: 'Join Community',
    subtitle: 'Run Together',
    description: 'Connect with fellow runners, share your progress, and participate in challenges with the community.',
    image: 'https://images.pexels.com/photos/2526878/pexels-photo-2526878.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&dpr=2',
    icon: Users,
    gradient: ['#DB2777', '#EC4899'],
    features: ['Social connections', 'Activity sharing', 'Group challenges', 'Leaderboards'],
  },
];

export default function OnboardingScreen() {
  const { completeOnboarding } = useAuth();
  const { theme } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const [isCompleting, setIsCompleting] = useState(false);

  // Animation values
  const scrollX = useSharedValue(0);
  const buttonScale = useSharedValue(1);
  const progressValue = useSharedValue(0);

  useEffect(() => {
    // Update progress indicator
    progressValue.value = withTiming((currentIndex + 1) / slides.length, { duration: 300 });

    // Set status bar to light content for better visibility on dark backgrounds
    StatusBar.setBarStyle('light-content');

    return () => {
      StatusBar.setBarStyle('default');
    };
  }, [currentIndex]);

  const handleNext = async () => {
    if (isCompleting) return;

    buttonScale.value = withSpring(0.95, {}, () => {
      buttonScale.value = withSpring(1);
    });

    if (currentIndex < slides.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      scrollViewRef.current?.scrollTo({
        x: nextIndex * width,
        animated: true,
      });
    } else {
      // On last slide, complete onboarding
      setIsCompleting(true);

      try {
        await completeOnboarding();
      } catch (error) {
        console.error('Error completing onboarding:', error);
        setIsCompleting(false);
      }
    }
  };

  const handleSkip = async () => {
    if (isCompleting) return;

    setIsCompleting(true);

    try {
      await completeOnboarding();
    } catch (error) {
      console.error('Error skipping onboarding:', error);
      setIsCompleting(false);
    }
  };

  const onScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    scrollX.value = contentOffsetX;
    const index = Math.round(contentOffsetX / width);
    if (index !== currentIndex) {
      setCurrentIndex(index);
    }
  };

  const animatedButtonStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: buttonScale.value }],
    };
  });

  const progressBarStyle = useAnimatedStyle(() => {
    return {
      width: `${progressValue.value * 100}%`,
    };
  });

  const renderSlide = (slide: OnboardingSlide, index: number) => {
    const IconComponent = slide.icon;

    const slideAnimatedStyle = useAnimatedStyle(() => {
      const inputRange = [
        (index - 1) * width,
        index * width,
        (index + 1) * width,
      ];

      const opacity = interpolate(
        scrollX.value,
        inputRange,
        [0, 1, 0],
        Extrapolate.CLAMP
      );

      const scale = interpolate(
        scrollX.value,
        inputRange,
        [0.8, 1, 0.8],
        Extrapolate.CLAMP
      );

      return {
        opacity,
        transform: [{ scale }],
      };
    });

    return (
      <View key={slide.id} style={styles.slide}>
        <LinearGradient
          colors={slide.gradient}
          style={styles.slideGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <SafeAreaView style={styles.safeArea}>
            <Animated.View style={[styles.slideContent, slideAnimatedStyle]}>
              {/* Image */}
              <View style={styles.imageContainer}>
                <Image
                  source={{ uri: slide.image }}
                  style={styles.slideImage}
                  defaultSource={{ uri: 'https://images.pexels.com/photos/2803158/pexels-photo-2803158.jpeg?auto=compress&cs=tinysrgb&w=300&h=200&dpr=2' }}
                />
                <View style={styles.iconContainer}>
                  <IconComponent size={28} color="#FFFFFF" />
                </View>
              </View>

              {/* Content */}
              <View style={styles.textContainer}>
                <Text style={styles.slideSubtitle}>{slide.subtitle}</Text>
                <Text style={styles.slideTitle}>{slide.title}</Text>
                <Text style={styles.slideDescription}>{slide.description}</Text>

                {/* Features */}
                <View style={styles.featuresContainer}>
                  {slide.features.map((feature, idx) => (
                    <View key={idx} style={styles.featureItem}>
                      <View style={styles.featureDot} />
                      <Text style={styles.featureText}>{feature}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </Animated.View>
          </SafeAreaView>
        </LinearGradient>
      </View>
    );
  };

  const renderPagination = () => {
    return (
      <View style={styles.paginationContainer}>
        <View style={styles.progressBarContainer}>
          <Animated.View style={[styles.progressBar, progressBarStyle]} />
        </View>
        <View style={styles.dotsContainer}>
          {slides.map((_, index) => {
            const dotAnimatedStyle = useAnimatedStyle(() => {
              const inputRange = [
                (index - 1) * width,
                index * width,
                (index + 1) * width,
              ];

              const opacity = interpolate(
                scrollX.value,
                inputRange,
                [0.4, 1, 0.4],
                Extrapolate.CLAMP
              );

              const scale = interpolate(
                scrollX.value,
                inputRange,
                [0.8, 1.2, 0.8],
                Extrapolate.CLAMP
              );

              return {
                opacity,
                transform: [{ scale }],
              };
            });

            return (
              <Animated.View
                key={index}
                style={[
                  styles.paginationDot,
                  index === currentIndex && styles.paginationDotActive,
                  dotAnimatedStyle,
                ]}
              />
            );
          })}
        </View>
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
        scrollEnabled={!isCompleting}
        decelerationRate="fast"
      >
        {slides.map((slide, index) => renderSlide(slide, index))}
      </ScrollView>

      <View style={styles.footer}>
        {renderPagination()}

        <View style={styles.buttonContainer}>
          <AnimatedButton
            onPress={handleSkip}
            style={styles.skipButton}
            disabled={isCompleting}
            hapticType="light"
          >
            <Text style={styles.skipButtonText}>
              Skip
            </Text>
          </AnimatedButton>

          <Animated.View style={animatedButtonStyle}>
            <AnimatedButton
              onPress={handleNext}
              style={[styles.nextButton, isCompleting && styles.disabledButton]}
              disabled={isCompleting}
              hapticType="medium"
            >
              {isCompleting ? (
                <Text style={styles.nextButtonText}>Starting...</Text>
              ) : (
                <>
                  <Text style={styles.nextButtonText}>
                    {currentIndex === slides.length - 1 ? 'Get Started' : 'Next'}
                  </Text>
                  <ChevronRight size={20} color="#FFFFFF" />
                </>
              )}
            </AnimatedButton>
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollView: {
    flex: 1,
  },
  slide: {
    width,
    height,
  },
  slideGradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  slideContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  imageContainer: {
    width: width * 0.85,
    height: width * 0.85,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  slideImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  iconContainer: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  textContainer: {
    alignItems: 'center',
    width: '100%',
  },
  slideSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  slideTitle: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  slideDescription: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
    maxWidth: '90%',
  },
  featuresContainer: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 12,
  },
  featureDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
  },
  featureText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    paddingHorizontal: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  paginationContainer: {
    marginBottom: 24,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 2,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#8B5CF6',
    borderRadius: 2,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: '#8B5CF6',
    width: 24,
    borderRadius: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipButton: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  skipButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: 'rgba(0, 0, 0, 0.6)',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    minWidth: 160,
    gap: 8,
    shadowColor: '#8B5CF6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  nextButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  disabledButton: {
    opacity: 0.7,
  },
});