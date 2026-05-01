import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, CommonActions } from '@react-navigation/native';
import * as Google from 'expo-auth-session';
import { makeRedirectUri } from 'expo-auth-session';
import { useAppDispatch, useAppSelector } from '../store';
import { login, signup, setUser, setToken } from '../store/slices/authSlice';
import { authAPI } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button } from '../components/Button';
import { colors, typography, spacing, borderRadius } from '../theme';
import { validateEmail, validatePassword } from '../utils/helpers';

const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '';

const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
};

// Production: Use native URI scheme (works in standalone builds)
// Development: Falls back to exp:// (won't work, use email/password for testing)
const redirectUri = makeRedirectUri({
  scheme: 'parknquik',
  // No path needed for production
});

// Debug: Log the redirect URI being used
console.log('🔍 OAuth Redirect URI (Production):', redirectUri);
if (__DEV__) {
  console.log('⚠️  Google OAuth requires standalone build. Use email/password for dev testing.');
}

const STITCH_COLORS = {
  primary: '#10b77f',
  accentOrange: colors.secondary,
  accentYellow: '#facc15',
  backgroundLight: '#f6f8f7',
  backgroundDark: '#10221c',
};

export const AuthScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [googleLoading, setGoogleLoading] = useState(false);

  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const authLoading = useAppSelector((state) => state.auth.loading);
  const authError = useAppSelector((state) => state.auth.error);

  const [request, response, promptAsync] = Google.useAuthRequest(
    {
      clientId: GOOGLE_CLIENT_ID,
      scopes: ['openid', 'profile', 'email'],
      redirectUri,
      responseType: 'code',
      usePKCE: false,
      prompt: Google.Prompt.SelectAccount, // Force account selection
    },
    discovery
  );

  React.useEffect(() => {
    console.log('🔍 OAuth Response:', response);

    if (response?.type === 'success') {
      const { code } = response.params;
      console.log('✅ Got OAuth code, sending to backend...');
      handleGoogleSignIn(code);
    } else if (response?.type === 'error') {
      console.error('❌ OAuth error:', response.error);
      Alert.alert('OAuth Error', response.error?.message || 'Authentication failed');
    } else if (response?.type === 'cancel') {
      console.log('⚠️ OAuth cancelled by user');
    }
  }, [response]);

  const handleGoogleSignIn = async (code: string) => {
    try {
      setGoogleLoading(true);
      // Send code to backend - backend exchanges it for tokens securely
      const userResponse = await authAPI.googleSignIn(code);
      const { token, user } = userResponse.data;

      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('user', JSON.stringify(user));
      dispatch(setUser(user));
      dispatch(setToken(token));
    } catch (error: any) {
      Alert.alert(
        'Google Sign In Failed',
        error.response?.data?.error || 'Please try again.'
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGooglePress = async () => {
    // In development, warn user that Google OAuth requires production build
    if (__DEV__) {
      Alert.alert(
        'Development Mode',
        'Google Sign-In requires a production build (EAS Build).\n\nFor development testing, please use email/password login.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Production: Launch Google OAuth
    promptAsync({ showInRecents: true });
  };

  const handleSubmit = async () => {
    const newErrors: typeof errors = {};

    if (activeTab === 'signup' && !name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(email)) {
      newErrors.email = 'Invalid email address';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else {
      const validation = validatePassword(password);
      if (!validation.valid) {
        newErrors.password = validation.message;
      }
    }

    if (activeTab === 'signup') {
      if (!confirmPassword) {
        newErrors.confirmPassword = 'Please confirm your password';
      } else if (password !== confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});

    try {
      if (activeTab === 'login') {
        await dispatch(login({ email, password })).unwrap();
      } else {
        await dispatch(signup({ name, email, password })).unwrap();
      }
    } catch (err: any) {
      Alert.alert(
        activeTab === 'login' ? 'Login Failed' : 'Signup Failed',
        err?.message || err?.error || (typeof err === 'string' ? err : 'An error occurred. Please try again.')
      );
    }
  };

  const handleForgotPassword = () => {
    navigation.dispatch(
      CommonActions.navigate({
        name: 'ForgotPassword',
      })
    );
  };

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Text style={styles.backIcon}>←</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Welcome Back</Text>
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.imageSection}>
            <View style={styles.imageOverlay}>
              <LinearGradient
                colors={['rgba(16, 183, 127, 0.9)', 'rgba(16, 183, 127, 0.4)', 'transparent']}
                style={styles.imageGradient}
              >
                <View style={styles.orangeOverlay} />
              </LinearGradient>
              <View style={styles.badgeContainer}>
                <View style={styles.badge}>
                  <Text style={styles.badgeIcon}>⚡</Text>
                  <Text style={styles.badgeText}>New Update</Text>
                </View>
              </View>
              <Text style={styles.imageTitle}>Start Your Journey</Text>
            </View>
          </View>

          <View style={styles.formSection}>
            <Text style={styles.formTitle}>Login or Sign Up</Text>
            <Text style={styles.formDescription}>
              Enter your details to explore our vibrant new ecosystem
            </Text>

            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[
                  styles.tab,
                  activeTab === 'login' && styles.activeTab,
                ]}
                onPress={() => setActiveTab('login')}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === 'login' && styles.activeTabText,
                  ]}
                >
                  Login
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.tab,
                  activeTab === 'signup' && styles.activeTab,
                ]}
                onPress={() => setActiveTab('signup')}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === 'signup' && styles.activeTabText,
                  ]}
                >
                  Sign Up
                </Text>
              </TouchableOpacity>
            </View>

            {activeTab === 'signup' && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <View style={[styles.inputContainer, errors.name && styles.inputError]}>
                  <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="John Doe"
                    placeholderTextColor={colors.textTertiary}
                  />
                </View>
                {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <View style={[styles.inputContainer, errors.email && styles.inputError]}>
                <Text style={styles.inputIcon}>✉️</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="name@example.com"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={[styles.inputContainer, errors.password && styles.inputError]}>
                <Text style={styles.inputIcon}>🔒</Text>
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textTertiary}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Text style={styles.eyeIcon}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
                </TouchableOpacity>
              </View>
              {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
            </View>

            {activeTab === 'signup' && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Confirm Password</Text>
                <View style={[styles.inputContainer, errors.confirmPassword && styles.inputError]}>
                  <Text style={styles.inputIcon}>🔒</Text>
                  <TextInput
                    style={styles.input}
                    value={confirmPassword}
                    onChangeText={(text) => {
                      setConfirmPassword(text);
                      if (errors.confirmPassword) setErrors((e) => ({ ...e, confirmPassword: undefined }));
                    }}
                    placeholder="••••••••"
                    placeholderTextColor={colors.textTertiary}
                    secureTextEntry={!showPassword}
                  />
                </View>
                {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
              </View>
            )}

            <View style={styles.rememberRow}>
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => setRememberMe(!rememberMe)}
              >
                <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                  {rememberMe && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.checkboxLabel}>Remember me</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleForgotPassword}>
                <Text style={styles.forgotPassword}>Forgot password?</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.continueButton}
              onPress={handleSubmit}
              activeOpacity={0.8}
              disabled={authLoading}
            >
              <LinearGradient
                colors={[STITCH_COLORS.primary, STITCH_COLORS.accentOrange]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.gradientButton, authLoading && styles.gradientButtonDisabled]}
              >
                <Text style={styles.continueButtonText}>
                  {authLoading ? 'Please wait...' : 'Continue to Dashboard'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {authError && (
              <View style={styles.authErrorContainer}>
                <Text style={styles.authErrorText}>{authError}</Text>
              </View>
            )}

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Or continue with</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.socialButtons}>
              <TouchableOpacity
                style={styles.socialButton}
                onPress={handleGooglePress}
                disabled={!request || googleLoading}
              >
                <Text style={styles.socialIcon}>G</Text>
                <Text style={styles.socialButtonText}>
                  {googleLoading ? 'Signing in...' : 'Google'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.socialButton, styles.socialButtonDisabled]}
                disabled={true}
              >
                <Text style={styles.socialIcon}>🍎</Text>
                <Text style={[styles.socialButtonText, styles.socialButtonTextDisabled]}>Apple (Soon)</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <LinearGradient
        colors={[STITCH_COLORS.primary, STITCH_COLORS.accentYellow, STITCH_COLORS.accentOrange]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.bottomBar}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: STITCH_COLORS.backgroundLight,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: `${STITCH_COLORS.primary}10`,
  },
  backButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: STITCH_COLORS.primary,
  },
  headerTitle: {
    ...typography.h6,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'center',
    marginRight: 48,
  },
  headerSpacer: {
    width: 48,
  },
  imageSection: {
    width: '100%',
    minHeight: 200,
    backgroundColor: `${STITCH_COLORS.primary}33`,
  },
  imageOverlay: {
    flex: 1,
    minHeight: 200,
    justifyContent: 'flex-end',
    padding: spacing.lg,
  },
  imageGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  orangeOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  badgeContainer: {
    position: 'relative',
    zIndex: 10,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: STITCH_COLORS.accentYellow,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
  },
  badgeIcon: {
    fontSize: 12,
    marginRight: spacing.xs,
  },
  badgeText: {
    ...typography.small,
    fontWeight: '700',
    color: STITCH_COLORS.backgroundDark,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  imageTitle: {
    ...typography.h2,
    fontWeight: '700',
    color: colors.white,
    position: 'relative',
    zIndex: 10,
  },
  formSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxxl,
  },
  formTitle: {
    ...typography.h3,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  formDescription: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: `${STITCH_COLORS.primary}15`,
    borderRadius: borderRadius.lg,
    padding: spacing.xs,
    marginBottom: spacing.xl,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: borderRadius.md,
  },
  activeTab: {
    backgroundColor: colors.white,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  activeTabText: {
    color: STITCH_COLORS.primary,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: `${STITCH_COLORS.primary}30`,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
  },
  inputError: {
    borderColor: colors.error,
    borderWidth: 2,
  },
  inputIcon: {
    fontSize: 18,
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    paddingVertical: spacing.md,
  },
  eyeButton: {
    padding: spacing.xs,
  },
  eyeIcon: {
    fontSize: 18,
  },
  errorText: {
    ...typography.small,
    color: colors.error,
    marginTop: spacing.xs,
  },
  rememberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: `${STITCH_COLORS.primary}50`,
    marginRight: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: STITCH_COLORS.primary,
    borderColor: STITCH_COLORS.primary,
  },
  checkmark: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  checkboxLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  forgotPassword: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: STITCH_COLORS.accentOrange,
  },
  continueButton: {
    marginBottom: spacing.xl,
  },
  gradientButton: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    shadowColor: STITCH_COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  continueButtonText: {
    ...typography.button,
    fontWeight: '700',
    color: colors.white,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: `${STITCH_COLORS.primary}15`,
  },
  dividerText: {
    ...typography.small,
    color: colors.textTertiary,
    marginHorizontal: spacing.lg,
  },
  socialButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: `${STITCH_COLORS.primary}20`,
  },
  socialIcon: {
    fontSize: 18,
    marginRight: spacing.sm,
  },
  socialButtonText: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  socialButtonDisabled: {
    opacity: 0.5,
    backgroundColor: '#e2e8f0',
  },
  socialButtonTextDisabled: {
    color: '#94a3b8',
  },
  bottomBar: {
    height: 8,
  },
  gradientButtonDisabled: {
    opacity: 0.7,
  },
  authErrorContainer: {
    backgroundColor: '#fef2f2',
    borderColor: colors.error,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  authErrorText: {
    ...typography.bodySmall,
    color: colors.error,
    textAlign: 'center',
  },
});
