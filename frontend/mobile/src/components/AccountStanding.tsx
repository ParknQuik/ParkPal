import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BehaviorStatus } from '../types';
import { borderRadius, spacing, typography } from '../theme';
import type { AppColors } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';
import {
  getBehaviorStanding,
  getBehaviorStatusLabel,
  getBehaviorStatusMessage,
} from '../utils/behaviorStatus';

type Surface = 'card' | 'banner';

interface AccountStandingProps {
  status: BehaviorStatus | null;
  surface?: Surface;
  testID?: string;
}

function getAccentColor(colors: AppColors, status: BehaviorStatus | null) {
  const standing = getBehaviorStanding(status);
  if (standing === 'suspended') return colors.error;
  if (standing === 'warning') return colors.warning;
  return colors.success;
}

function getIconName(status: BehaviorStatus | null) {
  const standing = getBehaviorStanding(status);
  if (standing === 'suspended') return 'shield-alert-outline';
  if (standing === 'warning') return 'shield-half-full';
  return 'shield-check-outline';
}

export const AccountStanding: React.FC<AccountStandingProps> = ({
  status,
  surface = 'card',
  testID,
}) => {
  const { colors } = useTheme();
  const accentColor = getAccentColor(colors, status);
  const isBanner = surface === 'banner';

  const styles = React.useMemo(() => StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: isBanner ? `${accentColor}14` : colors.surface,
      borderRadius: isBanner ? borderRadius.md : borderRadius.xl,
      borderWidth: 1,
      borderColor: isBanner ? `${accentColor}80` : colors.border,
      padding: isBanner ? spacing.md : spacing.lg,
      gap: spacing.md,
      width: '100%',
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: isBanner ? 0 : 2 },
      shadowOpacity: isBanner ? 0 : 0.05,
      shadowRadius: isBanner ? 0 : 8,
      elevation: isBanner ? 0 : 2,
    },
    iconWrap: {
      width: isBanner ? 36 : 48,
      height: isBanner ? 36 : 48,
      borderRadius: isBanner ? 18 : borderRadius.lg,
      backgroundColor: `${accentColor}18`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    content: {
      flex: 1,
    },
    eyebrow: {
      ...typography.small,
      color: colors.textTertiary,
      textTransform: 'uppercase',
      letterSpacing: 0,
      fontWeight: '600',
      marginBottom: 2,
    },
    title: {
      ...(isBanner ? typography.body : typography.h5),
      color: accentColor,
      fontWeight: '700',
      marginBottom: 2,
    },
    message: {
      ...typography.bodySmall,
      color: colors.textSecondary,
      lineHeight: 19,
    },
  }), [accentColor, colors, isBanner]);

  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.iconWrap}>
        <MaterialCommunityIcons name={getIconName(status) as any} size={isBanner ? 21 : 28} color={accentColor} />
      </View>
      <View style={styles.content}>
        {!isBanner && <Text style={styles.eyebrow}>Account standing</Text>}
        <Text style={styles.title}>{getBehaviorStatusLabel(status)}</Text>
        <Text style={styles.message}>{getBehaviorStatusMessage(status)}</Text>
      </View>
    </View>
  );
};
