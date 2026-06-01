import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { borderRadius, spacing, typography } from '../theme';
import { useTheme } from '../context/ThemeContext';

interface AuthTransitionScreenProps {
  message?: string;
}

export const AuthTransitionScreen: React.FC<AuthTransitionScreenProps> = ({
  message = 'Getting your dashboard ready...',
}) => {
  const { colors } = useTheme();

  const styles = React.useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
        },
        content: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: spacing.lg,
        },
        brandMark: {
          width: 84,
          height: 84,
          borderRadius: borderRadius.full,
          backgroundColor: 'rgba(255, 255, 255, 0.18)',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: spacing.lg,
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.28)',
        },
        brandAccent: {
          position: 'absolute',
          right: -2,
          bottom: 6,
          width: 16,
          height: 16,
          borderRadius: borderRadius.full,
          backgroundColor: colors.secondary,
          borderWidth: 2,
          borderColor: colors.white,
        },
        title: {
          ...typography.h3,
          fontWeight: '700',
          color: colors.white,
          marginBottom: spacing.xs,
          textAlign: 'center',
        },
        message: {
          ...typography.body,
          color: 'rgba(255, 255, 255, 0.9)',
          textAlign: 'center',
          marginBottom: spacing.xl,
        },
      }),
    [colors],
  );

  return (
    <View
      style={styles.container}
      accessibilityRole="progressbar"
      accessibilityLabel="ParknQuik is loading"
      accessibilityState={{ busy: true }}
    >
      <LinearGradient
        colors={colors.gradientSecondary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.content}>
        <View
          style={styles.brandMark}
          accessibilityRole="image"
          accessibilityLabel="ParknQuik logo"
        >
          <MaterialCommunityIcons name="parking" size={34} color={colors.white} />
          <View style={styles.brandAccent} />
        </View>
        <Text style={styles.title} accessibilityRole="header">
          ParknQuik
        </Text>
        <Text style={styles.message}>{message}</Text>
        <ActivityIndicator color={colors.white} size="large" />
      </View>
    </View>
  );
};
