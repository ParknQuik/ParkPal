import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'parkpal.auth.token';
const USER_KEY = 'parkpal.auth.user';
const MIGRATED_KEY = 'parkpal.auth.migrated.v1';
let memorySession: { token: string; user: string } | null = null;

export const sessionStorage = {
  async migrateLegacySession(): Promise<void> {
    if (await AsyncStorage.getItem(MIGRATED_KEY)) return;
    const [legacyToken, legacyUser] = await Promise.all([
      AsyncStorage.getItem('token'), AsyncStorage.getItem('user'),
    ]);
    if (legacyToken && legacyUser) {
      await Promise.all([
        SecureStore.setItemAsync(TOKEN_KEY, legacyToken),
        SecureStore.setItemAsync(USER_KEY, legacyUser),
      ]);
    }
    await Promise.all([
      AsyncStorage.removeItem('token'), AsyncStorage.removeItem('user'),
      AsyncStorage.setItem(MIGRATED_KEY, '1'),
    ]);
  },
  async getToken(): Promise<string | null> {
    await this.migrateLegacySession();
    return memorySession?.token ?? SecureStore.getItemAsync(TOKEN_KEY);
  },
  async getUser(): Promise<string | null> {
    await this.migrateLegacySession();
    return memorySession?.user ?? SecureStore.getItemAsync(USER_KEY);
  },
  async save(token: string, user: unknown, remember = true): Promise<void> {
    await this.clear();
    const serializedUser = JSON.stringify(user);
    if (remember) {
      await Promise.all([
        SecureStore.setItemAsync(TOKEN_KEY, token),
        SecureStore.setItemAsync(USER_KEY, serializedUser),
      ]);
    } else {
      memorySession = { token, user: serializedUser };
    }
  },
  async clear(): Promise<void> {
    memorySession = null;
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY), SecureStore.deleteItemAsync(USER_KEY),
      AsyncStorage.removeItem('token'), AsyncStorage.removeItem('user'),
    ]);
  },
};
