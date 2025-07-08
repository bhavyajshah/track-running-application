import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  MapPin,
  Clock,
  Zap,
  Flame,
  TrendingUp,
  Share,
  Mountain,
} from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import AnimatedButton from '@/components/AnimatedButton';
import LoadingSpinner from '@/components/LoadingSpinner';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import MapView, { Polyline } from 'react-native-maps';
import { formatDuration } from '@/lib/geolib';

const { width, height } = Dimensions.get('window');
const AnimatedView = Animated.createAnimatedComponent(View);

interface RunData {
  id: string;
  user_id: string;
  distance: number;
  duration: number;
  calories: number;
  avg_speed: number;
  max_speed: number;
  pace: string;
  elevation_gain: number;
  route_coordinates: any[];
  location: string;
  weather_data: any;
  splits: any[];
  start_time: string;
  end_time: string;
  created_at: string;
}

export default function RunDetailsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { id } = useLocalSearchParams();
  
  const [runDetails, setRunDetails] = useState<RunData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRunDetails = async () => {
      if (!id) {
        setError('Run ID not provided.');
        setLoading(false);
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        const { data, error: fetchError } = await supabase
          .from('runs')
          .select('*')
          .eq('id', id)
          .single();

        if (fetchError) {
          setError('Run not found or an error occurred: ' + fetchError.message);
        } else {
          setRunDetails(data);
        }
      } catch (err: any) {
        setError('An unexpected error occurred: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRunDetails();
  }, [id]);

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: theme.colors.background }]}>
        <LoadingSpinner size={48} />
        <Text style={[styles.loadingText, { color: theme.colors.text }]}>Loading run details...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
        <AnimatedButton onPress={() => router.back()} style={styles.backButton} hapticType="light">
          <Text style={[styles.backButtonText, { color: theme.colors.primary }]}>Go Back</Text>
        </AnimatedButton>
      </View>
    );
  }

  if (!runDetails) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.errorText, { color: theme.colors.error }]}>Run details not found.</Text>
        <AnimatedButton onPress={() => router.back()} style={styles.backButton} hapticType="light">
          <Text style={[styles.backButtonText, { color: theme.colors.primary }]}>Go Back</Text>
        </AnimatedButton>
      </View>
    );
  }

  const renderStatCard = (icon: React.ComponentType<any>, title: string, value: string, subtitle?: string) => {
    const IconComponent = icon;
    return (
      <View style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.statIcon}>
          <IconComponent size={20} color={theme.colors.primary} />
        </View>
        <Text style={[styles.statValue, { color: theme.colors.text }]}>{value}</Text>
        <Text style={[styles.statTitle, { color: theme.colors.textSecondary }]}>{title}</Text>
        {subtitle && (
          <Text style={[styles.statSubtitle, { color: theme.colors.textSecondary }]}>
            {subtitle}
          </Text>
        )}
      </View>
    );
  };

  const renderSplitsChart = () => {
    if (!runDetails.splits || runDetails.splits.length === 0) {
      return null;
    }

    const maxPaceSeconds = Math.max(...runDetails.splits.map((split: any) => {
      const [min, sec] = split.pace.split(':').map(Number);
      return min * 60 + sec;
    }));

    return (
      <View style={[styles.splitsCard, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Kilometer Splits</Text>
        <View style={styles.splitsChart}>
          {runDetails.splits.map((split: any, index: number) => {
            const barHeight = useSharedValue(0);
            
            React.useEffect(() => {
              barHeight.value = withDelay(
                index * 100,
                withSpring((paceSeconds / maxPaceSeconds) * 100)
              );
            }, []);
            
            const animatedBarStyle = useAnimatedStyle(() => {
              return {
                height: `${barHeight.value}%`,
              };
            });

            const [min, sec] = split.pace.split(':').map(Number);
            const paceSeconds = min * 60 + sec;
            const height = (paceSeconds / maxPaceSeconds) * 100;

            return (
              <View key={split.km || index} style={styles.splitBar}>
                <AnimatedView
                  style={[
                    styles.splitBarFill,
                    {
                      backgroundColor: theme.colors.primary,
                    },
                    animatedBarStyle,
                  ]}
                />
                <Text style={[styles.splitPace, { color: theme.colors.textSecondary }]}>
                  {split.pace}
                </Text>
                <Text style={[styles.splitKm, { color: theme.colors.textSecondary }]}>
                  {split.km || index + 1}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric',
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <SafeAreaView style={styles.safeArea}>
        {/* Fixed Header */}
        <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
          <AnimatedButton onPress={() => router.back()} hapticType="light">
            <ArrowLeft color={theme.colors.text} size={24} />
          </AnimatedButton>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Run Details</Text>
          <AnimatedButton hapticType="light">
            <Share color={theme.colors.text} size={24} />
          </AnimatedButton>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Run Summary Header */}
          <View style={[styles.summaryHeader, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.runBasicInfo}>
              <Text style={[styles.runDate, { color: theme.colors.text }]}>
                {formatDate(runDetails.created_at)}
              </Text>
              <Text style={[styles.runTime, { color: theme.colors.textSecondary }]}>
                {runDetails.start_time ? formatTime(runDetails.start_time) : 'Unknown time'}
              </Text>
              <View style={styles.locationInfo}>
                <MapPin size={16} color={theme.colors.textSecondary} />
                <Text style={[styles.locationName, { color: theme.colors.textSecondary }]}>
                  {runDetails.location}
                </Text>
              </View>
            </View>
            <View style={styles.runMainStat}>
              <Text style={[styles.runDistance, { color: theme.colors.primary }]}>
                {runDetails.distance.toFixed(2)}
              </Text>
              <Text style={[styles.runDistanceUnit, { color: theme.colors.textSecondary }]}>km</Text>
            </View>
          </View>

          {/* Route Map */}
          <View style={[styles.mapContainer, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Run Route</Text>
            {runDetails.route_coordinates && runDetails.route_coordinates.length > 0 ? (
              <MapView
                style={styles.map}
                initialRegion={{
                  latitude: runDetails.route_coordinates[0].latitude,
                  longitude: runDetails.route_coordinates[0].longitude,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
                scrollEnabled={true}
                zoomEnabled={true}
              >
                <Polyline
                  coordinates={runDetails.route_coordinates}
                  strokeColor={theme.colors.primary}
                  strokeWidth={4}
                  lineCap="round"
                  lineJoin="round"
                />
              </MapView>
            ) : (
              <View style={styles.noMapContainer}>
                <Text style={[styles.noMapText, { color: theme.colors.textSecondary }]}>
                  No route data available for this run
                </Text>
              </View>
            )}
          </View>

          {/* Main Stats Grid */}
          <View style={styles.statsGrid}>
            {renderStatCard(Clock, 'Duration', formatDuration(runDetails.duration))}
            {renderStatCard(Zap, 'Avg Pace', runDetails.pace, 'min/km')}
            {renderStatCard(TrendingUp, 'Avg Speed', `${runDetails.avg_speed.toFixed(1)} km/h`)}
            {renderStatCard(Flame, 'Calories', `${runDetails.calories} kcal`)}
            {renderStatCard(Mountain, 'Elevation', `${runDetails.elevation_gain.toFixed(0)} m`)}
            {renderStatCard(Zap, 'Max Speed', `${runDetails.max_speed.toFixed(1)} km/h`)}
          </View>


          {/* Splits Chart */}
          {renderSplitsChart()}

          {/* Additional Details */}
          <View style={[styles.detailsCard, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Run Details</Text>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>Started at:</Text>
              <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                {runDetails.start_time ? formatTime(runDetails.start_time) : 'Unknown'}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>Ended at:</Text>
              <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                {runDetails.end_time ? formatTime(runDetails.end_time) : 'Unknown'}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>Total distance:</Text>
              <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                {runDetails.distance.toFixed(2)} km
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>GPS points:</Text>
              <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                {runDetails.route_coordinates?.length || 0} recorded
              </Text>
            </View>
          </View>
        </ScrollView>
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
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  scrollContent: {
    paddingBottom: 100,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    padding: 20,
    margin: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  runBasicInfo: {
    flex: 1,
  },
  runDate: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 4,
  },
  runTime: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginBottom: 8,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationName: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  runMainStat: {
    alignItems: 'flex-end',
  },
  runDistance: {
    fontSize: 48,
    fontFamily: 'Inter-Bold',
  },
  runDistanceUnit: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    marginTop: -8,
  },
  mapContainer: {
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  map: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginTop: 12,
  },
  noMapContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  noMapText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  statCard: {
    width: '48%',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  statTitle: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
  statSubtitle: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 16,
  },
  splitsCard: {
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  splitsChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 120,
    marginTop: 16,
  },
  splitBar: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginHorizontal: 2,
  },
  splitBarFill: {
    width: '80%',
    borderRadius: 2,
    minHeight: 20,
  },
  splitPace: {
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
    marginTop: 4,
    transform: [{ rotate: '-45deg' }],
  },
  splitKm: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    marginTop: 8,
  },
  detailsCard: {
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  detailValue: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  loadingText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    textAlign: 'center',
    marginBottom: 20,
  },
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
});