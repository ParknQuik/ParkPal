import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { captureRef } from 'react-native-view-shot';
import { useAppDispatch, useAppSelector } from '../store';
import { marketplaceAPI } from '../services/api';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';
import { typography, spacing, borderRadius } from '../theme';
import { useTheme } from '../context/ThemeContext';

export const QRGeneratorScreen: React.FC = () => {
  const [listings, setListings] = useState<any[]>([]);
  const [selectedListing, setSelectedListing] = useState<any>(null);
  const [qrData, setQrData] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const qrRef = useRef<View>(null);
  const navigation = useNavigation();
  const { user } = useAppSelector((state) => state.auth);
  const { colors } = useTheme();

  useEffect(() => {
    loadMyListings();
  }, []);

  const loadMyListings = async () => {
    try {
      setLoading(true);
      const response = await marketplaceAPI.searchListings();
      // Filter to only show user's listings
      const myListings = response.data.listings.filter(
        (listing: any) => listing.ownerId === user?.id
      );
      setListings(myListings);
    } catch (error) {
      ;
      Alert.alert('Error', 'Failed to load your listings');
    } finally {
      setLoading(false);
    }
  };

  const generateQRData = async (listing: any) => {
    try {
      // Fetch the QR code data from the backend with proper HMAC signature
      const response = await marketplaceAPI.getListingById(listing.id);
      if (response.data.qrCodeData) {
        return response.data.qrCodeData;
      }
      // Fallback: generate QR data (backend should always provide this)
      return `PARKNQ:${listing.id}:${Date.now()}:fallback`;
    } catch (error) {
      ;
      // Fallback format
      return `PARKNQ:${listing.id}:${Date.now()}:error`;
    }
  };

  const handleSelectListing = async (listing: any) => {
    setSelectedListing(listing);
    setLoading(true);
    const data = await generateQRData(listing);
    setQrData(data);
    setLoading(false);
  };

  const handleShare = async () => {
    if (!qrRef.current) return;

    try {
      const uri = await captureRef(qrRef, {
        format: 'png',
        quality: 1,
      });

      if (Platform.OS === 'android') {
        // On Android, we need to move the file to a shareable location
        const fileName = `qr-code-${selectedListing.id}.png`;
        const destPath = `${FileSystem.cacheDirectory}${fileName}`;
        await FileSystem.copyAsync({ from: uri, to: destPath });

        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(destPath);
        }
      } else {
        // iOS
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(uri);
        }
      }
    } catch (error) {
      ;
      Alert.alert('Error', 'Failed to share QR code');
    }
  };

  const handleDownload = async () => {
    if (!qrRef.current) return;

    try {
      const uri = await captureRef(qrRef, {
        format: 'png',
        quality: 1,
      });

      const fileName = `parkpal-qr-${selectedListing.id}.png`;
      const destPath = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.copyAsync({ from: uri, to: destPath });

      Alert.alert(
        'Success',
        `QR code saved to ${destPath}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      ;
      Alert.alert('Error', 'Failed to save QR code');
    }
  };

  const styles = React.useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    title: {
      ...typography.h4,
      color: colors.textPrimary,
      fontWeight: '700',
    },
    content: {
      flex: 1,
      padding: spacing.xl,
    },
    subtitle: {
      ...typography.body,
      color: colors.textSecondary,
      marginBottom: spacing.xl,
      textAlign: 'center',
    },
    listingsContainer: {
      marginBottom: spacing.xl,
    },
    listingCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.white,
      padding: spacing.lg,
      borderRadius: borderRadius.lg,
      borderWidth: 2,
      borderColor: colors.border,
      marginBottom: spacing.md,
    },
    selectedCard: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + '10',
    },
    listingInfo: {
      flex: 1,
    },
    listingTitle: {
      ...typography.h6,
      color: colors.textPrimary,
      fontWeight: '600',
      marginBottom: spacing.xs,
    },
    listingAddress: {
      ...typography.small,
      color: colors.textSecondary,
      marginBottom: spacing.xs,
    },
    listingPrice: {
      ...typography.bodySmall,
      color: colors.primary,
      fontWeight: '600',
    },
    checkmark: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: spacing.md,
    },
    qrCard: {
      padding: spacing.xl,
      alignItems: 'center',
    },
    qrTitle: {
      ...typography.h5,
      color: colors.textPrimary,
      fontWeight: '700',
      marginBottom: spacing.xs,
      textAlign: 'center',
    },
    qrSubtitle: {
      ...typography.body,
      color: colors.textSecondary,
      marginBottom: spacing.xl,
      textAlign: 'center',
    },
    qrContainer: {
      backgroundColor: colors.white,
      padding: spacing.xl,
      borderRadius: borderRadius.lg,
      marginBottom: spacing.xl,
    },
    qrWrapper: {
      alignItems: 'center',
    },
    qrLabel: {
      ...typography.h6,
      color: colors.textPrimary,
      fontWeight: '600',
      marginTop: spacing.lg,
    },
    qrInfo: {
      ...typography.small,
      color: colors.textSecondary,
      marginTop: spacing.xs,
    },
    buttonContainer: {
      flexDirection: 'row',
      gap: spacing.md,
      width: '100%',
      marginBottom: spacing.xl,
    },
    button: {
      flex: 1,
    },
    infoBox: {
      backgroundColor: colors.info + '10',
      padding: spacing.lg,
      borderRadius: borderRadius.md,
      borderLeftWidth: 4,
      borderLeftColor: colors.info,
      width: '100%',
    },
    infoTitle: {
      ...typography.bodySmall,
      color: colors.textPrimary,
      fontWeight: '600',
      marginBottom: spacing.sm,
    },
    infoText: {
      ...typography.small,
      color: colors.textSecondary,
      lineHeight: 20,
    },
  }), [colors]);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Generate QR Code</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.subtitle}>
          Select a parking spot to generate a QR code for check-in
        </Text>

        {listings.length === 0 ? (
          <EmptyState
            title="No Listings Found"
            message="Create a parking listing first to generate QR codes"
          />
        ) : (
          <>
            <View style={styles.listingsContainer}>
              {listings.map((listing) => (
                <TouchableOpacity
                  key={listing.id}
                  style={[
                    styles.listingCard,
                    selectedListing?.id === listing.id && styles.selectedCard,
                  ]}
                  onPress={() => handleSelectListing(listing)}
                >
                  <View style={styles.listingInfo}>
                    <Text style={styles.listingTitle} numberOfLines={1}>
                      {listing.description || listing.address}
                    </Text>
                    <Text style={styles.listingAddress} numberOfLines={1}>
                      {listing.address}
                    </Text>
                    <Text style={styles.listingPrice}>₱{listing.price}/hour</Text>
                  </View>
                  {selectedListing?.id === listing.id && (
                    <View style={styles.checkmark}>
                      <MaterialCommunityIcons name="check" size={16} color={colors.primary} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {selectedListing && qrData && (
              <Card style={styles.qrCard}>
                <Text style={styles.qrTitle}>QR Code for Scanning</Text>
                <Text style={styles.qrSubtitle}>{selectedListing.description || selectedListing.address}</Text>

                <View ref={qrRef} style={styles.qrContainer} collapsable={false}>
                  <View style={styles.qrWrapper}>
                    <QRCode value={qrData} size={250} />
                    <Text style={styles.qrLabel}>Scan to Check In</Text>
                    <Text style={styles.qrInfo}>Slot ID: {selectedListing.id}</Text>
                  </View>
                </View>

                <View style={styles.buttonContainer}>
                  <Button
                    title="Share QR Code"
                    variant="gradient"
                    onPress={handleShare}
                    style={styles.button}
                  />
                  <Button
                    title="Download"
                    variant="outline"
                    onPress={handleDownload}
                    style={styles.button}
                  />
                </View>

                <View style={styles.infoBox}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
                    <MaterialCommunityIcons name="lightbulb-outline" size={18} color={colors.warning} />
                    <Text style={[styles.infoTitle, { marginBottom: 0, marginLeft: spacing.xs }]}>How it works:</Text>
                  </View>
                  <Text style={styles.infoText}>
                    1. Print and display this QR code at your parking spot{'\n'}
                    2. Users scan the code when they arrive{'\n'}
                    3. System validates and starts their parking session{'\n'}
                    4. Users scan again when leaving to end session
                  </Text>
                </View>
              </Card>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};
