import React, { useCallback, useState } from 'react';
import { Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '../store';
import { getMyListings } from '../store/slices/marketplaceSlice';
import { marketplaceAPI } from '../services/api';
import { colors, typography, spacing, borderRadius } from '../theme';
import { haptics } from '../utils/haptics';
import { accessibility } from '../utils/accessibility';

export const MyListingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const [refreshing, setRefreshing] = useState(false);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [qrData, setQrData] = useState<string>('');
  const [qrLoading, setQrLoading] = useState(false);
  const [qrListingName, setQrListingName] = useState<string>('');

  const { myListings, loading, error } = useAppSelector((state) => state.marketplace);

  const activeCount = myListings.filter((l: any) => l.availability).length;

  const fetchData = useCallback(async () => {
    try {
      await dispatch(getMyListings()).unwrap();
    } catch (err) {
      console.error('Failed to fetch listings:', err);
    }
  }, [dispatch]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchData();
    } finally {
      setRefreshing(false);
    }
  }, [fetchData]);

  const handleEditPress = useCallback(async (listingId: number) => {
    await haptics.light();
    navigation.navigate('ListSpot' as never, { listingId, mode: 'edit' } as never);
  }, [navigation]);

  const handleToggleAvailability = useCallback(async (listingId: number, currentStatus: boolean) => {
    try {
      console.log('Toggling listing:', listingId, 'from', currentStatus, 'to', !currentStatus);
      const response = await marketplaceAPI.toggleListingAvailability(listingId, !currentStatus);
      console.log('Toggle response:', response.data);
      fetchData();
    } catch (err: any) {
      console.error('Toggle failed:', err?.response?.data || err);
      Alert.alert('Error', err?.response?.data?.error || 'Failed to toggle availability');
    }
  }, [fetchData]);

  const handleDeleteListing = useCallback(async (listingId: number) => {
    await haptics.light();
    Alert.alert(
      'Delete Listing',
      'Are you sure you want to delete this listing?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await marketplaceAPI.deleteListing(listingId);
              fetchData();
            } catch (err) {
              console.error('Delete failed:', err);
            }
          },
        },
      ]
    );
  }, [fetchData]);

  const handleShowQR = useCallback(async (listing: any) => {
    await haptics.light();
    setQrListingName(listing.title || listing.address);
    setQrLoading(true);
    setQrModalVisible(true);
    try {
      const response = await marketplaceAPI.getListingById(listing.id);
      const data = response.data?.qrCodeData || response.data?.data?.qrCodeData;
      setQrData(data || `PARKNQ:${listing.id}:${Date.now()}`);
    } catch (err) {
      console.error('Failed to fetch QR data:', err);
      setQrData(`PARKNQ:${listing.id}:${Date.now()}`);
    } finally {
      setQrLoading(false);
    }
  }, []);

