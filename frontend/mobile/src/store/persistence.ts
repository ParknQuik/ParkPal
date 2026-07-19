export const sanitizePersistedAuthState = (state: unknown): unknown => {
  if (!state || typeof state !== 'object') {
    return state;
  }

  return {
    ...(state as Record<string, unknown>),
    loading: false,
    checkingAuth: false,
    error: null,
  };
};
