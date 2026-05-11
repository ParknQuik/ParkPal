import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { typography, spacing, borderRadius } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { AppHeader } from '../components/AppHeader';

interface PaymentMethod {
  id: string;
  name: string;
  icon: string;
  description: string;
  instructions: string[];
  isDefault?: boolean;
}

export const PaymentMethodsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();

  const [selectedMethod, setSelectedMethod] = useState<string>('cash');

  const paymentMethods: PaymentMethod[] = [
    {
      id: 'cash',
      name: 'Cash',
      icon: '💵',
      description: 'Pay the host directly in cash upon arrival',
      instructions: [
        'Arrive at the parking spot',
        'Scan the QR code to check in',
        'Pay the host in cash',
        'Host confirms payment in the app',
        'Your booking is confirmed',
      ],
      isDefault: true,
    },
    {
      id: 'bank_transfer',
      name: 'Bank Transfer',
      icon: '🏦',
      description: 'Transfer payment directly to the host\'s bank account',
      instructions: [
        'Create your booking',
        'View the host\'s bank account details',
        'Transfer the exact amount',
        'Screenshot or save the transfer reference',
        'Send proof of payment to the host',
        'Host confirms payment within 24 hours',
      ],
    },
    {
      id: 'gcash',
      name: 'GCash (Coming Soon)',
      icon: '💙',
      description: 'Fast and secure payment via GCash',
      instructions: [
        'This payment method will be available soon',
        'You\'ll be able to pay instantly via GCash',
        'Automatic payment confirmation',
      ],
    },
    {
      id: 'paymongo',
      name: 'Credit/Debit Card (Coming Soon)',
      icon: '💳',
      description: 'Pay securely with any card via PayMongo',
      instructions: [
        'This payment method will be available soon',
        'Accept Visa, Mastercard, and more',
        'Instant booking confirmation',
      ],
    },
  ];

  const handleSetDefault = (methodId: string) => {
    setSelectedMethod(methodId);
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const styles = React.useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: spacing.lg,
    },
    infoBanner: {
      flexDirection: 'row',
      backgroundColor: 'rgba(102, 126, 234, 0.1)',
      marginBottom: spacing.lg,
      padding: spacing.lg,
    },
    infoTextContainer: {
      flex: 1,
    },
    infoTitle: {
      ...typography.body,
      color: colors.primary,
      fontWeight: '700',
      marginBottom: spacing.xs,
    },
    infoDescription: {
      ...typography.small,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    methodCard: {
      marginBottom: spacing.lg,
      padding: spacing.lg,
    },
    methodHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    methodHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    methodIcon: {
      fontSize: 32,
      marginRight: spacing.md,
    },
    methodTitleContainer: {
      flex: 1,
    },
    methodName: {
      ...typography.body,
      color: colors.textPrimary,
      fontWeight: '700',
    },
    defaultBadge: {
      ...typography.small,
      color: colors.primary,
      fontWeight: '600',
      marginTop: spacing.xs,
    },
    radioButton: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioButtonSelected: {
      borderColor: colors.primary,
    },
    radioButtonInner: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: colors.primary,
    },
    methodDescription: {
      ...typography.body,
      color: colors.textSecondary,
      marginBottom: spacing.lg,
      lineHeight: 22,
    },
    instructionsContainer: {
      backgroundColor: colors.surface,
      padding: spacing.md,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    instructionsTitle: {
      ...typography.body,
      color: colors.textPrimary,
      fontWeight: '700',
      marginBottom: spacing.md,
    },
    instructionItem: {
      flexDirection: 'row',
      marginBottom: spacing.sm,
    },
    instructionNumber: {
      ...typography.body,
      color: colors.primary,
      fontWeight: '700',
      marginRight: spacing.sm,
      width: 20,
    },
    instructionText: {
      ...typography.body,
      color: colors.textSecondary,
      flex: 1,
      lineHeight: 22,
    },
    helpCard: {
      flexDirection: 'row',
      padding: spacing.lg,
      marginTop: spacing.md,
      marginBottom: spacing.xl,
    },
    helpTextContainer: {
      flex: 1,
    },
    helpTitle: {
      ...typography.body,
      color: colors.textPrimary,
      fontWeight: '700',
      marginBottom: spacing.xs,
    },
    helpDescription: {
      ...typography.small,
      color: colors.textSecondary,
      lineHeight: 20,
      marginBottom: spacing.md,
    },
    helpButton: {
      backgroundColor: colors.primary,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
      borderRadius: borderRadius.md,
      alignSelf: 'flex-start',
    },
    helpButtonText: {
      ...typography.body,
      color: colors.white,
      fontWeight: '600',
    },
  }), [colors]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <AppHeader title="Payment Methods" onBack={handleBack} />

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Info Banner */}
          <Card style={styles.infoBanner}>
            <MaterialCommunityIcons name="information-outline" size={18} color={colors.info} />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoTitle}>Manual Payment System</Text>
              <Text style={styles.infoDescription}>
                Currently, all payments are processed manually between drivers and hosts.
                Automated payment methods are coming soon!
              </Text>
            </View>
          </Card>

          {/* Payment Methods List */}
          {paymentMethods.map((method, index) => (
            <Card key={method.id} style={styles.methodCard}>
              <TouchableOpacity
                style={styles.methodHeader}
                onPress={() => handleSetDefault(method.id)}
                disabled={method.id === 'gcash' || method.id === 'paymongo'}
              >
                <View style={styles.methodHeaderLeft}>
                  <Text style={styles.methodIcon}>{method.icon}</Text>
                  <View style={styles.methodTitleContainer}>
                    <Text style={styles.methodName}>{method.name}</Text>
                    {selectedMethod === method.id && (
                      <Text style={styles.defaultBadge}>Default</Text>
                    )}
                  </View>
                </View>
                {method.id !== 'gcash' && method.id !== 'paymongo' && (
                  <View
                    style={[
                      styles.radioButton,
                      selectedMethod === method.id && styles.radioButtonSelected,
                    ]}
                  >
                    {selectedMethod === method.id && (
                      <View style={styles.radioButtonInner} />
                    )}
                  </View>
                )}
              </TouchableOpacity>

              <Text style={styles.methodDescription}>{method.description}</Text>

              {/* Instructions */}
              <View style={styles.instructionsContainer}>
                <Text style={styles.instructionsTitle}>How it works:</Text>
                {method.instructions.map((instruction, idx) => (
                  <View key={idx} style={styles.instructionItem}>
                    <Text style={styles.instructionNumber}>{idx + 1}.</Text>
                    <Text style={styles.instructionText}>{instruction}</Text>
                  </View>
                ))}
              </View>
            </Card>
          ))}

          {/* Help Section */}
          <Card style={styles.helpCard}>
            <MaterialCommunityIcons name="lightbulb-outline" size={18} color={colors.warning} />
            <View style={styles.helpTextContainer}>
              <Text style={styles.helpTitle}>Need Help?</Text>
              <Text style={styles.helpDescription}>
                If you have questions about payment methods or encounter any issues,
                please contact our support team.
              </Text>
              <TouchableOpacity style={styles.helpButton}>
                <Text style={styles.helpButtonText}>Contact Support</Text>
              </TouchableOpacity>
            </View>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
