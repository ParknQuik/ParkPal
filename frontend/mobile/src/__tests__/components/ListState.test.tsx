import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ListLoadingState, RetryableFailureState } from '../../components/ListState';

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return {
    MaterialCommunityIcons: ({ name }: { name?: string }) => <Text>{name}</Text>,
  };
});

jest.mock('../../components/SkeletonLoader', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    SkeletonLoader: ({ style }: { style?: object }) => <View style={style} />,
  };
});

describe('ListState components', () => {
  it.each([
    ['parking', 'parking-skeleton-card'],
    ['booking', 'booking-skeleton-card'],
    ['vehicle', 'vehicle-skeleton-card'],
    ['transaction', 'transaction-skeleton-row'],
    ['listing', 'listing-skeleton-card'],
  ] as const)('renders %s loading skeletons', (variant, skeletonTestId) => {
    const { getByLabelText, getAllByTestId } = render(
      <ListLoadingState
        variant={variant}
        accessibilityLabel={`Loading ${variant}`}
        testID={`${variant}-loading`}
      />,
    );

    expect(getByLabelText(`Loading ${variant}`)).toBeTruthy();
    expect(getAllByTestId(skeletonTestId)).toHaveLength(3);
  });

  it('renders retryable failure content and invokes retry', () => {
    const onRetry = jest.fn();
    const { getByLabelText, getByText } = render(
      <RetryableFailureState
        title="Unable to load bookings"
        message="Network request failed"
        retryLabel="Retry loading bookings"
        onRetry={onRetry}
      />,
    );

    expect(getByLabelText('Unable to load bookings')).toBeTruthy();
    expect(getByText('Network request failed')).toBeTruthy();

    fireEvent.press(getByLabelText('Retry loading bookings'));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders object-shaped failure messages as text', () => {
    const { getByText } = render(
      <RetryableFailureState
        title="Unable to load vehicles"
        message={{ message: 'License plate already exists' }}
        retryLabel="Retry loading vehicles"
        onRetry={jest.fn()}
      />,
    );

    expect(getByText('License plate already exists')).toBeTruthy();
  });
});
