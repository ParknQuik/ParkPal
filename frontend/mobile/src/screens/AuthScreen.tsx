import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, CommonActions } from '@react-navigation/native';
import * as Google from 'expo-auth-session';
import { makeRedirectUri } from 'expo-auth-session';
import { useAppDispatch, useAppSelector } from '../store';
import { login, signup, setUser, setToken } from '../store/slices/authSlice';
import { authAPI } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { typography, spacing, borderRadius } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { validateEmail, validatePassword } from '../utils/helpers';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useStatusBarStyle } from '../hooks/useStatusBarStyle';

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
;
if (__DEV__) {
  ;
}

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
  const { colors } = useTheme();
  const statusBarStyle = useStatusBarStyle();
  const authLoading = useAppSelector((state) => state.auth.loading);
  const authError = useAppSelector((state) => state.auth.error);
  const authBusy = authLoading || googleLoading;
  const submitButtonLabel = activeTab === 'login' ? 'Login' : 'Sign Up';

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
    ;

    if (response?.type === 'success') {
      const { code } = response.params;
      ;
      handleGoogleSignIn(code);
    } else if (response?.type === 'error') {
      ;
      Alert.alert('OAuth Error', response.error?.message || 'Authentication failed');
    } else if (response?.type === 'cancel') {
      ;
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
    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (activeTab === 'signup') {
      if (!normalizedName) {
        newErrors.name = 'Name is required';
      } else if (normalizedName.length < 2) {
        newErrors.name = 'Name must be at least 2 characters';
      }
    }

    if (!normalizedEmail) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(normalizedEmail)) {
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
        await dispatch(login({ email: normalizedEmail, password })).unwrap();
      } else {
        await dispatch(signup({ name: normalizedName, email: normalizedEmail, password })).unwrap();
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

  const styles = React.useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    keyboardView: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: spacing.lg,
      paddingTop: Platform.OS === 'ios' ? spacing.xxl : spacing.xl,
      paddingBottom: spacing.xxl,
    },
    formSection: {
      flex: 1,
      width: '100%',
      maxWidth: 430,
      alignSelf: 'center',
      justifyContent: 'center',
    },
    introSection: {
      alignItems: 'center',
      marginBottom: spacing.lg,
    },
    brandLockup: {
      alignItems: 'center',
      marginBottom: spacing.lg,
    },
    brandMark: {
      width: 52,
      height: 52,
      borderRadius: borderRadius.full,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.md,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.16,
      shadowRadius: 8,
      elevation: 3,
    },
    brandAccent: {
      position: 'absolute',
      right: -2,
      bottom: 4,
      width: 14,
      height: 14,
      borderRadius: borderRadius.full,
      backgroundColor: colors.secondary,
      borderWidth: 2,
      borderColor: colors.background,
    },
    formTitle: {
      ...typography.h4,
      fontWeight: '700',
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: spacing.xs,
    },
    formDescription: {
      ...typography.bodySmall,
      color: colors.textSecondary,
      textAlign: 'center',
      maxWidth: 320,
    },
    tabContainer: {
      flexDirection: 'row',
      backgroundColor: colors.authTabBackground,
      borderRadius: borderRadius.xl,
      borderWidth: 1,
      borderColor: colors.authInputBorder,
      padding: spacing.xs,
      marginBottom: spacing.lg,
    },
    tab: {
      flex: 1,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: borderRadius.lg,
    },
    activeTab: {
      backgroundColor: colors.primary,
    },
    tabText: {
      ...typography.bodySmall,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    activeTabText: {
      color: colors.white,
    },
    inputGroup: {
      marginBottom: spacing.md,
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
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.authInputBorder,
      borderRadius: borderRadius.xl,
      minHeight: 54,
      paddingHorizontal: spacing.lg,
    },
    inputError: {
      borderColor: colors.error,
      borderWidth: 2,
    },
    input: {
      flex: 1,
      ...typography.body,
      color: colors.textPrimary,
      paddingVertical: spacing.sm,
    },
    inputIcon: {
      marginRight: spacing.md,
    },
    eyeButton: {
      minWidth: 36,
      minHeight: 36,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: -spacing.xs,
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
      flexWrap: 'wrap',
      rowGap: spacing.sm,
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
      borderColor: colors.authCheckboxBorder,
      marginRight: spacing.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxChecked: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    checkboxLabel: {
      ...typography.bodySmall,
      color: colors.textSecondary,
    },
    forgotPassword: {
      ...typography.bodySmall,
      fontWeight: '600',
      color: colors.secondary,
    },
    continueButton: {
      marginBottom: spacing.lg,
    },
    gradientButton: {
      minHeight: 54,
      justifyContent: 'center',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xl,
      borderRadius: borderRadius.xl,
      alignItems: 'center',
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: 0.18,
      shadowRadius: 10,
      elevation: 3,
    },
    continueButtonText: {
      ...typography.button,
      fontWeight: '700',
      color: colors.white,
    },
    divider: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.lg,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: colors.authDivider,
    },
    dividerText: {
      ...typography.small,
      color: colors.textTertiary,
      marginHorizontal: spacing.lg,
    },
    socialButtons: {
      width: '100%',
    },
    socialButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      minHeight: 52,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      borderRadius: borderRadius.xl,
      borderWidth: 1,
      borderColor: colors.authInputBorder,
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
    gradientButtonDisabled: {
      opacity: 0.7,
    },
    authErrorContainer: {
      backgroundColor: colors.authErrorSurface,
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
  }), [colors]);

  return (
    <View style={styles.container}>
      <StatusBar style={statusBarStyle} backgroundColor={colors.background} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.formSection}>
            <View style={styles.introSection}>
              <View style={styles.brandLockup}>
                <View style={styles.brandMark}>
                  <MaterialCommunityIcons name="parking" size={26} color={colors.white} />
                  <View style={styles.brandAccent} />
                </View>
                <Text style={styles.formTitle}>ParknQuik</Text>
                <Text style={styles.formDescription}>
                  Sign in or create an account to manage parking in minutes.
                </Text>
              </View>

              <View style={styles.tabContainer}>
                <TouchableOpacity
                  style={[
                    styles.tab,
                    activeTab === 'login' && styles.activeTab,
                  ]}
                  onPress={() => setActiveTab('login')}
                  disabled={authBusy}
                  accessibilityRole="tab"
                  accessibilityLabel="Login tab"
                  accessibilityState={{ selected: activeTab === 'login', disabled: authBusy }}
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
                  disabled={authBusy}
                  accessibilityRole="tab"
                  accessibilityLabel="Sign Up tab"
                  accessibilityState={{ selected: activeTab === 'signup', disabled: authBusy }}
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
            </View>

            {activeTab === 'signup' && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <View style={[styles.inputContainer, errors.name && styles.inputError]}>
                  <MaterialCommunityIcons
                    name="account-outline"
                    size={20}
                    color={colors.textSecondary}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="John Doe"
                    placeholderTextColor={colors.textTertiary}
                    editable={!authBusy}
                  />
                </View>
                {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <View style={[styles.inputContainer, errors.email && styles.inputError]}>
                <MaterialCommunityIcons
                  name="email-outline"
                  size={20}
                  color={colors.textSecondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="name@example.com"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!authBusy}
                />
              </View>
              {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={[styles.inputContainer, errors.password && styles.inputError]}>
                <MaterialCommunityIcons
                  name="lock-outline"
                  size={20}
                  color={colors.textSecondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textTertiary}
                  secureTextEntry={!showPassword}
                  editable={!authBusy}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                  disabled={authBusy}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                  accessibilityState={{ disabled: authBusy }}
                >
                  <MaterialCommunityIcons name={showPassword ? "eye-outline" : "eye-off-outline"} size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
            </View>

            {activeTab === 'signup' && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Confirm Password</Text>
                <View style={[styles.inputContainer, errors.confirmPassword && styles.inputError]}>
                  <MaterialCommunityIcons
                    name="lock-outline"
                    size={20}
                    color={colors.textSecondary}
                    style={styles.inputIcon}
                  />
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
                    editable={!authBusy}
                  />
                </View>
                {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
              </View>
            )}

            {activeTab === 'login' && (
              <View style={styles.rememberRow}>
                <TouchableOpacity
                  style={styles.checkboxContainer}
                  onPress={() => setRememberMe(!rememberMe)}
                  disabled={authBusy}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: rememberMe, disabled: authBusy }}
                >
                  <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                    {rememberMe && <MaterialCommunityIcons name="check" size={16} color={colors.white} />}
                  </View>
                  <Text style={styles.checkboxLabel}>Remember me</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleForgotPassword}
                  disabled={authBusy}
                  accessibilityRole="button"
                  accessibilityLabel="Forgot password?"
                  accessibilityState={{ disabled: authBusy }}
                >
                  <Text style={styles.forgotPassword}>Forgot password?</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              style={styles.continueButton}
              onPress={handleSubmit}
              activeOpacity={0.8}
              disabled={authBusy}
              accessibilityRole="button"
              accessibilityLabel={submitButtonLabel}
              accessibilityState={{ disabled: authBusy, busy: authBusy }}
            >
              <LinearGradient
                colors={[colors.primary, colors.secondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.gradientButton, authBusy && styles.gradientButtonDisabled]}
              >
                {authLoading ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <Text style={styles.continueButtonText}>
                    {submitButtonLabel}
                  </Text>
                )}
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
                disabled={!request || authBusy}
                accessibilityRole="button"
                accessibilityLabel={googleLoading ? 'Signing in with Google' : 'Continue with Google'}
                accessibilityState={{ disabled: !request || authBusy, busy: googleLoading }}
              >
                <MaterialCommunityIcons
                  name="google"
                  size={18}
                  color={colors.textPrimary}
                  style={styles.socialIcon}
                />
                <Text style={styles.socialButtonText}>
                  {googleLoading ? 'Signing in...' : 'Continue with Google'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};
