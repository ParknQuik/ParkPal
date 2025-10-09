import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppDispatch, useAppSelector } from '../store';
import { login, signup } from '../store/slices/authSlice';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { colors, typography, spacing, borderRadius } from '../theme';
import { validateEmail, validatePassword } from '../utils/helpers';

export const AuthScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
  }>({});

  const dispatch = useAppDispatch();
  const { loading } = useAppSelector((state) => state.auth);

  const handleSubmit = () => {
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

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});

    if (activeTab === 'login') {
      dispatch(login({ email, password }));
    } else {
      dispatch(signup({ name, email, password }));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={colors.gradientPrimary}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.logo}>ParkPal</Text>
            <Text style={styles.tagline}>Find & Reserve Parking Instantly</Text>
          </View>

          <View style={styles.formContainer}>
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

            <View style={styles.form}>
              {activeTab === 'signup' && (
                <Input
                  label="Full Name"
                  value={name}
                  onChangeText={setName}
                  placeholder="John Doe"
                  error={errors.name}
                />
              )}
              <Input
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="john@example.com"
                error={errors.email}
              />
              <Input
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="********"
                secureTextEntry
                error={errors.password}
              />

              <Button
                title={activeTab === 'login' ? 'Login' : 'Sign Up'}
                onPress={handleSubmit}
                loading={loading}
                style={styles.submitButton}
              />

              {activeTab === 'login' && (
                <TouchableOpacity style={styles.forgotPassword}>
                  <Text style={styles.forgotPasswordText}>
                    Forgot Password?
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.socialButtons}>
              <TouchableOpacity style={styles.socialButton}>
                <Text style={styles.socialButtonText}>Continue with Google</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialButton}>
                <Text style={styles.socialButtonText}>Continue with Apple</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xxxl,
  },
  logo: {
    ...typography.h1,
    color: colors.white,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  tagline: {
    ...typography.body,
    color: colors.white,
    opacity: 0.9,
  },
  formContainer: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xxl,
    padding: spacing.xxl,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.xs,
    marginBottom: spacing.xxl,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: borderRadius.md,
  },
  activeTab: {
    backgroundColor: colors.white,
  },
  tabText: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  activeTabText: {
    color: colors.primary,
  },
  form: {
    marginBottom: spacing.xl,
  },
  submitButton: {
    marginTop: spacing.md,
  },
  forgotPassword: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  forgotPasswordText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    ...typography.small,
    color: colors.textTertiary,
    marginHorizontal: spacing.lg,
  },
  socialButtons: {
    gap: spacing.md,
  },
  socialButton: {
    backgroundColor: colors.background,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  socialButtonText: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
});
