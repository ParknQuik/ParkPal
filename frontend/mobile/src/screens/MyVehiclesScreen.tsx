import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useAppDispatch, useAppSelector } from '../store';
import {
  getVehicles,
  deleteVehicle,
  setDefaultVehicle,
  Vehicle,
} from '../store/slices/vehiclesSlice';
import { EmptyState } from '../components/EmptyState';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { typography, spacing, borderRadius } from '../theme';
import { useTheme } from '../context/ThemeContext';
import type { RootStackParamList } from '../types';

export const MyVehiclesScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList, 'MyVehicles'>>();
  const dispatch = useAppDispatch();
  const { vehicles, loading, error } = useAppSelector((state) => state.vehicles);

  const [refreshing, setRefreshing] = useState(false);
  const { colors } = useTheme();

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      ...typography.h3,
      color: colors.text,
    },
    addButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addButtonText: {
      fontSize: 32,
      color: colors.primary,
      fontWeight: 'bold',
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
    content: {
      flex: 1,
    },
    emptyContainer: {
      padding: spacing.xl,
      alignItems: 'center',
    },
    addFirstButton: {
      marginTop: spacing.xl,
      width: '100%',
    },
    vehiclesList: {
      padding: spacing.lg,
    },
    vehicleCard: {
      marginBottom: spacing.lg,
    },
    vehicleHeader: {
      marginBottom: spacing.md,
    },
    vehicleTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    vehicleName: {
      ...typography.h4,
      color: colors.text,
      flex: 1,
    },
    defaultBadge: {
      backgroundColor: colors.primary + '20',
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.sm,
    },
    defaultBadgeText: {
      ...typography.caption,
      color: colors.primary,
      fontWeight: '600',
    },
    vehicleActions: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    actionButton: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
    },
    actionButtonText: {
      ...typography.body,
      color: colors.primary,
    },
    setDefaultText: {
      ...typography.body,
      color: colors.success,
    },
    deleteText: {
      color: colors.error,
    },
    vehicleDetails: {
      gap: spacing.xs,
    },
    vehicleDetail: {
      ...typography.body,
      color: colors.textSecondary,
    },
  }), [colors]);

  useFocusEffect(
    React.useCallback(() => {
      dispatch(getVehicles());
    }, [dispatch])
  );

  const loadVehicles = async () => {
    await dispatch(getVehicles());
  };

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

  const handleEditVehicle = (vehicle: Vehicle) => {
    navigation.navigate('AddVehicleWizard', { vehicleId: vehicle.id });
  };



  const handleDeleteVehicle = (vehicle: Vehicle) => {
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
  };

  const handleSetDefault = async (vehicle: Vehicle) => {
    try {
      await dispatch(setDefaultVehicle(vehicle.id)).unwrap();
      Alert.alert('Success', 'Default vehicle updated');
    } catch (err: any) {
      const errorMessage = typeof err.message === 'string' ? err.message : 'Failed to set default vehicle';
      Alert.alert('Error', errorMessage);
    }
  };

  if (loading && vehicles.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Vehicles</Text>
        <TouchableOpacity onPress={handleAddVehicle} style={styles.addButton}>
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {vehicles.length === 0 ? (
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
        ) : (
          <View style={styles.vehiclesList}>
            {vehicles.map((vehicle) => (
              <Card key={vehicle.id} style={styles.vehicleCard}>
                <View style={styles.vehicleHeader}>
                  <View style={styles.vehicleTitleRow}>
                    <Text style={styles.vehicleName}>
                      {vehicle.year} {vehicle.make} {vehicle.model}
                    </Text>
                    {vehicle.isDefault && (
                      <View style={styles.defaultBadge}>
                        <Text style={styles.defaultBadgeText}>Default</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.vehicleActions}>
                    <TouchableOpacity
                      onPress={() => handleEditVehicle(vehicle)}
                      style={styles.actionButton}
                    >
                      <Text style={styles.actionButtonText}>Edit</Text>
                    </TouchableOpacity>
                    {!vehicle.isDefault && (
                      <TouchableOpacity
                        onPress={() => handleSetDefault(vehicle)}
                        style={styles.actionButton}
                      >
                        <Text style={styles.setDefaultText}>Set Default</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      onPress={() => handleDeleteVehicle(vehicle)}
                      style={styles.actionButton}
                    >
                      <Text style={[styles.actionButtonText, styles.deleteText]}>
                        Delete
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.vehicleDetails}>
                  <Text style={styles.vehicleDetail}>Color: {vehicle.color}</Text>
                  <Text style={styles.vehicleDetail}>
                    License Plate: {vehicle.licensePlate}
                  </Text>
                </View>
              </Card>
            ))}
          </View>
        )}
       </ScrollView>
     </SafeAreaView>
  );
};


