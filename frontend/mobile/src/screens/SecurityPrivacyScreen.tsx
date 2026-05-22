import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAppDispatch, useAppSelector } from '../store';
import { setThemeMode } from '../store/slices/settingsSlice';
import { AppHeader } from '../components/AppHeader';
import { useStatusBarStyle } from '../hooks/useStatusBarStyle';

export const SecurityPrivacyScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const statusBarStyle = useStatusBarStyle();
  const dispatch = useAppDispatch();
  const themeMode = useAppSelector((state) => state.settings.themeMode);

  const themeOptions: Array<{ label: string; value: 'system' | 'light' | 'dark' }> = [
    { label: 'System', value: 'system' },
    { label: 'Light', value: 'light' },
    { label: 'Dark', value: 'dark' },
  ];

  const handleThemeChange = (value: 'system' | 'light' | 'dark') => {
    dispatch(setThemeMode(value));
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const styles = React.useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    safeArea: {
      backgroundColor: colors.appHeaderBackground,
    },
    contentArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      flex: 1,
      padding: 16,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 8,
    },
    text: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    themeSection: {
      marginBottom: 24,
    },
    themeLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 12,
    },
    themeOptions: {
      flexDirection: 'row',
      gap: 8,
    },
    themeOption: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center',
    },
    themeOptionSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + '10',
    },
    themeOptionText: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    themeOptionTextSelected: {
      color: colors.primary,
      fontWeight: '600',
    },
  }), [colors]);

  return (
    <View style={styles.container}>
      <StatusBar style={statusBarStyle} backgroundColor={colors.appHeaderBackground} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <AppHeader title="Security & Privacy" onBack={handleBack} />
      </SafeAreaView>
      <ScrollView style={[styles.contentArea, styles.content]}>
        <View style={styles.themeSection}>
          <Text style={styles.themeLabel}>Appearance</Text>
          <View style={styles.themeOptions}>
            {themeOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.themeOption,
                  themeMode === option.value && styles.themeOptionSelected,
                ]}
                onPress={() => handleThemeChange(option.value)}
              >
                <Text
                  style={[
                    styles.themeOptionText,
                    themeMode === option.value && styles.themeOptionTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Security</Text>
          <Text style={styles.text}>
            Your personal data and payment information are encrypted and stored securely. 
            We use industry-standard security measures to protect your information.
          </Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy Policy</Text>
          <Text style={styles.text}>
            ParkPal collects only necessary information to provide parking services. 
            We do not share your data with third parties without your consent.
          </Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Security</Text>
          <Text style={styles.text}>
            Enable two-factor authentication in your account settings for enhanced security.
            Always use a strong password and never share it with anyone.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};
