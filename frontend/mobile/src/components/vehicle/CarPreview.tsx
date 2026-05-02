import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import { colors, typography, spacing, borderRadius } from '../../theme';

export interface CarColor {
  name: string;
  hex: string;
}

interface CarPreviewProps {
  color: CarColor;
  size?: 'small' | 'medium' | 'large';
}

export const CarPreview: React.FC<CarPreviewProps> = ({ color, size = 'medium' }) => {
  const sizeConfig = {
    small: { width: 120, height: 60, scale: 0.6 },
    medium: { width: 180, height: 90, scale: 0.9 },
    large: { width: 240, height: 120, scale: 1.2 },
  };

  const { width, height, scale } = sizeConfig[size];

  return (
    <View style={styles.container}>
      <Svg width={width} height={height} viewBox="0 0 200 100">
        <Path
          d="M40 60 Q30 60 30 50 L30 35 Q30 25 40 25 L160 25 Q170 25 170 35 L170 50 Q170 60 160 60 Z"
          fill={color.hex}
          stroke={colors.borderDark}
          strokeWidth="1.5"
        />
        <Path
          d="M50 25 Q55 20 60 25 L65 25"
          stroke={colors.surfaceDark}
          strokeWidth="3"
          fill="none"
          opacity="0.8"
        />
        <Path
          d="M80 25 Q85 20 90 25 L95 25"
          stroke={colors.surfaceDark}
          strokeWidth="3"
          fill="none"
          opacity="0.8"
        />
        <Path
          d="M110 25 Q115 20 120 25 L125 25"
          stroke={colors.surfaceDark}
          strokeWidth="3"
          fill="none"
          opacity="0.8"
        />
        <Path
          d="M140 25 Q145 20 150 25 L155 25"
          stroke={colors.surfaceDark}
          strokeWidth="3"
          fill="none"
          opacity="0.8"
        />
        <Rect
          x="55"
          y="35"
          width="40"
          height="15"
          rx="3"
          fill={colors.surfaceDark}
          opacity="0.8"
        />
        <Rect
          x="105"
          y="35"
          width="40"
          height="15"
          rx="3"
          fill={colors.surfaceDark}
          opacity="0.8"
        />
        <Circle cx="60" cy="70" r="12" fill={colors.borderDark} />
        <Circle cx="140" cy="70" r="12" fill={colors.borderDark} />
        <Circle cx="60" cy="70" r="6" fill={colors.textTertiary} />
        <Circle cx="140" cy="70" r="6" fill={colors.textTertiary} />
      </Svg>
      <Text style={[styles.colorLabel, size === 'small' && styles.colorLabelSmall]}>
        {color.name}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorLabel: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    fontWeight: '500',
  },
  colorLabelSmall: {
    ...typography.caption,
  },
});

export default CarPreview;