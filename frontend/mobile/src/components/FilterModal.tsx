import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { typography, spacing, borderRadius } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { Chip } from './Chip';

export interface FilterConfig {
  minPrice?: number;
  maxPrice?: number;
  slotTypes?: string[];
  amenities?: string[];
  availableNow?: boolean;
}

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: FilterConfig) => void;
  initialFilters?: Partial<FilterConfig>;
}

const SLOT_TYPE_OPTIONS = [
  { label: 'QR Entry', value: 'roadside_qr', icon: 'qrcode' },
  { label: 'Commercial', value: 'commercial_manual', icon: 'store' },
  { label: 'Automated', value: 'commercial_iot', icon: 'robot' },
];

const AMENITY_OPTIONS = [
  { label: 'Covered', value: 'Covered', icon: 'umbrella' },
  { label: 'CCTV', value: 'CCTV', icon: 'cctv' },
  { label: 'Security', value: 'Security', icon: 'shield-check' },
  { label: 'EV Charging', value: 'EV Charging', icon: 'ev-station' },
  { label: 'Lighting', value: 'Lighting', icon: 'lightbulb' },
  { label: 'Accessible', value: 'Accessible', icon: 'wheelchair-accessibility' },
];

export const FilterModal: React.FC<FilterModalProps> = ({
  visible,
  onClose,
  onApply,
  initialFilters,
}) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [selectedSlotTypes, setSelectedSlotTypes] = useState<string[]>([]);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [availableNow, setAvailableNow] = useState(false);

  const styles = React.useMemo(() => StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'flex-end',
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
    },
    sheet: {
      backgroundColor: colors.white,
      borderTopLeftRadius: borderRadius.xxl,
      borderTopRightRadius: borderRadius.xxl,
      maxHeight: '85%',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: {
      ...typography.h5,
      color: colors.textPrimary,
    },
    closeButton: {
      padding: spacing.xs,
    },
    content: {
      paddingHorizontal: spacing.xl,
    },
    section: {
      paddingVertical: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    sectionTitle: {
      ...typography.h6,
      color: colors.textPrimary,
      marginBottom: spacing.xs,
    },
    sectionSubtitle: {
      ...typography.small,
      color: colors.textSecondary,
      marginBottom: spacing.md,
    },
    priceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    priceInputContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderRadius: borderRadius.lg,
      paddingHorizontal: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    currencyPrefix: {
      ...typography.body,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    priceInput: {
      flex: 1,
      ...typography.body,
      color: colors.textPrimary,
      paddingVertical: spacing.md,
    },
    priceSeparator: {
      ...typography.h6,
      color: colors.textTertiary,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    chipGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    toggleTextContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    toggleLabel: {
      ...typography.body,
      color: colors.textPrimary,
      fontWeight: '500',
    },
    toggleTrack: {
      width: 48,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.border,
      justifyContent: 'center',
      paddingHorizontal: 3,
    },
    toggleTrackActive: {
      backgroundColor: colors.primary,
    },
    toggleThumb: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: colors.white,
    },
    toggleThumbActive: {
      alignSelf: 'flex-end',
    },
    buttonRow: {
      flexDirection: 'row',
      gap: spacing.md,
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.lg,
    },
    clearButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderRadius: borderRadius.lg,
      backgroundColor: colors.background,
    },
    clearButtonText: {
      ...typography.bodySmall,
      color: colors.error,
      fontWeight: '600',
    },
    applyButton: {
      flex: 1,
      backgroundColor: colors.primary,
      borderRadius: borderRadius.lg,
      paddingVertical: spacing.md,
      alignItems: 'center',
    },
    applyButtonText: {
      ...typography.button,
      color: colors.white,
    },
  }), [colors]);

  useEffect(() => {
    if (visible) {
      setMinPrice(initialFilters?.minPrice?.toString() ?? '');
      setMaxPrice(initialFilters?.maxPrice?.toString() ?? '');
      setSelectedSlotTypes(initialFilters?.slotTypes ?? []);
      setSelectedAmenities(initialFilters?.amenities ?? []);
      setAvailableNow(initialFilters?.availableNow ?? false);
    }
  }, [visible, initialFilters]);

  const toggleSlotType = (value: string) => {
    setSelectedSlotTypes((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const toggleAmenity = (value: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const hasActiveFilters =
    minPrice !== '' ||
    maxPrice !== '' ||
    selectedSlotTypes.length > 0 ||
    selectedAmenities.length > 0 ||
    availableNow;

  const handleClearAll = () => {
    setMinPrice('');
    setMaxPrice('');
    setSelectedSlotTypes([]);
    setSelectedAmenities([]);
    setAvailableNow(false);
  };

  const handleApply = () => {
    const filters: FilterConfig = {
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      slotTypes: selectedSlotTypes.length > 0 ? selectedSlotTypes : undefined,
      amenities: selectedAmenities.length > 0 ? selectedAmenities : undefined,
      availableNow: availableNow || undefined,
    };
    onApply(filters);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
          keyboardVerticalOffset={0}
        >
          <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
            <View style={styles.header}>
              <Text style={styles.title} accessibilityRole="header">Filters</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton} activeOpacity={0.7} accessibilityLabel="Close filter modal" accessibilityRole="button">
                <MaterialCommunityIcons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
              {/* Price Range */}
              <View style={styles.section} accessible accessibilityLabel="Price range filter">
                <Text style={styles.sectionTitle}>Price Range</Text>
                <Text style={styles.sectionSubtitle}>per hour (₱)</Text>
                <View style={styles.priceRow}>
                  <View style={styles.priceInputContainer}>
                    <Text style={styles.currencyPrefix}>₱</Text>
                    <TextInput
                      style={styles.priceInput}
                      value={minPrice}
                      onChangeText={setMinPrice}
                      placeholder="Min"
                      placeholderTextColor={colors.textTertiary}
                      keyboardType="numeric"
                      returnKeyType="done"
                      accessibilityLabel="Minimum price per hour"
                    />
                  </View>
                  <Text style={styles.priceSeparator}>—</Text>
                  <View style={styles.priceInputContainer}>
                    <Text style={styles.currencyPrefix}>₱</Text>
                    <TextInput
                      style={styles.priceInput}
                      value={maxPrice}
                      onChangeText={setMaxPrice}
                      placeholder="Max"
                      placeholderTextColor={colors.textTertiary}
                      keyboardType="numeric"
                      returnKeyType="done"
                      accessibilityLabel="Maximum price per hour"
                    />
                  </View>
                </View>
              </View>

              {/* Slot Type */}
              <View style={styles.section} accessible accessibilityLabel="Slot type filter">
                <Text style={styles.sectionTitle}>Slot Type</Text>
                <View style={styles.chipRow}>
                  {SLOT_TYPE_OPTIONS.map((option) => (
                    <Chip
                      key={option.value}
                      label={option.label}
                      selected={selectedSlotTypes.includes(option.value)}
                      onPress={() => toggleSlotType(option.value)}
                    />
                  ))}
                </View>
              </View>

              {/* Amenities */}
              <View style={styles.section} accessible accessibilityLabel="Amenities filter">
                <Text style={styles.sectionTitle}>Amenities</Text>
                <View style={styles.chipGrid}>
                  {AMENITY_OPTIONS.map((option) => (
                    <Chip
                      key={option.value}
                      label={option.label}
                      selected={selectedAmenities.includes(option.value)}
                      onPress={() => toggleAmenity(option.value)}
                    />
                  ))}
                </View>
              </View>

              {/* Availability */}
              <View style={styles.section} accessible accessibilityLabel="Availability filter">
                <TouchableOpacity
                  style={styles.toggleRow}
                  onPress={() => setAvailableNow(!availableNow)}
                  activeOpacity={0.7}
                  accessibilityLabel={availableNow ? "Show all availability" : "Show available now only"}
                  accessibilityRole="button"
                  accessibilityState={{ selected: availableNow }}
                >
                  <View style={styles.toggleTextContainer}>
                    <MaterialCommunityIcons name="clock-check-outline" size={20} color={colors.primary} />
                    <Text style={styles.toggleLabel}>Available Now</Text>
                  </View>
                  <View style={[styles.toggleTrack, availableNow && styles.toggleTrackActive]}>
                    <View style={[styles.toggleThumb, availableNow && styles.toggleThumbActive]} />
                  </View>
                </TouchableOpacity>
              </View>
            </ScrollView>

            {/* Bottom Buttons */}
            <View style={styles.buttonRow}>
              {hasActiveFilters && (
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={handleClearAll}
                  activeOpacity={0.7}
                  accessibilityLabel="Clear all filters"
                  accessibilityRole="button"
                >
                  <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.error} />
                  <Text style={styles.clearButtonText}>Clear All</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.applyButton}
                onPress={handleApply}
                activeOpacity={0.8}
                accessibilityLabel="Apply filters"
                accessibilityRole="button"
              >
                <Text style={styles.applyButtonText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};
