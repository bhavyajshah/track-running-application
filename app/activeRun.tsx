import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppState } from 'react-native';
import { ArrowLeft, Pause, Play, Flame, Zap, Square, MapPin, Clock, CircleStop as StopCircle } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import MapView, { Polyline } from 'react-native-maps';
import { locationService, LocationData, RunStats } from '@/lib/location';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import AnimatedButton from '@/components/AnimatedButton';
import BackgroundTracker from '@/components/BackgroundTracker';
import CountUpNumber from '@/components/CountUpNumber';
import PermissionManager from '@/components/PermissionManager';

const { width, height } = Dimensions.get('window');
const AnimatedView = Animated.createAnimatedComponent(View);

export default function ActiveRunScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { theme } = useTheme();
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [locationPermission, setLocationPermission] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [showBackgroundTracker, setShowBackgroundTracker] = useState(false);
  const [appState, setAppState] = useState('active');
  const [routeCoordinates, setRouteCoordinates] = useState<{ latitude: number; longitude: number }[]>([]);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [runStats, setRunStats] = useState<RunStats>({
    distance: 0,
    speed: 0,
    maxSpeed: 0,
    avgSpeed: 0,
    elevationGain: 0,
    duration: 0,
    pace: '0:00',
    calories: 0,
  });

  const startTimeRef = useRef<number | null>(null);
  const pausedTimeRef = useRef<number>(0);
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Animation values
  const statusDotScale = useSharedValue(1);
  const buttonScale = useSharedValue(1);

  // App state monitoring for background tracking
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      console.log('📱 App state changed in ActiveRun:', nextAppState);
      setAppState(nextAppState);

      // Show background tracker when app goes to background during active run
      setShowBackgroundTracker(nextAppState !== 'active' && (isRunning || isPaused));
    });

    return () => subscription?.remove();
  }, [isRunning, isPaused]);

  useEffect(() => {
    initializeActiveRun();
    return () => {
      locationService.stopTracking();
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Start duration update interval when running
    if (isRunning) {
      updateIntervalRef.current = setInterval(() => {
        if (startTimeRef.current) {
          const pausedMs = pausedTimeRef.current;
          const currentDuration = Math.floor((Date.now() - startTimeRef.current - pausedMs) / 1000);
          setRunStats(prev => ({ ...prev, duration: currentDuration }));
        }
      }, 1000);
    } else {
      // Clear duration update interval when not running
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
        updateIntervalRef.current = null;
      }
    }

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
        updateIntervalRef.current = null;
      }
    };
  }, [isRunning]);

  const initializeActiveRun = async () => {
    console.log('🔍 Checking location permission...');
    setInitializing(true);

    try {
      // First check if location services are available
      const isAvailable = await locationService.checkPermissionStatus();
      console.log('📍 Location available:', isAvailable);

      if (!isAvailable) {
        setPermissionError('Location services not available');
        setShowPermissionModal(true);
        setInitializing(false);
        return;
      }

      // Request permissions
      const hasPermission = await locationService.requestPermissions();
      console.log('🔐 Permission granted:', hasPermission);
      setLocationPermission(hasPermission);

      if (hasPermission) {
        // Try to get initial location
        const location = await getInitialLocation();
        if (location) {
          console.log('📍 Initial location obtained');
          setCurrentLocation(location);
          setRouteCoordinates([{ latitude: location.latitude, longitude: location.longitude }]);
          setPermissionError(null);
        } else {
          setPermissionError('Unable to get current location');
          setShowPermissionModal(true);
        }
      } else {
        setPermissionError('Location permission denied');
        setShowPermissionModal(true);
      }
    } catch (error) {
      console.error('❌ Location permission error:', error);
      setPermissionError('Failed to access location services');
      setShowPermissionModal(true);
    } finally {
      setInitializing(false);
    }
  };

  const getInitialLocation = async (): Promise<LocationData | null> => {
    try {
      console.log('🔍 Getting initial location with high accuracy...');
      const location = await locationService.getCurrentLocation();
      if (location) {
        console.log('✅ Initial location found:', location);
      } else {
        console.warn('❌ Could not get initial location');
      }
      return location;
    } catch (error) {
      console.error('❌ Error getting initial location:', error);
      return null;
    }
  };

  const handleLocationUpdate = (location: LocationData): void => {
    console.log('📍 Location update received');
    setCurrentLocation(location);
    setRouteCoordinates(prev => [...prev, { latitude: location.latitude, longitude: location.longitude }]);
  };

  const handleStatsUpdate = (stats: RunStats): void => {
    console.log('📊 Stats update received');
    setRunStats(stats);
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleRunning = async () => {
    if (!locationPermission) {
      setShowPermissionModal(true);
      return;
    }

    if (!isRunning && !isPaused) {
      // Start run
      startTimeRef.current = Date.now();
      pausedTimeRef.current = 0;

      console.log('▶️ Starting run tracking...');
      const success = await locationService.startTracking(handleLocationUpdate, handleStatsUpdate);
      if (success) {
        setIsRunning(true);
        setIsPaused(false);
        console.log('✅ Run tracking started');
      } else {
        Alert.alert('Error', 'Could not start location tracking');
      }
    } else if (isRunning && !isPaused) {
      // Pause run
      console.log('⏸️ Pausing run tracking...');
      locationService.pauseTracking();
      setIsRunning(false);
      setIsPaused(true);

      // Record the time when paused
      const currentPausedTime = pausedTimeRef.current;
      const pauseStartTime = Date.now();

      // Update paused time in an interval
      const pauseInterval = setInterval(() => {
        pausedTimeRef.current = currentPausedTime + (Date.now() - pauseStartTime);
      }, 1000);

      // Store the interval ID to clear it later
      updateIntervalRef.current = pauseInterval;

    } else if (!isRunning && isPaused) {
      // Resume run
      console.log('▶️ Resuming run tracking...');

      // Clear the pause interval
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }

      const success = await locationService.resumeTracking(handleLocationUpdate, handleStatsUpdate);
      if (success) {
        setIsRunning(true);
        setIsPaused(false);
        console.log('✅ Run tracking resumed');
      }
    }
  };

  const handleFinishRun = async () => {
    if (runStats.duration < 5) {
      Alert.alert(
        'Cancel Run',
        'This run is too short to save. Do you want to cancel it?',
        [
          { text: 'No', style: 'cancel' },
          {
            text: 'Yes, Cancel',
            style: 'destructive',
            onPress: () => {
              locationService.stopTracking();
              router.back();
            }
          }
        ]
      );
      return;
    }

    Alert.alert(
      'Finish Run',
      'Are you sure you want to finish this workout?',
      [
        { text: 'Continue Running', style: 'cancel' },
        {
          text: 'Finish & Save',
          style: 'default',
          onPress: saveRunAndFinish
        }
      ]
    );
  };

  const handleCancelRun = () => {
    if (isRunning || isPaused) {
      Alert.alert(
        'Cancel Run',
        'Are you sure you want to cancel this run? Your data will be lost.',
        [
          { text: 'Continue Running', style: 'cancel' },
          {
            text: 'Cancel Run',
            style: 'destructive',
            onPress: () => {
              locationService.stopTracking();
              router.back();
            }
          }
        ]
      );
    } else {
      router.back();
    }
  };

  const saveRunAndFinish = async () => {
    console.log('💾 Saving run data...');
    locationService.stopTracking();

    try {
      const runData = locationService.getRunData();
      const coordinates = locationService.getCoordinates();

      console.log('📊 Final run data:', runData);

      // Only save if we have meaningful data
      if (runData.distance < 0.01 || runData.duration < 10) {
        Alert.alert(
          'Run Too Short',
          'This run is too short to save. Try running for a longer distance or time.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
        return;
      }

      // Save run to Supabase
      const dbRunData = {
        user_id: user?.id,
        distance: runData.distance,
        duration: runData.duration,
        calories: runData.calories,
        avg_speed: runData.avgSpeed,
        max_speed: runData.maxSpeed,
        pace: runData.pace,
        elevation_gain: runData.elevationGain,
        route_coordinates: coordinates.map(coord => ({
          latitude: coord.latitude,
          longitude: coord.longitude,
          timestamp: coord.timestamp
        })),
        location: currentLocation ? 'Current Location' : 'Unknown',
        weather_data: {},
        start_time: new Date(Date.now() - runData.duration * 1000).toISOString(),
        end_time: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('runs')
        .insert([dbRunData]);

      if (error) {
        console.error('Error saving run:', error);
        Alert.alert('Error', 'Failed to save run data');
      } else {
        console.log('✅ Run saved successfully');
        Alert.alert(
          'Run Saved',
          `Great job! You completed ${runData.distance.toFixed(2)}km in ${formatTime(runData.duration)}.`,
          [{ text: 'View History', onPress: () => router.push('/(tabs)/history') }]
        );
      }
    } catch (error) {
      console.error('Error saving run:', error);
      Alert.alert('Error', 'Failed to save run data');
    }

    router.back();
  };

  const statusDotAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: statusDotScale.value }],
    };
  });

  const handlePermissionsComplete = (permissions: Record<string, boolean>) => {
    console.log('🔐 Permissions updated:', permissions);
    if (permissions.location) {
      setLocationPermission(true);
      setShowPermissionModal(false);
      initializeActiveRun();
    }
  };

  if (showPermissionModal) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <PermissionManager onPermissionsComplete={handlePermissionsComplete} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Background Tracker - Shows when app is minimized */}
      <BackgroundTracker
        isVisible={showBackgroundTracker}
        isTracking={isRunning}
        stats={{
          distance: runStats.distance,
          duration: runStats.duration,
          pace: runStats.pace,
        }}
      />

      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
          <AnimatedButton onPress={handleCancelRun} hapticType="light">
            <ArrowLeft color={theme.colors.text} size={24} />
          </AnimatedButton>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Active Run</Text>
          <AnimatedButton
            onPress={handleFinishRun}
            hapticType="heavy"
            style={styles.stopButton}
          >
            <StopCircle color="#EF4444" size={24} />
          </AnimatedButton>
        </View>

        {/* Map */}
        <View style={[styles.mapContainer, { backgroundColor: theme.colors.surface }]}>
          {currentLocation && (
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
              }}
              showsUserLocation={true}
              showsCompass={false}
              showsScale={false}
              zoomEnabled={true}
              scrollEnabled={true}
              followsUserLocation={isRunning}
              userLocationAnnotationTitle=""
            >
              {routeCoordinates.length > 1 && (
                <Polyline
                  coordinates={routeCoordinates}
                  strokeColor={theme.colors.primary}
                  strokeWidth={4}
                  lineCap="round"
                  lineJoin="round"
                />
              )}
            </MapView>
          )}

          {!currentLocation && (
            <View style={[styles.noLocationContainer, { backgroundColor: theme.colors.background }]}>
              <Text style={[styles.noLocationText, { color: theme.colors.textSecondary }]}>
                {initializing ? 'Getting your location...' : 'Location not available'}
              </Text>
            </View>
          )}

          {/* Map Overlay Stats */}
          <View style={styles.mapOverlay}>
            <View style={styles.overlayItem}>
              <MapPin size={16} color="#FFFFFF" />
              <Text style={styles.overlayText}>
                {isRunning ? 'Live Tracking' : isPaused ? 'Paused' : 'Ready'}
              </Text>
            </View>
            <View style={styles.overlayItem}>
              <Clock size={16} color="#FFFFFF" />
              <Text style={styles.overlayText}>{formatTime(runStats.duration)}</Text>
            </View>
          </View>
        </View>

        {/* Control Panel */}
        <View style={[styles.controlPanel, { backgroundColor: theme.colors.surface }]}>
          {/* Main Stats */}
          <View style={styles.mainStats}>
            <View style={styles.primaryStat}>
              <CountUpNumber
                value={runStats.distance}
                decimals={2}
                style={[styles.primaryStatValue, { color: theme.colors.text }]}
                duration={800}
              />
              <Text style={[styles.primaryStatUnit, { color: theme.colors.textSecondary }]}>km</Text>
              <Text style={[styles.primaryStatLabel, { color: theme.colors.textSecondary }]}>distance</Text>
            </View>

            <View style={styles.secondaryStats}>
              <View style={[styles.secondaryStat, { backgroundColor: theme.colors.background }]}>
                <Text style={[styles.secondaryStatValue, { color: theme.colors.text }]}>{runStats.pace}</Text>
                <Text style={[styles.secondaryStatLabel, { color: theme.colors.textSecondary }]}>min/km</Text>
              </View>
              <View style={[styles.secondaryStat, { backgroundColor: theme.colors.background }]}>
                <CountUpNumber
                  value={runStats.speed}
                  decimals={1}
                  style={[styles.secondaryStatValue, { color: theme.colors.text }]}
                  duration={500}
                />
                <Text style={[styles.secondaryStatLabel, { color: theme.colors.textSecondary }]}>km/h</Text>
              </View>
            </View>
          </View>

          {/* Control Buttons */}
          <View style={styles.controlButtons}>
            <AnimatedButton
              style={[
                styles.controlButton,
                styles.pausePlayButton,
                isRunning ? styles.pauseButton : isPaused ? styles.resumeButton : styles.playButton
              ]}
              onPress={toggleRunning}
              hapticType="heavy"
            >
              {isRunning ? (
                <Pause color="#FFFFFF" size={28} />
              ) : (
                <Play color="#FFFFFF" size={28} />
              )}
            </AnimatedButton>
          </View>

          {/* Additional Stats */}
          <View style={styles.additionalStats}>
            <View style={styles.statItem}>
              <View style={[styles.statIcon, { backgroundColor: '#F97316' + '20' }]}>
                <Flame color="#F97316" size={16} />
              </View>
              <CountUpNumber
                value={runStats.calories}
                style={[styles.statValue, { color: theme.colors.text }]}
                duration={600}
              />
              <Text style={[styles.statUnit, { color: theme.colors.textSecondary }]}>kcal</Text>
            </View>

            <View style={styles.statItem}>
              <View style={[styles.statIcon, { backgroundColor: '#EAB308' + '20' }]}>
                <Zap color="#EAB308" size={16} />
              </View>
              <CountUpNumber
                value={runStats.elevationGain}
                style={[styles.statValue, { color: theme.colors.text }]}
                duration={600}
              />
              <Text style={[styles.statUnit, { color: theme.colors.textSecondary }]}>m elevation</Text>
            </View>

            <View style={styles.statItem}>
              <View style={[styles.statIcon, { backgroundColor: '#6366F1' + '20' }]}>
                <Clock color="#6366F1" size={16} />
              </View>
              <Text style={[styles.statValue, { color: theme.colors.text }]}>{formatTime(runStats.duration)}</Text>
              <Text style={[styles.statUnit, { color: theme.colors.textSecondary }]}>time</Text>
            </View>
          </View>

          {/* Status Indicator */}
          <View style={styles.statusIndicator}>
            <AnimatedView style={[
              styles.statusDot,
              isRunning ? styles.runningDot : isPaused ? styles.pausedDot : styles.readyDot,
              statusDotAnimatedStyle
            ]} />
            <Text style={[styles.statusText, { color: theme.colors.textSecondary }]}>
              {isRunning ? 'Workout Active' : isPaused ? 'Workout Paused' : 'Ready to Start'}
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
  },
  stopButton: {
    padding: 8,
    borderRadius: 8,
  },
  mapContainer: {
    height: height * 0.35, // Reduced map size for better performance
    margin: 20,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  noLocationContainer: {
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noLocationText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  mapOverlay: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  overlayItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  overlayText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  controlPanel: {
    flex: 1,
    paddingTop: 20,
    paddingHorizontal: 20,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  mainStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  primaryStat: {
    flex: 1,
    alignItems: 'center',
  },
  primaryStatValue: {
    fontSize: 48,
    fontFamily: 'Inter-Bold',
  },
  primaryStatUnit: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    marginTop: -8,
  },
  primaryStatLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginTop: 4,
  },
  secondaryStats: {
    flex: 1,
    gap: 16,
  },
  secondaryStat: {
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
  },
  secondaryStatValue: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
  },
  secondaryStatLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    marginTop: 4,
  },
  controlButtons: {
    alignItems: 'center',
    marginBottom: 20,
  },
  controlButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  pausePlayButton: {
    // Base styles for pause/play button
  },
  pauseButton: {
    backgroundColor: '#8B5CF6',
  },
  resumeButton: {
    backgroundColor: '#10B981',
  },
  playButton: {
    backgroundColor: '#10B981',
  },
  additionalStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    marginBottom: 2,
  },
  statUnit: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  runningDot: {
    backgroundColor: '#10B981',
  },
  pausedDot: {
    backgroundColor: '#F59E0B',
  },
  readyDot: {
    backgroundColor: '#6B7280',
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
});