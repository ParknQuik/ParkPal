// ParkPal Mobile App - Referral Code Display Component
// Component for displaying user's referral code with share functionality

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Share,
  Alert,
} from 'react-native';
import { SvgXml } from 'react-native-svg';
import { useSelector } from 'react-redux';
import { RootState } from '../types';
import { generateReferralCode, fetchReferralStats } from '../store/slices/pointsSlice';
import { Button } from './Button';
import { Card } from './Card';
import { spacing, borderRadius } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { useAppDispatch } from '../store';

// Share icon SVG
const shareIcon = `
<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M18 8C19.6569 8 21 6.65685 21 5C21 3.34315 19.6569 2 18 2C16.3431 2 15 3.34315 15 5C15 6.65685 16.3431 8 18 8Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M6 15C7.65685 15 9 13.6569 9 12C9 10.3431 7.65685 9 6 9C4.34315 9 3 10.3431 3 12C3 13.6569 4.34315 15 6 15Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M18 22C19.6569 22 21 20.6569 21 19C21 17.3431 19.6569 16 18 16C16.3431 16 15 17.3431 15 19C15 20.6569 16.3431 22 18 22Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M8.59 13.51L15.42 17.49" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M15.41 6.51L8.59 10.49" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`;

// Link icon SVG
const linkIcon = `
<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M10 13C9.85892 13 9.71914 13.0284 9.5891 13.0826C9.45905 13.1367 9.34333 13.2149 9.24929 13.311C9.15525 13.4072 9.08538 13.5196 9.04422 13.6416C9.00305 13.7636 8.99162 13.8926 9.01084 14.021C9.03006 14.1493 9.0792 14.2743 9.15533 14.3895C9.23146 14.5047 9.33298 14.6076 9.45361 14.6926C9.57424 14.7775 9.71155 14.8425 9.8578 14.8838C9.99408 14.9228 10.1408 14.93 10.286 14.93C10.5856 14.9298 10.8821 14.8708 11.161 14.7563C11.4398 14.6417 11.696 14.4736 11.9167 14.2592C12.2803 13.8688 12.5 13.343 12.5 12.793C12.5 11.7276 12.0612 10.7044 11.2929 9.93604C10.8985 9.54991 10.4288 9.24425 9.90827 9.03931C9.38775 8.83436 8.82636 8.73472 8.26 8.74699M14 11C14.1411 11 14.2809 10.9716 14.4109 10.9174C14.541 10.8633 14.6567 10.7851 14.7507 10.689C14.8448 10.5928 14.9146 10.4804 14.9558 10.3584C14.997 10.2364 15.0084 10.1074 14.9892 9.97902C14.97 9.85068 14.9209 9.72566 14.8447 9.6105C14.7686 9.49534 14.6671 9.39239 14.5465 9.30745C14.4259 9.2225 14.2886 9.15749 14.1424 9.11615C14.0061 9.07721 13.8594 9.07002 13.7142 9.07C13.4147 9.07027 13.1183 9.12925 12.8394 9.24391C12.5606 9.35856 12.3044 9.52664 12.0837 9.74096C11.7201 10.1314 11.5 10.6572 11.5 11.207C11.5 12.2724 11.9388 13.2956 12.7071 14.064C13.1015 14.4501 13.5712 14.7558 14.0917 14.9607C14.6123 15.1656 15.1737 15.2653 15.74 15.253M9 17H15M12 15V19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`;

