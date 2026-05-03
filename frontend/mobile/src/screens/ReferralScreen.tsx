import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppSelector } from '../store';
import { ReferralCodeDisplay } from '../components/ReferralCodeDisplay';
import { colors, typography, spacing, borderRadius } from '../theme';

export const ReferralScreen: React.FC = () => {
  const navigation = useNavigation();

  const referralStats = useAppSelector((state) => state.points.referralStats);

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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Referrals</Text>
          <View style={styles.placeholder} />
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <ReferralCodeDisplay />

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>How It Works</Text>
          {howItWorksSteps.map((step, index) => (
            <View key={index} style={styles.stepItem}>
              <View style={styles.stepNumberContainer}>
                <Text style={styles.stepNumber}>{index + 1}</Text>
              </View>
              <View style={styles.stepContent}>
                <View style={styles.stepIconContainer}>
                  <MaterialCommunityIcons name={step.icon as any} size={24} color={colors.primary} />
                </View>
                <View style={styles.stepTextContainer}>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepDescription}>{step.description}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.summaryContainer}>
          <Text style={styles.summaryTitle}>Your Referral Summary</Text>
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { flex: 1, marginRight: spacing.sm }]}>
              <MaterialCommunityIcons name="account-multiple" size={32} color={colors.primary} />
              <Text style={styles.statValue}>{totalReferrals.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Total Referrals</Text>
            </View>
            <View style={[styles.statCard, { flex: 1, marginLeft: spacing.sm }]}>
              <MaterialCommunityIcons name="star" size={32} color={colors.secondary} />
              <Text style={[styles.statValue, { color: colors.success }]}>
                {totalPointsEarned.toLocaleString()}
              </Text>
              <Text style={styles.statLabel}>Points Earned</Text>
            </View>
          </View>
          <View style={[styles.statCard, { marginTop: spacing.sm }]}>
            <MaterialCommunityIcons name="account-check" size={24} color={colors.accent} />
            <Text style={styles.statValueSecondary}>{activeReferrals} Active Referrals</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  title: {
    ...typography.h5,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  placeholder: {
    width: 40,
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
    marginBottom: spacing.sm,
  },
  statCard: {
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
});
