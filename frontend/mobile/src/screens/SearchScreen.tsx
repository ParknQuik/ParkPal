import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import api from '../services/api';
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
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState('');
  const [location, setLocation] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchApiKey = async () => {
      try {
        const response = await api.get('/config/maps-api-key');
        setGoogleMapsApiKey(response.data.apiKey);
      } catch (error) {
        console.error('Failed to fetch Google Maps API key:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchApiKey();
  }, []);

  const handleSearch = () => {
    if (!latitude || !longitude) {
      alert('Please select a valid location from the suggestions');
      return;
    }

    // Navigate to map with search parameters
    navigation.navigate('Map' as never, {
      location,
      latitude,
      longitude,
    } as never);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

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

            <GooglePlacesAutocomplete
              placeholder="Enter address or location"
              onPress={(data, details = null) => {
                setLocation(data.description);
                if (details?.geometry?.location) {
                  setLatitude(details.geometry.location.lat);
                  setLongitude(details.geometry.location.lng);
                }
              }}
              query={{
                key: googleMapsApiKey,
                language: 'en',
                components: 'country:ph',
              }}
              fetchDetails={true}
              enablePoweredByContainer={false}
              styles={{
                container: {
                  flex: 0,
                  marginBottom: spacing.lg,
                },
                textInputContainer: {
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: borderRadius.md,
                  paddingHorizontal: spacing.sm,
                },
                textInput: {
                  ...typography.body,
                  color: colors.textPrimary,
                  backgroundColor: 'transparent',
                  height: 48,
                },
                listView: {
                  backgroundColor: colors.white,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: borderRadius.md,
                  marginTop: spacing.xs,
                },
                row: {
                  padding: spacing.md,
                },
                description: {
                  ...typography.body,
                  color: colors.textPrimary,
                },
              }}
            />

            {location && latitude && (
              <Text style={styles.selectedLocation}>
                ✓ Selected: {location}
              </Text>
            )}

            <TouchableOpacity
              style={[
                styles.searchButton,
                (!latitude || !longitude) && styles.searchButtonDisabled,
              ]}
              onPress={handleSearch}
              disabled={!latitude || !longitude}
            >
              <Text style={styles.searchButtonText}>🔍 Search Parking</Text>
            </TouchableOpacity>

            {location && !latitude && (
              <Text style={styles.helperText}>
                Please select a location from the dropdown suggestions
              </Text>
            )}
          </Card>

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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
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
  selectedLocation: {
    ...typography.bodySmall,
    color: colors.success,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  helperText: {
    ...typography.small,
    color: colors.textTertiary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  section: {
    marginBottom: spacing.xl,
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
