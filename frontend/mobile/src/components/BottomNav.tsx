import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors, spacing } from '../theme';

interface TabItem {
  name: string;
  label: string;
  icon: string;
  route: string;
}

const TABS: TabItem[] = [
  { name: 'Home', label: 'Home', icon: '🏠', route: 'Home' },
  { name: 'Map', label: 'Map', icon: '🗺️', route: 'Explore' },
  { name: 'Bookings', label: 'Bookings', icon: '📋', route: 'MyBookings' },
  { name: 'Profile', label: 'Profile', icon: '👤', route: 'Profile' },
];

interface BottomNavProps {
  activeTab?: string;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab = 'Home' }) => {
  const navigation = useNavigation<any>();
  const route = useRoute();

  const getCurrentTab = () => {
    const routeName = route.name;
    if (routeName === 'Home' || routeName === 'HomeDashboard' || routeName === 'HomeDashboardNew') return 'Home';
    if (routeName === 'Explore' || routeName === 'ExploreMap' || routeName === 'ExploreMapNew') return 'Map';
    if (routeName === 'Bookings' || routeName === 'MyBookings' || routeName === 'MyBookingsNew') return 'Bookings';
    if (routeName === 'Profile' || routeName === 'ProfileNew') return 'Profile';
    return activeTab;
  };

  const currentTab = getCurrentTab();

  const handleTabPress = async (tab: TabItem) => {
    if (currentTab === tab.name) return;
    
    switch (tab.name) {
      case 'Home':
        navigation.navigate('Home');
        break;
      case 'Map':
        navigation.navigate('Explore');
        break;
      case 'Bookings':
        navigation.navigate('MyBookings');
        break;
      case 'Profile':
        navigation.navigate('Profile');
        break;
    }
  };

  return (
    <View style={styles.container}>
      {TABS.map((tab) => {
        const isActive = currentTab === tab.name;
        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.tab}
            onPress={() => handleTabPress(tab)}
            activeOpacity={0.7}
          >
            <Text style={[styles.icon, isActive && styles.activeIcon]}>
              {tab.icon}
            </Text>
            <Text style={[styles.label, isActive && styles.activeLabel]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingBottom: spacing.sm,
    paddingTop: spacing.sm,
    height: 60,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  icon: {
    fontSize: 22,
    opacity: 0.5,
  },
  activeIcon: {
    opacity: 1,
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSecondary,
    marginTop: 2,
  },
  activeLabel: {
    color: colors.primary,
    fontWeight: '600',
  },
});

export default BottomNav;
