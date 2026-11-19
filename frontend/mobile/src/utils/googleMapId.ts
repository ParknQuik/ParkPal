import { Platform } from 'react-native';

export const getGoogleMapId = (platform = Platform.OS): string | undefined => {
  const id = platform === 'ios'
    ? process.env.EXPO_PUBLIC_GOOGLE_MAP_ID_IOS
    : platform === 'android'
      ? process.env.EXPO_PUBLIC_GOOGLE_MAP_ID_ANDROID
      : undefined;

  return id?.trim() || undefined;
};
