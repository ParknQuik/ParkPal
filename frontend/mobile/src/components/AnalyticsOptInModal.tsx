/**
 * Analytics Opt-In Modal (Phase 6A)
 *
 * Shown once after first login. User can accept or decline anonymous
 * parking analytics data collection. Decision is persisted in AsyncStorage.
 */

import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { colors } from '../theme/colors';

interface Props {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export const AnalyticsOptInModal: React.FC<Props> = ({ visible, onAccept, onDecline }) => (
  <Modal
    visible={visible}
    transparent
    animationType="slide"
    statusBarTranslucent
  >
    <View style={styles.overlay}>
      <View style={styles.sheet}>
        <Text style={styles.icon}>📍</Text>
        <Text style={styles.title}>Help improve parking in your area</Text>
        <Text style={styles.body}>
          ParkPal can anonymously track how long drivers circle for parking in your
          neighborhood. This data helps predict parking availability and reduce
          congestion.{'\n\n'}
          No personal information is stored. You can opt out any time in Settings.
        </Text>

        <View style={styles.bullets}>
          {[
            'Anonymous location data only',
            'Never sold to third parties',
            'Improves circling time estimates',
          ].map((item) => (
            <View key={item} style={styles.bulletRow}>
              <Text style={styles.bulletDot}>✓</Text>
              <Text style={styles.bulletText}>{item}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.acceptBtn} onPress={onAccept} activeOpacity={0.8}>
          <Text style={styles.acceptText}>Sure, I'll help</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.declineBtn} onPress={onDecline} activeOpacity={0.8}>
          <Text style={styles.declineText}>No thanks</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 28,
    paddingBottom: 40,
  },
  icon: {
    fontSize: 40,
    textAlign: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  body: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 21,
    marginBottom: 20,
  },
  bullets: {
    marginBottom: 24,
    gap: 8,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bulletDot: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '700',
    width: 20,
  },
  bulletText: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  acceptBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  acceptText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  declineBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  declineText: {
    fontSize: 15,
    color: colors.textSecondary,
  },
});
