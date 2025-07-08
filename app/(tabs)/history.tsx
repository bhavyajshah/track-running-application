import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar, Filter, Search, MapPin, Clock, Zap } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import FilterModal, { FilterOptions } from '@/components/FilterModal';
import { formatDuration } from '@/lib/geolib';
import LoadingSpinner from '@/components/LoadingSpinner';
import SkeletonLoader from '@/components/SkeletonLoader';
import AnimatedButton from '@/components/AnimatedButton';
import AnimatedCard from '@/components/AnimatedCard';
import React from 'react';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

export default function HistoryScreen() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [runHistory, setRunHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterOptions>({
    dateRange: 'all',
    distance: 'all',
    duration: 'all',
    pace: 'all',
  });
  const [searchFocused, setSearchFocused] = useState(false);
  
  const searchScale = useSharedValue(1);

  useEffect(() => {
    loadRunHistory();
  }, [user]);

  const loadRunHistory = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const { data: runs, error: fetchError } = await supabase
        .from('runs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('Error loading runs:', fetchError);
        setError('Failed to load running history');
        setRunHistory([]);
        return;
      }

      // Transform data for display
      const transformedRuns = runs?.map((run, index) => ({
        id: run.id,
        date: new Date(run.created_at).toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        }),
        fullDate: new Date(run.created_at).toLocaleDateString('en-US', { 
          month: 'long', 
          day: 'numeric', 
          year: 'numeric' 
        }),
        distance: run.distance || 0,
        calories: run.calories || 0,
        duration: formatDuration(run.duration || 0), 
        pace: run.pace || '0:00 min/km',
        avgSpeed: run.avg_speed || 0,
        elevation: run.elevation_gain || 0, 
        route: `https://images.pexels.com/photos/${1089438 + (index % 10)}/pexels-photo-${1089438 + (index % 10)}.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=2`,
        location: run.location || 'Unknown Location'
      })) || [];

      setRunHistory(transformedRuns);
    } catch (error) {
      console.error('Error loading run history:', error);
      setError('Failed to load running history');
      setRunHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await loadRunHistory();
    setRefreshing(false);
  }, [user]);

  const totalDistance = runHistory.reduce((sum, run) => sum + run.distance, 0);
  const totalCalories = runHistory.reduce((sum, run) => sum + run.calories, 0);
  const totalRuns = runHistory.length;
  
  const calculateAvgPace = () => {
    if (runHistory.length === 0) return '0:00';
    
    const totalSeconds = runHistory.reduce((sum, run) => {
      const paceStr = run.pace.replace(' min/km', '');
      const [min, sec] = paceStr.split(':').map(Number);
      return sum + (min * 60 + sec);
    }, 0);
    
    const avgSeconds = totalSeconds / runHistory.length;
    const minutes = Math.floor(avgSeconds / 60);
    const seconds = Math.floor(avgSeconds % 60);
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const filteredHistory = runHistory.filter(run => {
    if (searchQuery && !run.location.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  const handleApplyFilters = (newFilters: FilterOptions) => {
    setFilters(newFilters);
  };

  const searchAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: searchScale.value }],
    };
  });

  const handleSearchFocus = () => {
    setSearchFocused(true);
    searchScale.value = withSpring(1.01);
  };

  const handleSearchBlur = () => {
    setSearchFocused(false);
    searchScale.value = withSpring(1);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#8B5CF6', '#A855F7', '#C084FC']}
          style={styles.gradient}
        >
          <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Run History</Text>
              <View style={styles.headerButtons}>
                <SkeletonLoader width={32} height={32} borderRadius={16} />
                <SkeletonLoader width={32} height={32} borderRadius={16} />
              </View>
            </View>
            <View style={styles.content}>
              <SkeletonLoader width="100%" height={50} borderRadius={16} style={{ marginBottom: 20 }} />
              <SkeletonLoader width="100%" height={120} borderRadius={16} style={{ marginBottom: 20 }} />
              {[...Array(3)].map((_, index) => (
                <SkeletonLoader 
                  key={index} 
                  width="100%" 
                  height={180} 
                  borderRadius={16} 
                  style={{ marginBottom: 16 }} 
                />
              ))}
              <View style={styles.loadingSpinnerContainer}>
                <LoadingSpinner size={32} />
                <Text style={styles.loadingText}>Loading your runs...</Text>
              </View>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#8B5CF6', '#A855F7', '#C084FC']}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.safeArea}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Run History</Text>
            <View style={styles.headerButtons}>
              <AnimatedButton style={styles.headerButton} hapticType="light">
                <Calendar color="#FFFFFF" size={20} />
              </AnimatedButton>
              <AnimatedButton 
                style={styles.headerButton}
                onPress={() => setShowFilters(true)}
                hapticType="light"
              >
                <Filter color="#FFFFFF" size={20} />
              </AnimatedButton>
            </View>
          </View>

          {/* Content */}
          <View style={styles.content}>
            {/* Search Bar */}
            <Animated.View style={[styles.searchContainer, searchAnimatedStyle]}>
              <Search size={20} color="#6B7280" />
              <AnimatedTextInput
                style={styles.searchInput}
                placeholder="Search by location..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="#9CA3AF"
                onFocus={handleSearchFocus}
                onBlur={handleSearchBlur}
              />
            </Animated.View>

            <ScrollView 
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl 
                  refreshing={refreshing} 
                  onRefresh={onRefresh}
                  tintColor="#8B5CF6"
                  colors={['#8B5CF6']}
                />
              }
            >
              {/* Summary Stats */}
              {runHistory.length > 0 && (
                <AnimatedCard delay={200}>
                  <View style={styles.summaryCard}>
                    <Text style={styles.summaryTitle}>Period Summary</Text>
                    <View style={styles.summaryStats}>
                      <View style={styles.summaryItem}>
                        <Text style={styles.summaryValue}>{totalRuns}</Text>
                        <Text style={styles.summaryLabel}>runs</Text>
                      </View>
                      <View style={styles.summaryItem}>
                        <Text style={styles.summaryValue}>{totalDistance.toFixed(1)}</Text>
                        <Text style={styles.summaryLabel}>km</Text>
                      </View>
                      <View style={styles.summaryItem}>
                        <Text style={styles.summaryValue}>{totalCalories}</Text>
                        <Text style={styles.summaryLabel}>kcal</Text>
                      </View>
                      <View style={styles.summaryItem}>
                        <Text style={styles.summaryValue}>{calculateAvgPace()}</Text>
                        <Text style={styles.summaryLabel}>avg pace</Text>
                      </View>
                    </View>
                  </View>
                </AnimatedCard>
              )}

              {/* Error State */}
              {error && (
                <AnimatedCard delay={300}>
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                    <AnimatedButton 
                      style={styles.retryButton}
                      onPress={loadRunHistory}
                      hapticType="medium"
                    >
                      <Text style={styles.retryButtonText}>Try Again</Text>
                    </AnimatedButton>
                  </View>
                </AnimatedCard>
              )}

              {/* History List */}
              {!error && filteredHistory.length > 0 ? (
                filteredHistory.map((run, index) => (
                  <AnimatedCard key={run.id} index={index} delay={400}>
                    <AnimatedButton style={styles.historyCard} hapticType="light">
                      <Image
                        source={{ uri: run.route }}
                        style={styles.routeImage}
                        defaultSource={{ uri: 'https://images.pexels.com/photos/1089438/pexels-photo-1089438.jpeg?auto=compress&cs=tinysrgb&w=300&h=200&dpr=2' }}
                      />
                      <View style={styles.runInfo}>
                        <View style={styles.runHeader}>
                          <View>
                            <Text style={styles.runDate}>{run.fullDate}</Text>
                            <View style={styles.locationContainer}>
                              <MapPin size={12} color="#6B7280" />
                              <Text style={styles.runLocation}>{run.location}</Text>
                            </View>
                          </View>
                          <Text style={styles.runDistance}>{run.distance.toFixed(2)} km</Text>
                        </View>
                        
                        <View style={styles.runStats}>
                          <View style={styles.statRow}>
                            <View style={styles.statItem}>
                              <Clock size={14} color="#6B7280" />
                              <Text style={styles.statLabel}>Time:</Text>
                              <Text style={styles.statValue}>{run.duration}</Text>
                            </View>
                            <View style={styles.statItem}>
                              <Zap size={14} color="#6B7280" />
                              <Text style={styles.statLabel}>Pace:</Text>
                              <Text style={styles.statValue}>{run.pace}</Text>
                            </View>
                          </View>
                          <View style={styles.statRow}>
                            <View style={styles.statItem}>
                              <Text style={styles.statLabel}>Calories:</Text>
                              <Text style={styles.statValue}>{run.calories} kcal</Text>
                            </View>
                            <View style={styles.statItem}>
                              <Text style={styles.statLabel}>Speed:</Text>
                              <Text style={styles.statValue}>{run.avgSpeed.toFixed(1)} km/h</Text>
                            </View>
                          </View>
                          <View style={styles.statRow}>
                            <View style={styles.statItem}>
                              <Text style={styles.statLabel}>Elevation:</Text>
                              <Text style={styles.statValue}>{run.elevation.toFixed(0)} m</Text>
                            </View>
                          </View>
                        </View>
                      </View>
                    </AnimatedButton>
                  </AnimatedCard>
                ))
              ) : !error && (
                <AnimatedCard delay={400}>
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyIcon}>🏃‍♂️</Text>
                    <Text style={styles.emptyText}>
                      {runHistory.length === 0 ? 'No runs yet' : 'No runs match your search'}
                    </Text>
                    <Text style={styles.emptySubtext}>
                      {runHistory.length === 0 
                        ? 'Start your first run to see it here!' 
                        : 'Try adjusting your search or filters'
                      }
                    </Text>
                  </View>
                </AnimatedCard>
              )}
            </ScrollView>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <FilterModal
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        onApplyFilters={handleApplyFilters}
        currentFilters={filters}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontFamily: 'Inter-Bold',
  },
  headerButtons: {
    flexDirection: 'row',
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
  },
  content: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 24,
    paddingHorizontal: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#111827',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  summaryTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 16,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#8B5CF6',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  routeImage: {
    width: '100%',
    height: 120,
  },
  runInfo: {
    padding: 16,
  },
  runHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  runDate: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginBottom: 4,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  runLocation: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    marginLeft: 4,
  },
  runDistance: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#111827',
  },
  runStats: {
    gap: 8,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  statValue: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  loadingSpinnerContainer: {
    alignItems: 'center',
    marginTop: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 20,
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#EF4444',
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});