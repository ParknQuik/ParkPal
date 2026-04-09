import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors, typography, spacing, borderRadius, shadows } from '../theme';
import { haptics } from '../utils/haptics';

interface ColorCardProps {
  name: string;
  hex: string;
  isSelected: boolean;
  onSelect: () => void;
}

const ColorCard: React.FC<ColorCardProps> = ({ name, hex, isSelected, onSelect }) => {
  const handlePress = useCallback(async () => {
    await haptics.light();
    onSelect();
  }, [onSelect]);

  return (
    <TouchableOpacity 
      style={[styles.colorCard, isSelected && styles.colorCardSelected]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={[styles.colorSwatch, { backgroundColor: hex }]} />
      <View style={styles.colorInfo}>
        <Text style={styles.colorName}>{name}</Text>
        <Text style={styles.colorHex}>{hex}</Text>
      </View>
      <View style={[styles.selector, isSelected && styles.selectorSelected]}>
        {isSelected && <View style={styles.selectorDot} />}
      </View>
    </TouchableOpacity>
  );
};

export const DesignSystem: React.FC = () => {
  const navigation = useNavigation();
  const [selectedColors, setSelectedColors] = useState<string[]>(['brandGreen']);

  const handleBackPress = useCallback(async () => {
    await haptics.light();
    navigation.goBack();
  }, [navigation]);

  const handleSearchPress = useCallback(async () => {
    await haptics.light();
  }, []);

  const toggleColorSelection = useCallback((colorKey: string) => {
    setSelectedColors(prev => 
      prev.includes(colorKey)
        ? prev.filter(c => c !== colorKey)
        : [...prev, colorKey]
    );
  }, []);

  const brandColors = [
    { key: 'brandGreen', name: 'Brand Green', hex: '#4CAF50' },
    { key: 'brandOrange', name: 'Brand Orange', hex: '#FF9800' },
    { key: 'brandYellow', name: 'Brand Yellow', hex: '#FFEB3B' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.headerButton} 
          onPress={handleBackPress}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Design System</Text>
        
        <TouchableOpacity 
          style={styles.headerButton} 
          onPress={handleSearchPress}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.searchButton}>🔍</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Color Palette</Text>
          <Text style={styles.sectionDescription}>
            The color palette defines the visual identity of the ParkPal app. 
            Use these colors consistently to maintain brand recognition.
          </Text>
        </View>

        <View style={styles.subsection}>
          <Text style={styles.subsectionTitle}>Brand Colors</Text>
          
          {brandColors.map((color) => (
            <ColorCard
              key={color.key}
              name={color.name}
              hex={color.hex}
              isSelected={selectedColors.includes(color.key)}
              onSelect={() => toggleColorSelection(color.key)}
            />
          ))}
        </View>

        <View style={styles.subsection}>
          <Text style={styles.subsectionTitle}>Primary Color</Text>
          <View style={styles.primaryColorContainer}>
            <View style={[styles.primarySwatch, { backgroundColor: colors.primary }]} />
            <View style={styles.primaryInfo}>
              <Text style={styles.primaryName}>Primary</Text>
              <Text style={styles.primaryHex}>{colors.primary}</Text>
            </View>
          </View>
        </View>

        <View style={styles.subsection}>
          <Text style={styles.subsectionTitle}>Background</Text>
          <View style={styles.backgroundContainer}>
            <View style={[styles.backgroundSwatch, { backgroundColor: colors.background }]} />
            <View style={styles.backgroundInfo}>
              <Text style={styles.backgroundName}>Background Light</Text>
              <Text style={styles.backgroundHex}>{colors.background}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    fontSize: 24,
    color: colors.textPrimary,
  },
  searchButton: {
    fontSize: 20,
  },
  headerTitle: {
    ...typography.heading5,
    color: colors.textPrimary,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeading: {
    ...typography.heading3,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  sectionDescription: {
    ...typography.body2,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  subsection: {
    marginBottom: spacing.lg,
  },
  subsectionTitle: {
    ...typography.heading6,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  colorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
    ...shadows.small,
  },
  colorCardSelected: {
    borderColor: colors.primary,
  },
  colorSwatch: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.sm,
    marginRight: spacing.md,
  },
  colorInfo: {
    flex: 1,
  },
  colorName: {
    ...typography.body1,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  colorHex: {
    ...typography.body2,
    color: colors.textSecondary,
    marginTop: 2,
  },
  selector: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectorSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  selectorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.white,
  },
  primaryColorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...shadows.small,
  },
  primarySwatch: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.sm,
    marginRight: spacing.md,
  },
  primaryInfo: {
    flex: 1,
  },
  primaryName: {
    ...typography.body1,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  primaryHex: {
    ...typography.body2,
    color: colors.textSecondary,
    marginTop: 2,
  },
  backgroundContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...shadows.small,
  },
  backgroundSwatch: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.sm,
    marginRight: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  backgroundInfo: {
    flex: 1,
  },
  backgroundName: {
    ...typography.body1,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  backgroundHex: {
    ...typography.body2,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
