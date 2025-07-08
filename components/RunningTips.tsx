import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Lightbulb, Heart, Droplets, Zap } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

const tips = [
  {
    id: 1,
    icon: Heart,
    title: 'Monitor Heart Rate',
    description: 'Optimal heart rate zone for fat burning: 60-70% of maximum',
    color: '#EF4444',
  },
  {
    id: 2,
    icon: Droplets,
    title: 'Stay Hydrated',
    description: 'Drink 150-200ml of water every 15-20 minutes while running',
    color: '#3B82F6',
  },
  {
    id: 3,
    icon: Zap,
    title: 'Warm-up Matters',
    description: 'Spend 5-10 minutes warming up before starting your workout',
    color: '#F59E0B',
  },
];

export default function RunningTips() {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.header}>
        <Lightbulb size={20} color={theme.colors.primary} />
        <Text style={[styles.title, { color: theme.colors.text }]}>Running Tips</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tipsContainer}>
        {tips.map((tip) => {
          const IconComponent = tip.icon;
          return (
            <View key={tip.id} style={[styles.tipCard, { backgroundColor: theme.colors.background }]}>
              <View style={[styles.tipIcon, { backgroundColor: `${tip.color}20` }]}>
                <IconComponent size={16} color={tip.color} />
              </View>
              <Text style={[styles.tipTitle, { color: theme.colors.text }]}>{tip.title}</Text>
              <Text style={[styles.tipDescription, { color: theme.colors.textSecondary }]}>{tip.description}</Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    marginLeft: 8,
  },
  tipsContainer: {
    flexDirection: 'row',
  },
  tipCard: {
    width: 200,
    marginRight: 16,
    padding: 16,
    borderRadius: 12,
  },
  tipIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  tipTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 8,
  },
  tipDescription: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    lineHeight: 16,
  },
});