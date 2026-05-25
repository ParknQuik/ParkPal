import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '../store';
import {
  getVehicles,
  deleteVehicle,
  setDefaultVehicle,
  Vehicle,
} from '../store/slices/vehiclesSlice';
import { EmptyState } from '../components/EmptyState';
import { Button } from '../components/Button';
import { typography, spacing, borderRadius } from '../theme';
import { useTheme } from '../context/ThemeContext';
import type { RootStackParamList } from '../types';
import { AppHeader } from '../components/AppHeader';
import { useStatusBarStyle } from '../hooks/useStatusBarStyle';
import { ListLoadingState, RetryableFailureState } from '../components/ListState';

type VehicleCardProps = {
  vehicle: Vehicle;
  styles: ReturnType<typeof createStyles>;
  onEdit: (vehicle: Vehicle) => void;
  onSetDefault: (vehicle: Vehicle) => void;
  onDelete: (vehicle: Vehicle) => void;
};

const VehicleCard = React.memo(({
  vehicle,
  styles,
  onEdit,
  onSetDefault,
  onDelete,
}: VehicleCardProps) => {
  const title = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
  const swatchColor = getVehicleSwatchColor(vehicle.color);

  return (
    <View style={styles.vehicleCard}>
      <View style={styles.vehicleTopRow}>
        <View style={styles.vehicleVisual}>
          <MaterialCommunityIcons name="car-side" size={48} color={styles.vehicleIcon.color} />
        </View>

        <View style={styles.vehicleSummary}>
          <View style={styles.vehicleTitleRow}>
            <Text style={styles.vehicleName} numberOfLines={2}>
              {title}
            </Text>
            {vehicle.isDefault && (
              <View style={styles.defaultPill}>
                <MaterialCommunityIcons name="check-circle" size={14} color={styles.defaultPillText.color} />
                <Text style={styles.defaultPillText}>Default</Text>
              </View>
            )}
          </View>

          <View style={styles.plateChip}>
            <MaterialCommunityIcons name="card-text-outline" size={14} color={styles.plateText.color} />
            <Text style={styles.plateText} numberOfLines={1}>
              {vehicle.licensePlate}
            </Text>
          </View>

          <View style={styles.colorRow}>
            <View style={[styles.colorSwatch, { backgroundColor: swatchColor }]} />
            <Text style={styles.vehicleMeta} numberOfLines={1}>
              {vehicle.color}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.actionDivider} />

      <View style={styles.vehicleActions}>
        <TouchableOpacity
          onPress={() => onEdit(vehicle)}
          style={styles.secondaryActionButton}
          accessibilityRole="button"
          accessibilityLabel={`Edit ${title}`}
        >
          <MaterialCommunityIcons name="pencil-outline" size={18} color={styles.actionButtonText.color} />
          <Text style={styles.actionButtonText}>Edit</Text>
        </TouchableOpacity>

        {!vehicle.isDefault && (
          <TouchableOpacity
            onPress={() => onSetDefault(vehicle)}
            style={styles.secondaryActionButton}
            accessibilityRole="button"
            accessibilityLabel={`Set ${title} as default`}
          >
            <MaterialCommunityIcons name="check-circle-outline" size={18} color={styles.actionButtonText.color} />
            <Text style={styles.actionButtonText}>Set Default</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={() => onDelete(vehicle)}
          style={styles.deleteActionButton}
          accessibilityRole="button"
          accessibilityLabel={`Delete ${title}`}
        >
          <MaterialCommunityIcons name="trash-can-outline" size={18} color={styles.deleteActionText.color} />
          <Text style={styles.deleteActionText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

const getVehicleSwatchColor = (color: string) => {
  const normalized = color.trim().toLowerCase();
  const colorMap: Record<string, string> = {
    black: '#111827',
    white: '#f8fafc',
    silver: '#cbd5e1',
    gray: '#64748b',
    grey: '#64748b',
    red: '#dc2626',
    blue: '#2563eb',
    green: '#16a34a',
    yellow: '#ca8a04',
    orange: '#ea580c',
    brown: '#92400e',
    purple: '#7c3aed',
  };

  return colorMap[normalized] || '#94a3b8';
};

export const MyVehiclesScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList, 'MyVehicles'>>();
  const dispatch = useAppDispatch();
  const { vehicles, loading, error } = useAppSelector((state) => state.vehicles);

  const [refreshing, setRefreshing] = useState(false);
  const { colors } = useTheme();
  const statusBarStyle = useStatusBarStyle();
  const showInitialLoading = loading && !refreshing && vehicles.length === 0;
  const showInitialFailure = Boolean(error) && vehicles.length === 0;

  const styles = useMemo(() => createStyles(colors), [colors]);

  useFocusEffect(
    React.useCallback(() => {
      dispatch(getVehicles());
    }, [dispatch])
  );

  const loadVehicles = React.useCallback(async () => {
    await dispatch(getVehicles());
  }, [dispatch]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadVehicles();
    setRefreshing(false);
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const handleAddVehicle = () => {
    navigation.navigate('AddVehicleWizard', {});
  };

  const handleEditVehicle = React.useCallback((vehicle: Vehicle) => {
    navigation.navigate('AddVehicleWizard', { vehicleId: vehicle.id });
  }, [navigation]);

  const handleDeleteVehicle = React.useCallback((vehicle: Vehicle) => {
    Alert.alert(
      'Delete Vehicle',
      `Are you sure you want to delete ${vehicle.year} ${vehicle.make} ${vehicle.model}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(deleteVehicle(vehicle.id)).unwrap();
              Alert.alert('Success', 'Vehicle deleted successfully');
            } catch (err: any) {
              const errorMessage = typeof err.message === 'string' ? err.message : 'Failed to delete vehicle';
              Alert.alert('Error', errorMessage);
            }
          },
        },
      ]
    );
  }, [dispatch]);

  const handleSetDefault = React.useCallback(async (vehicle: Vehicle) => {
    try {
      await dispatch(setDefaultVehicle(vehicle.id)).unwrap();
      Alert.alert('Success', 'Default vehicle updated');
    } catch (err: any) {
      const errorMessage = typeof err.message === 'string' ? err.message : 'Failed to set default vehicle';
      Alert.alert('Error', errorMessage);
    }
  }, [dispatch]);

  const renderVehicle = React.useCallback(({ item }: { item: Vehicle }) => (
    <VehicleCard
      vehicle={item}
      styles={styles}
      onEdit={handleEditVehicle}
      onSetDefault={handleSetDefault}
      onDelete={handleDeleteVehicle}
    />
  ), [handleDeleteVehicle, handleEditVehicle, handleSetDefault, styles]);

  const keyExtractor = React.useCallback((item: Vehicle) => item.id.toString(), []);

  const renderEmptyState = () => {
    if (showInitialLoading) {
      return (
        <View style={styles.stateContent}>
          <ListLoadingState
            variant="vehicle"
            accessibilityLabel="Loading vehicles"
            testID="my-vehicles-loading-skeleton"
          />
        </View>
      );
    }

    if (showInitialFailure) {
      return (
        <View style={styles.stateContent}>
          <RetryableFailureState
            title="Unable to load vehicles"
            message={error || 'Something went wrong while loading your vehicles. Please try again.'}
            retryLabel="Retry loading vehicles"
            onRetry={loadVehicles}
            testID="my-vehicles-failure"
          />
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <EmptyState
          icon="car-outline"
          title="No vehicles yet"
          message="Add your vehicle information to make booking parking spots easier."
        />
        <Button
          title="Add Your First Vehicle"
          onPress={handleAddVehicle}
          variant="primary"
          style={styles.addFirstButton}
        />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style={statusBarStyle} backgroundColor={colors.appHeaderBackground} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <AppHeader
          title="My Vehicles"
          onBack={handleBack}
          rightAction={
            <TouchableOpacity
              onPress={handleAddVehicle}
              style={styles.addButton}
              accessibilityRole="button"
              accessibilityLabel="Add vehicle"
            >
              <MaterialCommunityIcons name="plus" size={26} color={colors.primary} />
            </TouchableOpacity>
          }
        />
      </SafeAreaView>

      {error && vehicles.length > 0 && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <FlatList
        style={styles.contentArea}
        contentContainerStyle={[
          styles.listContent,
          vehicles.length === 0 && styles.emptyListContent,
        ]}
        data={showInitialLoading || showInitialFailure ? [] : vehicles}
        renderItem={renderVehicle}
        keyExtractor={keyExtractor}
        ListEmptyComponent={renderEmptyState}
        refreshing={refreshing}
        onRefresh={onRefresh}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
  },
  safeArea: {
    backgroundColor: colors.appHeaderBackground,
  },
  contentArea: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
  },
  addButton: {
    minWidth: 44,
    minHeight: 44,
    borderRadius: 22,
    backgroundColor: colors.headerActionBackground,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.headerActionShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  errorBanner: {
    backgroundColor: colors.error + '20',
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderRadius: borderRadius.md,
  },
  errorText: {
    color: colors.error,
    ...typography.body,
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  addFirstButton: {
    marginTop: spacing.xl,
    width: '100%',
  },
  listContent: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  stateContent: {
    flex: 1,
    justifyContent: 'center',
  },
  vehicleCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
  },
  vehicleTopRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  vehicleVisual: {
    width: 92,
    minHeight: 108,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surfaceSecondary,
    borderColor: colors.border,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleIcon: {
    color: colors.primary,
  },
  vehicleSummary: {
    flex: 1,
    minWidth: 0,
    gap: spacing.sm,
  },
  vehicleTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  vehicleName: {
    ...typography.h4,
    color: colors.textPrimary,
    flex: 1,
  },
  defaultPill: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  defaultPillText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  plateChip: {
    minHeight: 34,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surfaceSecondary,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: borderRadius.sm,
  },
  plateText: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '700',
    letterSpacing: 0,
    textTransform: 'uppercase',
    maxWidth: 160,
  },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  colorSwatch: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.primary,
    borderColor: colors.border,
    borderWidth: 1,
  },
  vehicleMeta: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    flexShrink: 1,
  },
  actionDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  vehicleActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  secondaryActionButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceSecondary,
    borderColor: colors.border,
    borderWidth: 1,
    flexGrow: 1,
  },
  actionButtonText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
  },
  deleteActionButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    borderColor: colors.error,
    borderWidth: 1,
    flexGrow: 1,
  },
  deleteActionText: {
    ...typography.bodySmall,
    color: colors.error,
    fontWeight: '600',
  },
});
