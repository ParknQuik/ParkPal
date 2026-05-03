import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

export type SortOption = 'cheapest' | 'nearest' | 'top_rated' | 'available_now' | null;

interface FilterChipsProps {
  activeSort: SortOption;
  onSortChange: (sort: SortOption) => void;
}

const CHIPS = [
  { id: 'cheapest' as SortOption, label: 'Cheapest', icon: 'currency-usd' },
  { id: 'nearest' as SortOption, label: 'Nearest', icon: 'map-marker-distance' },
  { id: 'top_rated' as SortOption, label: 'Top Rated', icon: 'star' },
  { id: 'available_now' as SortOption, label: 'Available Now', icon: 'check-circle' },
];

export const FilterChips: React.FC<FilterChipsProps> = ({ activeSort, onSortChange }) => {
  const handlePress = (id: SortOption) => {
    onSortChange(activeSort === id ? null : id);
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {CHIPS.map(chip => (
        <TouchableOpacity
          key={chip.id}
          style={[styles.chip, activeSort === chip.id && styles.chipActive]}
          onPress={() => handlePress(chip.id)}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons
            name={chip.icon as any}
            size={14}
            color={activeSort === chip.id ? colors.white : colors.textSecondary}
          />
          <Text style={[styles.chipLabel, activeSort === chip.id && styles.chipLabelActive]}>
            {chip.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.background,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  chipLabelActive: {
    color: colors.white,
  },
});
