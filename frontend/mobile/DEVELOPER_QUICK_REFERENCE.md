# Phase 3 - Developer Quick Reference Guide

Quick copy-paste snippets for using Phase 3 improvements in your screens.

---

## 1. Haptic Feedback

```tsx
import { haptics } from '../utils/haptics';

// Light tap (for subtle interactions)
await haptics.light();

// Medium impact (for button presses)
await haptics.medium();

// Heavy impact (for important actions)
await haptics.heavy();

// Success notification (green checkmark feel)
await haptics.success();

// Error notification (red X feel)
await haptics.error();

// Warning notification
await haptics.warning();

// Selection change (for pickers)
await haptics.selection();

// Example in a button handler
const handleBooking = async () => {
  await haptics.medium();
  try {
    await createBooking();
    await haptics.success();
  } catch (error) {
    await haptics.error();
  }
};
```

---

## 2. Accessibility Labels

```tsx
import { accessibility } from '../utils/accessibility';

// Button
<TouchableOpacity
  {...accessibility.button('Submit', 'Submit the form')}
  onPress={handleSubmit}
>
  <Text>Submit</Text>
</TouchableOpacity>

// Text Input
<TextInput
  {...accessibility.textInput('Email', 'Enter your email address')}
  value={email}
  onChangeText={setEmail}
/>

// Image
<Image
  source={{ uri: imageUrl }}
  {...accessibility.image('Parking spot photo')}
/>

// Headers (h1 to h6)
<Text {...accessibility.header(1)}>Main Title</Text>
<Text {...accessibility.header(2)}>Subtitle</Text>
<Text {...accessibility.header(3)}>Section Title</Text>

// Disabled state
<TouchableOpacity {...accessibility.disabled}>
  <Text>Disabled Button</Text>
</TouchableOpacity>

// Selected state
<TouchableOpacity {...accessibility.selected(isSelected)}>
  <Text>Option</Text>
</TouchableOpacity>

// Announce to screen reader
accessibility.announce('Booking confirmed');

// Format for screen readers
<Text>{accessibility.formatPrice(100, 'PHP')}</Text>        // "100 PHP"
<Text>{accessibility.formatDate(new Date())}</Text>         // "Monday, December 31, 2024"
<Text>{accessibility.formatRating(4.5, 5)}</Text>           // "4.5 out of 5 stars"
```

---

## 3. Toast Notifications

```tsx
import { Toast } from '../components/Toast';
import { useState } from 'react';

// In your component
const [toast, setToast] = useState({
  visible: false,
  message: '',
  type: 'info' as const,
});

// Show success toast
setToast({
  visible: true,
  message: 'Booking confirmed!',
  type: 'success',
});

// Show error toast
setToast({
  visible: true,
  message: 'Unable to complete booking',
  type: 'error',
});

// Show warning toast
setToast({
  visible: true,
  message: 'Location permission required',
  type: 'warning',
});

// Show info toast
setToast({
  visible: true,
  message: 'Loading parking spots...',
  type: 'info',
});

// With action button
setToast({
  visible: true,
  message: 'Booking cancelled',
  type: 'success',
  action: {
    label: 'Undo',
    onPress: () => restoreBooking(),
  },
});

// In JSX
<Toast
  visible={toast.visible}
  message={toast.message}
  type={toast.type}
  onHide={() => setToast({ ...toast, visible: false })}
  duration={3000}
/>
```

---

## 4. Skeleton Loaders

```tsx
import {
  SkeletonLoader,
  SkeletonParkingCard,
  SkeletonBookingCard,
  SkeletonListItem,
} from '../components/SkeletonLoader';

// Pre-built skeleton cards
{loading ? (
  <>
    <SkeletonParkingCard />
    <SkeletonParkingCard />
    <SkeletonParkingCard />
  </>
) : (
  parkingSpots.map(spot => <ParkingCard key={spot.id} spot={spot} />)
)}

// Custom skeleton shapes
<SkeletonLoader width="100%" height={200} borderRadius={12} />
<SkeletonLoader width="70%" height={24} />
<SkeletonLoader width={100} height={16} />
```

---

## 5. Confirm Dialog

