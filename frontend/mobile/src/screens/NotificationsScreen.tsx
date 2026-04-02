import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const COLORS = {
  primary: '#10b77f',
  background: '#f6f6f8',
  white: '#ffffff',
  textPrimary: '#1a1a1a',
  textSecondary: '#6b7280',
  border: '#e5e7eb',
};

interface NotificationItem {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
}

interface NotificationSection {
  id: string;
  title: string;
  items: NotificationItem[];
}

export const NotificationsScreen: React.FC = () => {
  const navigation = useNavigation();

  const [sections, setSections] = useState<NotificationSection[]>([
    {
      id: 'bookings',
      title: 'Bookings',
      items: [
        { id: 'confirmations', title: 'Confirmations', description: 'Get notified when your booking is confirmed', enabled: true },
        { id: 'reminders', title: 'Reminders', description: 'Receive reminders before your parking starts', enabled: true },
      ],
    },
    {
      id: 'host',
      title: 'Host',
      items: [
        { id: 'new_requests', title: 'New Requests', description: 'Get notified when someone books your spot', enabled: true },
        { id: 'earnings', title: 'Earnings Alerts', description: 'Receive updates about your earnings', enabled: false },
      ],
    },
    {
      id: 'promotions',
      title: 'Promotions',
      items: [
        { id: 'deals', title: 'Deals', description: 'Get exclusive deals and discounts', enabled: false },
        { id: 'tips', title: 'Tips & Updates', description: 'Receive tips and app updates', enabled: true },
      ],
    },
  ]);

  const toggleNotification = (sectionId: string, itemId: string) => {
    setSections((prev) =>
      prev.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              items: section.items.map((item) =>
                item.id === itemId ? { ...item, enabled: !item.enabled } : item
              ),
            }
          : section
      )
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {sections.map((section) => (
          <View key={section.id} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.card}>
              {section.items.map((item, index) => (
                <View key={item.id}>
                  <View style={styles.itemRow}>
                    <View style={styles.itemContent}>
                      <Text style={styles.itemTitle}>{item.title}</Text>
                      <Text style={styles.itemDescription}>{item.description}</Text>
                    </View>
                    <Switch
                      value={item.enabled}
                      onValueChange={() => toggleNotification(section.id, item.id)}
                      trackColor={{ false: COLORS.border, true: COLORS.primary }}
                      thumbColor={COLORS.white}
                      ios_backgroundColor={COLORS.border}
                    />
                  </View>
                  {index < section.items.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </View>
          </View>
        ))}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    overflow: 'hidden',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  itemContent: {
    flex: 1,
    marginRight: 12,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginLeft: 16,
  },
  bottomSpacer: {
    height: 40,
  },
});

