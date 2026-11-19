import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { sessionStorage } from '../sessionStorage';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() },
}));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(), setItemAsync: jest.fn(), deleteItemAsync: jest.fn(),
}));

describe('sessionStorage', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
    (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);
    (SecureStore.deleteItemAsync as jest.Mock).mockResolvedValue(undefined);
    await sessionStorage.clear();
    jest.clearAllMocks();
  });

  it('migrates a legacy AsyncStorage session once and removes old copies', async () => {
    const values: Record<string, string> = { token: 'legacy-token', user: '{"id":7}' };
    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => Promise.resolve(values[key] ?? null));
    (AsyncStorage.setItem as jest.Mock).mockImplementation((key: string, value: string) => {
      values[key] = value;
      return Promise.resolve();
    });

    await sessionStorage.migrateLegacySession();
    await sessionStorage.migrateLegacySession();

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('parkpal.auth.token', 'legacy-token');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('parkpal.auth.user', '{"id":7}');
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('token');
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('user');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('parkpal.auth.migrated.v1', '1');
    expect(AsyncStorage.getItem).toHaveBeenCalledTimes(4);
  });

  it('keeps unchecked sessions in memory and remembered sessions in SecureStore', async () => {
    await sessionStorage.save('memory-token', { id: 1 }, false);
    expect(await sessionStorage.getToken()).toBe('memory-token');
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();

    await sessionStorage.save('secure-token', { id: 2 }, true);
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('parkpal.auth.token', 'secure-token');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('parkpal.auth.user', '{"id":2}');
  });

  it('updates a memory-only user without saving credentials', async () => {
    await sessionStorage.save('memory-token', { id: 1 }, false);
    jest.clearAllMocks();
    await sessionStorage.updateUser({ id: 1, profileImageUrl: 'photo.jpg' });
    expect(await sessionStorage.getUser()).toBe('{"id":1,"profileImageUrl":"photo.jpg"}');
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
  });

  it('updates a remembered user without changing its token', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('secure-token');
    await sessionStorage.updateUser({ id: 2, profileImageUrl: 'photo.jpg' });
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('parkpal.auth.user', '{"id":2,"profileImageUrl":"photo.jpg"}');
    expect(SecureStore.setItemAsync).not.toHaveBeenCalledWith('parkpal.auth.token', expect.anything());
  });
});
