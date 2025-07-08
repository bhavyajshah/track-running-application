import React from 'react';
import { Text } from 'react-native';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withTiming,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';

interface CountUpNumberProps {
  value: number;
  duration?: number;
  delay?: number;
  style?: any;
  decimals?: number;
  suffix?: string;
}

const AnimatedText = Animated.createAnimatedComponent(Text);

export default function CountUpNumber({
  value,
  duration = 1000,
  delay = 0,
  style,
  decimals = 0,
  suffix = '',
}: CountUpNumberProps) {
  const [displayValue, setDisplayValue] = React.useState((value || 0).toFixed(decimals) + suffix);
  const animatedValue = useSharedValue(0);

  React.useEffect(() => {
    if (value === undefined || value === null) {
      setDisplayValue('0' + suffix);
      return;
    }
    
    animatedValue.value = withDelay(
      delay,
      withTiming(value, { 
        duration,
      }, (finished) => {
        if (finished) {
          runOnJS(setDisplayValue)((value || 0).toFixed(decimals) + suffix);
        }
      })
    );

    // Update display value during animation
    const interval = setInterval(() => {
      const currentValue = animatedValue.value;
      const formatted = (currentValue || 0).toFixed(decimals) + suffix;
      setDisplayValue(formatted);
    }, 16); // ~60fps

    return () => clearInterval(interval);
  }, [value, duration, delay, decimals, suffix]);

  return (
    <Text style={style}>
      {displayValue}
    </Text>
  );
}