import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Dimensions,
} from 'react-native';
import { X, Calendar, MapPin, Clock, Zap } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import AnimatedButton from '@/components/AnimatedButton';

const { width, height } = Dimensions.get('window');

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApplyFilters: (filters: FilterOptions) => void;
  currentFilters: FilterOptions;
}

export interface FilterOptions {
  dateRange: 'week' | 'month' | 'year' | 'all';
  distance: 'all' | '0-5' | '5-10' | '10-15' | '15+';
  duration: 'all' | '0-30' | '30-60' | '60-90' | '90+';
  pace: 'all' | 'slow' | 'moderate' | 'fast' | 'sprint';
}

export default function FilterModal({ visible, onClose, onApplyFilters, currentFilters }: FilterModalProps) {
  const [filters, setFilters] = useState<FilterOptions>(currentFilters);

  const dateRangeOptions = [
    { key: 'week', label: 'This Week', icon: Calendar },
    { key: 'month', label: 'This Month', icon: Calendar },
    { key: 'year', label: 'This Year', icon: Calendar },
    { key: 'all', label: 'All Time', icon: Calendar },
  ];

  const distanceOptions = [
    { key: 'all', label: 'Any Distance', icon: MapPin },
    { key: '0-5', label: '0-5 km', icon: MapPin },
    { key: '5-10', label: '5-10 km', icon: MapPin },
    { key: '10-15', label: '10-15 km', icon: MapPin },
    { key: '15+', label: '15+ km', icon: MapPin },
  ];

  const durationOptions = [
    { key: 'all', label: 'Any Duration', icon: Clock },
    { key: '0-30', label: '0-30 min', icon: Clock },
    { key: '30-60', label: '30-60 min', icon: Clock },
    { key: '60-90', label: '1-1.5 hours', icon: Clock },
    { key: '90+', label: '1.5+ hours', icon: Clock },
  ];

  const paceOptions = [
    { key: 'all', label: 'Any Pace', icon: Zap },
    { key: 'slow', label: 'Slow (7+ min/km)', icon: Zap },
    { key: 'moderate', label: 'Moderate (5-7 min/km)', icon: Zap },
    { key: 'fast', label: 'Fast (4-5 min/km)', icon: Zap },
    { key: 'sprint', label: 'Sprint (<4 min/km)', icon: Zap },
  ];

  const handleApply = () => {
    onApplyFilters(filters);
    onClose();
  };

  const handleReset = () => {
    const resetFilters: FilterOptions = {
      dateRange: 'all',
      distance: 'all',
      duration: 'all',
      pace: 'all',
    };
    setFilters(resetFilters);
  };

  const handleOptionSelect = (filterType: string, value: string) => {
    onSelect(value);
  };

  const renderFilterSection = (
    title: string,
    options: any[],
    currentValue: string,
    onSelect: (value: string) => void
  ) => (
    <View style={styles.filterSection}>
      <Text style={styles.filterTitle}>{title}</Text>
      <View style={styles.filterOptions}>
        {options.map((option) => {
          const IconComponent = option.icon;
          const isSelected = currentValue === option.key;
          
          return (
            <AnimatedButton
              key={option.key}
              style={[styles.filterOption, isSelected && styles.filterOptionSelected]}
              onPress={() => onSelect(option.key)}
            >
              <IconComponent 
                size={16} 
                color={isSelected ? '#8B5CF6' : '#6B7280'} 
              />
              <Text style={[
                styles.filterOptionText,
                isSelected && styles.filterOptionTextSelected
              ]}>
                {option.label}
              </Text>
            </AnimatedButton>
          );
        })}
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <BlurView intensity={20} style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Filters</Text>
              <AnimatedButton onPress={onClose} style={styles.closeButton} hapticType="light">
                <X size={24} color="#6B7280" />
              </AnimatedButton>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
              {renderFilterSection(
                'Time Period',
                dateRangeOptions,
                filters.dateRange,
                (value) => setFilters({ ...filters, dateRange: value as any })
              )}

              {renderFilterSection(
                'Distance',
                distanceOptions,
                filters.distance,
                (value) => setFilters({ ...filters, distance: value as any })
              )}

              {renderFilterSection(
                'Duration',
                durationOptions,
                filters.duration,
                (value) => setFilters({ ...filters, duration: value as any })
              )}

              {renderFilterSection(
                'Pace',
                paceOptions,
                filters.pace,
                (value) => setFilters({ ...filters, pace: value as any })
              )}
            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
              <AnimatedButton style={styles.resetButton} onPress={handleReset} hapticType="light">
                <Text style={styles.resetButtonText}>Reset</Text>
              </AnimatedButton>
              <AnimatedButton style={styles.applyButton} onPress={handleApply} hapticType="medium">
                <Text style={styles.applyButtonText}>Apply</Text>
              </AnimatedButton>
            </View>
          </View>
        </View>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.85,
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  filterSection: {
    marginVertical: 20,
  },
  filterTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 12,
  },
  filterOptions: {
    gap: 8,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterOptionSelected: {
    backgroundColor: '#F3E8FF',
    borderColor: '#8B5CF6',
  },
  filterOptionText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginLeft: 8,
  },
  filterOptionTextSelected: {
    color: '#8B5CF6',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 12,
  },
  resetButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
  },
  applyButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});