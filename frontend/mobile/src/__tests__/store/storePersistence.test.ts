import { sanitizePersistedAuthState } from '../../store/persistence';

describe('store persistence', () => {
  it('resets transient auth flags before persisted auth state is used', () => {
    expect(
      sanitizePersistedAuthState({
        user: { id: 1, email: 'driver@example.com' },
        token: 'token',
        isAuthenticated: true,
        loading: true,
        checkingAuth: true,
        error: 'stale error',
      })
    ).toEqual({
      user: { id: 1, email: 'driver@example.com' },
      token: 'token',
      isAuthenticated: true,
      loading: false,
      checkingAuth: false,
      error: null,
    });
  });
});
