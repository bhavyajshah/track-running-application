import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, RefreshControl, Dimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Play, Settings, Trophy, Target, TrendingUp, Calendar, Award, Clock, MapPin } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  withSpring,
  withDelay,
  withTiming,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { locationService } from '@/lib/location';
import { supabase } from '@/lib/supabase';
import { formatDuration } from '@/lib/geolib';
import RunningTips from '@/components/RunningTips';
import Sidebar from '@/components/Sidebar';
import ParallaxHomeHeader from '@/components/ParallaxHomeHeader';
import PermissionManager from '@/components/PermissionManager';
import LoadingSpinner from '@/components/LoadingSpinner';
import SkeletonLoader from '@/components/SkeletonLoader';
import AnimatedButton from '@/components/AnimatedButton';
import AnimatedCard from '@/components/AnimatedCard';
import CountUpNumber from '@/components/CountUpNumber';

const { width, height } = Dimensions.get('window');
const HEADER_HEIGHT = 350;

export default function HomeScreen() {
  const router = useRouter();
  const { user, refreshProfile } = useAuth();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [weeklyProgress, setWeeklyProgress] = useState({
    current: 0,
    target: 50,
  });
  const [recentRuns, setRecentRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userStats, setUserStats] = useState({
    totalRuns: 0,
    totalDistance: 0,
    totalCalories: 0,
    avgPace: '0:00',
  });
  const [achievements, setAchievements] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);

  // Animation values
  const scrollY = useSharedValue(0);
  const sidebarTranslateX = useSharedValue(-width);
  const sidebarOpacity = useSharedValue(0);

  useEffect(() => {
    loadInitialData();
  }, [user]);

  const loadInitialData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      await Promise.all([
        loadUserData(),
        loadUserAchievements(),
        loadUserGoals(),
      ]);
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setLoading(false);
    }
  };


  const loadUserData = async () => {
    if (!user?.id) {
      // Set empty data immediately if no user
      setWeeklyProgress({ current: 0, target: 50 });
      setRecentRuns([]);
      setUserStats({
        totalRuns: 0,
        totalDistance: 0,
        totalCalories: 0,
        avgPace: '0:00',
      });
      return;
    }

    try {
      // Load recent runs and statistics
      const { data: runs } = await supabase
        .from('runs')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (runs) {
        // Calculate weekly progress (last 7 days)
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const weeklyRuns = runs.filter(run => new Date(run.created_at) >= weekAgo);
        const weeklyDistance = weeklyRuns.reduce((sum, run) => sum + (run.distance || 0), 0);

        setWeeklyProgress({ current: weeklyDistance, target: user?.weekly_goal || 50 });

        // Calculate overall stats
        const totalDistance = runs.reduce((sum, run) => sum + (run.distance || 0), 0);
        const totalCalories = runs.reduce((sum, run) => sum + (run.calories || 0), 0);
        const avgPaceSeconds = runs.length > 0 ?
          runs.reduce((sum, run) => {
            const paceStr = (run.pace || '0:00').replace(' min/km', '');
            const [min, sec] = paceStr.split(':').map(Number);
            return sum + (min * 60 + sec);
          }, 0) / runs.length : 0;

        const avgPaceMinutes = Math.floor(avgPaceSeconds / 60);
        const avgPaceSecondsRemainder = Math.floor(avgPaceSeconds % 60);
        const avgPace = `${avgPaceMinutes}:${avgPaceSecondsRemainder.toString().padStart(2, '0')}`;

        setUserStats({
          totalRuns: runs.length,
          totalDistance,
          totalCalories,
          avgPace,
        });

        // Transform recent runs for display
        const transformedRuns = runs.slice(0, 3).map((run, index) => ({
          id: run.id,
          date: new Date(run.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
          }),
          distance: run.distance?.toFixed(1) || '0.0',
          calories: run.calories || 0,
          duration: formatDuration(run.duration || 0),
          pace: run.pace || '0:00 min/km',
          image: `https://images.pexels.com/photos/${1089438 + (index % 10)}/pexels-photo-${1089438 + (index % 10)}.jpeg?auto=compress&cs=tinysrgb&w=300&h=200&dpr=2`
        }));

        setRecentRuns(transformedRuns);
      } else {
        // No runs found
        setWeeklyProgress({ current: 0, target: user?.weekly_goal || 50 });
        setRecentRuns([]);
        setUserStats({
          totalRuns: 0,
          totalDistance: 0,
          totalCalories: 0,
          avgPace: '0:00',
        });
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      // Set default values on error
      setWeeklyProgress({ current: 0, target: user?.weekly_goal || 50 });
      setRecentRuns([]);
      setUserStats({
        totalRuns: 0,
        totalDistance: 0,
        totalCalories: 0,
        avgPace: '0:00',
      });
    }
  };

  const loadUserAchievements = async () => {
    if (!user?.id) {
      setAchievements([]);
      return;
    }

    try {
      const { data: userAchievements } = await supabase
        .from('user_achievements')
        .select(`
          *,
          achievements (*)
        `)
        .eq('user_id', user.id)
        .order('earned_at', { ascending: false })
        .limit(3);

      if (userAchievements) {
        setAchievements(userAchievements.map(ua => ua.achievements));
      } else {
        setAchievements([]);
      }
    } catch (error) {
      console.error('Error loading achievements:', error);
      setAchievements([]);
    }
  };

  const loadUserGoals = async () => {
    if (!user?.id) {
      setGoals([]);
      return;
    }

    try {
      const { data: userGoals } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('completed', false)
        .order('created_at', { ascending: false })
        .limit(2);

      if (userGoals) {
        setGoals(userGoals);
      } else {
        setGoals([]);
      }
    } catch (error) {
      console.error('Error loading goals:', error);
      setGoals([]);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadInitialData().finally(() => {
      setRefreshing(false);
    });
  }, [user]);

  const toggleSidebar = () => {
    if (showSidebar) {
      sidebarTranslateX.value = withSpring(-width);
      sidebarOpacity.value = withSpring(0);
      setTimeout(() => setShowSidebar(false), 300);
    } else {
      setShowSidebar(true);
      sidebarTranslateX.value = withSpring(0);
      sidebarOpacity.value = withSpring(1);
    }
  };

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const handlePermissionsComplete = (permissions: Record<string, boolean>) => {
    console.log('🔐 Permissions updated:', permissions);
    // Handle permissions completion if needed
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <SkeletonLoader width={120} height={24} />
            <View style={styles.headerActions}>
              <SkeletonLoader width={40} height={40} borderRadius={20} />
              <SkeletonLoader width={40} height={40} borderRadius={20} />
            </View>
          </View>
          <View style={styles.content}>
            <SkeletonLoader width="100%" height={120} borderRadius={16} style={{ marginBottom: 20 }} />
            <SkeletonLoader width="100%" height={160} borderRadius={16} style={{ marginBottom: 20 }} />
            <View style={styles.skeletonGrid}>
              <SkeletonLoader width="48%" height={100} borderRadius={12} />
              <SkeletonLoader width="48%" height={100} borderRadius={12} />
            </View>
            <View style={styles.loadingSpinnerContainer}>
              <LoadingSpinner size={32} />
              <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
                Loading your data...
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <>
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Animated.ScrollView
          showsVerticalScrollIndicator={false}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingTop: 0 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          }
        >
          {/* Parallax Header */}
          <ParallaxHomeHeader
            scrollY={scrollY}
            onMenuPress={toggleSidebar}
            onSettingsPress={() => router.push('/settings')}
          />

          {/* Content */}
          <View style={[styles.content, { backgroundColor: theme.colors.background, marginTop: -50 }]}>

            {/* Weekly Goal Card */}
            <AnimatedCard delay={200}>
            <View style={[styles.goalCard, { backgroundColor: theme.colors.surface }]}>
              <View style={styles.goalHeader}>
                <Target size={20} color={theme.colors.primary} />
                <Text style={[styles.goalTitle, { color: theme.colors.text }]}>Weekly Goal</Text>
              </View>
              <CountUpNumber
                value={user?.weekly_goal || 50}
                suffix=" km"
                style={[styles.goalDistance, { color: theme.colors.text }]}
                delay={600}
              />

              <View style={styles.progressContainer}>
                <View style={[styles.progressBackground, { backgroundColor: theme.colors.border }]}>
                  <View
                    style={[
                      styles.progressBar,
                      {
                        width: `${Math.min((weeklyProgress.current / weeklyProgress.target) * 100, 100)}%`,
                        backgroundColor: theme.colors.primary
                      }
                    ]}
                  />
                </View>
                <Text style={[styles.progressText, { color: theme.colors.text }]}>
                  {weeklyProgress.current.toFixed(1)} km of {weeklyProgress.target} km
                </Text>
              </View>

              <Text style={[styles.remainingText, { color: theme.colors.textSecondary }]}>
                {Math.max(0, weeklyProgress.target - weeklyProgress.current).toFixed(1)} km remaining to reach goal
              </Text>
            </View>
            </AnimatedCard>

            {/* Quick Actions */}
            <AnimatedCard delay={400}>
            <View style={styles.quickActions}>
              <AnimatedButton
                style={[styles.primaryAction, { backgroundColor: theme.colors.primary }]}
                onPress={() => router.push('/activeRun')}
                hapticType="medium"
              >
                <Play color="#FFFFFF" size={20} />
                <Text style={styles.primaryActionText}>Start Run</Text>
              </AnimatedButton>
              <AnimatedButton
                style={[styles.secondaryAction, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                onPress={() => router.push('/settings')}
                hapticType="light"
              >
                <Settings color={theme.colors.primary} size={20} />
                <Text style={[styles.secondaryActionText, { color: theme.colors.primary }]}>Settings</Text>
              </AnimatedButton>
            </View>
            </AnimatedCard>

            {/* User Statistics Overview */}
            <AnimatedCard delay={600}>
            <View style={[styles.statsOverview, { backgroundColor: theme.colors.surface }]}>
              <View style={styles.statsHeader}>
                <TrendingUp size={20} color={theme.colors.primary} />
                <Text style={[styles.statsTitle, { color: theme.colors.text }]}>Your Statistics</Text>
              </View>
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <CountUpNumber
                    value={userStats.totalRuns}
                    style={[styles.statValue, { color: theme.colors.text }]}
                    delay={1000}
                  />
                  <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Total Runs</Text>
                </View>
                <View style={styles.statItem}>
                  <CountUpNumber
                    value={userStats.totalDistance}
                    decimals={1}
                    style={[styles.statValue, { color: theme.colors.text }]}
                    delay={1100}
                  />
                  <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Total km</Text>
                </View>
                <View style={styles.statItem}>
                  <CountUpNumber
                    value={userStats.totalCalories}
                    style={[styles.statValue, { color: theme.colors.text }]}
                    delay={1200}
                  />
                  <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Calories</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: theme.colors.text }]}>{userStats.avgPace}</Text>
                  <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Avg Pace</Text>
                </View>
              </View>
            </View>
            </AnimatedCard>

            {/* Recent Achievements */}
            {achievements.length > 0 && (
              <AnimatedCard delay={800}>
              <View style={[styles.achievementsPreview, { backgroundColor: theme.colors.surface }]}>
                <View style={styles.achievementsHeader}>
                  <Trophy size={20} color="#F59E0B" />
                  <Text style={[styles.achievementsTitle, { color: theme.colors.text }]}>Recent Achievements</Text>
                  <AnimatedButton onPress={() => router.push('/achievements')} hapticType="light">
                    <Text style={[styles.viewAllText, { color: theme.colors.primary }]}>View All</Text>
                  </AnimatedButton>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {achievements.map((achievement, index) => (
                    <AnimatedCard key={achievement.id || index} index={index} delay={1200 + index * 100}>
                      <View style={styles.achievementCard}>
                        <Text style={styles.achievementIcon}>{achievement.icon}</Text>
                        <Text style={[styles.achievementTitle, { color: theme.colors.text }]}>{achievement.title}</Text>
                        <Text style={[styles.achievementDescription, { color: theme.colors.textSecondary }]}>{achievement.description}</Text>
                        <View style={styles.achievementPoints}>
                          <Text style={[styles.pointsText, { color: '#F59E0B' }]}>{achievement.points} XP</Text>
                        </View>
                      </View>
                    </AnimatedCard>
                  ))}
                </ScrollView>
              </View>
              </AnimatedCard>
            )}

            {/* Active Goals */}
            {goals.length > 0 && (
              <AnimatedCard delay={1000}>
              <View style={[styles.goalsPreview, { backgroundColor: theme.colors.surface }]}>
                <View style={styles.goalsHeader}>
                  <Target size={20} color={theme.colors.primary} />
                  <Text style={[styles.goalsTitle, { color: theme.colors.text }]}>Active Goals</Text>
                  <AnimatedButton onPress={() => router.push('/goals')} hapticType="light">
                    <Text style={[styles.viewAllText, { color: theme.colors.primary }]}>Manage</Text>
                  </AnimatedButton>
                </View>
                {goals.map((goal) => (
                  <View key={goal.id} style={[styles.goalItem, { backgroundColor: theme.colors.background }]}>
                    <View style={styles.goalItemHeader}>
                      <Text style={[styles.goalItemTitle, { color: theme.colors.text }]}>{goal.title}</Text>
                      <Text style={[styles.goalItemProgress, { color: theme.colors.textSecondary }]}>
                        {goal.current_value}/{goal.target_value} {goal.unit}
                      </Text>
                    </View>
                    <View style={[styles.goalProgressBar, { backgroundColor: theme.colors.border }]}>
                      <View
                        style={[
                          styles.goalProgressFill,
                          {
                            width: `${Math.min((goal.current_value / goal.target_value) * 100, 100)}%`,
                            backgroundColor: theme.colors.primary
                          }
                        ]}
                      />
                    </View>
                  </View>
                ))}
              </View>
              </AnimatedCard>
            )}

            {/* Running Tips */}
            <AnimatedCard delay={1200}>
            <RunningTips />
            </AnimatedCard>

            {/* History Section */}
            {recentRuns.length > 0 && (
              <AnimatedCard delay={1400}>
              <View style={styles.historySection}>
                <View style={styles.historySectionHeader}>
                  <Text style={[styles.historyTitle, { color: theme.colors.text }]}>Recent Runs</Text>
                  <AnimatedButton onPress={() => router.push('/(tabs)/history')} hapticType="light">
                    <Text style={[styles.historyViewAll, { color: theme.colors.primary }]}>View All</Text>
                  </AnimatedButton>
                </View>

                {recentRuns.map((run, index) => (
                  <AnimatedButton
                    key={run.id}
                    style={[styles.historyItem, { backgroundColor: theme.colors.surface }]}
                    onPress={() => router.push(`/runDetails?id=${run.id}` as any)}
                    hapticType="light"
                  >
                    <Image
                      source={{ uri: run.image }}
                      style={styles.routePreview}
                    />
                    <View style={styles.runDetails}>
                      <Text style={[styles.runDate, { color: theme.colors.textSecondary }]}>{run.date}</Text>
                      <Text style={[styles.runDistance, { color: theme.colors.text }]}>{run.distance} km</Text>
                      <Text style={[styles.runStats, { color: theme.colors.textSecondary }]}>
                        {run.calories} kcal • {run.duration} • {run.pace}
                      </Text>
                    </View>
                  </AnimatedButton>
                ))}
              </View>
              </AnimatedCard>
            )}

            {recentRuns.length === 0 && (
              <AnimatedCard delay={800}>
              <View style={styles.emptyRunsSection}>
                <MapPin size={48} color={theme.colors.textSecondary} />
                <Text style={[styles.emptyRunsTitle, { color: theme.colors.text }]}>No runs yet</Text>
                <Text style={[styles.emptyRunsText, { color: theme.colors.textSecondary }]}>Start your first run to see it here!</Text>
                <AnimatedButton
                  style={[styles.startRunButton, { backgroundColor: theme.colors.primary }]}
                  onPress={() => router.push('/activeRun')}
                  hapticType="medium"
                >
                  <Play size={16} color="#FFFFFF" />
                  <Text style={styles.startRunButtonText}>Start First Run</Text>
                </AnimatedButton>
              </View>
              </AnimatedCard>
            )}

            {/* Quick Access Buttons */}
            <AnimatedCard delay={1600}>
            <View style={styles.quickAccessSection}>
              <Text style={[styles.quickAccessTitle, { color: theme.colors.text }]}>Quick Access</Text>
              <View style={styles.quickAccessGrid}>
                <AnimatedButton
                  style={[styles.quickAccessButton, { backgroundColor: theme.colors.surface }]}
                  onPress={() => router.push('/achievements' as any)}
                  hapticType="light"
                >
                  <Trophy size={24} color="#F59E0B" />
                  <Text style={[styles.quickAccessText, { color: theme.colors.text }]}>Achievements</Text>
                </AnimatedButton>
                <AnimatedButton
                  style={[styles.quickAccessButton, { backgroundColor: theme.colors.surface }]}
                  onPress={() => router.push('/goals' as any)}
                  hapticType="light"
                >
                  <Target size={24} color={theme.colors.primary} />
                  <Text style={[styles.quickAccessText, { color: theme.colors.text }]}>Goals</Text>
                </AnimatedButton>
                <AnimatedButton
                  style={[styles.quickAccessButton, { backgroundColor: theme.colors.surface }]}
                  onPress={() => router.push('/(tabs)/stats')}
                  hapticType="light"
                >
                  <TrendingUp size={24} color="#10B981" />
                  <Text style={[styles.quickAccessText, { color: theme.colors.text }]}>Statistics</Text>
                </AnimatedButton>
              </View>
            </View>
            </AnimatedCard>
          </View>
        </Animated.ScrollView>
      </View>

      {/* Sidebar */}
      <Sidebar
        visible={showSidebar}
        onClose={toggleSidebar}
        translateX={sidebarTranslateX}
        opacity={sidebarOpacity}
      />

    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingSpinnerContainer: {
    alignItems: 'center',
    marginTop: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  skeletonGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  content: {
    flex: 1,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 24,
    paddingHorizontal: 20,
    minHeight: height,
  },
  goalCard: {
    borderRadius: 20,
    padding: 20,
    marginTop: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  goalTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    marginLeft: 8,
  },
  goalDistance: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    marginBottom: 16,
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressBackground: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  remainingText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  primaryAction: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  secondaryAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  secondaryActionText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  statsOverview: {
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
    marginBottom: 16,
  },
  statsTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    marginLeft: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
  achievementsPreview: {
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
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  achievementsTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    marginLeft: 8,
    flex: 1,
  },
  viewAllText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  achievementCard: {
    width: 120,
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
  },
  achievementIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  achievementTitle: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    textAlign: 'center',
    marginBottom: 4,
  },
  achievementDescription: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    marginBottom: 8,
  },
  achievementPoints: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pointsText: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
  },
  goalsPreview: {
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
  goalsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  goalsTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    marginLeft: 8,
    flex: 1,
  },
  goalItem: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  goalItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  goalItemTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  goalItemProgress: {
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
  historySection: {
    marginBottom: 20,
  },
  historySectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  historyTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
  },
  historyViewAll: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
  historyItem: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  routePreview: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  runDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  runDate: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    marginBottom: 4,
  },
  runDistance: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 4,
  },
  runStats: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  emptyRunsSection: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyRunsTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyRunsText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    marginBottom: 20,
  },
  startRunButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  startRunButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  quickAccessSection: {
    marginBottom: 100,
  },
  quickAccessTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 16,
  },
  quickAccessGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickAccessButton: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  quickAccessText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    marginTop: 8,
    textAlign: 'center',
  },
});