import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import { useNavigation, useRoute } from '@react-navigation/native';
import { marketplaceAPI } from '../services/api';
import { colors, typography, spacing } from '../theme';

type ScanMode = 'checkin' | 'checkout';

export const QRScannerScreen: React.FC = () => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();
  const route = useRoute();

  // Get scan mode and optional data from navigation params
  const scanMode = route.params?.mode || 'checkin';
  const bookingId = route.params?.bookingId;
  const sessionId = route.params?.sessionId;

  useEffect(() => {
    requestCameraPermission();
  }, []);

  const requestCameraPermission = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
  };

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned || loading) return;

    setScanned(true);
    setLoading(true);

    try {
      if (scanMode === 'checkin') {
        await handleCheckIn(data);
      } else if (scanMode === 'checkout' && sessionId) {
        // For checkout, we don't need the QR code, just the session ID
        await handleCheckOut(sessionId);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Something went wrong');
      setScanned(false);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async (qrData: string) => {
    try {
      const response = await marketplaceAPI.qrCheckIn({
        qrData,
        bookingId: bookingId ? parseInt(bookingId) : undefined,
      });

      Alert.alert(
        'Check-in Successful! 🎉',
        `You've checked in. Session ID: ${response.data.session.id}`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error || 'Failed to check in. Please try again.';
      Alert.alert('Check-in Failed', errorMessage, [
        {
          text: 'Retry',
          onPress: () => setScanned(false),
        },
        {
          text: 'Cancel',
          onPress: () => navigation.goBack(),
          style: 'cancel',
        },
      ]);
    }
  };

  const handleCheckOut = async (sessionId: number) => {
    try {
      const response = await marketplaceAPI.qrCheckOut({ sessionId });

      const { totalAmount, durationMinutes } = response.data;

      Alert.alert(
        'Check-out Successful! ✅',
        `Duration: ${durationMinutes} minutes\nTotal: ₱${totalAmount.toFixed(
          2
        )}\n\nThank you for using ParkPal!`,
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Home' as never),
          },
        ]
      );
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error ||
        'Failed to check out. Please try again.';
      Alert.alert('Check-out Failed', errorMessage, [
        {
          text: 'Retry',
          onPress: () => setScanned(false),
        },
        {
          text: 'Cancel',
          onPress: () => navigation.goBack(),
          style: 'cancel',
        },
      ]);
    }
  };

  if (hasPermission === null) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.text}>Requesting camera permission...</Text>
      </SafeAreaView>
    );
  }

  if (hasPermission === false) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>No access to camera</Text>
        <Text style={styles.text}>
          Please enable camera permissions in your device settings.
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={requestCameraPermission}
        >
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {scanMode === 'checkin' ? 'Scan to Check In' : 'Checking Out...'}
        </Text>
        <Text style={styles.subtitle}>
          {scanMode === 'checkin'
            ? 'Position the QR code within the frame'
            : 'Processing your check-out'}
        </Text>
      </View>

      <View style={styles.cameraContainer}>
        {scanMode === 'checkin' ? (
          <CameraView
            style={styles.camera}
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ['qr'],
            }}
          >
            <View style={styles.overlay}>
              <View style={styles.scanArea} />
            </View>
          </CameraView>
        ) : (
          <View style={styles.checkoutContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.text}>Processing check-out...</Text>
          </View>
        )}
      </View>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.white} />
          <Text style={styles.loadingText}>
            {scanMode === 'checkin' ? 'Checking in...' : 'Checking out...'}
          </Text>
        </View>
      )}

      {scanned && !loading && scanMode === 'checkin' && (
        <TouchableOpacity
          style={styles.rescanButton}
          onPress={() => setScanned(false)}
        >
          <Text style={styles.rescanText}>Tap to Scan Again</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={styles.cancelButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.cancelText}>Cancel</Text>
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
    padding: spacing.lg,
    alignItems: 'center',
  },
  title: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  cameraContainer: {
    flex: 1,
    margin: spacing.lg,
    borderRadius: 20,
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: colors.white,
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  checkoutContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  text: {
    ...typography.body,
    color: colors.text,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  errorText: {
    ...typography.h3,
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  button: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 25,
    marginTop: spacing.lg,
  },
  buttonText: {
    ...typography.button,
    color: colors.white,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body,
    color: colors.white,
    marginTop: spacing.md,
  },
  rescanButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 25,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  rescanText: {
    ...typography.button,
    color: colors.white,
  },
  cancelButton: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  cancelText: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
