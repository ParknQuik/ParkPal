import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { ListingBottomSheet } from '../../components/ListingBottomSheet';
import * as Haptics from 'expo-haptics';

jest.mock('@gorhom/bottom-sheet', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: React.forwardRef(({ children, onChange }: any, ref: any) => {
      React.useImperativeHandle(ref, () => ({ snapToIndex: jest.fn() }));
      return <View testID="listing-bottom-sheet" onChange={onChange}>{children}</View>;
    }),
    BottomSheetView: View,
    BottomSheetBackdrop: View,
  };
});

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(),
}));

jest.mock('expo-image', () => ({ Image: 'Image' }));

jest.mock('../../context/ThemeContext', () => ({
  useTheme: () => ({ colors: {
    border: '#ddd', surface: '#fff', textPrimary: '#111', textSecondary: '#555',
    textTertiary: '#777', primary: '#080', white: '#fff', warning: '#f90',
  } }),
}));

jest.mock('@expo/vector-icons', () => ({ MaterialCommunityIcons: 'Icon' }));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

it('keeps sheet movement and closing working when selection haptics reject', async () => {
  (Haptics.selectionAsync as jest.Mock).mockRejectedValue(new Error('native haptics unavailable'));
  const onClose = jest.fn();
  const { getByTestId, getByText } = await render(
    <ListingBottomSheet
      listing={{ id: 1, title: 'Host Garage', pricePerHour: 50 }}
      zoneAvailability={null}
      onViewDetails={jest.fn()}
      onDirections={jest.fn()}
      onQuickBook={jest.fn()}
      onClose={onClose}
    />
  );

  await fireEvent(getByTestId('listing-bottom-sheet'), 'onChange', 1);
  expect(getByText('Book Now')).toBeTruthy();
  await waitFor(() => expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1));
  await fireEvent(getByTestId('listing-bottom-sheet'), 'onChange', -1);
  expect(onClose).toHaveBeenCalledTimes(1);
});
