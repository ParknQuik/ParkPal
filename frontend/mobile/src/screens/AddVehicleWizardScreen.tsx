import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '../store';
import {
  getVehicles,
  createVehicle,
  updateVehicle,
  Vehicle,
} from '../store/slices/vehiclesSlice';
import { vehiclesAPI } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { typography, spacing, borderRadius, shadows } from '../theme';
import { Chip } from '../components/Chip';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { AppHeader } from '../components/AppHeader';
import { useStatusBarStyle } from '../hooks/useStatusBarStyle';

// Types
type WizardStep = 1 | 2 | 3;

interface CountryFormat {
  code: string;
  name: string;
  pattern: string;
  placeholder: string;
  validation: (value: string) => boolean;
}

interface CarMake {
  id: string;
  name: string;
  models: string[];
}

interface CarColor {
  name: string;
  hex: string;
}

// Data
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 40 }, (_, i) => CURRENT_YEAR - i);

const CAR_MAKES: CarMake[] = [
  {
    id: 'toyota',
    name: 'Toyota',
    models: ['Vios', 'Camry', 'Corolla', 'RAV4', 'Fortuner', 'Innova', 'Hilux', 'Yaris', 'Wigo'],
  },
  {
    id: 'honda',
    name: 'Honda',
    models: ['City', 'Civic', 'Accord', 'CR-V', 'BR-V', 'HR-V', 'Jazz', 'Brio'],
  },
  {
    id: 'ford',
    name: 'Ford',
    models: ['Ranger', 'Everest', 'Focus', 'Escape', 'Mustang', 'Transit'],
  },
  {
    id: 'chevrolet',
    name: 'Chevrolet',
    models: ['Spark', 'Sail', 'Malibu', 'Trax', 'Colorado', 'Tahoe'],
  },
  {
    id: 'nissan',
    name: 'Nissan',
    models: ['Navara', 'GT-R', 'Juke', 'Almera', 'Patrol', 'X-Trail', 'Sylphy'],
  },
  {
    id: 'hyundai',
    name: 'Hyundai',
    models: ['Tucson', 'Santa Fe', 'Elantra', 'Accent', 'Kona', 'Staria', 'Palisade'],
  },
  {
    id: 'kia',
    name: 'Kia',
    models: ['Sorento', 'Sportage', 'Carnival', 'Seltos', 'Rio', 'Picanto', 'Forte'],
  },
  {
    id: 'mazda',
    name: 'Mazda',
    models: ['Mazda3', 'CX-5', 'CX-30', 'MX-5', 'BT-50', 'CX-90'],
  },
  {
    id: 'bmw',
    name: 'BMW',
    models: ['3 Series', '5 Series', 'X1', 'X3', 'X5', 'X7', 'iX', 'M3'],
  },
  {
    id: 'mercedes-benz',
    name: 'Mercedes-Benz',
    models: ['C-Class', 'E-Class', 'S-Class', 'GLA', 'GLC', 'GLE', 'GLS', 'A-Class'],
  },
  {
    id: 'audi',
    name: 'Audi',
    models: ['A3', 'A4', 'A6', 'Q3', 'Q5', 'Q7', 'e-tron', 'RS6'],
  },
  {
    id: 'volkswagen',
    name: 'Volkswagen',
    models: ['Golf', 'Passat', 'Tiguan', 'T-Roc', 'Multivan', 'ID.4'],
  },
  {
    id: 'tesla',
    name: 'Tesla',
    models: ['Model 3', 'Model Y', 'Model S', 'Model X', 'Cybertruck'],
  },
  {
    id: 'mitsubishi',
    name: 'Mitsubishi',
    models: ['Montero', 'Lancer', 'Mirage', 'Strada', 'Pajero', 'Xpander'],
  },
  {
    id: 'suzuki',
    name: 'Suzuki',
    models: ['Swift', 'Celerio', 'Vitara', 'Jimny', 'Dzire', 'Alto'],
  },
  {
    id: 'isuzu',
    name: 'Isuzu',
    models: ['D-Max', 'MU-X', 'ELF', 'N-Series'],
  },
];

