import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { authAPI } from '../services/api';
import { colors, typography, spacing } from '../theme';

type ResetPasswordRouteParams = {
  ResetPassword: {
    token: string;
  };
};

export const ResetPasswordScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<ResetPasswordRouteParams, 'ResetPassword'>>();
  const token = route.params?.token ?? '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<{ newPassword?: string; confirmPassword?: string }>({});

  const validate = () => {
    const newErrors: typeof errors = {};

    if (!newPassword) {
      newErrors.newPassword = 'Password is required';
    } else if (newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters';
    } else if (!/[A-Z]/.test(newPassword)) {
      newErrors.newPassword = 'Password must contain at least one uppercase letter';
    } else if (!/[0-9]/.test(newPassword)) {
      newErrors.newPassword = 'Password must contain at least one number';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      await authAPI.resetPassword(token, newPassword);
      setSuccess(true);
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to reset password';
      if (message.toLowerCase().includes('expired') || message.toLowerCase().includes('invalid')) {
        setErrors({
          newPassword: 'This reset link has expired or is invalid. Please request a new one.',
        });
      } else {
        setErrors({ newPassword: message });
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="checkmark-circle-outline" size={56} color={colors.success || colors.primary} />
          </View>
          <Text style={styles.successTitle}>Password Reset!</Text>
          <Text style={styles.successBody}>
            Your password has been changed successfully. You can now log in with your new password.
          </Text>
          <Button
            title="Back to Login"
            variant="gradient"
            onPress={() => {
              // Navigate back to Auth screen (root of AuthStack)
              navigation.navigate('Auth' as never);
            }}
            style={styles.backButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (!token) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="alert-circle-outline" size={56} color={colors.error} />
          </View>
          <Text style={styles.successTitle}>Invalid Link</Text>
          <Text style={styles.successBody}>
            This password reset link is invalid or has expired. Please request a new one.
          </Text>
          <Button
            title="Request New Link"
            variant="gradient"
            onPress={() => navigation.navigate('ForgotPassword' as never)}
            style={styles.backButton}
          />
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
          <TouchableOpacity style={styles.backArrow} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.iconCircle}>
            <Ionicons name="lock-closed-outline" size={48} color={colors.primary} />
          </View>

          <Text style={styles.title}>Create New Password</Text>
          <Text style={styles.subtitle}>
            Your new password must be at least 8 characters and contain an uppercase letter and a number.
          </Text>

          <View style={styles.form}>
            <Input
              label="New Password"
              value={newPassword}
              onChangeText={(text) => {
                setNewPassword(text);
                if (errors.newPassword) setErrors((e) => ({ ...e, newPassword: undefined }));
              }}
              placeholder="Enter new password"
              secureTextEntry={!showPassword}
              error={errors.newPassword}
              rightElement={
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              }
            />

            <Input
              label="Confirm New Password"
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                if (errors.confirmPassword) setErrors((e) => ({ ...e, confirmPassword: undefined }));
              }}
              placeholder="Confirm new password"
              secureTextEntry={!showConfirm}
              error={errors.confirmPassword}
              rightElement={
                <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
                  <Ionicons
                    name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              }
            />

            <Button
              title={loading ? 'Resetting...' : 'Reset Password'}
              variant="gradient"
              onPress={handleSubmit}
              loading={loading}
              disabled={loading}
              style={styles.submitButton}
            />
          </View>
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
  // Success / Error states
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
    marginBottom: spacing.xxl,
  },
  backButton: {
    width: '100%',
  },
});
