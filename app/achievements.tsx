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
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Trophy, Target, Zap, Calendar, MapPin, Clock } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import AnimatedButton from '@/components/AnimatedButton';
import LoadingSpinner from '@/components/LoadingSpinner';
import AnimatedCard from '@/components/AnimatedCard';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'distance' | 'speed' | 'consistency' | 'milestone' | 'elevation' | 'social';
  progress: number;
  maxProgress: number;
  earned: boolean;
  earnedDate?: string;
  points: number;
  requirement_type: string;
  requirement_value: number;
}

const categories = [
  { key: 'all', label: 'All', icon: Trophy },
  { key: 'distance', label: 'Distance', icon: MapPin },
  { key: 'speed', label: 'Speed', icon: Zap },
  { key: 'consistency', label: 'Consistency', icon: Calendar },
  { key: 'milestone', label: 'Milestone', icon: Target },
  { key: 'elevation', label: 'Elevation', icon: Clock },
  { key: 'social', label: 'Social', icon: Trophy },
];

export default function AchievementsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [userStats, setUserStats] = useState<any>({});

  const scrollY = useSharedValue(0);
  const headerOpacity = useSharedValue(1);

  useEffect(() => {
    if (user) {
      loadAchievements();
      loadUserStats();
    }
  }, [user]);

  const loadAchievements = async () => {
    try {
      setLoading(true);
      
      // Load all achievements
      const { data: allAchievements, error: achievementsError } = await supabase
        .from('achievements')
        .select('*')
        .order('points', { ascending: true });

      if (achievementsError) throw achievementsError;

      // Load user's earned achievements
      const { data: userAchievements, error: userError } = await supabase
        .from('user_achievements')
        .select('achievement_id, earned_at')
        .eq('user_id', user?.id);

      if (userError) throw userError;

      // Combine data to create achievement objects
      const processedAchievements = allAchievements?.map(achievement => {
        const userAchievement = userAchievements?.find(ua => ua.achievement_id === achievement.id);
        const progress = calculateProgress(achievement);
        
        return {
          id: achievement.id,
          title: achievement.title,
          description: achievement.description,
          icon: achievement.icon,
          category: achievement.category,
          progress: progress,
          maxProgress: achievement.requirement_value,
          earned: !!userAchievement,
          earnedDate: userAchievement?.earned_at,
          points: achievement.points,
          requirement_type: achievement.requirement_type,
          requirement_value: achievement.requirement_value,
        };
      }) || [];

      setAchievements(processedAchievements);
    } catch (error) {
      console.error('Error loading achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserStats = async () => {
    try {
      // Load user's running statistics to calculate progress
      const { data: runs } = await supabase
        .from('runs')
        .select('*')
        .eq('user_id', user?.id);

      if (runs) {
        const stats = {
          totalRuns: runs.length,
          totalDistance: runs.reduce((sum, run) => sum + (run.distance || 0), 0),
          totalElevation: runs.reduce((sum, run) => sum + (run.elevation_gain || 0), 0),
          longestRun: runs.length > 0 ? Math.max(...runs.map(run => run.distance || 0)) : 0,
          fastestPace: calculateFastestPace(runs),
          // Add more stats as needed
        };
        setUserStats(stats);
      }
    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  };

  const calculateProgress = (achievement: any) => {
    // Calculate progress based on achievement type and user stats
    switch (achievement.requirement_type) {
      case 'single_run_distance':
        return userStats.longestRun >= achievement.requirement_value ? achievement.requirement_value : userStats.longestRun || 0;
      case 'total_distance':
        return Math.min(userStats.totalDistance || 0, achievement.requirement_value);
      case 'total_runs':
        return Math.min(userStats.totalRuns || 0, achievement.requirement_value);
      case 'total_elevation':
        return Math.min(userStats.totalElevation || 0, achievement.requirement_value);
      default:
        return 0;
    }
  };

  const calculateFastestPace = (runs: any[]) => {
    if (!runs.length) return 0;
    
    const paces = runs.map(run => {
      const paceStr = (run.pace || '0:00').replace(' min/km', '');
      const [min, sec] = paceStr.split(':').map(Number);
      return min + sec / 60;
    }).filter(pace => pace > 0);
    
    return paces.length > 0 ? Math.min(...paces) : 0;
  };

  const filteredAchievements = achievements.filter(
    achievement => selectedCategory === 'all' || achievement.category === selectedCategory
  );

  const earnedCount = achievements.filter(a => a.earned).length;
  const totalPoints = achievements
    .filter(a => a.earned)
    .reduce((sum, a) => sum + a.points, 0);

  const animatedHeaderStyle = useAnimatedStyle(() => {
    return {
      opacity: headerOpacity.value,
    };
  });

  const renderCategoryFilter = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.categoryFilter}
      contentContainerStyle={styles.categoryFilterContent}
    >
      {categories.map((category) => {
        const IconComponent = category.icon;
        const isSelected = selectedCategory === category.key;

        return (
          <AnimatedButton
            key={category.key}
            style={[
              styles.categoryButton,
              isSelected && styles.categoryButtonActive,
              { backgroundColor: isSelected ? theme.colors.primary : theme.colors.surface }
            ]}
            onPress={() => setSelectedCategory(category.key)}
          >
            <IconComponent
              size={16}
              color={isSelected ? '#FFFFFF' : theme.colors.textSecondary}
            />
            <Text
              style={[
                styles.categoryButtonText,
                { color: isSelected ? '#FFFFFF' : theme.colors.textSecondary }
              ]}
            >
              {category.label}
            </Text>
          </AnimatedButton>
        );
      })}
    </ScrollView>
  );

  const renderAchievementCard = (achievement: Achievement, index: number) => {
    const progressPercentage = (achievement.progress / achievement.maxProgress) * 100;
    const pointsColor = achievement.points < 100 ? '#10B981' : 
                      achievement.points < 300 ? '#F59E0B' : 
                      achievement.points < 500 ? '#EF4444' : '#8B5CF6';

    return (
      <AnimatedCard key={achievement.id} index={index} delay={200}>
        <AnimatedButton
          style={[
            styles.achievementContent,
            { backgroundColor: theme.colors.surface },
            achievement.earned && styles.achievementEarned
          ]}
          hapticType="light"
        >
          <View style={styles.achievementHeader}>
            <View style={styles.achievementIconContainer}>
              <Text style={styles.achievementIcon}>{achievement.icon}</Text>
              {achievement.earned && (
                <View style={styles.earnedBadge}>
                  <Trophy size={12} color="#FFFFFF" />
                </View>
              )}
            </View>
            <View style={styles.achievementInfo}>
              <Text style={[styles.achievementTitle, { color: theme.colors.text }]}>
                {achievement.title}
              </Text>
              <Text style={[styles.achievementDescription, { color: theme.colors.textSecondary }]}>
                {achievement.description}
              </Text>
              {achievement.earnedDate && (
                <Text style={[styles.achievementDate, { color: theme.colors.textSecondary }]}>
                  Earned on {new Date(achievement.earnedDate).toLocaleDateString()}
                </Text>
              )}
            </View>
            <View style={styles.achievementReward}>
              <View style={[styles.pointsBadge, { backgroundColor: pointsColor }]}>
                <Text style={styles.pointsText}>
                  {achievement.points} XP
                </Text>
              </View>
            </View>
          </View>

          {!achievement.earned && (
            <View style={styles.progressContainer}>
              <View style={styles.progressHeader}>
                <Text style={[styles.progressText, { color: theme.colors.textSecondary }]}>
                  Progress: {achievement.progress}/{achievement.maxProgress}
                </Text>
                <Text style={[styles.progressPercentage, { color: theme.colors.primary }]}>
                  {Math.round(progressPercentage)}%
                </Text>
              </View>
              <View style={[styles.progressBar, { backgroundColor: theme.colors.border }]}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${progressPercentage}%`, backgroundColor: theme.colors.primary }
                  ]}
                />
              </View>
            </View>
          )}
        </AnimatedButton>
      </AnimatedCard>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <LinearGradient
          colors={['#8B5CF6', '#A855F7', '#C084FC']}
          style={styles.header}
        >
          <SafeAreaView>
            <View style={[styles.headerContent, animatedHeaderStyle]}>
              <AnimatedButton onPress={() => router.back()} hapticType="light">
                <ArrowLeft color="#FFFFFF" size={24} />
              </AnimatedButton>
              <Text style={styles.headerTitle}>Achievements</Text>
              <View style={{ width: 24 }} />
            </View>
          </SafeAreaView>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <LoadingSpinner size={48} />
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>Loading achievements...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <LinearGradient
        colors={['#8B5CF6', '#A855F7', '#C084FC']}
        style={styles.header}
      >
        <SafeAreaView>
          <Animated.View style={[styles.headerContent, animatedHeaderStyle]}>
            <AnimatedButton onPress={() => router.back()} hapticType="light">
              <ArrowLeft color="#FFFFFF" size={24} />
            </AnimatedButton>
            <Text style={styles.headerTitle}>Achievements</Text>
            <View style={{ width: 24 }} />
          </Animated.View>

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{earnedCount}</Text>
              <Text style={styles.statLabel}>Earned</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{achievements.length}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{totalPoints}</Text>
              <Text style={styles.statLabel}>Points</Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <View style={styles.content}>
        {renderCategoryFilter()}

        <Animated.ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.achievementsList}
        >
          {filteredAchievements.map((achievement, index) =>
            renderAchievementCard(achievement, index)
          )}
        </Animated.ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  categoryFilter: {
    paddingVertical: 16,
  },
  categoryFilterContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  categoryButtonActive: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryButtonText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  achievementsList: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  achievementCard: {
    marginBottom: 16,
  },
  achievementContent: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  achievementEarned: {
    borderWidth: 2,
    borderColor: '#10B981',
  },
  achievementHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  achievementIconContainer: {
    position: 'relative',
    marginRight: 12,
  },
  achievementIcon: {
    fontSize: 32,
  },
  earnedBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#10B981',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
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
  achievementReward: {
    alignItems: 'flex-end',
  },
  pointsBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 4,
  },
  pointsText: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  progressContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  progressPercentage: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
});