import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
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
  const [listViewDisplayed, setListViewDisplayed] = useState(false);
  const [searchText, setSearchText] = useState('');
  const autocompleteRef = useRef<any>(null);

  const handleClearSearch = () => {
    setLocation('');
    setLatitude(null);
    setLongitude(null);
    setSearchText('');
    setListViewDisplayed(false);
    if (autocompleteRef.current) {
      autocompleteRef.current.setAddressText('');
    }
  };

  useEffect(() => {
    const fetchApiKey = async (retryCount = 0) => {
      try {
        const response = await api.get('/config/maps-api-key');
        setGoogleMapsApiKey(response.data.apiKey);
      } catch (error) {
        // Retry silently up to 2 times
        if (retryCount < 2) {
          console.log(`Retrying Google Maps API key fetch (${retryCount + 1}/2)...`);
          setTimeout(() => fetchApiKey(retryCount + 1), 2000);
          return;
        }
        console.error('Failed to fetch Google Maps API key after retries:', error);
      } finally {
        if (retryCount === 0 || retryCount >= 2) {
          setLoading(false);
        }
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

  const sections = [
    { type: 'hero' },
    { type: 'search' },
    { type: 'step', icon: '🔍', title: '1. Search', description: 'Enter your location and desired parking time' },
    { type: 'step', icon: '📍', title: '2. Choose', description: 'Browse available parking spots on the map' },
    { type: 'step', icon: '📅', title: '3. Book', description: 'Reserve your spot and park with confidence' },
  ];

  const renderItem = ({ item }: any) => {
    if (item.type === 'hero') {
      return (
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
      );
    }

    if (item.type === 'search') {
      return (
        <View style={styles.content}>
          <Card style={styles.searchCard}>
            <Text style={styles.sectionTitle}>Where do you need parking?</Text>

            <View style={styles.searchInputContainer}>
              <GooglePlacesAutocomplete
                ref={autocompleteRef}
                placeholder="Enter address or location"
                onPress={(data, details = null) => {
                  setLocation(data.description);
                  setSearchText(data.description);
                  if (details?.geometry?.location) {
                    setLatitude(details.geometry.location.lat);
                    setLongitude(details.geometry.location.lng);
                  }
                  setListViewDisplayed(false);
                }}
                query={{
                  key: googleMapsApiKey,
                  language: 'en',
                  components: 'country:ph',
                }}
                fetchDetails={true}
                enablePoweredByContainer={false}
                keyboardShouldPersistTaps="handled"
                listViewDisplayed={listViewDisplayed}
                onFocus={() => setListViewDisplayed(true)}
                onBlur={() => setListViewDisplayed(false)}
                textInputProps={{
                  onChangeText: (text) => {
                    setSearchText(text);
                    if (text.length > 0) {
                      setListViewDisplayed(true);
                    } else {
                      setListViewDisplayed(false);
                    }
                  },
                }}
                styles={{
                container: {
                  flex: 0,
                  marginBottom: spacing.lg,
                  zIndex: 1,
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
                  position: 'absolute',
                  top: 60,
                  left: 0,
                  right: 0,
                  maxHeight: 200,
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
              {searchText.length > 0 && (
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={handleClearSearch}
                >
                  <Text style={styles.clearButtonText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

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
        </View>
      );
    }

    if (item.type === 'step') {
      return (
        <View style={styles.content}>
          <Card style={styles.stepCard}>
            <Text style={styles.stepIcon}>{item.icon}</Text>
            <Text style={styles.stepTitle}>{item.title}</Text>
            <Text style={styles.stepDescription}>{item.description}</Text>
          </Card>
        </View>
      );
    }

    return null;
  };

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={sections}
        renderItem={renderItem}
        keyExtractor={(item, index) => `${item.type}-${index}`}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          sections[0].type === 'step' ? (
            <Text style={[styles.sectionTitle, { paddingHorizontal: spacing.xl, marginTop: spacing.lg }]}>
              How It Works
            </Text>
          ) : null
        }
      />
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
  searchInputContainer: {
    position: 'relative',
  },
  clearButton: {
    position: 'absolute',
    right: 12,
    top: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  clearButtonText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '600',
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
