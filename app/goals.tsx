import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Plus, Target, Calendar, MapPin, Clock, Flame, CreditCard as Edit3, Trash2, Check } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import AnimatedButton from '@/components/AnimatedButton';
import AnimatedCard from '@/components/AnimatedCard';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

interface Goal {
  id: string;
  title: string;
  description: string;
  type: 'distance' | 'time' | 'calories' | 'frequency';
  target: number;
  current: number;
  unit: string;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  deadline: string;
  completed: boolean;
  createdAt: string;
}

const initialGoals: Goal[] = [
  {
    id: '1',
    title: 'Weekly Distance',
    description: 'Run 50km this week',
    type: 'distance',
    target: 50,
    current: 35.2,
    unit: 'km',
    period: 'weekly',
    deadline: '2024-06-02',
    completed: false,
    createdAt: '2024-05-26',
  },
  {
    id: '2',
    title: 'Monthly Runs',
    description: 'Complete 20 runs this month',
    type: 'frequency',
    target: 20,
    current: 16,
    unit: 'runs',
    period: 'monthly',
    deadline: '2024-06-30',
    completed: false,
    createdAt: '2024-05-01',
  },
  {
    id: '3',
    title: 'Calorie Burn',
    description: 'Burn 3000 calories this week',
    type: 'calories',
    target: 3000,
    current: 2450,
    unit: 'kcal',
    period: 'weekly',
    deadline: '2024-06-02',
    completed: false,
    createdAt: '2024-05-26',
  },
  {
    id: '4',
    title: 'Daily Exercise',
    description: 'Run for 30 minutes daily',
    type: 'time',
    target: 30,
    current: 25,
    unit: 'min',
    period: 'daily',
    deadline: '2024-06-01',
    completed: false,
    createdAt: '2024-05-31',
  },
];

const goalTypes = [
  { key: 'distance', label: 'Distance', icon: MapPin, unit: 'km' },
  { key: 'time', label: 'Time', icon: Clock, unit: 'min' },
  { key: 'calories', label: 'Calories', icon: Flame, unit: 'kcal' },
  { key: 'frequency', label: 'Frequency', icon: Target, unit: 'runs' },
];

const periods = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'yearly', label: 'Yearly' },
];

