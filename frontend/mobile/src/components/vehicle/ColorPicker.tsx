import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';

export interface CarColor {
  name: string;
  hex: string;
}

interface ColorPickerProps {
  colors: CarColor[];
  selectedColor: CarColor | null;
  onSelect: (color: CarColor) => void;
  columns?: number;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({
  colors: colorOptions,
  selectedColor,
  onSelect,
  columns = 5,
}) => {
  const getColorSize = () => {
    const totalColors = colorOptions.length;
    if (totalColors <= 10) return 48;
    if (totalColors <= 18) return 42;
    return 36;
  };

  const swatchSize = getColorSize();
  const swatchSpacing = spacing.sm;

  const renderColorSwatch = (color: CarColor, index: number) => {
    const isSelected = selectedColor?.hex === color.hex;
    const isWhite = color.hex.toLowerCase() === '#ffffff';

    return (
      <TouchableOpacity
        key={`${color.hex}-${index}`}
        style={[
          styles.colorSwatch,
          {
            backgroundColor: color.hex,
            width: swatchSize,
            height: swatchSize,
            borderRadius: swatchSize / 2,
            margin: swatchSpacing / 2,
          },
          isSelected && styles.colorSwatchSelected,
          isWhite && styles.whiteSwatch,
          isWhite && isSelected && styles.whiteSwatchSelected,
        ]}
        onPress={() => onSelect(color)}
        activeOpacity={0.7}
      >
        {isSelected && (
          <View style={styles.checkmarkContainer}>
            <Text style={styles.checkmark}>✓</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.colorGrid}>
          {colorOptions.map(renderColorSwatch)}
        </View>
      </ScrollView>
      {selectedColor && (
        <Text style={styles.selectedColorText}>
          Selected: {selectedColor.name}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.sm,
  },
  scrollContent: {
    paddingHorizontal: spacing.xs,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  colorSwatch: {
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  whiteSwatch: {
    borderWidth: 2,
    borderColor: colors.border,
  },
  colorSwatchSelected: {
    borderColor: colors.primary,
    borderWidth: 3,
    transform: [{ scale: 1.1 }],
  },
  whiteSwatchSelected: {
    borderColor: colors.primary,
    borderWidth: 3,
  },
  checkmarkContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  selectedColorText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});

export default ColorPicker;