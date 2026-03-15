import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  Alert,
  Dimensions,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import QRCode from 'react-native-qrcode-svg';
import { useAppDispatch, useAppSelector } from '../store';
import { getMyListings } from '../store/slices/marketplaceSlice';
import { Card } from '../components/Card';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { colors, typography, spacing, borderRadius } from '../theme';
import { formatCurrency } from '../utils/helpers';
import { MarketplaceListing } from '../types';
import { marketplaceAPI } from '../services/api';

const { width } = Dimensions.get('window');

export const MyListingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const { myListings, loading } = useAppSelector((state) => state.marketplace);

  const [activeTab, setActiveTab] = useState<'active' | 'paused'>('active');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedListing, setSelectedListing] = useState<MarketplaceListing | null>(null);
  const [qrCodeData, setQrCodeData] = useState<string>('');
  const [showQRModal, setShowQRModal] = useState(false);

  // Refetch listings when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('MyListingsScreen focused - fetching listings');
      loadListings();
    }, [dispatch])
  );

  const loadListings = async () => {
    console.log('loadListings called');
    const result = await dispatch(getMyListings());
    console.log('getMyListings result:', result);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadListings();
    setRefreshing(false);
  };

  const handleCreateListing = () => {
    navigation.navigate('ListSpot' as never);
  };

  const handleEditListing = (listing: MarketplaceListing) => {
    // Navigate to edit listing screen (ListSpotScreen with edit mode)
    navigation.navigate('ListSpot' as never, { listingId: listing.id, mode: 'edit' } as never);
  };

  const handleDeleteListing = (listing: MarketplaceListing) => {
    Alert.alert(
      'Delete Listing',
      `Are you sure you want to delete "${listing.title || listing.address}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // TODO: Implement delete listing API call
            Alert.alert('Success', 'Listing deleted successfully');
            loadListings();
          },
        },
      ]
    );
  };

  const handleToggleAvailability = async (listing: MarketplaceListing) => {
    Alert.alert(
      listing.availability ? 'Pause Listing' : 'Activate Listing',
      `Do you want to ${listing.availability ? 'pause' : 'activate'} this listing?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              console.log('Toggling listing:', listing.id, 'Current availability:', listing.availability);
              const response = await marketplaceAPI.toggleListingAvailability(listing.id);
              console.log('Toggle response:', response.data);

              Alert.alert(
                'Success',
                `Listing ${listing.availability ? 'paused' : 'activated'} successfully`
              );

              console.log('Reloading listings...');
              await loadListings();
              console.log('Listings reloaded');
            } catch (error) {
              Alert.alert('Error', 'Failed to toggle listing availability');
              console.error('Toggle availability error:', error);
            }
          },
        },
      ]
    );
  };

  const handleGenerateQR = async (listing: MarketplaceListing) => {
    try {
      // Fetch listing details to get qrCodeData
      const response = await marketplaceAPI.getListingById(listing.id);
      const qrData = response.data.qrCodeData;

      if (qrData) {
        setSelectedListing(listing);
        setQrCodeData(qrData);
        setShowQRModal(true);
      } else {
        Alert.alert('Error', 'QR code not available for this listing');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to generate QR code');
      console.error('QR generation error:', error);
    }
  };

  const activeListings = myListings.filter((l) => l.availability);
  const pausedListings = myListings.filter((l) => !l.availability);

  const currentListings = activeTab === 'active' ? activeListings : pausedListings;

  const renderListingCard = (listing: MarketplaceListing) => {
    return (
      <Card key={listing.id} style={styles.listingCard}>
        <View style={styles.cardHeader}>
          {listing.photos && listing.photos.length > 0 ? (
            <Image
              source={{ uri: listing.photos[0] }}
              style={styles.spotImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.spotImage, styles.placeholderImage]}>
              <Text style={styles.placeholderText}>P</Text>
            </View>
          )}
          <View style={styles.cardHeaderInfo}>
            <Text style={styles.spotTitle} numberOfLines={2}>
              {listing.address}
            </Text>
            <Text style={styles.spotPrice}>
              {formatCurrency(listing.pricePerHour)}/hr
            </Text>
            <Badge
              text={listing.availability ? 'Active' : 'Paused'}
              variant={listing.availability ? 'success' : 'default'}
            />
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailsGrid}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Rating</Text>
            <Text style={styles.detailValue}>⭐ {listing.rating.toFixed(1)}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Bookings</Text>
            <Text style={styles.detailValue}>{listing.reviewCount || 0}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleGenerateQR(listing)}
          >
            <Text style={styles.actionIcon}>📱</Text>
            <Text style={styles.actionLabel}>QR Code</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleEditListing(listing)}
          >
            <Text style={styles.actionIcon}>✏️</Text>
            <Text style={styles.actionLabel}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleToggleAvailability(listing)}
          >
            <Text style={styles.actionIcon}>
              {listing.availability ? '⏸️' : '▶️'}
            </Text>
            <Text style={styles.actionLabel}>
              {listing.availability ? 'Pause' : 'Activate'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDeleteListing(listing)}
          >
            <Text style={styles.actionIcon}>🗑️</Text>
            <Text style={styles.actionLabel}>Delete</Text>
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Listings</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleCreateListing}
        >
          <Text style={styles.addButtonText}>+ Add Listing</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'active' && styles.activeTab]}
          onPress={() => setActiveTab('active')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'active' && styles.activeTabText,
            ]}
          >
            Active ({activeListings.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'paused' && styles.activeTab]}
          onPress={() => setActiveTab('paused')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'paused' && styles.activeTabText,
            ]}
          >
            Paused ({pausedListings.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <LoadingSpinner />
        ) : currentListings.length === 0 ? (
          myListings.length === 0 ? (
            <View style={styles.emptyContainer}>
              <EmptyState
                title="No Listings Yet"
                message="Start hosting by creating your first parking spot listing"
              />
              <Button
                title="Create Your First Listing"
                variant="gradient"
                onPress={handleCreateListing}
                style={styles.createButton}
              />
            </View>
          ) : (
            <EmptyState
              title={`No ${activeTab} listings`}
              message={
                activeTab === 'active'
                  ? 'Your active listings will appear here'
                  : 'Your paused listings will appear here'
              }
            />
          )
        ) : (
          currentListings.map(renderListingCard)
        )}
      </ScrollView>

      {/* QR Code Modal */}
      <Modal
        visible={showQRModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowQRModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.qrModalContainer}>
            <View style={styles.qrModalHeader}>
              <Text style={styles.qrModalTitle}>QR Code</Text>
              <TouchableOpacity onPress={() => setShowQRModal(false)}>
                <Text style={styles.qrModalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedListing && (
              <View style={styles.qrModalContent}>
                <Text style={styles.qrModalSubtitle}>
                  {selectedListing.address}
                </Text>

                <View style={styles.qrCodeContainer}>
                  <QRCode value={qrCodeData} size={250} />
                </View>

                <View style={styles.qrInfo}>
                  <Text style={styles.qrInfoTitle}>How to use:</Text>
                  <Text style={styles.qrInfoText}>
                    1. Display this QR code at your parking spot{'\n'}
                    2. Drivers scan to check in when they arrive{'\n'}
                    3. System automatically manages their parking session
                  </Text>
                </View>

                <Button
                  title="Close"
                  variant="outline"
                  onPress={() => setShowQRModal(false)}
                  style={styles.qrModalButton}
                />
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  addButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  addButtonText: {
    ...typography.bodySmall,
    color: colors.white,
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  activeTabText: {
    color: colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.xl,
    flexGrow: 1,
  },
  emptyContainer: {
    paddingVertical: spacing.xxxl,
  },
  createButton: {
    marginTop: spacing.xxl,
  },
  listingCard: {
    marginBottom: spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  spotImage: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.md,
    backgroundColor: colors.border,
  },
  placeholderImage: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
  },
  placeholderText: {
    ...typography.h4,
    color: colors.primary,
    fontWeight: '700',
  },
  cardHeaderInfo: {
    flex: 1,
    marginLeft: spacing.lg,
    justifyContent: 'space-between',
  },
  spotTitle: {
    ...typography.h6,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  spotPrice: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },
  detailsGrid: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    ...typography.small,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  detailValue: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  actionIcon: {
    fontSize: 20,
    marginBottom: spacing.xs,
  },
  actionLabel: {
    ...typography.tiny,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrModalContainer: {
    width: width * 0.9,
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
  },
  qrModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  qrModalTitle: {
    ...typography.h4,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  qrModalClose: {
    fontSize: 28,
    color: colors.textSecondary,
  },
  qrModalContent: {
    alignItems: 'center',
  },
  qrModalSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  qrCodeContainer: {
    padding: spacing.xl,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.xl,
  },
  qrInfo: {
    width: '100%',
    backgroundColor: colors.info + '10',
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.info,
    marginBottom: spacing.xl,
  },
  qrInfoTitle: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  qrInfoText: {
    ...typography.small,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  qrModalButton: {
    width: '100%',
  },
});
