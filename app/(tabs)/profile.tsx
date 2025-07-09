import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Settings, CreditCard as Edit3, Trophy, Target, Calendar, TrendingUp, MapPin, Clock, Flame, Award, ChevronRight, LogOut } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import AnimatedButton from '@/components/AnimatedButton';
import AnimatedCard from '@/components/AnimatedCard';
import CountUpNumber from '@/components/CountUpNumber';
import LoadingSpinner from '@/components/LoadingSpinner';
import SkeletonLoader from '@/components/SkeletonLoader';

interface UserStats {
  totalRuns: number;
  totalDistance: number;
  totalCalories: number;
  avgPace: string;
  longestRun: number;
  currentStreak: number;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  earned_at: string;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userStats, setUserStats] = useState<UserStats>({
    totalRuns: 0,
    totalDistance: 0,
    totalCalories: 0,
    avgPace: '0:00',
    longestRun: 0,
    currentStreak: 0,
  });
  const [recentAchievements, setRecentAchievements] = useState<Achievement[]>([]);

  useEffect(() => {
    loadProfileData();
  }, [user]);

  const loadProfileData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      await Promise.all([
        loadUserStats(),
        loadRecentAchievements(),
      ]);
    } catch (error) {
      console.error('Error loading profile data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserStats = async () => {
    if (!user?.id) {
      setUserStats({
        totalRuns: 0,
        totalDistance: 0,
        totalCalories: 0,
        avgPace: '0:00',
        longestRun: 0,
        currentStreak: 0,
      });
      return;
    }

    try {
      const { data: runs } = await supabase
        .from('runs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (runs && runs.length > 0) {
        const totalDistance = runs.reduce((sum, run) => sum + (run.distance || 0), 0);
        const totalCalories = runs.reduce((sum, run) => sum + (run.calories || 0), 0);
        const longestRun = Math.max(...runs.map(run => run.distance || 0));

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

        setUserStats({
          totalRuns: runs.length,
          totalDistance,
          totalCalories,
          avgPace,
          longestRun,
          currentStreak: 0, // Would need to calculate based on consecutive days
        });
      }
    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  };

  const loadRecentAchievements = async () => {
    if (!user?.id) {
      setRecentAchievements([]);
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
        const achievements = userAchievements.map(ua => ({
          id: ua.achievements?.id || ua.id,
          title: ua.achievements?.title || 'Achievement',
          description: ua.achievements?.description || 'Great job!',
          icon: ua.achievements?.icon || '🏆',
          earned_at: ua.earned_at,
        }));
        setRecentAchievements(achievements);
      }
    } catch (error) {
      console.error('Error loading achievements:', error);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadProfileData().finally(() => {
      setRefreshing(false);
    });
  }, [user]);

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => signOut()
        }
      ]
    );
  };

  const profileMenuItems = [
    {
      id: 'achievements',
      title: 'Achievements',
      subtitle: `${recentAchievements.length} earned`,
      icon: Trophy,
      color: '#F59E0B',
      onPress: () => router.push('/achievements' as any),
    },
    {
      id: 'goals',
      title: 'Goals',
      subtitle: 'Manage your targets',
      icon: Target,
      color: '#10B981',
      onPress: () => router.push('/goals' as any),
    },
    {
      id: 'settings',
      title: 'Settings',
      subtitle: 'Preferences & privacy',
      icon: Settings,
      color: '#6B7280',
      onPress: () => router.push('/settings' as any),
    },
  ];

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <SafeAreaView style={styles.safeArea}>
          {/* Skeleton Header */}
          <LinearGradient
            colors={['#8B5CF6', '#A855F7', '#C084FC']}
            style={styles.skeletonHeader}
          >
            <View style={styles.header}>
              <SkeletonLoader width={100} height={24} borderRadius={4} />
              <SkeletonLoader width={32} height={32} borderRadius={16} />
            </View>
          </LinearGradient>

          {/* Skeleton Content */}
          <ScrollView style={[styles.content, { backgroundColor: theme.colors.background }]}>
            {/* Profile Card Skeleton */}
            <View style={[styles.skeletonCard, { backgroundColor: theme.colors.surface }]}>
              <SkeletonLoader width={100} height={100} borderRadius={50} style={{ alignSelf: 'center', marginBottom: 16 }} />
              <SkeletonLoader width={150} height={24} borderRadius={4} style={{ alignSelf: 'center', marginBottom: 8 }} />
              <SkeletonLoader width={200} height={16} borderRadius={4} style={{ alignSelf: 'center', marginBottom: 16 }} />
              <View style={styles.skeletonBadges}>
                <SkeletonLoader width={80} height={24} borderRadius={12} />
                <SkeletonLoader width={120} height={24} borderRadius={12} />
              </View>
            </View>

            {/* Stats Card Skeleton */}
            <View style={[styles.skeletonCard, { backgroundColor: theme.colors.surface }]}>
              <SkeletonLoader width={150} height={20} borderRadius={4} style={{ marginBottom: 16 }} />
              <View style={styles.skeletonStatsGrid}>
                {[...Array(4)].map((_, index) => (
                  <View key={index} style={styles.skeletonStatItem}>
                    <SkeletonLoader width={40} height={40} borderRadius={20} style={{ marginBottom: 8 }} />
                    <SkeletonLoader width={60} height={16} borderRadius={4} style={{ marginBottom: 4 }} />
                    <SkeletonLoader width={80} height={12} borderRadius={4} />
                  </View>
                ))}
              </View>
            </View>

            {/* Menu Items Skeleton */}
            <View style={styles.skeletonMenuSection}>
              {[...Array(3)].map((_, index) => (
                <View key={index} style={[styles.skeletonMenuItem, { backgroundColor: theme.colors.surface }]}>
                  <SkeletonLoader width={40} height={40} borderRadius={20} />
                  <View style={styles.skeletonMenuText}>
                    <SkeletonLoader width={120} height={16} borderRadius={4} style={{ marginBottom: 4 }} />
                    <SkeletonLoader width={180} height={12} borderRadius={4} />
                  </View>
                  <SkeletonLoader width={20} height={20} borderRadius={4} />
                </View>
              ))}
            </View>

            <View style={styles.loadingSpinnerContainer}>
              <LoadingSpinner size={32} />
              <Text style={[styles.loadingText, { color: theme.colors.text }]}>
                Loading profile...
              </Text>
            </View>
          </ScrollView>
        </SafeAreaView>
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
            <Text style={styles.headerTitle}>Profile</Text>
            <AnimatedButton onPress={() => router.push('/settings' as any)}>
              <Settings color="#FFFFFF" size={24} />
            </AnimatedButton>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={theme.colors.primary}
                colors={[theme.colors.primary]}
              />
            }
          >
            {/* Profile Info */}
            <AnimatedCard delay={200}>
              <View style={[styles.profileCard, { backgroundColor: theme.colors.surface }]}>
                <Image
                  source={{
                    uri: user?.avatar_url || 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&dpr=2'
                  }}
                  style={styles.avatar}
                />
                <Text style={[styles.userName, { color: theme.colors.text }]}>
                  {user?.full_name || 'Runner'}
                </Text>
                <Text style={[styles.userEmail, { color: theme.colors.textSecondary }]}>
                  {user?.email || 'runner@example.com'}
                </Text>
                <View style={styles.userBadges}>
                  <View style={[styles.badge, { backgroundColor: theme.colors.primary + '20' }]}>
                    <Text style={[styles.badgeText, { color: theme.colors.primary }]}>
                      {user?.fitness_level || 'Beginner'}
                    </Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: '#10B981' + '20' }]}>
                    <Text style={[styles.badgeText, { color: '#10B981' }]}>
                      Goal: {user?.weekly_goal || 50}km/week
                    </Text>
                  </View>
                </View>
              </View>
            </AnimatedCard>

            {/* Stats Overview */}
            <AnimatedCard delay={400}>
              <View style={[styles.statsCard, { backgroundColor: theme.colors.surface }]}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                  Running Statistics
                </Text>
                <View style={styles.statsGrid}>
                  <View style={styles.statItem}>
                    <View style={[styles.statIcon, { backgroundColor: '#8B5CF6' + '20' }]}>
                      <MapPin size={20} color="#8B5CF6" />
                    </View>
                    <CountUpNumber
                      value={userStats.totalDistance}
                      decimals={1}
                      style={[styles.statValue, { color: theme.colors.text }]}
                      delay={600}
                    />
                    <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                      Total km
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <View style={[styles.statIcon, { backgroundColor: '#10B981' + '20' }]}>
                      <Calendar size={20} color="#10B981" />
                    </View>
                    <CountUpNumber
                      value={userStats.totalRuns}
                      style={[styles.statValue, { color: theme.colors.text }]}
                      delay={700}
                    />
                    <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                      Total runs
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <View style={[styles.statIcon, { backgroundColor: '#F59E0B' + '20' }]}>
                      <Flame size={20} color="#F59E0B" />
                    </View>
                    <CountUpNumber
                      value={userStats.totalCalories}
                      style={[styles.statValue, { color: theme.colors.text }]}
                      delay={800}
                    />
                    <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                      Calories
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <View style={[styles.statIcon, { backgroundColor: '#EF4444' + '20' }]}>
                      <Clock size={20} color="#EF4444" />
                    </View>
                    <Text style={[styles.statValue, { color: theme.colors.text }]}>
                      {userStats.avgPace}
                    </Text>
                    <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                      Avg pace
                    </Text>
                  </View>
                </View>
              </View>
            </AnimatedCard>

            {/* Recent Achievements */}
            {recentAchievements.length > 0 && (
              <AnimatedCard delay={600}>
                <View style={[styles.achievementsCard, { backgroundColor: theme.colors.surface }]}>
                  <View style={styles.achievementsHeader}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                      Recent Achievements
                    </Text>
                    <AnimatedButton onPress={() => router.push('/achievements' as any)}>
                      <Text style={[styles.viewAllText, { color: theme.colors.primary }]}>
                        View All
                      </Text>
                    </AnimatedButton>
                  </View>
                  <View style={styles.achievementsList}>
                    {recentAchievements.map((achievement, index) => (
                      <AnimatedCard key={achievement.id} index={index} delay={800}>
                        <View style={styles.achievementItem}>
                          <Text style={styles.achievementIcon}>{achievement.icon}</Text>
                          <View style={styles.achievementInfo}>
                            <Text style={[styles.achievementTitle, { color: theme.colors.text }]}>
                              {achievement.title}
                            </Text>
                            <Text style={[styles.achievementDescription, { color: theme.colors.textSecondary }]}>
                              {achievement.description}
                            </Text>
                          </View>
                          <Award size={16} color="#F59E0B" />
                        </View>
                      </AnimatedCard>
                    ))}
                  </View>
                </View>
              </AnimatedCard>
            )}

            {/* Menu Items */}
            <View style={styles.menuSection}>
              {profileMenuItems.map((item, index) => {
                const IconComponent = item.icon;
                return (
                  <AnimatedCard key={item.id} index={index} delay={1000}>
                    <AnimatedButton
                      style={[styles.menuItem, { backgroundColor: theme.colors.surface }]}
                      onPress={item.onPress}
                    >
                      <View style={styles.menuItemLeft}>
                        <View style={[styles.menuIcon, { backgroundColor: item.color + '20' }]}>
                          <IconComponent size={20} color={item.color} />
                        </View>
                        <View style={styles.menuItemInfo}>
                          <Text style={[styles.menuItemTitle, { color: theme.colors.text }]}>
                            {item.title}
                          </Text>
                          <Text style={[styles.menuItemSubtitle, { color: theme.colors.textSecondary }]}>
                            {item.subtitle}
                          </Text>
                        </View>
                      </View>
                      <ChevronRight size={20} color={theme.colors.textSecondary} />
                    </AnimatedButton>
                  </AnimatedCard>
                );
              })}
            </View>

            {/* Sign Out */}
            <AnimatedCard delay={1200}>
              <AnimatedButton
                style={[styles.signOutButton, { backgroundColor: '#FEF2F2' }]}
                onPress={handleLogout}
              >
                <LogOut size={20} color="#EF4444" />
                <Text style={[styles.signOutText, { color: '#EF4444' }]}>
                  Sign Out
                </Text>
              </AnimatedButton>
            </AnimatedCard>

            <View style={{ height: 100 }} />
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
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
  content: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 24,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
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
  skeletonHeader: {
    paddingBottom: 20,
  },
  skeletonCard: {
    borderRadius: 20,
    padding: 24,
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
  skeletonBadges: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  skeletonStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  skeletonStatItem: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 16,
  },
  skeletonMenuSection: {
    gap: 12,
    marginBottom: 20,
  },
  skeletonMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  skeletonMenuText: {
    flex: 1,
    marginLeft: 12,
  },
  profileCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
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
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#8B5CF6',
  },
  userName: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginBottom: 16,
  },
  userBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
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
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 16,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  achievementsList: {
    gap: 12,
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  achievementIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 2,
  },
  achievementDescription: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  menuSection: {
    gap: 12,
    marginBottom: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuItemInfo: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 2,
  },
  menuItemSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 8,
    marginBottom: 20,
  },
  signOutText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
});