const handleFilterPress = useCallback(async () => {
    await haptics.light();
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      


      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
      >
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total Listings</Text>
            <Text style={styles.statValue}>{myListings.length}</Text>
            <View style={styles.statFooter}>
              <MaterialIcons name="trending-up" size={16} color={colors.primary} />
              <Text style={styles.trendText}>{activeCount} active</Text>
            </View>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Active Listings</Text>
            <Text style={styles.statValue}>{activeCount}</Text>
            <View style={styles.statFooter}>
              <MaterialIcons name="visibility" size={16} color={colors.secondary} />
              <Text style={styles.viewsText}>{myListings.length} total</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Parking Spots</Text>
            <TouchableOpacity
              style={styles.filterButton}
              onPress={handleFilterPress}
              {...accessibility.button('Filter', 'Filter listings')}
            >
              <Text style={styles.filterText}>Filter</Text>
              <MaterialIcons name="filter-list" size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {loading && !refreshing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Loading listings...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>Failed to load listings</Text>
              <TouchableOpacity style={styles.retryButton} onPress={fetchData}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
          <FlatList
            data={myListings}
            keyExtractor={(item) => String(item.id)}
            scrollEnabled={false}
            nestedScrollEnabled={true}
            renderItem={({ item: listing }) => {
              const isActive = listing.availability;
              return (
                <View style={styles.listingCard}>
                  <Image source={{ uri: listing.photos?.[0] || 'https://via.placeholder.com/180' }} style={styles.listingImage} contentFit="cover" transition={200} />
                  <View style={styles.listingContent}>
                    <View style={styles.listingHeader}>
                      <View style={{ flex: 1 }}>
                        <View style={[
                          styles.statusBadge,
                          isActive ? styles.activeBadge : styles.inactiveBadge
                        ]}>
                          <Text style={[
                            styles.statusText,
                            isActive ? styles.activeStatusText : styles.inactiveStatusText
                          ]}>
                            {isActive ? 'Active' : 'Inactive'}
                          </Text>
                        </View>
                        <Text style={styles.listingName} numberOfLines={1}>{listing.title || listing.address}</Text>
                      </View>
                      <View>
                        <Text style={[
                          styles.listingPrice,
                          !isActive && styles.inactivePrice
                        ]}>
                          ₱{listing.pricePerHour}
                          <Text style={styles.priceUnit}>/hr</Text>
                        </Text>
                      </View>
                    </View>
                    <View style={styles.listingLocation}>
                      <MaterialIcons name="location-on" size={16} color={colors.textSecondary} />
                      <Text style={styles.locationText} numberOfLines={1}>{listing.address}</Text>
                    </View>
                    <View style={styles.listingActions}>
                      <TouchableOpacity
                        style={[
                          styles.actionButton,
                          isActive ? styles.editButton : styles.activateButton
                        ]}
                        onPress={() => isActive ? handleEditPress(listing.id) : handleToggleAvailability(listing.id, listing.availability)}
                        {...accessibility.button(
                          isActive ? 'Edit Listing' : 'Activate Listing',
                          `${isActive ? 'Edit' : 'Activate'} ${listing.title || listing.address}`
                        )}
                      >
                        <Text style={[
                          styles.actionButtonText,
                          isActive ? styles.editButtonText : styles.activateButtonText
                        ]}>
                          {isActive ? 'Edit Listing' : 'Activate'}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.moreButton}
                        onPress={() => {
                          if (isActive) {
                            Alert.alert('Listing Options', listing.title || listing.address, [
                              { text: 'Show QR Code', onPress: () => handleShowQR(listing) },
                              { text: 'Toggle Availability', onPress: () => handleToggleAvailability(listing.id, listing.availability) },
                              { text: 'Delete', style: 'destructive', onPress: () => handleDeleteListing(listing.id) },
                              { text: 'Cancel', style: 'cancel' },
                            ]);
                          } else {
                            handleDeleteListing(listing.id);
                          }
                        }}
                      >
                        <MaterialIcons name="more-horiz" size={20} color={colors.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            }}
            contentContainerStyle={styles.listingsList}
            ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <MaterialIcons name="add-location" size={48} color={colors.textSecondary} />
                <Text style={styles.emptyText}>No listings yet</Text>
                <TouchableOpacity
                  style={styles.addListingButton}
                  onPress={() => navigation.navigate('ListSpot' as never)}
                >
                  <Text style={styles.addListingText}>Create Your First Listing</Text>
                </TouchableOpacity>
              </View>
            }
          />
          )}
        </View>
      </ScrollView>
      {/* QR Code Modal */}
      <Modal
        visible={qrModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setQrModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setQrModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>QR Code</Text>
            <Text style={styles.modalSubtitle}>{qrListingName}</Text>
            <Text style={styles.modalInstructions}>
              Show this QR code to the renter so they can check in when they arrive at the spot.
            </Text>
            {qrLoading ? (
              <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 40 }} />
            ) : qrData ? (
              <View style={styles.qrContainer}>
                <QRCode
                  value={qrData}
                  size={220}
                  backgroundColor="white"
                />
              </View>
            ) : (
              <Text style={styles.modalErrorText}>Failed to generate QR code</Text>
            )}
            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => setQrModalVisible(false)}
            >
              <Text style={styles.closeModalText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
      {/* FAB for creating new listing */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('ListSpot' as never)}
      >
        <MaterialIcons name="add" size={28} color={colors.white} />
      </TouchableOpacity>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    backgroundColor: colors.background,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  newListingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.xl,
  },
  addIcon: {
    fontFamily: 'MaterialSymbolsOutlined',
    fontSize: 20,
    color: colors.white,
  },
  newListingText: {
    ...typography.bodySmall,
    color: colors.white,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 100,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(16, 183, 127, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(16, 183, 127, 0.2)',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
  },
  statLabel: {
    ...typography.tiny,
    color: colors.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  statValue: {
    ...typography.h3,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  statFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  trendText: {
    ...typography.tiny,
    color: colors.primary,
    fontWeight: '600',
  },
  viewsText: {
    ...typography.tiny,
    color: colors.secondary,
    fontWeight: '600',
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.h5,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  filterText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
  },
  listingsList: {
    gap: spacing.md,
  },
  listingCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  listingImage: {
    width: '100%',
    height: 180,
  },
  listingContent: {
    padding: spacing.md,
  },
  listingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs - 2,
    borderRadius: borderRadius.full,
  },
  activeBadge: {
    backgroundColor: 'rgba(16, 183, 127, 0.1)',
  },
  inactiveBadge: {
    backgroundColor: '#f1f5f9',
  },
  statusText: {
    ...typography.tiny,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  activeStatusText: {
    color: colors.primary,
  },
  inactiveStatusText: {
    color: colors.textSecondary,
  },
  listingName: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  listingPrice: {
    ...typography.h5,
    color: colors.primary,
    fontWeight: '700',
    textAlign: 'right',
  },
  inactivePrice: {
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  priceUnit: {
    ...typography.small,
    color: colors.textSecondary,
    fontWeight: '400',
  },
  listingLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  locationText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    flex: 1,
  },
  listingActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    minHeight: 44,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButton: {
    backgroundColor: colors.primary,
  },
  activateButton: {
    backgroundColor: '#e2e8f0',
  },
  actionButtonText: {
    ...typography.bodySmall,
    fontWeight: '600',
  },
  editButtonText: {
    color: colors.white,
  },
  activateButtonText: {
    color: colors.textPrimary,
  },
  moreButton: {
    minWidth: 44,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrButton: {
    minWidth: 44,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  modalInstructions: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  qrContainer: {
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    marginVertical: 8,
  },
  modalErrorText: {
    color: colors.error,
    marginVertical: 40,
    fontSize: 14,
  },
  closeModalButton: {
    marginTop: 16,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  closeModalText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl * 2,
  },
  loadingText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl * 2,
  },
  errorText: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  retryButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
  },
  retryText: {
    ...typography.bodySmall,
    color: colors.white,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl * 2,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  addListingButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm + 2,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
  },
  addListingText: {
    ...typography.bodySmall,
    color: colors.white,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