const CAR_COLORS: CarColor[] = [
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Black', hex: '#000000' },
  { name: 'Silver', hex: '#C0C0C0' },
  { name: 'Gray', hex: '#808080' },
  { name: 'Metallic Gray', hex: '#5A5A5A' },
  { name: 'Red', hex: '#EF4444' },
  { name: 'Blue', hex: '#3B82F6' },
  { name: 'Navy Blue', hex: '#1E3A8A' },
  { name: 'Green', hex: '#10B77F' },
  { name: 'Forest Green', hex: '#228B22' },
  { name: 'Yellow', hex: '#FACC15' },
  { name: 'Orange', hex: '#F97316' },
  { name: 'Brown', hex: '#8B4513' },
  { name: 'Beige', hex: '#D2B48C' },
  { name: 'Gold', hex: '#FFD700' },
  { name: 'Bronze', hex: '#CD7F32' },
  { name: 'Purple', hex: '#A855F7' },
  { name: 'Pink', hex: '#EC4899' },
  { name: 'Sky Blue', hex: '#0EA5E9' },
  { name: 'Maroon', hex: '#800000' },
];

const COUNTRY_FORMATS: CountryFormat[] = [
  {
    code: 'PH',
    name: 'Philippines',
    pattern: '^[A-Z]{3}-\\d{4}$',
    placeholder: 'AAA-1234',
    validation: (value: string) => /^[A-Z]{3}-\d{4}$/.test(value),
  },
  {
    code: 'US',
    name: 'United States',
    pattern: '^[A-Z0-9]{3,8}$',
    placeholder: 'ABC-1234 or ABC123',
    validation: (value: string) => /^[A-Z0-9]{3,8}$/.test(value),
  },
  {
    code: 'UK',
    name: 'United Kingdom',
    pattern: '^[A-Z]{2}\\d{2}\\s?[A-Z]{3}$',
    placeholder: 'AB12 CDE',
    validation: (value: string) => /^[A-Z]{2}\d{2}\s?[A-Z]{3}$/.test(value),
  },
  {
    code: 'JP',
    name: 'Japan',
    pattern: '^[A-Z0-9]{2,4}-\\d{2,4}$',
    placeholder: '12-34 or 123-45',
    validation: (value: string) => /^[A-Z0-9]{2,4}-\d{2,4}$/.test(value),
  },
  {
    code: 'AU',
    name: 'Australia',
    pattern: '^[A-Z0-9]{3}-\\d{3}$',
    placeholder: 'ABC-123',
    validation: (value: string) => /^[A-Z0-9]{3}-\d{3}$/.test(value),
  },
  {
    code: 'CA',
    name: 'Canada',
    pattern: '^[A-Z]{3}-\\d{3}$',
    placeholder: 'ABC-123',
    validation: (value: string) => /^[A-Z]{3}-\d{3}$/.test(value),
  },
  {
    code: 'DE',
    name: 'Germany',
    pattern: '^[A-Z0-9]{1,3}-[A-Z0-9]{1,3}$',
    placeholder: 'B-AB 1234',
    validation: (value: string) => /^[A-Z0-9]{1,3}-[A-Z0-9]{1,3}$/.test(value),
  },
];

