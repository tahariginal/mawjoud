import Constants from 'expo-constants';

export type AppEnv = 'development' | 'staging' | 'production';
export type ApiMode = 'demo' | 'http';

function readAppEnv(): AppEnv {
  const value = process.env.EXPO_PUBLIC_APP_ENV;
  return value === 'staging' || value === 'production' ? value : 'development';
}

function readApiMode(): ApiMode {
  return process.env.EXPO_PUBLIC_API_MODE === 'http' ? 'http' : 'demo';
}

export const env = {
  appEnv: readAppEnv(),
  apiMode: readApiMode(),
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? '',
  appVersion: Constants.expoConfig?.version ?? '0.0.0',
  googleMapsAndroidConfigured: Constants.expoConfig?.extra?.googleMapsAndroidConfigured === true,
} as const;

// Fail fast on unsafe configurations instead of silently running with fake data.
if (env.appEnv === 'production' && env.apiMode === 'demo') {
  throw new Error('The demo API adapter cannot be used in a production build.');
}
if (env.apiMode === 'http' && env.apiBaseUrl.length === 0) {
  throw new Error('EXPO_PUBLIC_API_BASE_URL is required when EXPO_PUBLIC_API_MODE=http.');
}
