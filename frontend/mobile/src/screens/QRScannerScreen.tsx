import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Animated,
  Dimensions,
  ActivityIndicator,
  TextInput,
  Easing,
} from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { marketplaceAPI } from '../services/api';
import { colors, typography, spacing } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SCAN_AREA_SIZE = SCREEN_WIDTH * 0.7;

type ScanMode = 'checkin' | 'checkout' | 'generic';

type QRScannerParams = {
  QRScanner: {
    mode?: ScanMode;
    bookingId?: string;
    sessionId?: string;
  };
};

export const QRScannerScreen: React.FC = () => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [scanResult, setScanResult] = useState<{
    type: 'success' | 'error' | null;
    title: string;
    message: string;
  }>({ type: null, title: '', message: '' });

  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scanAnimationRef = useRef<Animated.CompositeAnimation | null>(null);
  const navigation = useNavigation();
  const route = useRoute<RouteProp<QRScannerParams, 'QRScanner'>>();

  const scanMode: ScanMode = route.params?.mode || 'generic';
  const bookingId = route.params?.bookingId;
  const sessionId = route.params?.sessionId;

  useEffect(() => {
    requestCameraPermission();
    startScanAnimation();

    return () => {
      scanAnimationRef.current?.stop();
    };
  }, []);

  const startScanAnimation = () => {
    scanLineAnim.setValue(0);
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
        Animated.timing(scanLineAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
      ])
    );
    scanAnimationRef.current = anim;
    anim.start();
  };

  const startPulseAnimation = () => {
    Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 1.3,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const requestCameraPermission = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
  };

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned || loading) return;

    setScanned(true);
    setLoading(true);
    startPulseAnimation();

    try {
      if (scanMode === 'checkin') {
        await handleCheckIn(data);
      } else if (scanMode === 'checkout') {
        if (!sessionId) {
          setScanResult({
            type: 'error',
            title: 'Check-out Error',
            message: 'No session ID provided. Please go back and try again.',
          });
          return;
        }
        await handleCheckOut(parseInt(sessionId, 10));
      } else {
        await handleGenericScan(data);
      }
    } catch (error: any) {
      setScanResult({
        type: 'error',
        title: 'Error',
        message: error.message || 'Something went wrong. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async (qrData: string) => {
    try {
      const response = await marketplaceAPI.qrCheckIn({
        qrData,
        bookingId: bookingId ? parseInt(bookingId, 10) : undefined,
      });

      setScanResult({
        type: 'success',
        title: 'Check-in Successful!',
        message: `Session ID: ${response.data.session.id}\nYou're all set. Enjoy your parking!`,
      });
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error || 'Failed to check in. Please try again.';
      setScanResult({
        type: 'error',
        title: 'Check-in Failed',
        message: errorMessage,
      });
    }
  };

  const handleCheckOut = async (sid: number) => {
    try {
      const response = await marketplaceAPI.qrCheckOut({ sessionId: sid });
      const { totalAmount, durationMinutes } = response.data;

      setScanResult({
        type: 'success',
        title: 'Check-out Successful!',
        message: `Duration: ${durationMinutes} minutes\nTotal: ₱${totalAmount.toFixed(2)}\n\nThank you for using ParkPal!`,
      });
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error || 'Failed to check out. Please try again.';
      setScanResult({
        type: 'error',
        title: 'Check-out Failed',
        message: errorMessage,
      });
    }
  };

  const handleGenericScan = async (data: string) => {
    try {
      const parsed = parseQRData(data);

      if (parsed.valid) {
        setScanResult({
          type: 'success',
          title: 'QR Code Scanned',
          message: `Slot ID: ${parsed.slotId}\n\nWould you like to check in to this parking spot?`,
        });
      } else {
        setScanResult({
          type: 'error',
          title: 'Invalid QR Code',
          message: 'This QR code is not a valid ParkPal parking code. Please try scanning a ParkPal QR code.',
        });
      }
    } catch (error: any) {
      setScanResult({
        type: 'error',
        title: 'Scan Error',
        message: 'Could not read QR code data. Please try again.',
      });
    }
  };

  const parseQRData = (data: string): { valid: boolean; slotId?: string; error?: string } => {
    if (!data || typeof data !== 'string') {
      return { valid: false, error: 'Empty or invalid QR data' };
    }

    // Format: PARKPAL:slotId:timestamp:signature
    const parts = data.split(':');

    if (parts[0] === 'PARKPAL' && parts.length >= 2) {
      return { valid: true, slotId: parts[1] };
    }

    // Try parsing as JSON
    try {
      const json = JSON.parse(data);
      if (json.slotId || json.parkingSlotId || json.slot_id) {
        return { valid: true, slotId: json.slotId || json.parkingSlotId || json.slot_id };
      }
    } catch {}

    // Try as a direct slot ID (numeric)
    if (/^\d+$/.test(data.trim())) {
      return { valid: true, slotId: data.trim() };
    }

    return { valid: false, error: 'Unrecognized QR format' };
  };

  const handleRetry = () => {
    setScanResult({ type: null, title: '', message: '' });
    setScanned(false);
  };

  const handleFlashToggle = () => {
    setFlashOn(!flashOn);
  };

  const handleManualSubmit = async () => {
    if (!manualCode.trim()) return;
    handleBarCodeScanned({ data: manualCode.trim() });
  };

  const getHeaderTitle = () => {
    switch (scanMode) {
      case 'checkin':
        return 'Scan to Check In';
      case 'checkout':
        return 'Scan to Check Out';
      default:
        return 'Scan QR Code';
    }
  };

  const getInstructionText = () => {
    if (loading) {
      return scanMode === 'checkout' ? 'Processing check-out...' : 'Checking in...';
    }
    if (scanResult.type) {
      return scanResult.type === 'success' ? 'Scan complete!' : 'Scan failed';
    }
    switch (scanMode) {
      case 'checkin':
        return 'Scan the QR code at your parking spot';
      case 'checkout':
        return 'Scan the QR code to end your session';
      default:
        return 'Align QR code within the frame';
    }
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.permissionText}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>No access to camera</Text>
        <Text style={styles.permissionSubtext}>
          Please enable camera permissions in your device settings.
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestCameraPermission}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={flashOn}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
      />

      <View style={styles.overlay}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.headerButtonText}>✕</Text>
            </TouchableOpacity>

            <Text style={styles.headerTitle}>{getHeaderTitle()}</Text>

            <TouchableOpacity
              style={styles.headerButton}
              onPress={handleFlashToggle}
            >
              <Text style={styles.headerButtonText}>{flashOn ? '⚡' : '🔦'}</Text>
            </TouchableOpacity>
          </View>

          {!scanResult.type && (
            <View style={styles.viewfinderContainer}>
              <Animated.View
                style={[
                  styles.viewfinder,
                  loading && { transform: [{ scale: pulseAnim }] },
                ]}
              >
                <View style={[styles.corner, styles.cornerTL]} />
                <View style={[styles.corner, styles.cornerTR]} />
                <View style={[styles.corner, styles.cornerBL]} />
                <View style={[styles.corner, styles.cornerBR]} />

                {!loading && (
                  <Animated.View
                    style={[
                      styles.scanLine,
                      {
                        transform: [
                          {
                            translateY: scanLineAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [-SCAN_AREA_SIZE / 2, SCAN_AREA_SIZE / 2],
                            }),
                          },
                        ],
                      },
                    ]}
                  />
                )}

                {loading && (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#f59e0b" />
                  </View>
                )}
              </Animated.View>
            </View>
          )}

          {scanResult.type && (
            <View style={styles.resultContainer}>
              <View
                style={[
                  styles.resultCard,
                  scanResult.type === 'success' ? styles.resultSuccess : styles.resultError,
                ]}
              >
                <Text style={styles.resultIcon}>
                  {scanResult.type === 'success' ? '✓' : '✕'}
                </Text>
                <Text
                  style={[
                    styles.resultTitle,
                    scanResult.type === 'success' ? styles.resultTitleSuccess : styles.resultTitleError,
                  ]}
                >
                  {scanResult.title}
                </Text>
                <Text style={styles.resultMessage}>{scanResult.message}</Text>

                <View style={styles.resultActions}>
                  {scanResult.type === 'error' && (
                    <TouchableOpacity
                      style={[styles.resultButton, styles.resultButtonPrimary]}
                      onPress={handleRetry}
                    >
                      <Text style={styles.resultButtonPrimaryText}>Try Again</Text>
                    </TouchableOpacity>
                  )}

                  {scanResult.type === 'success' && scanMode === 'checkin' && (
                    <TouchableOpacity
                      style={[styles.resultButton, styles.resultButtonPrimary]}
                      onPress={() => navigation.goBack()}
                    >
                      <Text style={styles.resultButtonPrimaryText}>Done</Text>
                    </TouchableOpacity>
                  )}

                  {scanResult.type === 'success' && scanMode === 'checkout' && (
                    <TouchableOpacity
                      style={[styles.resultButton, styles.resultButtonPrimary]}
                      onPress={() => navigation.navigate('MainTabs' as never)}
                    >
                      <Text style={styles.resultButtonPrimaryText}>Back to Home</Text>
                    </TouchableOpacity>
                  )}

                  {scanResult.type === 'success' && scanMode === 'generic' && (
                    <TouchableOpacity
                      style={[styles.resultButton, styles.resultButtonPrimary]}
                      onPress={handleRetry}
                    >
                      <Text style={styles.resultButtonPrimaryText}>Scan Another</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={[styles.resultButton, styles.resultButtonSecondary]}
                    onPress={() => navigation.goBack()}
                  >
                    <Text style={styles.resultButtonSecondaryText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionsText}>{getInstructionText()}</Text>
          </View>

          {!scanResult.type && (
            <View style={styles.bottomControls}>
              <TouchableOpacity style={styles.controlButton} onPress={handleFlashToggle}>
                <Text style={styles.controlIcon}>{flashOn ? '⚡' : '🔦'}</Text>
                <Text style={styles.controlLabel}>Flash</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.mainScanButton}
                onPress={() => setScanned(false)}
              >
                <View style={styles.scanButtonInner}>
                  <Text style={styles.scanButtonIcon}>
                    {loading ? '⏳' : '📷'}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.controlButton}
                onPress={() => navigation.goBack()}
              >
                <Text style={styles.controlIcon}>✕</Text>
                <Text style={styles.controlLabel}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}

          {!scanResult.type && !loading && (
            <View style={styles.manualEntryContainer}>
              <TouchableOpacity
                style={styles.manualEntryToggle}
                onPress={() => setShowManualEntry(!showManualEntry)}
              >
                <Text style={styles.manualEntryToggleText}>
                  {showManualEntry ? 'Hide Manual Entry' : 'Enter Code Manually'}
                </Text>
              </TouchableOpacity>

              {showManualEntry && (
                <View style={styles.manualEntryForm}>
                  <TextInput
                    style={styles.manualEntryInput}
                    placeholder="Enter code or session ID"
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    value={manualCode}
                    onChangeText={setManualCode}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    style={styles.manualEntrySubmit}
                    onPress={handleManualSubmit}
                  >
                    <Text style={styles.manualEntrySubmitText}>Submit</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </SafeAreaView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButtonText: {
    fontSize: 20,
    color: '#fff',
    fontWeight: '600',
  },
  headerTitle: {
    ...typography.h3,
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  viewfinderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewfinder: {
    width: SCAN_AREA_SIZE,
    height: SCAN_AREA_SIZE,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#f59e0b',
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  scanLine: {
    position: 'absolute',
    left: 10,
    right: 10,
    height: 2,
    backgroundColor: '#f59e0b',
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  resultContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  resultCard: {
    width: '100%',
    borderRadius: 20,
    padding: spacing.xl,
    alignItems: 'center',
  },
  resultSuccess: {
    backgroundColor: 'rgba(16, 183, 127, 0.95)',
  },
  resultError: {
    backgroundColor: 'rgba(239, 68, 68, 0.95)',
  },
  resultIcon: {
    fontSize: 48,
    color: '#fff',
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  resultTitle: {
    ...typography.h3,
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  resultTitleSuccess: {
    color: '#fff',
  },
  resultTitleError: {
    color: '#fff',
  },
  resultMessage: {
    ...typography.body,
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  resultActions: {
    width: '100%',
    gap: spacing.sm,
  },
  resultButton: {
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  resultButtonPrimary: {
    backgroundColor: '#fff',
  },
  resultButtonPrimaryText: {
    ...typography.button,
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  resultButtonSecondary: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  resultButtonSecondaryText: {
    ...typography.button,
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  instructionsContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  instructionsText: {
    ...typography.body,
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  controlButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
  },
  controlIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  controlLabel: {
    color: '#fff',
    fontSize: 12,
  },
  mainScanButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#10b77f',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
  scanButtonInner: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanButtonIcon: {
    fontSize: 32,
  },
  permissionText: {
    ...typography.body,
    color: '#fff',
    textAlign: 'center',
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  permissionSubtext: {
    ...typography.body,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginBottom: spacing.lg,
    fontSize: 13,
  },
  permissionButton: {
    backgroundColor: '#10b77f',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 25,
  },
  permissionButtonText: {
    ...typography.button,
    color: '#fff',
  },
  manualEntryContainer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    alignItems: 'center',
  },
  manualEntryToggle: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  manualEntryToggleText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  manualEntryForm: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    width: '100%',
    gap: spacing.sm,
  },
  manualEntryInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  manualEntrySubmit: {
    backgroundColor: '#10b77f',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  manualEntrySubmitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
