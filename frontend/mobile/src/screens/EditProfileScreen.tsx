import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../store';
import { updateUserProfile } from '../store/slices/authSlice';
import { Card } from '../components/Card';
import { colors, typography, spacing, borderRadius } from '../theme';

export const EditProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Name is required');
      return;
    }

    try {
      setLoading(true);
      await dispatch(
        updateUserProfile({
          name: name.trim(),
          phone: phone.trim() || null,
        })
      ).unwrap();

      Alert.alert('Success', 'Profile updated successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Edit Profile</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.card}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Name *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter your name"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Phone</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="Enter your phone number (optional)"
              placeholderTextColor={colors.textTertiary}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, styles.inputDisabled]}
              value={user?.email || ''}
              editable={false}
            />
            <Text style={styles.helperText}>Email cannot be changed</Text>
          </View>
        </Card>

        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.sm,
  },
  backText: {
    ...typography.body,
    color: colors.primary,
    fontSize: 24,
  },
  title: {
    ...typography.h5,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  placeholder: {
    width: 50,
  },
  content: {
    flex: 1,
    padding: spacing.xl,
  },
  card: {
    marginBottom: spacing.xl,
  },
  formGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  input: {
    ...typography.body,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    color: colors.textPrimary,
  },
  inputDisabled: {
    backgroundColor: colors.background,
    color: colors.textSecondary,
  },
  helperText: {
    ...typography.small,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    ...typography.body,
    color: colors.white,
    fontWeight: '700',
  },
});