// Styles factory function
const createStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
   StyleSheet.create({
     container: {
       flex: 1,
       backgroundColor: colors.background,
     },
     safeArea: {
       backgroundColor: colors.appHeaderBackground,
     },
     contentArea: {
       flex: 1,
       backgroundColor: colors.background,
     },
     progressContainer: {
       paddingVertical: spacing.lg,
       paddingHorizontal: spacing.xl,
       backgroundColor: colors.surface,
       borderBottomWidth: 1,
       borderBottomColor: colors.border,
     },
     stepIndicatorContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepIndicatorItem: {
      alignItems: 'center',
    },
    stepDot: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.background,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepDotActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + '20',
    },
    stepDotCompleted: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    stepNumber: {
      ...typography.bodySmall,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    stepLine: {
      width: 40,
      height: 2,
      backgroundColor: colors.border,
      marginHorizontal: spacing.xs,
    },
    stepLineActive: {
      backgroundColor: colors.primary,
    },
    content: {
      flex: 1,
    },
    contentContainer: {
      padding: spacing.lg,
      paddingBottom: spacing.xxxl,
    },
    keyboardAvoidingView: {
      flex: 1,
    },
    stepContent: {
      flex: 1,
    },
    stepTitle: {
      ...typography.h4,
      color: colors.text,
      marginBottom: spacing.xs,
    },
    stepDescription: {
      ...typography.body,
      color: colors.textSecondary,
      marginBottom: spacing.xl,
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
      ...shadows.sm,
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
    inputGroup: {
      marginBottom: spacing.lg,
    },
    label: {
      ...typography.bodySmall,
      fontWeight: '600',
      color: colors.text,
      marginBottom: spacing.sm,
    },
    input: {
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: colors.border,
      borderRadius: borderRadius.xl,
      padding: spacing.lg,
      ...typography.body,
      color: colors.text,
    },
    helperText: {
      ...typography.caption,
      color: colors.textTertiary,
      marginTop: spacing.xs,
    },
    validationHint: {
      ...typography.bodySmall,
      color: colors.error,
      marginTop: spacing.md,
      textAlign: 'center',
    },
    errorText: {
      ...typography.bodySmall,
      color: colors.error,
      marginTop: spacing.sm,
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
    pickerItemSubtext: {
      ...typography.caption,
      color: colors.textTertiary,
      marginTop: spacing.xs,
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
    previewCard: {
      marginBottom: spacing.lg,
      padding: spacing.lg,
      alignItems: 'center',
    },
    carPreviewContainer: {
      alignItems: 'center',
      padding: spacing.lg,
    },
    carBody: {
      width: 200,
      height: 80,
      borderRadius: 20,
      position: 'relative',
      borderWidth: 2,
      borderColor: colors.borderDark,
      overflow: 'hidden',
    },
    carWindow: {
      position: 'absolute',
      top: 10,
      left: 20,
      right: 20,
      height: 30,
      backgroundColor: colors.surfaceDark,
      borderRadius: 10,
      opacity: 0.8,
    },
    carRoof: {
      position: 'absolute',
      top: 5,
      left: 30,
      right: 30,
      height: 15,
      backgroundColor: colors.surfaceDark,
      borderRadius: 8,
      opacity: 0.8,
    },
    carWheel: {
      position: 'absolute',
      bottom: -10,
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: colors.borderDark,
      borderWidth: 3,
      borderColor: colors.textTertiary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    wheelInner: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: colors.textTertiary,
    },
    carPreviewLabel: {
      ...typography.body,
      color: colors.textSecondary,
      marginTop: spacing.md,
      fontWeight: '500',
    },
    colorGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
      justifyContent: 'center',
      marginBottom: spacing.md,
    },
    colorSwatch: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      ...shadows.sm,
    },
    whiteSwatch: {
      borderWidth: 2,
      borderColor: colors.border,
    },
    colorSwatchSelected: {
      borderColor: colors.primary,
      borderWidth: 3,
      transform: [{ scale: 1.1 }],
    },
    whiteSwatchSelected: {
      borderColor: colors.primary,
      borderWidth: 3,
    },
    swatchCheckmark: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    selectedColorText: {
      ...typography.body,
      color: colors.primary,
      fontWeight: '600',
      textAlign: 'center',
      marginBottom: spacing.lg,
    },
    checkboxContainer: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: spacing.lg,
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
      marginTop: 2,
    },
    checkboxChecked: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    checkboxTextContainer: {
      flex: 1,
    },
    checkboxLabel: {
      ...typography.body,
      color: colors.text,
      fontWeight: '500',
    },
    checkboxHelper: {
      ...typography.caption,
      color: colors.textTertiary,
      marginTop: spacing.xs,
    },
    actionContainer: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.lg,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.surface,
    },
    actionButton: {
      width: '100%',
    },
    loadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.overlay,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

// Car preview component
const CarPreview: React.FC<{ color: CarColor; styles: ReturnType<typeof createStyles>; colors: ReturnType<typeof useTheme>['colors'] }> = ({ color, styles, colors }) => {
  return (
    <View style={styles.carPreviewContainer}>
      <View style={[styles.carBody, { backgroundColor: color.hex }]}>
        <View style={styles.carWindow}>
          <View style={styles.carRoof} />
        </View>
        <View style={styles.carWheel}>
          <View style={styles.wheelInner} />
        </View>
        <View style={[styles.carWheel, { left: 100 }]}>
          <View style={styles.wheelInner} />
        </View>
      </View>
      <Text style={styles.carPreviewLabel}>{color.name}</Text>
    </View>
  );
};

// Step indicator component
const StepIndicator: React.FC<{
  currentStep: WizardStep;
  styles: ReturnType<typeof createStyles>;
  colors: ReturnType<typeof useTheme>['colors'];
}> = ({ currentStep, styles, colors }) => {
  return (
    <View style={styles.stepIndicatorContainer}>
      {[1, 2, 3].map((step) => (
        <View key={step} style={styles.stepIndicatorItem}>
          <View
            style={[
              styles.stepDot,
              currentStep >= step && styles.stepDotActive,
              currentStep > step && styles.stepDotCompleted,
            ]}
          >
            {currentStep > step ? (
              <MaterialCommunityIcons name="check" size={16} color={colors.white} />
            ) : null}
            {currentStep === step && <Text style={styles.stepNumber}>{step}</Text>}
          </View>
          {step < 3 && (
            <View
              style={[
                styles.stepLine,
                currentStep > step && styles.stepLineActive,
              ]}
            />
          )}
        </View>
      ))}
    </View>
  );
};

// Step 1 Component: Year, Make, Model
const Step1Selection: React.FC<{
  year: string;
  setYear: (year: string) => void;
  make: string;
  setMake: (make: string) => void;
  model: string;
  setModel: (model: string) => void;
  styles: ReturnType<typeof createStyles>;
}> = ({ year, setYear, make, setMake, model, setModel, styles }) => {
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [showMakePicker, setShowMakePicker] = useState(false);
  const [showModelPicker, setShowModelPicker] = useState(false);

  const selectedMake = CAR_MAKES.find((m) => m.id === make);
  const availableModels = selectedMake?.models || [];

  const isValid = year && make && model;

  return (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Select Your Vehicle</Text>
      <Text style={styles.stepDescription}>
        Choose the year, make, and model of your vehicle
      </Text>

      {/* Year Selector */}
      <TouchableOpacity
        style={[styles.selectorButton, year && styles.selectorButtonFilled]}
        onPress={() => setShowYearPicker(true)}
      >
        <Text style={[styles.selectorLabel, year && styles.selectorLabelFilled]}>
          {year ? `Year: ${year}` : 'Select Year *'}
        </Text>
      </TouchableOpacity>

      {/* Make Selector */}
      <TouchableOpacity
        style={[styles.selectorButton, make && styles.selectorButtonFilled]}
        onPress={() => setShowMakePicker(true)}
      >
        <Text style={[styles.selectorLabel, make && styles.selectorLabelFilled]}>
          {make ? `Make: ${selectedMake?.name || make}` : 'Select Make *'}
        </Text>
      </TouchableOpacity>

      {/* Model Selector - disabled until make is selected */}
      <TouchableOpacity
        style={[
          styles.selectorButton,
          model && styles.selectorButtonFilled,
          !make && styles.selectorButtonDisabled,
        ]}
        onPress={() => make && setShowModelPicker(true)}
        disabled={!make}
      >
        <Text
          style={[
            styles.selectorLabel,
            model && styles.selectorLabelFilled,
            !make && styles.selectorLabelDisabled,
          ]}
        >
          {model ? `Model: ${model}` : 'Select Model *'}
        </Text>
      </TouchableOpacity>

      {/* Year Picker Modal */}
      <Modal
        visible={showYearPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowYearPicker(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowYearPicker(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Year</Text>
            <View style={{ width: 60 }} />
          </View>
          <FlatList
            data={YEARS}
            keyExtractor={(item) => item.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.pickerItem, item.toString() === year && styles.pickerItemSelected]}
                onPress={() => {
                  setYear(item.toString());
                  setShowYearPicker(false);
                }}
              >
                <Text
                  style={[
                    styles.pickerItemText,
                    item.toString() === year && styles.pickerItemTextSelected,
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            )}
            initialNumToRender={20}
          />
        </SafeAreaView>
      </Modal>

      {/* Make Picker Modal */}
      <Modal
        visible={showMakePicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowMakePicker(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowMakePicker(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Make</Text>
            <View style={{ width: 60 }} />
          </View>
          <FlatList
            data={CAR_MAKES}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.pickerItem, item.id === make && styles.pickerItemSelected]}
                onPress={() => {
                  setMake(item.id);
                  setModel(''); // Reset model when make changes
                  setShowMakePicker(false);
                }}
              >
                <Text
                  style={[
                    styles.pickerItemText,
                    item.id === make && styles.pickerItemTextSelected,
                  ]}
                >
                  {item.name}
                </Text>
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>

      {/* Model Picker Modal */}
      <Modal
        visible={showModelPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModelPicker(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowModelPicker(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Model</Text>
            <View style={{ width: 60 }} />
          </View>
          <FlatList
            data={availableModels}
            keyExtractor={(item, index) => `${item}-${index}`}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.pickerItem, item === model && styles.pickerItemSelected]}
                onPress={() => {
                  setModel(item);
                  setShowModelPicker(false);
                }}
              >
                <Text
                  style={[
                    styles.pickerItemText,
                    item === model && styles.pickerItemTextSelected,
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>

      {!isValid && (
        <Text style={styles.validationHint}>
          Please select year, make, and model to continue
        </Text>
      )}
    </View>
  );
};

// Step 2 Component: Color Selection with Preview
const Step2Color: React.FC<{
  selectedColor: CarColor | null;
  setSelectedColor: (color: CarColor | null) => void;
  styles: ReturnType<typeof createStyles>;
  colors: ReturnType<typeof useTheme>['colors'];
}> = ({ selectedColor, setSelectedColor, styles, colors }) => {
  return (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Choose Color</Text>
      <Text style={styles.stepDescription}>
        Select the color that matches your vehicle
      </Text>

      {/* Car Preview */}
      <Card style={styles.previewCard}>
        <CarPreview color={selectedColor || CAR_COLORS[0]} styles={styles} colors={colors} />
      </Card>

      {/* Color Grid */}
      <View style={styles.colorGrid}>
        {CAR_COLORS.map((color) => (
          <TouchableOpacity
            key={color.hex}
            style={[
              styles.colorSwatch,
              { backgroundColor: color.hex },
              selectedColor?.hex === color.hex && styles.colorSwatchSelected,
              color.hex === '#FFFFFF' && styles.whiteSwatch,
              color.hex === '#FFFFFF' && selectedColor?.hex === color.hex && styles.whiteSwatchSelected,
            ]}
            onPress={() => setSelectedColor(color)}
          >
            {selectedColor?.hex === color.hex && (
              <View style={styles.swatchCheckmark}>
                <MaterialCommunityIcons name="check" size={16} color={colors.white} />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.selectedColorText}>
        Selected: {selectedColor?.name || 'None'}
      </Text>
    </View>
  );
};

// Step 3 Component: License Plate and Default Toggle
const Step3Details: React.FC<{
  licensePlate: string;
  setLicensePlate: (value: string) => void;
  countryFormat: CountryFormat;
  setCountryFormat: (format: CountryFormat) => void;
  isDefault: boolean;
  setIsDefault: (value: boolean) => void;
  styles: ReturnType<typeof createStyles>;
  colors: ReturnType<typeof useTheme>['colors'];
}> = ({
  licensePlate,
  setLicensePlate,
  countryFormat,
  setCountryFormat,
  isDefault,
  setIsDefault,
  styles,
  colors,
}) => {
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  const isValid = countryFormat.validation(licensePlate);

  const formatLicensePlate = (text: string) => {
    // Auto-format based on country pattern
    if (countryFormat.code === 'PH') {
      // PH format: XXX-1234
      const cleaned = text.replace(/[^A-Z0-9]/g, '').toUpperCase();
      if (cleaned.length <= 7) {
        const formatted = cleaned.replace(/^(.{3})(.{0,4})$/, (_, p1, p2) => {
          return p2 ? `${p1}-${p2}` : p1;
        });
        setLicensePlate(formatted);
      }
    } else if (countryFormat.code === 'US') {
      // US format: Just uppercase, no dashes required
      const cleaned = text.replace(/[^A-Z0-9]/g, '').toUpperCase();
      setLicensePlate(cleaned);
    } else {
      // Generic: just uppercase
      setLicensePlate(text.toUpperCase().replace(/[^A-Z0-9-]/g, ''));
    }
  };

  return (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>License Details</Text>
      <Text style={styles.stepDescription}>
        Enter your vehicle's license plate information
      </Text>

      {/* Country Selector */}
      <TouchableOpacity
        style={[styles.selectorButton, countryFormat && styles.selectorButtonFilled]}
        onPress={() => setShowCountryPicker(true)}
      >
        <Text style={[styles.selectorLabel, countryFormat && styles.selectorLabelFilled]}>
          {countryFormat ? `Country: ${countryFormat.name}` : 'Select Country *'}
        </Text>
      </TouchableOpacity>

      {/* License Plate Input */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>License Plate *</Text>
        <TextInput
          style={styles.input}
          value={licensePlate}
          onChangeText={formatLicensePlate}
          placeholder={countryFormat?.placeholder || 'Enter license plate'}
          placeholderTextColor={colors.textTertiary}
          autoCapitalize="characters"
          maxLength={15}
          keyboardType="default"
        />
        <Text style={styles.helperText}>
          Format: {countryFormat?.placeholder || 'Select country first'}
        </Text>
      </View>

      {/* Default Toggle */}
      <TouchableOpacity
        style={styles.checkboxContainer}
        onPress={() => setIsDefault(!isDefault)}
      >
        <View style={[styles.checkbox, isDefault && styles.checkboxChecked]}>
          {isDefault && <MaterialCommunityIcons name="check" size={16} color={colors.primary} />}
        </View>
        <View style={styles.checkboxTextContainer}>
          <Text style={styles.checkboxLabel}>Set as default vehicle</Text>
          <Text style={styles.checkboxHelper}>
            This vehicle will be pre-selected when booking
          </Text>
        </View>
      </TouchableOpacity>

      {!isValid && licensePlate.length > 0 && (
        <Text style={styles.errorText}>
          Please enter a valid license plate number for {countryFormat?.name}
        </Text>
      )}

      {/* Country Picker Modal */}
      <Modal
        visible={showCountryPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCountryPicker(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCountryPicker(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Country</Text>
            <View style={{ width: 60 }} />
          </View>
          <FlatList
            data={COUNTRY_FORMATS}
            keyExtractor={(item) => item.code}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.pickerItem, item.code === countryFormat?.code && styles.pickerItemSelected]}
                onPress={() => {
                  setCountryFormat(item);
                  setShowCountryPicker(false);
                  setLicensePlate(''); // Clear plate when country changes
                }}
              >
                <Text
                  style={[
                    styles.pickerItemText,
                    item.code === countryFormat?.code && styles.pickerItemTextSelected,
                  ]}
                >
                  {item.name} ({item.code})
                </Text>
                <Text style={styles.pickerItemSubtext}>
                  Format: {item.placeholder}
                </Text>
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
};

// Main Component
export const AddVehicleWizardScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const statusBarStyle = useStatusBarStyle();

  const styles = useMemo(() => createStyles(colors), [colors]);

  const vehicleId = route.params?.vehicleId;

  // Wizard state
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingVehicle, setLoadingVehicle] = useState(false);

  // Form data
  const [year, setYear] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [selectedColor, setSelectedColor] = useState<CarColor | null>(null);
  const [licensePlate, setLicensePlate] = useState('');
  const [countryFormat, setCountryFormat] = useState<CountryFormat | null>(null);
  const [isDefault, setIsDefault] = useState(false);

  // Edit mode: Load existing vehicle data
  useEffect(() => {
    const loadVehicle = async () => {
      if (vehicleId) {
        setLoadingVehicle(true);
        try {
          const response = await vehiclesAPI.getVehicle(vehicleId);
          const vehicle: Vehicle = response.data;

          // Populate form
          setYear(vehicle.year.toString());
          setMake(CAR_MAKES.find(m => m.name === vehicle.make)?.id || vehicle.make.toLowerCase());
          setModel(vehicle.model);
          const foundColor = CAR_COLORS.find(c => c.name.toLowerCase() === vehicle.color.toLowerCase());
          setSelectedColor(foundColor || null);
          setLicensePlate(vehicle.licensePlate);
          setIsDefault(vehicle.isDefault);

          // Auto-select country format based on license plate pattern
          if (foundColor) {
            // Try to match country format
            const matchedCountry = COUNTRY_FORMATS.find(f => f.validation(vehicle.licensePlate));
            if (matchedCountry) {
              setCountryFormat(matchedCountry);
            } else {
              // Default to Philippines format for now if no match
              setCountryFormat(COUNTRY_FORMATS[0]);
            }
          }
        } catch (err) {
          ;
          Alert.alert('Error', 'Failed to load vehicle data');
          navigation.goBack();
        } finally {
          setLoadingVehicle(false);
        }
      }
    };

    loadVehicle();
  }, [vehicleId]);

  // Validation for each step
  const isStep1Valid = () => {
    return !!year && !!make && !!model;
  };

  const isStep2Valid = () => {
    return !!selectedColor;
  };

  const isStep3Valid = () => {
    return (
      !!countryFormat &&
      !!licensePlate &&
      countryFormat.validation(licensePlate)
    );
  };

  const handleNext = () => {
    if (currentStep === 1 && isStep1Valid()) {
      setCurrentStep(2);
    } else if (currentStep === 2 && isStep2Valid()) {
      // Set default country format if none selected
      if (!countryFormat) {
        setCountryFormat(COUNTRY_FORMATS[0]); // Default to Philippines
      }
      setCurrentStep(3);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as WizardStep);
    } else {
      navigation.goBack();
    }
  };

  const handleSubmit = async () => {
    if (!isStep3Valid()) {
      Alert.alert('Validation Error', 'Please complete all required fields correctly');
      return;
    }

    if (!selectedColor) {
      Alert.alert('Validation Error', 'Please select a vehicle color');
      return;
    }

    setIsSubmitting(true);
    try {
      const vehicleData = {
        make: CAR_MAKES.find((m) => m.id === make)?.name || make,
        model,
        year: parseInt(year),
        color: selectedColor.name,
        licensePlate: licensePlate.toUpperCase(),
        isDefault,
      };

      if (vehicleId) {
        await dispatch(
          updateVehicle({ id: vehicleId, data: vehicleData })
        ).unwrap();
        Alert.alert('Success', 'Vehicle updated successfully');
      } else {
        await dispatch(createVehicle(vehicleData)).unwrap();
        Alert.alert('Success', 'Vehicle added successfully');
      }

      navigation.goBack();
    } catch (err: any) {
      ;
      const errorMessage =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Failed to save vehicle. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return isStep1Valid();
      case 2:
        return isStep2Valid();
      case 3:
        return isStep3Valid();
      default:
        return false;
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Step1Selection
            year={year}
            setYear={setYear}
            make={make}
            setMake={setMake}
            model={model}
            setModel={setModel}
            styles={styles}
          />
        );
      case 2:
        return (
          <Step2Color
             selectedColor={selectedColor}
             setSelectedColor={setSelectedColor}
             styles={styles}
             colors={colors}
           />
        );
      case 3:
        return (
          <Step3Details
            licensePlate={licensePlate}
            setLicensePlate={setLicensePlate}
            countryFormat={countryFormat!}
            setCountryFormat={setCountryFormat}
            isDefault={isDefault}
            setIsDefault={setIsDefault}
            styles={styles}
            colors={colors}
          />
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style={statusBarStyle} backgroundColor={colors.appHeaderBackground} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
      <AppHeader
        title={vehicleId ? 'Edit Vehicle' : 'Add Vehicle'}
        onBack={handleBack}
      />
      </SafeAreaView>

      <View style={styles.contentArea}>
      {/* Step Indicator */}
      <View style={styles.progressContainer}>
        <StepIndicator currentStep={currentStep} styles={styles} colors={colors} />
      </View>

      {/* Step Content */}
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {renderStep()}
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          {currentStep < 3 ? (
            <Button
              title="Continue"
              onPress={handleNext}
              variant="primary"
              disabled={!isStepValid()}
              style={styles.actionButton}
            />
          ) : (
            <Button
              title={isSubmitting ? 'Saving...' : 'Save Vehicle'}
              onPress={handleSubmit}
              variant="primary"
              disabled={!isStepValid() || isSubmitting}
              loading={isSubmitting}
              style={styles.actionButton}
            />
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Loading Overlay */}
      {(loadingVehicle || isSubmitting) && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
      </View>
    </View>
  );
};

export default AddVehicleWizardScreen;
