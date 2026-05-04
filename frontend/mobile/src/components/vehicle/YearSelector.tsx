import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  SafeAreaView,
  TextInput,
} from 'react-native';
import { typography, spacing, borderRadius } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

interface YearSelectorProps {
  value: string;
  onChange: (year: string) => void;
  placeholder?: string;
  minYear?: number;
  maxYearsBack?: number;
}

export const YearSelector: React.FC<YearSelectorProps> = ({
  value,
  onChange,
  placeholder = 'Select Year',
  minYear = 1950,
  maxYearsBack = 40,
}) => {
  const { colors } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: maxYearsBack }, (_, i) => currentYear - i);

  const filteredYears = searchQuery
    ? years.filter((y) => y.toString().includes(searchQuery))
    : years;

  const handleSelect = (year: number) => {
    onChange(year.toString());
    setModalVisible(false);
    setSearchQuery('');
  };

  useEffect(() => {
    if (!modalVisible) {
      setSearchQuery('');
    }
  }, [modalVisible]);

  const styles = useMemo(() => StyleSheet.create({
    container: {
      width: '100%',
    },
    selectorButton: {
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: colors.border,
      borderRadius: borderRadius.xl,
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    selectorButtonFilled: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + '10',
    },
    selectorLabel: {
      ...typography.body,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    selectorLabelFilled: {
      color: colors.primary,
      fontWeight: '600',
    },
    modalContainer: {
      flex: 1,
      backgroundColor: colors.background,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.surface,
    },
    cancelText: {
      ...typography.body,
      color: colors.primary,
      fontWeight: '600',
    },
    modalTitle: {
      ...typography.h5,
      color: colors.text,
    },
    searchContainer: {
      padding: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.surface,
    },
    searchInput: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      ...typography.body,
      color: colors.text,
    },
    pickerItem: {
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.surface,
    },
    pickerItemSelected: {
      backgroundColor: colors.primary + '15',
    },
    pickerItemText: {
      ...typography.body,
      color: colors.text,
    },
    pickerItemTextSelected: {
      color: colors.primary,
      fontWeight: '600',
    },
    emptyContainer: {
      padding: spacing.xxl,
      alignItems: 'center',
    },
    emptyText: {
      ...typography.body,
      color: colors.textTertiary,
    },
  }), [colors]);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.selectorButton, value && styles.selectorButtonFilled]}
        onPress={() => setModalVisible(true)}
      >
        <Text style={[styles.selectorLabel, value && styles.selectorLabelFilled]}>
          {value ? `Year: ${value}` : placeholder}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Year</Text>
            <View style={{ width: 60 }} />
          </View>

          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search year..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              keyboardType="numeric"
              placeholderTextColor={colors.textTertiary}
            />
          </View>

          <FlatList
            data={filteredYears}
            keyExtractor={(item) => item.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.pickerItem,
                  item.toString() === value && styles.pickerItemSelected,
                ]}
                onPress={() => handleSelect(item)}
              >
                <Text
                  style={[
                    styles.pickerItemText,
                    item.toString() === value && styles.pickerItemTextSelected,
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            )}
            initialNumToRender={20}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No years found</Text>
              </View>
            }
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
};

export default YearSelector;
