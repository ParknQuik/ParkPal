export const sanitizePersistedAuthState = (state: unknown): unknown => {
  if (!state || typeof state !== 'object') {
    return state;
  }

  return {
    ...(state as Record<string, unknown>),
    token: null,
    isAuthenticated: false,
    loading: false,
    checkingAuth: false,
    error: null,
  };
};
