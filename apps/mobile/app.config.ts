import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Name: Mazal (decided 2026-10-03, D5 in docs/README.md).
 * PLACEHOLDERS — pending client decisions:
 *  - Bundle identifier and Android package: confirm `com.mazal.app` is free in both stores and
 *        owned by the client's developer accounts (D9). They cannot change after release.
 *  - Google Maps Android key: set GOOGLE_MAPS_ANDROID_API_KEY at build time.
 *        Without it, the Android map falls back to the list view.
 */
const BUNDLE_ID_PLACEHOLDER = 'com.mazal.app';
const googleMapsAndroidApiKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY ?? '';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Mazal',
  slug: 'mazal',
  platforms: ['ios', 'android'],
  version: '0.1.0',
  scheme: 'mazal',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  userInterfaceStyle: 'light',
  ios: {
    bundleIdentifier: BUNDLE_ID_PLACEHOLDER,
    supportsTablet: false,
  },
  android: {
    package: BUNDLE_ID_PLACEHOLDER,
    adaptiveIcon: {
      backgroundColor: '#6050DC',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#FFFFFF',
        image: './assets/images/splash-icon.png',
        imageWidth: 96,
      },
    ],
    ['expo-localization', { supportsRTL: true }],
    'expo-secure-store',
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'Mazal uses your location to show food you can rescue nearby. It is never stored.',
      },
    ],
    [
      'expo-camera',
      {
        cameraPermission: 'Mazal uses the camera to scan pickup codes at your store.',
        microphonePermission: false,
        recordAudioAndroid: false,
      },
    ],
    ['react-native-maps', { androidGoogleMapsApiKey: googleMapsAndroidApiKey }],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    googleMapsAndroidConfigured: googleMapsAndroidApiKey.length > 0,
  },
});
