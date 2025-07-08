import React from 'react';
import { TouchableOpacity, TouchableOpacityProps, Platform } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

interface AnimatedButtonProps extends TouchableOpacityProps {
  children: React.ReactNode;
  scaleValue?: number;
  style?: any;
  hapticType?: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export default function AnimatedButton({
  children,
  onPress,
  scaleValue = 0.95,
  style,
  hapticType,
  ...props
}: AnimatedButtonProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };
  });

  const triggerHaptic = () => {
    // Only trigger haptics on native platforms
    if (Platform.OS !== 'web' && hapticType) {
      // Haptic feedback would be implemented here for native platforms
      // For now, we'll skip it since web doesn't support it
    }
  };

  const handlePressIn = () => {
    scale.value = withSpring(scaleValue, { damping: 15, stiffness: 300 });
    opacity.value = withTiming(0.8, { duration: 100 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    opacity.value = withTiming(1, { duration: 100 });
  };

  const handlePress = (event: any) => {
    triggerHaptic();
    if (onPress) {
      onPress(event);
    }
  };

  return (
    <AnimatedTouchable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      style={[animatedStyle, style]}
      {...props}
    >
      {children}
    </AnimatedTouchable>
  );
}