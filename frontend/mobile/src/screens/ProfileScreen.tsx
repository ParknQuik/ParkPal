import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../store';
import { logout } from '../store/slices/authSlice';
import { Avatar } from '../components/Avatar';
import { Card } from '../components/Card';
import { colors, typography, spacing, borderRadius } from '../theme';
import { formatCurrency, formatDate } from '../utils/helpers';

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);

  if (!user) return null;

  const handleLogout = () => {
    dispatch(logout());
  };

  const menuSections = [
    {
      title: 'Account',
      items: [
        { icon: '👤', label: 'Edit Profile', action: () => {} },
        { icon: '💳', label: 'Payment Methods', action: () => {} },
        { icon: '📍', label: 'Saved Addresses', action: () => {} },
      ],
    },
    {
      title: 'Parking',
      items: [
        { icon: '🚗', label: 'My Vehicles', action: () => {} },
        {
          icon: '📋',
          label: 'My Listings',
          action: () => navigation.navigate('ListSpot' as never),
        },
        { icon: '⭐', label: 'Reviews', action: () => {} },
      ],
    },
    {
      title: 'Settings',
      items: [
        { icon: '🔔', label: 'Notifications', action: () => {} },
        { icon: '🔒', label: 'Privacy & Security', action: () => {} },
        { icon: '❓', label: 'Help & Support', action: () => {} },
        { icon: '📄', label: 'Terms & Conditions', action: () => {} },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={colors.gradientPrimary}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.profileSection}>
            <Avatar uri={user.avatar} name={user.name} size={80} />
            <Text style={styles.userName}>{user.name}</Text>
            <Text style={styles.userEmail}>{user.email}</Text>
            {user.phone && <Text style={styles.userPhone}>{user.phone}</Text>}
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{user.totalBookings}</Text>
              <Text style={styles.statLabel}>Bookings</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {formatCurrency(user.totalSpent)}
              </Text>
              <Text style={styles.statLabel}>Spent</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>4.8</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          <Card style={styles.memberCard}>
            <View style={styles.memberCardHeader}>
              <Text style={styles.memberCardTitle}>Member Since</Text>
              <Text style={styles.memberCardBadge}>Premium</Text>
            </View>
            <Text style={styles.memberCardDate}>
              {formatDate(user.activeSince)}
            </Text>
          </Card>

          {menuSections.map((section, sectionIndex) => (
            <View key={sectionIndex} style={styles.menuSection}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Card style={styles.menuCard}>
                {section.items.map((item, itemIndex) => (
                  <React.Fragment key={itemIndex}>
                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={item.action}
                    >
                      <View style={styles.menuItemLeft}>
                        <Text style={styles.menuIcon}>{item.icon}</Text>
                        <Text style={styles.menuLabel}>{item.label}</Text>
                      </View>
                      <Text style={styles.menuArrow}>›</Text>
                    </TouchableOpacity>
                    {itemIndex < section.items.length - 1 && (
                      <View style={styles.menuDivider} />
                    )}
                  </React.Fragment>
                ))}
              </Card>
            </View>
          ))}

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>

          <Text style={styles.version}>Version 1.0.0</Text>
        </View>
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
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxxl,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  userName: {
    ...typography.h3,
    color: colors.white,
    fontWeight: '700',
    marginTop: spacing.lg,
  },
  userEmail: {
    ...typography.body,
    color: colors.white,
    opacity: 0.9,
    marginTop: spacing.xs,
  },
  userPhone: {
    ...typography.bodySmall,
    color: colors.white,
    opacity: 0.8,
    marginTop: spacing.xs,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  statValue: {
    ...typography.h4,
    color: colors.white,
    fontWeight: '700',
  },
  statLabel: {
    ...typography.small,
    color: colors.white,
    opacity: 0.9,
    marginTop: spacing.xs,
  },
  content: {
    padding: spacing.xl,
    marginTop: -spacing.xl,
  },
  memberCard: {
    marginBottom: spacing.xl,
  },
  memberCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  memberCardTitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  memberCardBadge: {
    ...typography.small,
    color: colors.primary,
    fontWeight: '700',
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  memberCardDate: {
    ...typography.h5,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  menuSection: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.h6,
    color: colors.textPrimary,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  menuCard: {
    padding: 0,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIcon: {
    fontSize: 24,
    marginRight: spacing.lg,
  },
  menuLabel: {
    ...typography.body,
    color: colors.textPrimary,
  },
  menuArrow: {
    fontSize: 24,
    color: colors.textTertiary,
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: spacing.lg + 24 + spacing.lg,
  },
  logoutButton: {
    backgroundColor: colors.error,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
  logoutText: {
    ...typography.body,
    color: colors.white,
    fontWeight: '700',
  },
  version: {
    ...typography.small,
    color: colors.textTertiary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
});
