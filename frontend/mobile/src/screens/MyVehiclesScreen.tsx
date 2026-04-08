import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../store';
import {
  getVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  setDefaultVehicle,
  Vehicle,
} from '../store/slices/vehiclesSlice';
import { EmptyState } from '../components/EmptyState';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { colors, typography, spacing, borderRadius } from '../theme';

export const MyVehiclesScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const { vehicles, loading, error } = useAppSelector((state) => state.vehicles);

  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [color, setColor] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [isDefault, setIsDefault] = useState(false);

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

  const resetForm = () => {
    setMake('');
    setModel('');
    setYear('');
    setColor('');
    setLicensePlate('');
    setIsDefault(false);
    setEditingVehicle(null);
  };

  const handleAddVehicle = () => {
    resetForm();
    setShowModal(true);
  };

  const handleEditVehicle = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setMake(vehicle.make);
    setModel(vehicle.model);
    setYear(vehicle.year.toString());
    setColor(vehicle.color);
    setLicensePlate(vehicle.licensePlate);
    setIsDefault(vehicle.isDefault);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    resetForm();
  };

  const validateForm = (): boolean => {
    if (!make.trim()) {
      Alert.alert('Validation Error', 'Make is required');
      return false;
    }
    if (!model.trim()) {
      Alert.alert('Validation Error', 'Model is required');
      return false;
    }
    if (!year.trim()) {
      Alert.alert('Validation Error', 'Year is required');
      return false;
    }
    const yearNum = parseInt(year);
    if (isNaN(yearNum) || yearNum < 1900 || yearNum > new Date().getFullYear() + 1) {
      Alert.alert('Validation Error', 'Please enter a valid year');
      return false;
    }
    if (!color.trim()) {
      Alert.alert('Validation Error', 'Color is required');
      return false;
    }
    if (!licensePlate.trim()) {
      Alert.alert('Validation Error', 'License plate is required');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const vehicleData = {
        make: make.trim(),
        model: model.trim(),
        year: parseInt(year),
        color: color.trim(),
        licensePlate: licensePlate.trim().toUpperCase(),
        isDefault,
      };

      if (editingVehicle) {
        await dispatch(updateVehicle({ id: editingVehicle.id, data: vehicleData })).unwrap();
        Alert.alert('Success', 'Vehicle updated successfully');
      } else {
        await dispatch(createVehicle(vehicleData)).unwrap();
        Alert.alert('Success', 'Vehicle added successfully');
      }

      handleCloseModal();
      loadVehicles();
    } catch (err: any) {
      const errorMessage = typeof err.message === 'string' ? err.message : 'Failed to save vehicle';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
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
          <Text style={styles.backButtonText}>←</Text>
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
              icon="🚗"
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

      {/* Add/Edit Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <SafeAreaView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={handleCloseModal}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {editingVehicle ? 'Edit Vehicle' : 'Add Vehicle'}
              </Text>
              <View style={{ width: 60 }} />
            </View>

            <ScrollView style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Make *</Text>
                <TextInput
                  style={styles.input}
                  value={make}
                  onChangeText={setMake}
                  placeholder="e.g., Toyota"
                  placeholderTextColor={colors.textSecondary}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Model *</Text>
                <TextInput
                  style={styles.input}
                  value={model}
                  onChangeText={setModel}
                  placeholder="e.g., Vios"
                  placeholderTextColor={colors.textSecondary}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Year *</Text>
                <TextInput
                  style={styles.input}
                  value={year}
                  onChangeText={setYear}
                  placeholder="e.g., 2023"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="number-pad"
                  maxLength={4}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Color *</Text>
                <TextInput
                  style={styles.input}
                  value={color}
                  onChangeText={setColor}
                  placeholder="e.g., Silver"
                  placeholderTextColor={colors.textSecondary}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>License Plate *</Text>
                <TextInput
                  style={styles.input}
                  value={licensePlate}
                  onChangeText={setLicensePlate}
                  placeholder="e.g., ABC-1234"
                  placeholderTextColor={colors.textSecondary}
                  autoCapitalize="characters"
                  maxLength={10}
                />
              </View>

              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => setIsDefault(!isDefault)}
              >
                <View style={[styles.checkbox, isDefault && styles.checkboxChecked]}>
                  {isDefault && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.checkboxLabel}>Set as default vehicle</Text>
              </TouchableOpacity>

              <Button
                title={isSubmitting ? 'Saving...' : editingVehicle ? 'Update Vehicle' : 'Add Vehicle'}
                onPress={handleSubmit}
                variant="primary"
                disabled={isSubmitting}
                style={styles.submitButton}
              />
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
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
  backButtonText: {
    fontSize: 24,
    color: colors.text,
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
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalContent: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cancelText: {
    ...typography.body,
    color: colors.primary,
  },
  modalTitle: {
    ...typography.h4,
    color: colors.text,
  },
  form: {
    flex: 1,
    padding: spacing.lg,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...typography.body,
    color: colors.text,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    marginRight: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkmark: {
    color: colors.white,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    ...typography.body,
    color: colors.text,
  },
  submitButton: {
    marginBottom: spacing.xl,
  },
});
