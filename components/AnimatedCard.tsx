import React from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

interface AnimatedCardProps {
  children: React.ReactNode;
  delay?: number;
  style?: any;
  index?: number;
}

export default function AnimatedCard({ 
  children, 
  delay = 0, 
  style, 
  index = 0 
}: AnimatedCardProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(30);
  const scale = useSharedValue(0.95);

  React.useEffect(() => {
    const animationDelay = delay + (index * 100);
    
    opacity.value = withDelay(
      animationDelay,
      withTiming(1, { duration: 300 })
    );
    
    translateY.value = withDelay(
      animationDelay,
      withSpring(0, { damping: 20, stiffness: 300 })
    );
    
    scale.value = withDelay(
      animationDelay,
      withSpring(1, { damping: 20, stiffness: 300 })
    );
  }, [delay, index]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [
        { translateY: translateY.value },
        { scale: scale.value },
      ],
    };
  });

  return (
    <Animated.View style={[animatedStyle, style]}>
      {children}
    </Animated.View>
  );
}