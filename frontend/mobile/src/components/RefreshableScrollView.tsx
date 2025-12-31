import React, { useState } from 'react';
import { RefreshControl, ScrollView, ScrollViewProps } from 'react-native';
import { colors } from '../theme';
import { haptics } from '../utils/haptics';

interface RefreshableScrollViewProps extends ScrollViewProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}

/**
 * ScrollView with pull-to-refresh functionality
 * Includes haptic feedback and proper loading states
 */
export const RefreshableScrollView: React.FC<RefreshableScrollViewProps> = ({
  onRefresh,
  children,
  ...scrollViewProps
}) => {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await haptics.light();

    try {
      await onRefresh();
      await haptics.success();
    } catch (error) {
      await haptics.error();
      console.error('Refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <ScrollView
      {...scrollViewProps}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={colors.primary}
          colors={[colors.primary, colors.primaryDark]}
          progressBackgroundColor={colors.white}
        />
      }
    >
      {children}
    </ScrollView>
  );
};

export default RefreshableScrollView;
