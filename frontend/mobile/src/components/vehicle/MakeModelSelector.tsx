import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  SafeAreaView,
  TextInput,
} from 'react-native';
import { colors, typography, spacing, borderRadius } from '../../theme';

export interface CarMake {
  id: string;
  name: string;
  models: string[];
}

const DEFAULT_MAKES: CarMake[] = [
  { id: 'toyota', name: 'Toyota', models: ['Vios', 'Camry', 'Corolla', 'RAV4', 'Fortuner', 'Innova', 'Hilux'] },
  { id: 'honda', name: 'Honda', models: ['City', 'Civic', 'Accord', 'CR-V', 'BR-V', 'HR-V', 'Jazz'] },
  { id: 'ford', name: 'Ford', models: ['Ranger', 'Everest', 'Focus', 'Escape', 'Mustang'] },
  { id: 'chevrolet', name: 'Chevrolet', models: ['Spark', 'Sail', 'Malibu', 'Trax'] },
  { id: 'nissan', name: 'Nissan', models: ['Navara', 'GT-R', 'Juke', 'Almera', 'X-Trail'] },
  { id: 'hyundai', name: 'Hyundai', models: ['Tucson', 'Santa Fe', 'Elantra', 'Accent', 'Kona'] },
  { id: 'kia', name: 'Kia', models: ['Sorento', 'Sportage', 'Carnival', 'Seltos', 'Rio'] },
  { id: 'mazda', name: 'Mazda', models: ['Mazda3', 'CX-5', 'CX-30', 'MX-5', 'BT-50'] },
  { id: 'bmw', name: 'BMW', models: ['3 Series', '5 Series', 'X1', 'X3', 'X5'] },
  { id: 'mercedes-benz', name: 'Mercedes-Benz', models: ['C-Class', 'E-Class', 'S-Class', 'GLA', 'GLC'] },
  { id: 'audi', name: 'Audi', models: ['A3', 'A4', 'A6', 'Q3', 'Q5', 'e-tron'] },
  { id: 'volkswagen', name: 'Volkswagen', models: ['Golf', 'Passat', 'Tiguan', 'T-Roc', 'ID.4'] },
  { id: 'tesla', name: 'Tesla', models: ['Model 3', 'Model Y', 'Model S', 'Model X'] },
];

interface MakeModelSelectorProps {
  makes?: CarMake[];
  selectedMake: string;
  selectedModel: string;
  onMakeChange: (makeId: string) => void;
  onModelChange: (model: string) => void;
}

export const MakeModelSelector: React.FC<MakeModelSelectorProps> = ({
  makes = DEFAULT_MAKES,
  selectedMake,
  selectedModel,
  onMakeChange,
  onModelChange,
}) => {
  const [makeModalVisible, setMakeModalVisible] = useState(false);
  const [modelModalVisible, setModelModalVisible] = useState(false);
  const [makeSearchQuery, setMakeSearchQuery] = useState('');
  const [modelSearchQuery, setModelSearchQuery] = useState('');

  const selectedMakeData = useMemo(
    () => makes.find((m) => m.id === selectedMake),
    [makes, selectedMake]
  );

  const filteredMakes = useMemo(
    () =>
      makeSearchQuery
        ? makes.filter((m) =>
            m.name.toLowerCase().includes(makeSearchQuery.toLowerCase())
          )
        : makes,
    [makes, makeSearchQuery]
  );

  const filteredModels = useMemo(() => {
    const models = selectedMakeData?.models || [];
    return modelSearchQuery
      ? models.filter((m) =>
          m.toLowerCase().includes(modelSearchQuery.toLowerCase())
        )
      : models;
  }, [selectedMakeData, modelSearchQuery]);

  useEffect(() => {
    if (!makeModalVisible) setMakeSearchQuery('');
    if (!modelModalVisible) setModelSearchQuery('');
  }, [makeModalVisible, modelModalVisible]);

  const handleMakeSelect = (makeId: string) => {
    onMakeChange(makeId);
    onModelChange('');
    setMakeModalVisible(false);
  };

  const handleModelSelect = (model: string) => {
    onModelChange(model);
    setModelModalVisible(false);
  };

  const renderMakeItem = ({ item }: { item: CarMake }) => (
    <TouchableOpacity
      style={[
        styles.pickerItem,
        item.id === selectedMake && styles.pickerItemSelected,
      ]}
      onPress={() => handleMakeSelect(item.id)}
    >
      <Text
        style={[
          styles.pickerItemText,
          item.id === selectedMake && styles.pickerItemTextSelected,
        ]}
      >
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  const renderModelItem = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={[
        styles.pickerItem,
        item === selectedModel && styles.pickerItemSelected,
      ]}
      onPress={() => handleModelSelect(item)}
    >
      <Text
        style={[
          styles.pickerItemText,
          item === selectedModel && styles.pickerItemTextSelected,
        ]}
      >
        {item}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.selectorButton, selectedMake && styles.selectorButtonFilled]}
        onPress={() => setMakeModalVisible(true)}
      >
        <Text style={[styles.selectorLabel, selectedMake && styles.selectorLabelFilled]}>
          {selectedMake ? selectedMakeData?.name || 'Select Make' : 'Select Make *'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.selectorButton,
          selectedModel && styles.selectorButtonFilled,
          !selectedMake && styles.selectorButtonDisabled,
        ]}
        onPress={() => selectedMake && setModelModalVisible(true)}
        disabled={!selectedMake}
      >
        <Text
          style={[
            styles.selectorLabel,
            selectedModel && styles.selectorLabelFilled,
            !selectedMake && styles.selectorLabelDisabled,
          ]}
        >
          {selectedModel ? selectedModel : 'Select Model *'}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={makeModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setMakeModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setMakeModalVisible(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Make</Text>
            <View style={{ width: 60 }} />
          </View>

          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search make..."
              value={makeSearchQuery}
              onChangeText={setMakeSearchQuery}
              placeholderTextColor={colors.textTertiary}
            />
          </View>

          <FlatList
            data={filteredMakes}
            keyExtractor={(item) => item.id}
            renderItem={renderMakeItem}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No makes found</Text>
              </View>
            }
          />
        </SafeAreaView>
      </Modal>

      <Modal
        visible={modelModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModelModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModelModalVisible(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Model</Text>
            <View style={{ width: 60 }} />
          </View>

          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search model..."
              value={modelSearchQuery}
              onChangeText={setModelSearchQuery}
              placeholderTextColor={colors.textTertiary}
            />
          </View>

          <FlatList
            data={filteredModels}
            keyExtractor={(item, index) => `${item}-${index}`}
            renderItem={renderModelItem}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No models found</Text>
              </View>
            }
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  selectorButton: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectorButtonFilled: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  selectorButtonDisabled: {
    opacity: 0.5,
  },
  selectorLabel: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  selectorLabelFilled: {
    color: colors.primary,
    fontWeight: '600',
  },
  selectorLabelDisabled: {
    color: colors.textTertiary,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  cancelText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  modalTitle: {
    ...typography.h5,
    color: colors.text,
  },
  searchContainer: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  searchInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...typography.body,
    color: colors.text,
  },
  pickerItem: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  pickerItemSelected: {
    backgroundColor: colors.primary + '15',
  },
  pickerItemText: {
    ...typography.body,
    color: colors.text,
  },
  pickerItemTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.body,
    color: colors.textTertiary,
  },
});

export default MakeModelSelector;
