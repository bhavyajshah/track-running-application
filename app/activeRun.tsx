import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppState } from 'react-native';
import { ArrowLeft, Pause, Play, Flame, Zap, Square, MapPin, Clock } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withDelay,
  withRepeat,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import MapView, { Polyline } from 'react-native-maps';
import { locationService, LocationData, RunStats } from '@/lib/location';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import AnimatedButton from '@/components/AnimatedButton';
import BackgroundTracker from '@/components/BackgroundTracker';
import CountUpNumber from '@/components/CountUpNumber';

const { width, height } = Dimensions.get('window');
const AnimatedView = Animated.createAnimatedComponent(View);
const AnimatedText = Animated.createAnimatedComponent(Text);

export default function ActiveRunScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [locationPermission, setLocationPermission] = useState(false);
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
  const statsOpacity = useSharedValue(0);
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
    // Animate status dot based on running state
    if (isRunning) {
      statusDotScale.value = withRepeat(
        withTiming(1.2, { duration: 1000 }),
        -1,
        true
      );
      
      // Start duration update interval
      updateIntervalRef.current = setInterval(() => {
        if (startTimeRef.current) {
          const currentDuration = Math.floor((Date.now() - startTimeRef.current) / 1000);
          setRunStats(prev => ({ ...prev, duration: currentDuration }));
        }
      }, 1000);
    } else {
      statusDotScale.value = withTiming(1, { duration: 300 });
      
      // Clear duration update interval
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

  useEffect(() => {
    // Animate stats visibility
    statsOpacity.value = withTiming(1, { duration: 800 });
  }, []);


  const initializeActiveRun = async () => {
    console.log('🔍 Checking location permission...');
    setInitializing(true);
    
    try {
      // First check if location services are available
      const isAvailable = await locationService.checkPermissionStatus();
      console.log('📍 Location available:', isAvailable);
      
      if (!isAvailable) {
        setPermissionError('Location services not available');
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
        }
      } else {
        setPermissionError('Location permission denied');
      }
    } catch (error) {
      console.error('❌ Location permission error:', error);
      setPermissionError('Failed to access location services');
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
    console.log('📍 Location update received:', location);
    setCurrentLocation(location);
    setRouteCoordinates(prev => [...prev, { latitude: location.latitude, longitude: location.longitude }]);
  };

  const handleStatsUpdate = (stats: RunStats): void => {
    console.log('📊 Stats update received:', stats);
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
      await initializeActiveRun();
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
      pausedTimeRef.current += Date.now() - (startTimeRef.current || Date.now());
    } else if (!isRunning && isPaused) {
      // Resume run
      console.log('▶️ Resuming run tracking...');
      startTimeRef.current = Date.now() - pausedTimeRef.current;
      const success = await locationService.resumeTracking(handleLocationUpdate, handleStatsUpdate);
      if (success) {
        setIsRunning(true);
        setIsPaused(false);
        console.log('✅ Run tracking resumed');
      }
    } else {
      // Stop run
      console.log('⏹️ Stopping run tracking...');
      locationService.stopTracking();
      setIsRunning(false);
      setIsPaused(false);
    }
  };

  const handleFinishRun = async () => {
    if (runStats.duration === 0) {
      router.back();
      return;
    }

    Alert.alert(
      'Finish Run',
      'Are you sure you want to finish this workout?',
      [
        { text: 'Continue', style: 'cancel' },
        { 
          text: 'Finish', 
          style: 'destructive', 
          onPress: saveRunAndFinish
        }
      ]
    );
  };

  const saveRunAndFinish = async () => {
    console.log('💾 Saving run data...');
    locationService.stopTracking();
    
    try {
      const runData = locationService.getRunData();
      const coordinates = locationService.getCoordinates();
      
      console.log('📊 Final run data:', runData);
      
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
        route_coordinates: coordinates,
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

  const statsAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: statsOpacity.value,
    };
  });

  const handleLongPressStop = () => {
    handleFinishRun();
  };

  if (!locationPermission) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          {/* Header */}
          <View style={styles.header}>
            <AnimatedButton onPress={() => router.back()} hapticType="light">
              <ArrowLeft color="#111827" size={24} />
            </AnimatedButton>
            <Text style={styles.headerTitle}>Active Run</Text>
            <View style={{ width: 24 }} />
          </View>
          
          <View style={styles.permissionContainer}>
            {initializing ? (
              <>
                <Text style={styles.permissionTitle}>Initializing...</Text>
                <Text style={styles.permissionDescription}>
                  Setting up location services for your run.
                </Text>
              </>
            ) : (
              <>
            <Text style={styles.permissionTitle}>Location Permission Required</Text>
            <Text style={styles.permissionDescription}>
              Location access is needed to track your run accurately and provide distance, pace, and route information.
            </Text>
            {permissionError && (
              <Text style={styles.permissionError}>{permissionError}</Text>
            )}
                <TouchableOpacity style={styles.permissionButton} onPress={initializeActiveRun}>
              <Text style={styles.permissionButtonText}>Grant Permission</Text>
            </TouchableOpacity>
              </>
            )}
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
        <View style={styles.header}>
          <AnimatedButton onPress={() => router.back()} hapticType="light">
            <ArrowLeft color="#111827" size={24} />
          </AnimatedButton>
          <Text style={styles.headerTitle}>Active Run</Text>
          <AnimatedButton 
            onPress={handleLongPressStop}
            hapticType="heavy"
            style={styles.stopButton}
          >
            <Square color="#EF4444" size={20} />
          </AnimatedButton>
        </View>

        {/* Map */}
        <View style={styles.mapContainer}>
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
                    strokeColor="#8B5CF6"
                    strokeWidth={4}
                    lineCap="round"
                    lineJoin="round"
                  />
                )}
              </MapView>
            )}
            
            {!currentLocation && (
              <View style={styles.noLocationContainer}>
                <Text style={styles.noLocationText}>Getting your location...</Text>
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
          
          {/* Real-time Stats Overlay */}
          <AnimatedView style={[styles.statsOverlay, statsAnimatedStyle]}>
            <View style={styles.liveStatItem}>
              <CountUpNumber 
                value={runStats.distance} 
                decimals={2}
                style={styles.liveStatValue}
                duration={500}
              />
              <Text style={styles.liveStatLabel}>km</Text>
            </View>
            <View style={styles.liveStatItem}>
              <CountUpNumber 
                value={runStats.speed} 
                decimals={1}
                style={styles.liveStatValue}
                duration={500}
              />
              <Text style={styles.liveStatLabel}>km/h</Text>
            </View>
            <View style={styles.liveStatItem}>
              <AnimatedText style={styles.liveStatValue}>{runStats.pace}</AnimatedText>
              <Text style={styles.liveStatLabel}>pace</Text>
            </View>
          </AnimatedView>
        </View>

        {/* Control Panel */}
        <View style={styles.controlPanel}>
          {/* Main Stats */}
          <View style={styles.mainStats}>
            <View style={styles.primaryStat}>
              <CountUpNumber 
                value={runStats.distance} 
                decimals={2}
                style={styles.primaryStatValue}
                duration={800}
              />
              <Text style={styles.primaryStatUnit}>km</Text>
              <Text style={styles.primaryStatLabel}>distance</Text>
            </View>
            
            <View style={styles.secondaryStats}>
              <View style={styles.secondaryStat}>
                <AnimatedText style={styles.secondaryStatValue}>{runStats.pace}</AnimatedText>
                <Text style={styles.secondaryStatLabel}>min/km</Text>
              </View>
              <View style={styles.secondaryStat}>
                <CountUpNumber 
                  value={runStats.speed} 
                  decimals={1}
                  style={styles.secondaryStatValue}
                  duration={500}
                />
                <Text style={styles.secondaryStatLabel}>km/h</Text>
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
              <View style={styles.statIcon}>
                <Flame color="#F97316" size={16} />
              </View>
              <CountUpNumber 
                value={runStats.calories} 
                style={styles.statValue}
                duration={600}
              />
              <Text style={styles.statUnit}>kcal</Text>
            </View>

            <View style={styles.statItem}>
              <View style={styles.statIcon}>
                <Zap color="#EAB308" size={16} />
              </View>
              <CountUpNumber 
                value={runStats.elevationGain} 
                style={styles.statValue}
                duration={600}
              />
              <Text style={styles.statUnit}>m elevation</Text>
            </View>

            <View style={styles.statItem}>
              <View style={styles.statIcon}>
                <Clock color="#6366F1" size={16} />
              </View>
              <Text style={styles.statValue}>{formatTime(runStats.duration)}</Text>
              <Text style={styles.statUnit}>time</Text>
            </View>
          </View>

          {/* Status Indicator */}
          <View style={styles.statusIndicator}>
            <AnimatedView style={[
              styles.statusDot, 
              isRunning ? styles.runningDot : isPaused ? styles.pausedDot : styles.readyDot,
              statusDotAnimatedStyle
            ]} />
            <Text style={styles.statusText}>
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
    backgroundColor: '#F9FAFB',
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
    backgroundColor: '#FFFFFF',
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
    color: '#111827',
  },
  stopButton: {
    padding: 8,
    borderRadius: 8,
  },
  mapContainer: {
    height: height * 0.5, // Make map bigger - 50% of screen height
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
    height: height * 0.5,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  noLocationText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
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
    backgroundColor: '#FFFFFF',
    paddingTop: 20,
    paddingBottom: 40,
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
    color: '#111827',
  },
  primaryStatUnit: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginTop: -8,
  },
  primaryStatLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    marginTop: 4,
  },
  secondaryStats: {
    flex: 1,
    gap: 16,
  },
  secondaryStat: {
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
  },
  secondaryStatValue: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#111827',
  },
  secondaryStatLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
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
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginBottom: 2,
  },
  statUnit: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
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
    color: '#6B7280',
  },
  statsOverlay: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  liveStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  liveStatValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    marginBottom: 2,
  },
  liveStatLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 10,
    fontFamily: 'Inter-Regular',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  permissionTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 16,
  },
  permissionDescription: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  permissionButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  permissionButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});