export default function GoalsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const [goals, setGoals] = useState<Goal[]>(initialGoals);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'distance' as Goal['type'],
    target: '',
    period: 'weekly' as Goal['period'],
    deadline: '',
  });

  const modalScale = useSharedValue(0);
  const modalOpacity = useSharedValue(0);

  const openAddModal = () => {
    setFormData({
      title: '',
      description: '',
      type: 'distance',
      target: '',
      period: 'weekly',
      deadline: '',
    });
    setEditingGoal(null);
    setShowAddModal(true);
    modalScale.value = withSpring(1);
    modalOpacity.value = withTiming(1);
  };

  const openEditModal = (goal: Goal) => {
    setFormData({
      title: goal.title,
      description: goal.description,
      type: goal.type,
      target: goal.target.toString(),
      period: goal.period,
      deadline: goal.deadline,
    });
    setEditingGoal(goal);
    setShowAddModal(true);
    modalScale.value = withSpring(1);
    modalOpacity.value = withTiming(1);
  };

  const closeModal = () => {
    modalScale.value = withSpring(0);
    modalOpacity.value = withTiming(0, {}, () => {
      setShowAddModal(false);
    });
  };

  const handleSaveGoal = async () => {
    if (!formData.title || !formData.target) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const goalData = {
      title: formData.title,
      description: formData.description,
      type: formData.type,
      target: parseFloat(formData.target),
      current: 0,
      unit: goalTypes.find(t => t.key === formData.type)?.unit || 'km',
      period: formData.period,
      deadline: formData.deadline || new Date().toISOString().split('T')[0],
      completed: false,
    };

    try {
      if (editingGoal) {
        // Update existing goal
        const { error } = await supabase
          .from('goals')
          .update(goalData)
          .eq('id', editingGoal.id);

        if (error) {
          Alert.alert('Error', 'Failed to update goal');
          return;
        }
      } else {
        // Create new goal
        const { error } = await supabase
          .from('goals')
          .insert([goalData]);

        if (error) {
          Alert.alert('Error', 'Failed to create goal');
          return;
        }
      }

      // Update local state
      if (editingGoal) {
        setGoals(goals.map(goal => 
          goal.id === editingGoal.id 
            ? { ...goal, ...goalData }
            : goal
        ));
      } else {
        const newGoal: Goal = {
          ...goalData,
          id: Date.now().toString(),
          createdAt: new Date().toISOString().split('T')[0],
        };
        setGoals([...goals, newGoal]);
      }

      closeModal();
    } catch (error) {
      console.error('Error saving goal:', error);
      Alert.alert('Error', 'Failed to save goal');
    }
  };

  const handleDeleteGoal = (goalId: string) => {
    Alert.alert(
      'Delete Goal',
      'Are you sure you want to delete this goal?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('goals')
                .delete()
                .eq('id', goalId);

              if (error) {
                Alert.alert('Error', 'Failed to delete goal');
                return;
              }

              setGoals(goals.filter(goal => goal.id !== goalId));
            } catch (error) {
              console.error('Error deleting goal:', error);
              Alert.alert('Error', 'Failed to delete goal');
            }
          },
        },
      ]
    );
  };

  const handleCompleteGoal = (goalId: string) => {
    const completeGoalAsync = async () => {
      try {
        const goal = goals.find(g => g.id === goalId);
        if (goal) {
          const { error } = await supabase
            .from('goals')
            .update({ completed: true, current: goal.target })
            .eq('id', goalId);

          if (!error) {
            setGoals(goals.map(g =>
              g.id === goalId ? { ...g, completed: true, current: g.target } : g
            ));
          }
        }
      } catch (error) {
        console.error('Error completing goal:', error);
      }
    };
    completeGoalAsync();
  };

  const animatedModalStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: modalScale.value }],
      opacity: modalOpacity.value,
    };
  });

  const renderGoalCard = (goal: Goal, index: number) => {
    const progressPercentage = Math.min((goal.current / goal.target) * 100, 100);
    const isOverdue = new Date(goal.deadline) < new Date() && !goal.completed;
    const typeInfo = goalTypes.find(t => t.key === goal.type);
    const IconComponent = typeInfo?.icon || Target;

    return (
      <AnimatedCard key={goal.id} index={index} delay={200}>
        <View
          style={[
            styles.goalContent,
            { backgroundColor: theme.colors.surface },
            goal.completed && styles.goalCompleted,
            isOverdue && styles.goalOverdue,
          ]}
        >
          <View style={styles.goalHeader}>
            <View style={styles.goalIconContainer}>
              <IconComponent size={20} color={theme.colors.primary} />
            </View>
            <View style={styles.goalInfo}>
              <Text style={[styles.goalTitle, { color: theme.colors.text }]}>
                {goal.title}
              </Text>
              <Text style={[styles.goalDescription, { color: theme.colors.textSecondary }]}>
                {goal.description}
              </Text>
              <Text style={[styles.goalPeriod, { color: theme.colors.textSecondary }]}>
                {goal.period.charAt(0).toUpperCase() + goal.period.slice(1)} • Due: {new Date(goal.deadline).toLocaleDateString()}
              </Text>
            </View>
            <View style={styles.goalActions}>
              {!goal.completed && (
                <>
                  <AnimatedButton
                    onPress={() => openEditModal(goal)}
                    style={styles.actionButton}
                    hapticType="light"
                  >
                    <Edit3 size={16} color={theme.colors.textSecondary} />
                  </AnimatedButton>
                  <AnimatedButton
                    onPress={() => handleDeleteGoal(goal.id)}
                    style={styles.actionButton}
                    hapticType="warning"
                  >
                    <Trash2 size={16} color="#EF4444" />
                  </AnimatedButton>
                </>
              )}
            </View>
          </View>

          <View style={styles.goalProgress}>
            <View style={styles.progressHeader}>
              <Text style={[styles.progressText, { color: theme.colors.text }]}>
                {goal.current} / {goal.target} {goal.unit}
              </Text>
              <Text style={[styles.progressPercentage, { color: theme.colors.primary }]}>
                {Math.round(progressPercentage)}%
              </Text>
            </View>
            <View style={[styles.progressBar, { backgroundColor: theme.colors.border }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${progressPercentage}%`,
                    backgroundColor: goal.completed
                      ? '#10B981'
                      : isOverdue
                      ? '#EF4444'
                      : theme.colors.primary,
                  },
                ]}
              />
            </View>
          </View>

          {!goal.completed && progressPercentage >= 100 && (
            <AnimatedButton
              style={styles.completeButton}
              onPress={() => handleCompleteGoal(goal.id)}
              hapticType="success"
            >
              <Check size={16} color="#FFFFFF" />
              <Text style={styles.completeButtonText}>Mark Complete</Text>
            </AnimatedButton>
          )}

          {goal.completed && (
            <View style={styles.completedBadge}>
              <Check size={16} color="#FFFFFF" />
              <Text style={styles.completedText}>Completed!</Text>
            </View>
          )}
        </View>
      </AnimatedCard>
    );
  };

  const renderAddModal = () => (
    <Modal
      visible={showAddModal}
      transparent
      animationType="fade"
      onRequestClose={closeModal}
    >
      <View style={styles.modalOverlay}>
        <Animated.View style={[styles.modalContent, animatedModalStyle]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              {editingGoal ? 'Edit Goal' : 'Add New Goal'}
            </Text>
            <TouchableOpacity onPress={closeModal}>
              <Text style={[styles.modalClose, { color: theme.colors.textSecondary }]}>
                ✕
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalForm}>
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: theme.colors.text }]}>
                Title *
              </Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: theme.colors.background, color: theme.colors.text }]}
                value={formData.title}
                onChangeText={(text) => setFormData({ ...formData, title: text })}
                placeholder="Enter goal title"
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: theme.colors.text }]}>
                Description
              </Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: theme.colors.background, color: theme.colors.text }]}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                placeholder="Enter goal description"
                placeholderTextColor={theme.colors.textSecondary}
                multiline
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: theme.colors.text }]}>
                Type
              </Text>
              <View style={styles.typeSelector}>
                {goalTypes.map((type) => {
                  const IconComponent = type.icon;
                  const isSelected = formData.type === type.key;
                  return (
                    <AnimatedButton
                      key={type.key}
                      style={[
                        styles.typeButton,
                        isSelected && { backgroundColor: theme.colors.primary },
                        { backgroundColor: isSelected ? theme.colors.primary : theme.colors.background }
                      ]}
                      onPress={() => setFormData({ ...formData, type: type.key as Goal['type'] })}
                      hapticType="light"
                    >
                      <IconComponent
                        size={16}
                        color={isSelected ? '#FFFFFF' : theme.colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.typeButtonText,
                          { color: isSelected ? '#FFFFFF' : theme.colors.textSecondary }
                        ]}
                      >
                        {type.label}
                      </Text>
                    </AnimatedButton>
                  );
                })}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: theme.colors.text }]}>
                Target *
              </Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: theme.colors.background, color: theme.colors.text }]}
                value={formData.target}
                onChangeText={(text) => setFormData({ ...formData, target: text })}
                placeholder="Enter target value"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: theme.colors.text }]}>
                Period
              </Text>
              <View style={styles.periodSelector}>
                {periods.map((period) => {
                  const isSelected = formData.period === period.key;
                  return (
                    <AnimatedButton
                      key={period.key}
                      style={[
                        styles.periodButton,
                        { backgroundColor: isSelected ? theme.colors.primary : theme.colors.background }
                      ]}
                      onPress={() => setFormData({ ...formData, period: period.key as Goal['period'] })}
                      hapticType="light"
                    >
                      <Text
                        style={[
                          styles.periodButtonText,
                          { color: isSelected ? '#FFFFFF' : theme.colors.textSecondary }
                        ]}
                      >
                        {period.label}
                      </Text>
                    </AnimatedButton>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalActions}>
            <AnimatedButton
              style={[styles.modalButton, styles.cancelButton]}
              onPress={closeModal}
              hapticType="light"
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </AnimatedButton>
            <AnimatedButton
              style={[styles.modalButton, styles.saveButton]}
              onPress={handleSaveGoal}
              hapticType="medium"
            >
              <Text style={styles.saveButtonText}>
                {editingGoal ? 'Update' : 'Create'}
              </Text>
            </AnimatedButton>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );

  const activeGoals = goals.filter(goal => !goal.completed);
  const completedGoals = goals.filter(goal => goal.completed);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <LinearGradient
        colors={['#8B5CF6', '#A855F7', '#C084FC']}
        style={styles.header}
      >
        <SafeAreaView>
          <View style={styles.headerContent}>
            <AnimatedButton onPress={() => router.back()} hapticType="light">
              <ArrowLeft color="#FFFFFF" size={24} />
            </AnimatedButton>
            <Text style={styles.headerTitle}>Goals</Text>
            <AnimatedButton onPress={openAddModal} hapticType="light">
              <Plus color="#FFFFFF" size={24} />
            </AnimatedButton>
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{activeGoals.length}</Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{completedGoals.length}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {Math.round(
                  activeGoals.reduce((sum, goal) => sum + (goal.current / goal.target) * 100, 0) /
                  (activeGoals.length || 1)
                )}%
              </Text>
              <Text style={styles.statLabel}>Avg Progress</Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeGoals.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Active Goals
            </Text>
            {activeGoals.map((goal, index) => renderGoalCard(goal, index))}
          </View>
        )}

        {completedGoals.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Completed Goals
            </Text>
            {completedGoals.map((goal, index) => renderGoalCard(goal, index))}
          </View>
        )}

        {goals.length === 0 && (
          <AnimatedCard delay={400}>
          <View style={styles.emptyState}>
            <Target size={48} color={theme.colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
              No Goals Yet
            </Text>
            <Text style={[styles.emptyDescription, { color: theme.colors.textSecondary }]}>
              Set your first goal to start tracking your progress
            </Text>
            <AnimatedButton 
              style={styles.emptyButton} 
              onPress={openAddModal}
              hapticType="medium"
            >
              <Plus size={20} color="#FFFFFF" />
              <Text style={styles.emptyButtonText}>Add Goal</Text>
            </AnimatedButton>
          </View>
          </AnimatedCard>
        )}
      </ScrollView>

      {renderAddModal()}
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
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 16,
  },
  goalCard: {
    marginBottom: 16,
  },
  goalContent: {
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
  goalCompleted: {
    borderWidth: 2,
    borderColor: '#10B981',
  },
  goalOverdue: {
    borderWidth: 2,
    borderColor: '#EF4444',
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  goalIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  goalInfo: {
    flex: 1,
  },
  goalTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 4,
  },
  goalDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginBottom: 4,
  },
  goalPeriod: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  goalActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  goalProgress: {
    marginBottom: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  progressPercentage: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    borderRadius: 8,
    paddingVertical: 8,
    gap: 6,
  },
  completeButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    borderRadius: 8,
    paddingVertical: 8,
    gap: 6,
  },
  completedText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  emptyButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
  },
  modalClose: {
    fontSize: 18,
    fontFamily: 'Inter-Regular',
  },
  modalForm: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  typeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 6,
  },
  typeButtonText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  periodSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  periodButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  periodButtonText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  modalActions: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
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
  saveButton: {
    backgroundColor: '#8B5CF6',
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});