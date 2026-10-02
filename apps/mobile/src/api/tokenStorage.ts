import * as SecureStore from 'expo-secure-store';

const REFRESH_TOKEN_KEY = 'mawjood.refreshToken';

/**
 * Refresh token lives in the Keychain / Keystore. The access token is kept in memory only
 * (docs/SECURITY_MODEL.md §2).
 */
export const tokenStorage = {
  getRefreshToken(): Promise<string | null> {
    return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  },
  setRefreshToken(token: string): Promise<void> {
    return SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
  },
  clear(): Promise<void> {
    return SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  },
};