export const ReferralCodeDisplay: React.FC = () => {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const referralCode = useSelector((state: RootState) => state.points.referralCode);
  const referralStats = useSelector((state: RootState) => state.points.referralStats);
  const loading = useSelector((state: RootState) => state.points.loading);
  const [isGenerating, setIsGenerating] = useState(false);

  const styles = React.useMemo(() => StyleSheet.create({
    container: {
      marginHorizontal: spacing.md,
      marginVertical: spacing.sm,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: spacing.xl,
    },
    emptyIcon: {
      width: 64,
      height: 64,
      borderRadius: borderRadius.xl,
      backgroundColor: 'rgba(16, 183, 127, 0.1)',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacing.lg,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: spacing.sm,
    },
    emptyDescription: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: spacing.xl,
      lineHeight: 20,
      paddingHorizontal: spacing.lg,
    },
    generateButton: {
      width: '100%',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.lg,
    },
    headerIcon: {
      width: 32,
      height: 32,
      borderRadius: borderRadius.lg,
      backgroundColor: 'rgba(16, 183, 127, 0.1)',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: spacing.md,
    },
    headerText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    codeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      marginBottom: spacing.lg,
    },
    codeWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    codeText: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.primary,
      letterSpacing: 2,
      marginLeft: spacing.sm,
      fontFamily: 'monospace',
    },
    copyButton: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    copyButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.primary,
    },
    statsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      marginBottom: spacing.lg,
    },
    statItem: {
      flex: 1,
      alignItems: 'center',
    },
    statValue: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 4,
    },
    statValueAccent: {
      color: colors.success,
    },
    statLabel: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    statDivider: {
      width: 1,
      height: '80%',
      backgroundColor: colors.border,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    shareButton: {
      flex: 1,
    },
    detailsButton: {
      flex: 1,
    },
  }), [colors]);

  const handleGenerateCode = async () => {
    setIsGenerating(true);
    try {
      await dispatch(generateReferralCode()).unwrap();
      await dispatch(fetchReferralStats()).unwrap();
    } catch (error) {
      Alert.alert('Error', 'Failed to generate referral code');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShare = async () => {
    if (!referralCode) return;

    try {
      await Share.share({
        message: `Join me on ParkPal and use my referral code: ${referralCode} to get started! You'll earn points for parking, and I'll earn points too!`,
        title: 'Join ParkPal - My Referral Code',
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share referral code');
    }
  };

  const handleCopyCode = async () => {
    // Note: Clipboard API would require expo-clipboard or react-native-clipboard
    Alert.alert('Code Copied', `Referral code ${referralCode} has been copied to clipboard`);
  };

  if (!referralCode) {
    return (
      <Card style={styles.container}>
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <SvgXml xml={shareIcon} width={32} height={32} />
          </View>
          <Text style={styles.emptyTitle}>No Referral Code Yet</Text>
          <Text style={styles.emptyDescription}>
            Generate a referral code to start earning points when friends join ParkPal
          </Text>
          <Button
            title="Generate Referral Code"
            onPress={handleGenerateCode}
            variant="gradient"
            size="medium"
            loading={isGenerating || loading}
            style={styles.generateButton}
          />
        </View>
      </Card>
    );
  }

  return (
    <Card style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <SvgXml xml={shareIcon} width={20} height={20} />
        </View>
        <Text style={styles.headerText}>Your Referral Code</Text>
      </View>

      <View style={styles.codeContainer}>
        <View style={styles.codeWrapper}>
          <SvgXml xml={linkIcon} width={18} height={18} />
          <Text style={styles.codeText}>{referralCode}</Text>
        </View>
        <TouchableOpacity
          style={styles.copyButton}
          onPress={handleCopyCode}
          activeOpacity={0.7}
        >
          <Text style={styles.copyButtonText}>Copy</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {referralStats?.totalReferrals?.toLocaleString() || '0'}
          </Text>
          <Text style={styles.statLabel}>Total Referrals</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, styles.statValueAccent]}>
            +{referralStats?.totalPointsEarned?.toLocaleString() || '0'}
          </Text>
          <Text style={styles.statLabel}>Points Earned</Text>
        </View>
      </View>

      <View style={styles.buttonRow}>
        <Button
          title="Share Code"
          onPress={handleShare}
          variant="gradient"
          size="medium"
          style={styles.shareButton}
        />
        <Button
          title="View Details"
          onPress={() => {}}
          variant="outline"
          size="medium"
          style={styles.detailsButton}
        />
      </View>
    </Card>
  );
};
