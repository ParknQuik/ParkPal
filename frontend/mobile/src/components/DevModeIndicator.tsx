import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { API_BASE_URL, isLocalBackend } from '../config/api.config';

/**
 * Development Mode Indicator
 * Shows current backend connection in development mode
 * Displays at the bottom of the screen as a small badge
 */
export const DevModeIndicator: React.FC = () => {
  const [expanded, setExpanded] = useState<boolean>(false);

  // Only show in development mode
  if (!__DEV__) {
    return null;
  }

  const isLocal = isLocalBackend();
  const shortUrl = API_BASE_URL.replace('http://', '').replace('https://', '').split('/')[0];

  return (
    <TouchableOpacity
      style={[styles.container, isLocal ? styles.local : styles.deployed]}
      onPress={() => setExpanded(!expanded)}
      activeOpacity={0.8}
    >
      <View style={styles.badge}>
        <Text style={styles.icon}>{isLocal ? '🏠' : '☁️'}</Text>
        {expanded && (
          <Text style={styles.text} numberOfLines={1} ellipsizeMode="middle">
            {shortUrl}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 9999,
  },
  local: {
    backgroundColor: '#10b981',
  },
  deployed: {
    backgroundColor: '#3b82f6',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  icon: {
    fontSize: 16,
  },
  text: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    maxWidth: 200,
  },
});

export default DevModeIndicator;
