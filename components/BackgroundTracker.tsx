import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, AppState, Platform } from 'react-native';
import { MapPin, Play, Pause } from 'lucide-react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { locationService } from '@/lib/location';
import { formatDuration } from '@/lib/geolib';

interface BackgroundTrackerProps {
  isVisible: boolean;
  isTracking: boolean;
  stats: {
    distance: number;
    duration: number;
    pace: string;
  };
}

export default function BackgroundTracker({
  isVisible,
  isTracking,
  stats
}: BackgroundTrackerProps) {
  const [appState, setAppState] = useState(AppState.currentState);

  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      console.log('📱 App state changed:', nextAppState);
      setAppState(nextAppState);
    });

    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    if (isVisible && isTracking) {
      opacity.value = withTiming(1, { duration: 300 });
      scale.value = withSpring(1, { damping: 20, stiffness: 100 });
    } else if (!isVisible) {
      opacity.value = withTiming(0, { duration: 300 });
      scale.value = withTiming(0.8, { duration: 300 });
    }
  }, [isVisible, isTracking]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ scale: scale.value }],
    };
  });

  if (!isVisible) return null;

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <View style={styles.tracker}>
        <View style={[styles.iconContainer, { backgroundColor: isTracking ? '#10B981' : '#F59E0B' }]}>
          {isTracking ? (
            <Play size={16} color="#FFFFFF" />
          ) : (
            <Pause size={16} color="#FFFFFF" />
          )}
        </View>

        <View style={styles.statsContainer}>
          <Text style={styles.distance}>{stats.distance.toFixed(2)} km</Text>
          <Text style={styles.duration}>{formatDuration(stats.duration)}</Text>
          <Text style={styles.pace}>{stats.pace}</Text>
        </View>

        <View style={styles.statusIndicator}>
          <MapPin size={12} color={isTracking ? '#10B981' : '#F59E0B'} />
          <Text style={[styles.statusText, { color: isTracking ? '#10B981' : '#F59E0B' }]}>
            {isTracking ? 'LIVE' : 'PAUSED'}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 100 : 75,
    left: 20,
    right: 20,
    zIndex: 999,
  },
  tracker: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  statsContainer: {
    flex: 1,
    alignItems: 'center',
  },
  distance: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'Inter-Bold',
  },
  duration: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  pace: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 10,
    fontFamily: 'Inter-Regular',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
  },
});