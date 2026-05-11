import React, { useEffect, useMemo } from 'react';
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
import { useAppSelector, useAppDispatch } from '../store';
import { ReferralCodeDisplay } from '../components/ReferralCodeDisplay';
import { useTheme } from '../context/ThemeContext';
import { typography, spacing, borderRadius } from '../theme';
import { useStatusBarStyle } from '../hooks/useStatusBarStyle';
import { StatusBar } from 'expo-status-bar';
import { fetchReferralStats } from '../store/slices/pointsSlice';
import { AppHeader } from '../components/AppHeader';

export const ReferralScreen: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();

  const statusBarStyle = useStatusBarStyle();

  const referralStats = useAppSelector((state) => state.points.referralStats);

  useEffect(() => {
    dispatch(fetchReferralStats());
  }, [dispatch]);

  const handleBack = () => {
    navigation.goBack();
  };

  const totalPointsEarned = referralStats?.totalPointsEarned || 0;
  const totalReferrals = referralStats?.totalReferrals || 0;
  const activeReferrals = referralStats?.activeReferrals || 0;

  const howItWorksSteps = [
    {
      icon: 'share-variant',
      title: 'Share Your Code',
      description: 'Send your unique referral code to friends via text, email, or social media.',
    },
    {
      icon: 'account-check',
      title: 'Friend Signs Up',
      description: 'Your friend creates a ParkPal account using your referral code.',
    },
    {
      icon: 'trophy',
      title: 'Both Earn Points',
      description: 'You and your friend both receive bonus points when they complete their first booking.',
    },
  ];

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    safeArea: {
      backgroundColor: colors.primary,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: spacing.xl,
    },
    sectionContainer: {
      backgroundColor: colors.white,
      marginTop: spacing.md,
      padding: spacing.lg,
    },
    sectionTitle: {
      ...typography.h5,
      color: colors.textPrimary,
      fontWeight: '700',
      marginBottom: spacing.lg,
    },
    stepItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: spacing.lg,
    },
    stepNumberContainer: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: spacing.md,
    },
    stepNumber: {
      color: colors.white,
      fontSize: 14,
      fontWeight: '700',
    },
    stepContent: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    stepIconContainer: {
      width: 48,
      height: 48,
      borderRadius: borderRadius.lg,
      backgroundColor: 'rgba(16, 183, 127, 0.1)',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: spacing.md,
    },
    stepTextContainer: {
      flex: 1,
    },
    stepTitle: {
      ...typography.body,
      color: colors.textPrimary,
      fontWeight: '600',
      marginBottom: spacing.xs,
    },
    stepDescription: {
      ...typography.bodySmall,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    summaryContainer: {
      backgroundColor: colors.white,
      marginTop: spacing.md,
      padding: spacing.lg,
    },
    summaryTitle: {
      ...typography.h5,
      color: colors.textPrimary,
      fontWeight: '700',
      marginBottom: spacing.md,
    },
    statsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
      marginBottom: spacing.sm,
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.background,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statValue: {
      ...typography.h3,
      color: colors.textPrimary,
      fontWeight: '700',
      marginVertical: spacing.xs,
    },
    statValueSecondary: {
      ...typography.body,
      color: colors.accent,
      fontWeight: '600',
      marginTop: spacing.xs,
    },
    statLabel: {
      ...typography.caption,
      color: colors.textSecondary,
      textAlign: 'center',
    },
  }), [colors]);

  return (
    <>
      <StatusBar style={statusBarStyle} />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <AppHeader title="Referral Program" onBack={handleBack} />
          <ScrollView style={styles.scrollView}>
            <View style={styles.scrollContent}>
              <ReferralCodeDisplay />
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>How It Works</Text>
                {howItWorksSteps.map((step, index) => (
                  <View key={index} style={styles.stepItem}>
                    <View style={styles.stepNumberContainer}>
                      <Text style={styles.stepNumber}>{index + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.stepIconContainer}>
                        <MaterialCommunityIcons name={step.icon as keyof typeof MaterialCommunityIcons.glyphMap} size={24} color={colors.primary} />
                      </View>
                      <View style={styles.stepTextContainer}>
                        <Text style={styles.stepTitle}>{step.title}</Text>
                        <Text style={styles.stepDescription}>{step.description}</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
              <View style={styles.sectionContainer}>
                <Text style={styles.summaryTitle}>Your Referral Stats</Text>
                <View style={styles.statsRow}>
                  <View style={styles.statCard}>
                    <Text style={styles.statValue}>{totalReferrals}</Text>
                    <Text style={styles.statLabel}>Total Referrals</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statValue}>{activeReferrals}</Text>
                    <Text style={styles.statLabel}>Active Referrals</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statValueSecondary}>{totalPointsEarned}</Text>
                    <Text style={styles.statLabel}>Points Earned</Text>
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    </>
  );
};