```tsx
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useState } from 'react';

// In your component
const [showDialog, setShowDialog] = useState(false);

// Show dialog
const handleDeletePress = () => {
  setShowDialog(true);
};

// In JSX
<ConfirmDialog
  visible={showDialog}
  title="Delete Listing"
  message="Are you sure you want to delete this parking spot? This action cannot be undone."
  confirmText="Yes, Delete"
  cancelText="Cancel"
  destructive={true}  // Red confirm button
  onConfirm={async () => {
    await deleteListing();
    setShowDialog(false);
  }}
  onCancel={() => setShowDialog(false)}
/>

// Non-destructive dialog
<ConfirmDialog
  visible={showDialog}
  title="Save Changes"
  message="Do you want to save your changes?"
  confirmText="Save"
  cancelText="Discard"
  onConfirm={handleSave}
  onCancel={() => setShowDialog(false)}
/>
```

---

## 6. Pull-to-Refresh

```tsx
import { RefreshableScrollView } from '../components/RefreshableScrollView';

// Replace ScrollView with RefreshableScrollView
<RefreshableScrollView
  onRefresh={async () => {
    // Fetch fresh data
    await dispatch(fetchParkingSpots());
    await dispatch(fetchBookings());
  }}
  style={styles.scrollView}
>
  {/* Your content */}
</RefreshableScrollView>

// Or use standard RefreshControl
import { RefreshControl } from 'react-native';

<ScrollView
  refreshControl={
    <RefreshControl
      refreshing={refreshing}
      onRefresh={handleRefresh}
      tintColor={colors.primary}
    />
  }
>
  {/* Your content */}
</ScrollView>
```

---

## 7. Enhanced Empty States

```tsx
import { EmptyState } from '../components/EmptyState';

// Basic empty state
<EmptyState
  title="No bookings found"
  message="You haven't made any bookings yet"
/>

// With icon
<EmptyState
  title="No parking spots found"
  message="Try adjusting your search or location"
  icon="🅿️"
/>

// With action button
<EmptyState
  title="Connection Lost"
  message="Unable to load parking spots"
  icon="📡"
  actionLabel="Retry"
  onAction={handleRetry}
/>

// All options
<EmptyState
  title="No Results"
  message="We couldn't find what you're looking for"
  icon="🔍"
  actionLabel="Clear Filters"
  onAction={() => dispatch(clearFilters())}
/>
```

---

## 8. Error Handling

```tsx
import { getErrorMessage, ErrorMessages } from '../utils/errorMessages';

// Convert any error to user-friendly message
try {
  await api.createBooking(data);
} catch (error) {
  const message = getErrorMessage(error);
  setToast({
    visible: true,
    message: message,
    type: 'error',
  });
}

// Use predefined error messages
catch (error) {
  setToast({
    visible: true,
    message: ErrorMessages.BOOKING_FAILED,
    type: 'error',
  });
}

// In async thunks
const result = await dispatch(createBooking(data));

if (createBooking.rejected.match(result)) {
  setToast({
    visible: true,
    message: getErrorMessage(result.error),
    type: 'error',
  });
}
```

---

## 9. Performance: Debounced Search

```tsx
import { useDebouncedCallback, useDebouncedValue } from '../utils/performance';

// Debounced callback (for functions)
const debouncedSearch = useDebouncedCallback((query: string) => {
  dispatch(searchParkingSpots(query));
}, 500);

const handleSearchChange = (text: string) => {
  setSearchQuery(text);
  debouncedSearch(text);  // Only calls API after 500ms of no typing
};

// Debounced value (for state)
const [searchQuery, setSearchQuery] = useState('');
const debouncedQuery = useDebouncedValue(searchQuery, 500);

useEffect(() => {
  if (debouncedQuery) {
    dispatch(searchParkingSpots(debouncedQuery));
  }
}, [debouncedQuery]);
```

---

## 10. Performance: Throttled Events

```tsx
import { useThrottledCallback } from '../utils/performance';

// Throttle scroll events (max once per 100ms)
const throttledScroll = useThrottledCallback((event) => {
  const offsetY = event.nativeEvent.contentOffset.y;
  handleScroll(offsetY);
}, 100);

<ScrollView onScroll={throttledScroll}>
  {/* Content */}
</ScrollView>
```

---

## 11. Complete Screen Example

