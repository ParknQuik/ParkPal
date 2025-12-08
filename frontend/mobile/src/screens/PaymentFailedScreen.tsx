import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';

type PaymentFailedScreenRouteProp = RouteProp<RootStackParamList, 'PaymentFailed'>;
type PaymentFailedScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'PaymentFailed'
>;

export const PaymentFailedScreen: React.FC = () => {
  const navigation = useNavigation<PaymentFailedScreenNavigationProp>();
  const route = useRoute<PaymentFailedScreenRouteProp>();
  const { error, bookingId } = route.params;

  const shakeAnim = new Animated.Value(0);
  const fadeAnim = new Animated.Value(0);

  useEffect(() => {
    // Shake animation for error icon
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Fade in content
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      delay: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleTryAgain = () => {
    // Navigate back to payment screen with the same booking
    navigation.goBack();
  };

  const handleContactSupport = () => {
    // In production, this would open email client or support chat
    console.log('Contact support for booking:', bookingId);
  };

  const handleBackToHome = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Main' }],
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Error Icon */}
        <Animated.View
          style={[
            styles.iconContainer,
            {
              transform: [{ translateX: shakeAnim }],
            },
          ]}
        >
          <View style={styles.errorCircle}>
            <Text style={styles.errorIcon}>✗</Text>
          </View>
        </Animated.View>

        {/* Error Message */}
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          <Text style={styles.title}>Payment Failed</Text>
          <Text style={styles.subtitle}>
            Unfortunately, we couldn't process your payment
          </Text>

          {/* Error Details */}
          <View style={styles.errorCard}>
            <Text style={styles.errorLabel}>Error Details:</Text>
            <Text style={styles.errorText}>{error || 'Unknown error occurred'}</Text>
            {bookingId && (
              <>
                <View style={styles.errorSeparator} />
                <View style={styles.errorRow}>
                  <Text style={styles.errorLabel}>Booking ID:</Text>
                  <Text style={styles.errorValue}>#{bookingId}</Text>
                </View>
              </>
            )}
          </View>

          {/* Common Reasons */}
          <View style={styles.reasonsContainer}>
            <Text style={styles.reasonsTitle}>Common Reasons:</Text>
            <View style={styles.reasonItem}>
              <Text style={styles.reasonIcon}>💳</Text>
              <Text style={styles.reasonText}>Insufficient funds in your account</Text>
            </View>
            <View style={styles.reasonItem}>
              <Text style={styles.reasonIcon}>🔒</Text>
              <Text style={styles.reasonText}>Card or payment method declined</Text>
            </View>
            <View style={styles.reasonItem}>
              <Text style={styles.reasonIcon}>📶</Text>
              <Text style={styles.reasonText}>Network connection issues</Text>
            </View>
            <View style={styles.reasonItem}>
              <Text style={styles.reasonIcon}>⏱️</Text>
              <Text style={styles.reasonText}>Payment session timed out</Text>
            </View>
          </View>

          {/* What to Do */}
          <View style={styles.infoBox}>
            <Text style={styles.infoIcon}>💡</Text>
            <Text style={styles.infoText}>
              Try again with a different payment method or check your account balance. If the
              problem persists, please contact support.
            </Text>
          </View>

          {/* Support Info */}
          <View style={styles.supportBox}>
            <Text style={styles.supportTitle}>Need Help?</Text>
            <Text style={styles.supportText}>
              Our support team is here to help you Monday - Friday, 9 AM - 6 PM PHT
            </Text>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.primaryButton} onPress={handleTryAgain}>
          <Text style={styles.primaryButtonText}>Try Again</Text>
        </TouchableOpacity>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.secondaryButton, styles.flexButton]}
            onPress={handleContactSupport}
          >
            <Text style={styles.secondaryButtonText}>Contact Support</Text>
          </TouchableOpacity>

          <View style={styles.buttonSpacer} />

          <TouchableOpacity
            style={[styles.secondaryButton, styles.flexButton]}
            onPress={handleBackToHome}
          >
            <Text style={styles.secondaryButtonText}>Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  errorCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F44336',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F44336',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  errorIcon: {
    fontSize: 60,
    color: '#fff',
    fontWeight: '600',
  },
  content: {
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  errorCard: {
    backgroundColor: '#FFEBEE',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  errorLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#C62828',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 15,
    color: '#D32F2F',
    lineHeight: 22,
  },
  errorSeparator: {
    height: 1,
    backgroundColor: '#FFCDD2',
    marginVertical: 12,
  },
  errorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#D32F2F',
  },
  reasonsContainer: {
    marginBottom: 24,
  },
  reasonsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingLeft: 8,
  },
  reasonIcon: {
    fontSize: 18,
    marginRight: 12,
    width: 24,
  },
  reasonText: {
    flex: 1,
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#FFF3E0',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#E65100',
    lineHeight: 20,
  },
  supportBox: {
    backgroundColor: '#f8f8f8',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  supportTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  supportText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  footer: {
    padding: 20,
    paddingBottom: 30,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  buttonRow: {
    flexDirection: 'row',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  flexButton: {
    flex: 1,
  },
  buttonSpacer: {
    width: 12,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
});
