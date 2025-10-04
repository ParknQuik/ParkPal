import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { AvatarProps } from '../types';
import { colors, typography, borderRadius } from '../theme';
import { getInitials } from '../utils/helpers';

export const Avatar: React.FC<AvatarProps> = ({
  uri,
  name,
  size = 40,
  style,
}) => {
  const containerStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  const textStyle = {
    fontSize: size / 2.5,
  };

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[styles.image, containerStyle, style]}
        resizeMode="cover"
      />
    );
  }

  return (
    <View style={[styles.placeholder, containerStyle, style]}>
      <Text style={[styles.initials, textStyle]}>{getInitials(name)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  image: {
    backgroundColor: colors.border,
  },
  placeholder: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    ...typography.body,
    color: colors.white,
    fontWeight: '600',
  },
});
