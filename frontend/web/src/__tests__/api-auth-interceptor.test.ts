import { describe, expect, it } from 'vitest';
import api from '../api';

describe('public auth API errors', () => {
  it('keeps the current session available so a 401 sign-in error can be shown', async () => {
    localStorage.setItem('token', 'existing-token');
    localStorage.setItem('user', '{"id":1}');

    await expect(api.post('/auth/google', { googleToken: 'bad-token' }, {
      adapter: async (config) => Promise.reject({
        config,
        response: { status: 401, data: { error: 'Invalid Google token' } },
      }),
    })).rejects.toMatchObject({ response: { status: 401 } });

    expect(localStorage.getItem('token')).toBe('existing-token');
    expect(localStorage.getItem('user')).toBe('{"id":1}');
    localStorage.clear();
  });
});
