import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { colors, typography, spacing, borderRadius } from '../theme';
import { Card } from '../components/Card';

const popularLocations = [
  'Manila',
  'Quezon City',
  'Makati',
  'Taguig',
  'Pasay',
  'Mandaluyong',
  'Pasig',
  'San Juan',
  'BGC',
  'Ortigas',
  'Alabang',
  'San Jose del Monte, Bulacan',
];

export const SearchScreen: React.FC = () => {
  const navigation = useNavigation();
  const [location, setLocation] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');

  const handleSearch = () => {
    if (!location) return;

    // Navigate to map with search parameters
    navigation.navigate('Map' as never, {
      location,
      checkIn,
      checkOut,
    } as never);
  };

  const handleQuickLocation = (loc: string) => {
    setLocation(loc);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <LinearGradient
          colors={colors.gradientPrimary}
          style={styles.hero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.heroTitle}>Find Parking Near You</Text>
          <Text style={styles.heroSubtitle}>
            Book parking spaces in advance. Save time, save money.
          </Text>
        </LinearGradient>

        <View style={styles.content}>
          {/* Search Card */}
          <Card style={styles.searchCard}>
            <Text style={styles.sectionTitle}>Where do you need parking?</Text>

            <View style={styles.inputContainer}>
              <Text style={styles.inputIcon}>📍</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter city or area"
                value={location}
                onChangeText={setLocation}
                placeholderTextColor={colors.textTertiary}
              />
            </View>

            <Text style={styles.label}>Check-in (Optional)</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.inputIcon}>📅</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 2024-01-15 09:00"
                value={checkIn}
                onChangeText={setCheckIn}
                placeholderTextColor={colors.textTertiary}
              />
            </View>

            <Text style={styles.label}>Check-out (Optional)</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.inputIcon}>📅</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 2024-01-15 17:00"
                value={checkOut}
                onChangeText={setCheckOut}
                placeholderTextColor={colors.textTertiary}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.searchButton,
                !location && styles.searchButtonDisabled,
              ]}
              onPress={handleSearch}
              disabled={!location}
            >
              <Text style={styles.searchButtonText}>🔍 Search Parking</Text>
            </TouchableOpacity>
          </Card>

          {/* Popular Locations */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Popular Locations</Text>
            <View style={styles.chipsContainer}>
              {popularLocations.map((loc) => (
                <TouchableOpacity
                  key={loc}
                  style={[
                    styles.chip,
                    location === loc && styles.chipActive,
                  ]}
                  onPress={() => handleQuickLocation(loc)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      location === loc && styles.chipTextActive,
                    ]}
                  >
                    {loc}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* How It Works */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>How It Works</Text>

            <Card style={styles.stepCard}>
              <Text style={styles.stepIcon}>🔍</Text>
              <Text style={styles.stepTitle}>1. Search</Text>
              <Text style={styles.stepDescription}>
                Enter your location and desired parking time
              </Text>
            </Card>

            <Card style={styles.stepCard}>
              <Text style={styles.stepIcon}>📍</Text>
              <Text style={styles.stepTitle}>2. Choose</Text>
              <Text style={styles.stepDescription}>
                Browse available parking spots on the map
              </Text>
            </Card>

            <Card style={styles.stepCard}>
              <Text style={styles.stepIcon}>📅</Text>
              <Text style={styles.stepTitle}>3. Book</Text>
              <Text style={styles.stepDescription}>
                Reserve your spot and park with confidence
              </Text>
            </Card>
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
  hero: {
    padding: spacing.xxxl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxxl,
  },
  heroTitle: {
    ...typography.h2,
    color: colors.white,
    fontWeight: '700',
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  heroSubtitle: {
    ...typography.body,
    color: colors.white,
    opacity: 0.9,
    textAlign: 'center',
  },
  content: {
    padding: spacing.xl,
    marginTop: -spacing.xl,
  },
  searchCard: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.h5,
    color: colors.textPrimary,
    fontWeight: '700',
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  inputIcon: {
    fontSize: 20,
    marginRight: spacing.md,
  },
  input: {
    ...typography.body,
    flex: 1,
    color: colors.textPrimary,
    paddingVertical: spacing.lg,
  },
  searchButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  searchButtonDisabled: {
    opacity: 0.5,
  },
  searchButtonText: {
    ...typography.body,
    color: colors.white,
    fontWeight: '700',
    fontSize: 16,
  },
  section: {
    marginBottom: spacing.xl,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  chipTextActive: {
    color: colors.white,
  },
  stepCard: {
    alignItems: 'center',
    padding: spacing.xl,
    marginBottom: spacing.md,
  },
  stepIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  stepTitle: {
    ...typography.h6,
    color: colors.textPrimary,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  stepDescription: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
