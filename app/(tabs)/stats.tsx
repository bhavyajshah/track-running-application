import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { TrendingUp, Award, Target, Clock, Calendar, ChartBar as BarChart3 } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withDelay,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { formatDuration } from '@/lib/geolib';
import LoadingSpinner from '@/components/LoadingSpinner';
import SkeletonLoader from '@/components/SkeletonLoader';
import AnimatedButton from '@/components/AnimatedButton';
import AnimatedCard from '@/components/AnimatedCard';
import CountUpNumber from '@/components/CountUpNumber';
import { useTheme } from '@/contexts/ThemeContext';
import React from 'react';

const { width } = Dimensions.get('window');

export default function StatsScreen() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year' | 'custom'>('month');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customDateRange, setCustomDateRange] = useState({
    startDate: '',
    endDate: '',
  });
  const [statsData, setStatsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const selectorPosition = useSharedValue(1);

  const periods = [
    { key: 'week', label: 'Week' },
    { key: 'month', label: 'Month' },
    { key: 'year', label: 'Year' },
    { key: 'custom', label: 'Custom' },
  ];

  React.useEffect(() => {
    loadStatsData();
    
    // Animate selector position
    const index = periods.findIndex(p => p.key === selectedPeriod);
    selectorPosition.value = withSpring(index);
  }, [user, selectedPeriod]);

  const loadStatsData = async () => {
    if (!user) {
      setStatsData(null);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      // Calculate date range based on selected period
      const now = new Date();
      let startDate: Date;
      
      if (selectedPeriod === 'custom' && customDateRange.startDate && customDateRange.endDate) {
        startDate = new Date(customDateRange.startDate);
      } else {
        switch (selectedPeriod) {
          case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case 'year':
            startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            break;
          default:
            startDate = new Date(0);
        }
      }
      
      const { data: runs, error } = await supabase
        .from('runs')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading stats:', error);
        return;
      }

      if (!runs || runs.length === 0) {
        setStatsData({
          distance: 0,
          time: '0h 0m',
          calories: 0,
          runs: 0,
          avgPace: '0:00',
          avgSpeed: 0,
          elevation: 0,
          bestRun: 0,
          longestRun: '0h 0m',
        });
        return;
      }

      // Calculate statistics
      const totalDistance = runs.reduce((sum, run) => sum + (run.distance || 0), 0);
      const totalDuration = runs.reduce((sum, run) => sum + (run.duration || 0), 0);
      const totalCalories = runs.reduce((sum, run) => sum + (run.calories || 0), 0);
      const totalElevation = runs.reduce((sum, run) => sum + (run.elevation_gain || 0), 0);
      
      const avgSpeed = runs.length > 0 ? 
        runs.reduce((sum, run) => sum + (run.avg_speed || 0), 0) / runs.length : 0;
      
      // Calculate average pace
      const avgPaceSeconds = runs.length > 0 ? 
        runs.reduce((sum, run) => {
          const paceStr = (run.pace || '0:00').replace(' min/km', '');
          const [min, sec] = paceStr.split(':').map(Number);
          return sum + (min * 60 + sec);
        }, 0) / runs.length : 0;
      
      const avgPaceMinutes = Math.floor(avgPaceSeconds / 60);
      const avgPaceSecondsRemainder = Math.floor(avgPaceSeconds % 60);
      const avgPace = `${avgPaceMinutes}:${avgPaceSecondsRemainder.toString().padStart(2, '0')}`;
      
      // Find best run (longest distance)
      const bestRun = runs.length > 0 ? Math.max(...runs.map(run => run.distance || 0)) : 0;
      
      // Find longest run (by duration)
      const longestRunDuration = runs.length > 0 ? Math.max(...runs.map(run => run.duration || 0)) : 0;
      
      setStatsData({
        distance: totalDistance,
        time: formatDuration(totalDuration),
        calories: totalCalories,
        runs: runs.length,
        avgPace,
        avgSpeed,
        elevation: totalElevation,
        bestRun,
        longestRun: formatDuration(longestRunDuration),
      });
      
    } catch (error) {
      console.error('Error loading stats:', error);
      setStatsData({
        distance: 0,
        time: '0h 0m',
        calories: 0,
        runs: 0,
        avgPace: '0:00',
        avgSpeed: 0,
        elevation: 0,
        bestRun: 0,
        longestRun: '0h 0m',
      });
    } finally {
      setLoading(false);
    }
  };

  const getCurrentStats = () => {
    return statsData || {
      distance: 0,
      time: '0h 0m',
      calories: 0,
      runs: 0,
      avgPace: '0:00',
      avgSpeed: 0,
      elevation: 0,
      bestRun: 0,
      longestRun: '0h 0m',
    };
  };

  const generateAchievements = () => {
    const currentStats = getCurrentStats();
    const achievements = [];
    
    if (currentStats.distance >= 5) {
      achievements.push({
        id: 1,
        title: 'First 5km',
        description: 'Completed a 5km run',
        date: new Date().toLocaleDateString(),
        icon: '🏃‍♀️',
        category: 'distance'
      });
    }
    
    if (currentStats.distance >= 10) {
      achievements.push({
        id: 2,
        title: 'First 10km',
        description: 'Completed a 10km run',
        date: new Date().toLocaleDateString(),
        icon: '🏆',
        category: 'distance'
      });
    }
    
    if (currentStats.runs >= 5) {
      achievements.push({
        id: 3,
        title: 'Consistent Runner',
        description: 'Completed 5 runs',
        date: new Date().toLocaleDateString(),
        icon: '🎯',
        category: 'consistency'
      });
    }
    
    if (currentStats.calories >= 1000) {
      achievements.push({
        id: 4,
        title: 'Calorie Burner',
        description: 'Burned 1000+ calories',
        date: new Date().toLocaleDateString(),
        icon: '🔥',
        category: 'fitness'
      });
    }
    
    return achievements;
  };

  const selectorAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: selectorPosition.value * (width - 80) / 4 }],
    };
  });

  const handlePeriodSelect = (period: typeof selectedPeriod) => {
    setSelectedPeriod(period);
    if (period === 'custom') {
      setShowDatePicker(true);
    }
  };

  const handleCustomDateRange = () => {
    // Validate dates
    if (!customDateRange.startDate || !customDateRange.endDate) {
      alert('Please select both start and end dates');
      return;
    }
    
    const startDate = new Date(customDateRange.startDate);
    const endDate = new Date(customDateRange.endDate);
    
    if (startDate >= endDate) {
      alert('Start date must be before end date');
      return;
    }
    
    setShowDatePicker(false);
    loadStatsData();
  };

  const renderDatePickerModal = () => (
    <Modal
      visible={showDatePicker}
      transparent
      animationType="slide"
      onRequestClose={() => setShowDatePicker(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Select Date Range</Text>
          
          <View style={styles.dateInputContainer}>
            <Text style={[styles.dateLabel, { color: theme.colors.text }]}>Start Date</Text>
            <TouchableOpacity 
              style={[styles.dateInput, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
              onPress={() => {
                // For now, we'll use a simple prompt for date input
                // In a real app, you'd use a proper date picker
                const date = prompt('Enter start date (YYYY-MM-DD):');
                if (date) {
                  setCustomDateRange(prev => ({ ...prev, startDate: date }));
                }
              }}
            >
              <Text style={[styles.dateText, { color: theme.colors.text }]}>
                {customDateRange.startDate || 'Select start date'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.dateInputContainer}>
            <Text style={[styles.dateLabel, { color: theme.colors.text }]}>End Date</Text>
            <TouchableOpacity 
              style={[styles.dateInput, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
              onPress={() => {
                const date = prompt('Enter end date (YYYY-MM-DD):');
                if (date) {
                  setCustomDateRange(prev => ({ ...prev, endDate: date }));
                }
              }}
            >
              <Text style={[styles.dateText, { color: theme.colors.text }]}>
                {customDateRange.endDate || 'Select end date'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity 
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setShowDatePicker(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.modalButton, styles.applyButton]}
              onPress={handleCustomDateRange}
            >
              <Text style={styles.applyButtonText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const currentStats = getCurrentStats();
  const achievements = generateAchievements();

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <LinearGradient
          colors={['#8B5CF6', '#A855F7', '#C084FC']}
          style={styles.gradient}
        >
          <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Statistics</Text>
              <SkeletonLoader width={32} height={32} borderRadius={16} />
            </View>
            <View style={styles.content}>
              <SkeletonLoader width="100%" height={50} borderRadius={16} style={{ marginBottom: 20 }} />
              <SkeletonLoader width="100%" height={200} borderRadius={16} style={{ marginBottom: 20 }} />
              <SkeletonLoader width="100%" height={150} borderRadius={16} style={{ marginBottom: 20 }} />
              <View style={styles.loadingSpinnerContainer}>
                <LoadingSpinner size={32} />
                <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading statistics...</Text>
              </View>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <LinearGradient
        colors={['#8B5CF6', '#A855F7', '#C084FC']}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.safeArea}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Statistics</Text>
            <AnimatedButton 
              style={styles.calendarButton} 
              onPress={() => setShowDatePicker(true)}
              hapticType="light"
            >
              <Calendar color="#FFFFFF" size={20} />
            </AnimatedButton>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Period Selector */}
              <View style={[styles.periodSelector, { backgroundColor: theme.colors.surface }]}>
                <Animated.View style={[styles.selectorIndicator, { backgroundColor: theme.colors.primary }, selectorAnimatedStyle]} />
                {periods.map((period) => (
                  <AnimatedButton
                    key={period.key}
                    style={[
                      styles.periodButton,
                      selectedPeriod === period.key && styles.periodButtonActive
                    ]}
                    onPress={() => handlePeriodSelect(period.key as any)}
                    hapticType="light"
                  >
                    <Text style={[
                      styles.periodButtonText,
                      { color: selectedPeriod === period.key ? '#FFFFFF' : theme.colors.textSecondary }
                    ]}>
                      {period.label}
                    </Text>
                  </AnimatedButton>
                ))}
              </View>

              {/* Main Stats */}
              {statsData && (
              <AnimatedCard delay={200}>
              <View style={[styles.statsCard, { backgroundColor: theme.colors.surface }]}>
                <View style={styles.statsHeader}>
                  <TrendingUp color={theme.colors.primary} size={24} />
                  <Text style={[styles.statsTitle, { color: theme.colors.text }]}>
                    This {selectedPeriod === 'week' ? 'Week' : 
                        selectedPeriod === 'month' ? 'Month' : 
                        selectedPeriod === 'year' ? 'Year' : 'Custom Period'}
                  </Text>
                </View>
                
                <View style={styles.statsGrid}>
                  <View style={[styles.statItem, { backgroundColor: theme.colors.background }]}>
                    <CountUpNumber 
                      value={currentStats.distance} 
                      decimals={1}
                      style={[styles.statValue, { color: theme.colors.text }]}
                      delay={400}
                    />
                    <Text style={[styles.statUnit, { color: theme.colors.textSecondary }]}>km</Text>
                    <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Distance</Text>
                  </View>
                  <View style={[styles.statItem, { backgroundColor: theme.colors.background }]}>
                    <CountUpNumber 
                      value={currentStats.runs} 
                      style={[styles.statValue, { color: theme.colors.text }]}
                      delay={500}
                    />
                    <Text style={[styles.statUnit, { color: theme.colors.textSecondary }]}>runs</Text>
                    <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Workouts</Text>
                  </View>
                  <View style={[styles.statItem, { backgroundColor: theme.colors.background }]}>
                    <Text style={[styles.statValue, { color: theme.colors.text }]}>{currentStats.time}</Text>
                    <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Time</Text>
                  </View>
                  <View style={[styles.statItem, { backgroundColor: theme.colors.background }]}>
                    <CountUpNumber 
                      value={currentStats.calories} 
                      style={[styles.statValue, { color: theme.colors.text }]}
                      delay={700}
                    />
                    <Text style={[styles.statUnit, { color: theme.colors.textSecondary }]}>kcal</Text>
                    <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Burned</Text>
                  </View>
                </View>

                <View style={[styles.avgStats, { borderTopColor: theme.colors.border }]}>
                  <View style={styles.avgStatItem}>
                    <Text style={[styles.avgStatLabel, { color: theme.colors.textSecondary }]}>Average Pace</Text>
                    <Text style={[styles.avgStatValue, { color: theme.colors.text }]}>{currentStats.avgPace}</Text>
                  </View>
                  <View style={styles.avgStatItem}>
                    <Text style={[styles.avgStatLabel, { color: theme.colors.textSecondary }]}>Average Speed</Text>
                    <Text style={[styles.avgStatValue, { color: theme.colors.text }]}>{currentStats.avgSpeed.toFixed(1)} km/h</Text>
                  </View>
                  <View style={styles.avgStatItem}>
                    <Text style={[styles.avgStatLabel, { color: theme.colors.textSecondary }]}>Elevation Gain</Text>
                    <Text style={[styles.avgStatValue, { color: theme.colors.text }]}>{currentStats.elevation.toFixed(0)} m</Text>
                  </View>
                </View>
              </View>
              </AnimatedCard>
              )}

              {/* Personal Records */}
              {selectedPeriod !== 'week' && statsData && currentStats.bestRun > 0 && (
                <AnimatedCard delay={400}>
                <View style={[styles.recordsCard, { backgroundColor: theme.colors.surface }]}>
                  <View style={styles.recordsHeader}>
                    <Target color="#10B981" size={24} />
                    <Text style={[styles.recordsTitle, { color: theme.colors.text }]}>Personal Records</Text>
                  </View>
                  
                  <View style={styles.recordsGrid}>
                    <View style={[styles.recordItem, { backgroundColor: '#F0FDF4' }]}>
                      <Text style={[styles.recordValue, { color: '#10B981' }]}>{currentStats.bestRun.toFixed(1)}</Text>
                      <Text style={[styles.recordLabel, { color: '#10B981' }]}>km</Text>
                      <Text style={[styles.recordDescription, { color: theme.colors.textSecondary }]}>Best Distance</Text>
                    </View>
                    <View style={[styles.recordItem, { backgroundColor: '#F0FDF4' }]}>
                      <Text style={[styles.recordValue, { color: '#10B981' }]}>{currentStats.longestRun}</Text>
                      <Text style={[styles.recordDescription, { color: theme.colors.textSecondary }]}>Longest Run</Text>
                    </View>
                  </View>
                </View>
                </AnimatedCard>
              )}

              {/* Achievements */}
              {achievements.length > 0 && (
              <AnimatedCard delay={600}>
              <View style={[styles.achievementsCard, { backgroundColor: theme.colors.surface }]}>
                <View style={styles.achievementsHeader}>
                  <Award color="#F59E0B" size={24} />
                  <Text style={[styles.achievementsTitle, { color: theme.colors.text }]}>Achievements</Text>
                </View>
                
                <View style={styles.achievementsGrid}>
                  {achievements.map((achievement) => (
                    <AnimatedCard key={achievement.id} index={achievement.id} delay={800}>
                      <View style={[styles.achievementItem, { backgroundColor: '#FEF3C7' }]}>
                      <Text style={styles.achievementIcon}>{achievement.icon}</Text>
                      <View style={styles.achievementInfo}>
                        <Text style={[styles.achievementTitle, { color: theme.colors.text }]}>{achievement.title}</Text>
                        <Text style={[styles.achievementDescription, { color: theme.colors.textSecondary }]}>{achievement.description}</Text>
                        <Text style={[styles.achievementDate, { color: theme.colors.textSecondary }]}>{achievement.date}</Text>
                      </View>
                      </View>
                    </AnimatedCard>
                  ))}
                </View>
              </View>
              </AnimatedCard>
              )}

              {/* Goals Section */}
              {statsData && (
              <AnimatedCard delay={800}>
              <View style={[styles.goalsCard, { backgroundColor: theme.colors.surface }]}>
                <View style={styles.goalsHeader}>
                  <Target color={theme.colors.primary} size={24} />
                  <Text style={[styles.goalsTitle, { color: theme.colors.text }]}>
                    {selectedPeriod === 'week' ? 'Weekly' : 
                     selectedPeriod === 'month' ? 'Monthly' : 
                     selectedPeriod === 'year' ? 'Yearly' : 'Custom'} Goals
                  </Text>
                </View>
                
                <View style={styles.goalsList}>
                  <View style={[styles.goalItem, { backgroundColor: theme.colors.background }]}>
                    <View style={styles.goalInfo}>
                      <Text style={[styles.goalTitle, { color: theme.colors.text }]}>
                        Run {selectedPeriod === 'week' ? '50' : selectedPeriod === 'month' ? '200' : '2000'}km
                      </Text>
                      <Text style={[styles.goalProgress, { color: theme.colors.textSecondary }]}>
                        {currentStats.distance.toFixed(1)} / {selectedPeriod === 'week' ? '50' : selectedPeriod === 'month' ? '200' : '2000'} km
                      </Text>
                    </View>
                    <View style={[styles.goalProgressBar, { backgroundColor: theme.colors.border }]}>
                      <View style={[
                        styles.goalProgressFill, 
                        { 
                          width: `${Math.min((currentStats.distance / (selectedPeriod === 'week' ? 50 : selectedPeriod === 'month' ? 200 : 2000)) * 100, 100)}%`,
                          backgroundColor: theme.colors.primary
                        }
                      ]} />
                    </View>
                  </View>
                  
                  <View style={[styles.goalItem, { backgroundColor: theme.colors.background }]}>
                    <View style={styles.goalInfo}>
                      <Text style={[styles.goalTitle, { color: theme.colors.text }]}>
                        {selectedPeriod === 'week' ? '5' : selectedPeriod === 'month' ? '20' : '200'} Workouts
                      </Text>
                      <Text style={[styles.goalProgress, { color: theme.colors.textSecondary }]}>
                        {currentStats.runs} / {selectedPeriod === 'week' ? '5' : selectedPeriod === 'month' ? '20' : '200'} workouts
                      </Text>
                    </View>
                    <View style={[styles.goalProgressBar, { backgroundColor: theme.colors.border }]}>
                      <View style={[
                        styles.goalProgressFill, 
                        { 
                          width: `${Math.min((currentStats.runs / (selectedPeriod === 'week' ? 5 : selectedPeriod === 'month' ? 20 : 200)) * 100, 100)}%`,
                          backgroundColor: theme.colors.primary
                        }
                      ]} />
                    </View>
                  </View>
                  
                  <View style={[styles.goalItem, { backgroundColor: theme.colors.background }]}>
                    <View style={styles.goalInfo}>
                      <Text style={[styles.goalTitle, { color: theme.colors.text }]}>
                        Burn {selectedPeriod === 'week' ? '2000' : selectedPeriod === 'month' ? '8000' : '80000'} kcal
                      </Text>
                      <Text style={[styles.goalProgress, { color: theme.colors.textSecondary }]}>
                        {currentStats.calories} / {selectedPeriod === 'week' ? '2000' : selectedPeriod === 'month' ? '8000' : '80000'} kcal
                      </Text>
                    </View>
                    <View style={[styles.goalProgressBar, { backgroundColor: theme.colors.border }]}>
                      <View style={[
                        styles.goalProgressFill, 
                        { 
                          width: `${Math.min((currentStats.calories / (selectedPeriod === 'week' ? 2000 : selectedPeriod === 'month' ? 8000 : 80000)) * 100, 100)}%`,
                          backgroundColor: theme.colors.primary
                        }
                      ]} />
                    </View>
                  </View>
                </View>
              </View>
              </AnimatedCard>
              )}
              
              {!statsData && (
                <AnimatedCard delay={400}>
                <View style={styles.emptyContainer}>
                  <Text style={[styles.emptyText, { color: theme.colors.text }]}>No data available</Text>
                  <Text style={[styles.emptySubtext, { color: theme.colors.textSecondary }]}>Start running to see your statistics!</Text>
                </View>
                </AnimatedCard>
              )}
            </ScrollView>
          </View>
        </SafeAreaView>
      </LinearGradient>
      
      {renderDatePickerModal()}
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
  calendarButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 24,
    paddingHorizontal: 20,
  },
  periodSelector: {
    flexDirection: 'row',
    position: 'relative',
    borderRadius: 16,
    padding: 4,
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
  selectorIndicator: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 4,
    bottom: 4,
    width: (width - 80) / 4,
    borderRadius: 12,
    zIndex: 0,
  },
  periodButton: {
    flex: 1,
    zIndex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
  },
  periodButtonActive: {},
  periodButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  statsCard: {
    borderRadius: 20,
    padding: 20,
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
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  statsTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    marginLeft: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statItem: {
    width: '48%',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
  },
  statUnit: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
  avgStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: 16,
  },
  avgStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  avgStatLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    marginBottom: 4,
    textAlign: 'center',
  },
  avgStatValue: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  recordsCard: {
    borderRadius: 20,
    padding: 20,
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
  recordsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  recordsTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    marginLeft: 12,
  },
  recordsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  recordItem: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
  },
  recordValue: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
  },
  recordLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    marginBottom: 4,
  },
  recordDescription: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
  achievementsCard: {
    borderRadius: 20,
    padding: 20,
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
  achievementsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  achievementsTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    marginLeft: 12,
  },
  achievementsGrid: {
    gap: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  loadingSpinnerContainer: {
    alignItems: 'center',
    marginTop: 40,
    gap: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
  },
  achievementIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 4,
  },
  achievementDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginBottom: 4,
  },
  achievementDate: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  goalsCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 100,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  goalsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  goalsTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    marginLeft: 12,
  },
  goalsList: {
    gap: 16,
  },
  goalItem: {
    borderRadius: 12,
    padding: 16,
  },
  goalInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  goalTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  goalProgress: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  goalProgressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  goalProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  dateInputContainer: {
    marginBottom: 20,
  },
  dateLabel: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 8,
  },
  dateInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  dateText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
  },
  applyButton: {
    backgroundColor: '#8B5CF6',
  },
  applyButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});