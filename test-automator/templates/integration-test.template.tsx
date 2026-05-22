import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { Provider } from 'react-redux';
import { store } from '../store';
import App from '../App';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

// Helper to render with all providers
const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <Provider store={store}>
      <NavigationContainer>
        {component}
      </NavigationContainer>
    </Provider>
  );
};

describe('Integration Test: Complete User Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication Flow', () => {
    it('should complete full registration and login flow', async () => {
      renderWithProviders(<App />);

      // Start at landing screen
      expect(screen.getByText(/welcome/i)).toBeTruthy();

      // Navigate to registration
      const registerButton = screen.getByText(/sign up/i);
      fireEvent.press(registerButton);

      await waitFor(() => {
        expect(screen.getByText(/create account/i)).toBeTruthy();
      });

      // Fill registration form
      fireEvent.changeText(screen.getByPlaceholderText(/name/i), 'Test User');
      fireEvent.changeText(screen.getByPlaceholderText(/email/i), 'test@example.com');
      fireEvent.changeText(screen.getByPlaceholderText(/password/i), 'SecurePass123!');
      fireEvent.changeText(screen.getByPlaceholderText(/phone/i), '+639171234567');

      // Submit registration
      const submitButton = screen.getByText(/create account/i);
      fireEvent.press(submitButton);

      // Verify successful registration and redirect
      await waitFor(() => {
        expect(screen.getByText(/dashboard/i)).toBeTruthy();
      }, { timeout: 5000 });
    });

    it('should handle login flow', async () => {
      renderWithProviders(<App />);

      // Navigate to login
      const loginButton = screen.getByText(/log in/i);
      fireEvent.press(loginButton);

      await waitFor(() => {
        expect(screen.getByText(/welcome back/i)).toBeTruthy();
      });

      // Fill login form
      fireEvent.changeText(screen.getByPlaceholderText(/email/i), 'test@example.com');
      fireEvent.changeText(screen.getByPlaceholderText(/password/i), 'password123');

      // Submit login
      const submitButton = screen.getByText(/log in/i);
      fireEvent.press(submitButton);

      // Verify successful login
      await waitFor(() => {
        expect(screen.getByText(/dashboard/i)).toBeTruthy();
      }, { timeout: 5000 });
    });
  });

  describe('Search and Booking Flow', () => {
    it('should complete full search to booking flow', async () => {
      // Assume user is logged in
      renderWithProviders(<App />);

      // Navigate to search
      const searchTab = screen.getByTestId('search-tab');
      fireEvent.press(searchTab);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search location/i)).toBeTruthy();
      });

      // Search for parking
      const searchInput = screen.getByPlaceholderText(/search location/i);
      fireEvent.changeText(searchInput, 'Makati CBD');

      // Wait for results
      await waitFor(() => {
        expect(screen.getByText(/parking spots/i)).toBeTruthy();
      });

      // Select a listing
      const firstListing = screen.getAllByTestId('listing-card')[0];
      fireEvent.press(firstListing);

      // View listing details
      await waitFor(() => {
        expect(screen.getByText(/booking details/i)).toBeTruthy();
      });

      // Select date and time
      const selectDateButton = screen.getByText(/select date/i);
      fireEvent.press(selectDateButton);

      // Choose tomorrow
      const tomorrowButton = screen.getByText(/tomorrow/i);
      fireEvent.press(tomorrowButton);

      // Select time slot
      const timeSlot = screen.getByText(/8:00 AM - 10:00 AM/i);
      fireEvent.press(timeSlot);

      // Proceed to booking
      const bookNowButton = screen.getByText(/book now/i);
      fireEvent.press(bookNowButton);

      // Verify booking confirmation
      await waitFor(() => {
        expect(screen.getByText(/booking confirmed/i)).toBeTruthy();
      }, { timeout: 5000 });
    });
  });

  describe('Payment Flow', () => {
    it('should complete payment process', async () => {
      renderWithProviders(<App />);

      // Navigate to payment from booking
      // (Assuming booking is already created)

      const payButton = screen.getByText(/proceed to payment/i);
      fireEvent.press(payButton);

      await waitFor(() => {
        expect(screen.getByText(/payment method/i)).toBeTruthy();
      });

      // Select payment method
      const gcashOption = screen.getByText(/gcash/i);
      fireEvent.press(gcashOption);

      // Confirm payment
      const confirmButton = screen.getByText(/confirm payment/i);
      fireEvent.press(confirmButton);

      // Verify payment success
      await waitFor(() => {
        expect(screen.getByText(/payment successful/i)).toBeTruthy();
      }, { timeout: 10000 });
    });
  });

  describe('Host Dashboard Flow', () => {
    it('should allow host to create and manage listings', async () => {
      renderWithProviders(<App />);

      // Navigate to host dashboard
      const hostTab = screen.getByTestId('host-tab');
      fireEvent.press(hostTab);

      await waitFor(() => {
        expect(screen.getByText(/my listings/i)).toBeTruthy();
      });

      // Create new listing
      const createButton = screen.getByText(/create listing/i);
      fireEvent.press(createButton);

      // Fill listing form
      fireEvent.changeText(screen.getByPlaceholderText(/title/i), 'My Parking Spot');
      fireEvent.changeText(screen.getByPlaceholderText(/description/i), 'Safe and convenient');
      fireEvent.changeText(screen.getByPlaceholderText(/price/i), '100');

      // Submit listing
      const submitButton = screen.getByText(/publish/i);
      fireEvent.press(submitButton);

      // Verify listing created
      await waitFor(() => {
        expect(screen.getByText(/my parking spot/i)).toBeTruthy();
      }, { timeout: 5000 });
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      // Mock network failure
      jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'));

      renderWithProviders(<App />);

      await waitFor(() => {
        expect(screen.getByText(/connection error/i)).toBeTruthy();
      });

      // Verify retry mechanism
      const retryButton = screen.getByText(/retry/i);
      expect(retryButton).toBeTruthy();
    });

    it('should handle validation errors', async () => {
      renderWithProviders(<App />);

      // Try to submit form with invalid data
      const submitButton = screen.getByText(/submit/i);
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/required/i)).toBeTruthy();
      });
    });
  });

  describe('State Persistence', () => {
    it('should persist user session across app restarts', async () => {
      // First render - login
      const { unmount } = renderWithProviders(<App />);

      // Login
      // ... login flow ...

      // Unmount app
      unmount();

      // Remount app
      renderWithProviders(<App />);

      // Verify user still logged in
      await waitFor(() => {
        expect(screen.getByText(/dashboard/i)).toBeTruthy();
      });
    });
  });
});