```tsx
import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchData } from '../store/slices/dataSlice';
import { RefreshableScrollView } from '../components/RefreshableScrollView';
import { SkeletonParkingCard } from '../components/SkeletonLoader';
import { EmptyState } from '../components/EmptyState';
import { Toast } from '../components/Toast';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { haptics } from '../utils/haptics';
import { accessibility } from '../utils/accessibility';
import { getErrorMessage } from '../utils/errorMessages';

export const MyScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const { data, loading, error } = useAppSelector((state) => state.data);

  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' as const });
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const result = await dispatch(fetchData());

    if (fetchData.rejected.match(result)) {
      setToast({
        visible: true,
        message: getErrorMessage(result.error),
        type: 'error',
      });
    }
  };

  const handleRefresh = async () => {
    await haptics.light();
    await loadData();
    await haptics.success();
  };

  const handleItemPress = async (id: string) => {
    await haptics.medium();
    // Navigate or perform action
  };

  const handleDelete = async () => {
    await haptics.warning();
    setShowDialog(true);
  };

  const confirmDelete = async () => {
    setShowDialog(false);
    try {
      await deleteItem();
      await haptics.success();
      setToast({
        visible: true,
        message: 'Item deleted successfully',
        type: 'success',
      });
    } catch (error) {
      await haptics.error();
      setToast({
        visible: true,
        message: getErrorMessage(error),
        type: 'error',
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title} {...accessibility.header(1)}>
        My Screen
      </Text>

      <RefreshableScrollView onRefresh={handleRefresh}>
        {loading ? (
          <>
            <SkeletonParkingCard />
            <SkeletonParkingCard />
          </>
        ) : data.length === 0 ? (
          <EmptyState
            title="No data found"
            message="Pull down to refresh"
            icon="📭"
            actionLabel="Refresh"
            onAction={handleRefresh}
          />
        ) : (
          data.map((item) => (
            <YourComponent key={item.id} item={item} onPress={handleItemPress} />
          ))
        )}
      </RefreshableScrollView>

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast({ ...toast, visible: false })}
      />

      <ConfirmDialog
        visible={showDialog}
        title="Delete Item"
        message="Are you sure?"
        destructive={true}
        onConfirm={confirmDelete}
        onCancel={() => setShowDialog(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    padding: 16,
  },
});
```

---

## 12. Testing Your Screen

```tsx
// screen.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MyScreen } from './MyScreen';
import dataReducer from '../store/slices/dataSlice';

describe('MyScreen', () => {
  let store;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        data: dataReducer,
      },
    });
  });

  it('should render loading state', () => {
    render(
      <Provider store={store}>
        <MyScreen />
      </Provider>
    );

    expect(screen.getByTestId('skeleton-loader')).toBeTruthy();
  });

  it('should show empty state when no data', async () => {
    render(
      <Provider store={store}>
        <MyScreen />
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('No data found')).toBeTruthy();
    });
  });

  it('should handle refresh', async () => {
    const { getByTestId } = render(
      <Provider store={store}>
        <MyScreen />
      </Provider>
    );

    fireEvent.press(getByTestId('refresh-button'));

    await waitFor(() => {
      expect(screen.getByText('Refreshed successfully')).toBeTruthy();
    });
  });
});
```

---

## Tips & Best Practices

### 1. Always use haptics for user actions
- Light: Subtle taps, selections
- Medium: Button presses, confirmations
- Heavy: Important actions, destructive operations
- Success/Error/Warning: Based on operation result

### 2. Add accessibility to all interactive elements
- Use `accessibility.button()` for all TouchableOpacity
- Use `accessibility.header()` for all headings
- Add meaningful labels and hints

### 3. Show loading skeletons instead of spinners
- Better perceived performance
- Users can see layout before content loads
- More professional appearance

### 4. Use toast for all user feedback
- Success: "Booking confirmed"
- Error: "Unable to process payment"
- Info: "Loading..."
- Warning: "Low battery"

### 5. Debounce search inputs
- Reduces API calls
- Improves performance
- Better user experience

### 6. Add pull-to-refresh on all list screens
- Easy for users to refresh data
- Standard mobile pattern
- Automatic haptic feedback

### 7. Use ConfirmDialog for destructive actions
- Delete operations
- Cancel bookings
- Sign out
- Clear data

---

## Quick Checklist for New Screens

- [ ] Add haptic feedback to all buttons
- [ ] Add accessibility labels to all interactive elements
- [ ] Use skeleton loaders for loading states
- [ ] Add pull-to-refresh functionality
- [ ] Show toast notifications for user actions
- [ ] Use ConfirmDialog for destructive actions
- [ ] Add enhanced empty states with icons and actions
- [ ] Debounce search inputs
- [ ] Handle errors with user-friendly messages
- [ ] Add proper heading hierarchy (h1, h2, h3)
- [ ] Test with VoiceOver/TalkBack
- [ ] Test on low-end devices

---

## Need Help?

- Check `/frontend/mobile/PHASE3_IMPLEMENTATION_SUMMARY.md` for detailed documentation
- Review `/frontend/mobile/src/screens/HomeScreen.tsx` for a complete example
- Run tests: `npm test`
- Check coverage: `npm run test:coverage`
