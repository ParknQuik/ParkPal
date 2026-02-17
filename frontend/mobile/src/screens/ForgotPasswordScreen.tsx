import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { authAPI } from '../services/api';
import { colors, typography, spacing, borderRadius } from '../theme';

export const ForgotPasswordScreen: React.FC = () => {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const validateEmail = (value: string) => {
    if (!value.trim()) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Please enter a valid email address';
    return '';
  };

  const handleSubmit = async () => {
    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }

    setError('');
    setLoading(true);
    try {
      await authAPI.forgotPassword(email.trim().toLowerCase());
      setSubmitted(true);
    } catch (err: any) {
      // Always show success to prevent email enumeration
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="mail-outline" size={48} color={colors.primary} />
          </View>
          <Text style={styles.successTitle}>Check Your Email</Text>
          <Text style={styles.successBody}>
            If an account exists for{' '}
            <Text style={styles.emailHighlight}>{email}</Text>, you will receive
            a password reset link shortly.
          </Text>
          <Text style={styles.successHint}>
            Didn't receive an email? Check your spam folder or try again.
          </Text>
          <Button
            title="Back to Login"
            variant="gradient"
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          />
          <TouchableOpacity
            style={styles.tryAgainLink}
            onPress={() => {
              setSubmitted(false);
              setEmail('');
            }}
          >
            <Text style={styles.tryAgainText}>Try a different email</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <TouchableOpacity style={styles.backArrow} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.iconCircle}>
            <Ionicons name="lock-open-outline" size={48} color={colors.primary} />
          </View>

          <Text style={styles.title}>Forgot Password?</Text>
          <Text style={styles.subtitle}>
            Enter the email address associated with your account and we'll send you a link to reset
            your password.
          </Text>

          {/* Form */}
          <View style={styles.form}>
            <Input
              label="Email Address"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (error) setError('');
              }}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              error={error}
            />

            <Button
              title={loading ? 'Sending...' : 'Send Reset Link'}
              variant="gradient"
              onPress={handleSubmit}
              loading={loading}
              disabled={loading}
              style={styles.submitButton}
            />
          </View>

          <TouchableOpacity style={styles.loginLink} onPress={() => navigation.goBack()}>
            <Text style={styles.loginLinkText}>
              Remember your password?{' '}
              <Text style={styles.loginLinkHighlight}>Log In</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  backArrow: {
    marginBottom: spacing.xl,
    alignSelf: 'flex-start',
    padding: spacing.xs,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primaryLight || `${colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xxl,
  },
  form: {
    marginBottom: spacing.xl,
  },
  submitButton: {
    marginTop: spacing.md,
  },
  loginLink: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  loginLinkText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  loginLinkHighlight: {
    color: colors.primary,
    fontWeight: '600',
  },
  // Success state
  successContainer: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    alignItems: 'center',
  },
  successTitle: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  successBody: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  emailHighlight: {
    color: colors.text,
    fontWeight: '600',
  },
  successHint: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xxl,
  },
  backButton: {
    width: '100%',
    marginBottom: spacing.lg,
  },
  tryAgainLink: {
    paddingVertical: spacing.md,
  },
  tryAgainText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
});
