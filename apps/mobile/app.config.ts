import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * PLACEHOLDERS — pending client decisions (see docs/README.md):
 *  - D5: final brand spelling, bundle identifier and Android package.
 *        These cannot be changed after the first store release.
 *  - Google Maps Android key: set GOOGLE_MAPS_ANDROID_API_KEY at build time.
 *        Without it, the Android map falls back to the list view.
 */
const BUNDLE_ID_PLACEHOLDER = 'com.mawjood.app';
const googleMapsAndroidApiKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY ?? '';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'MAWJOOd',
  slug: 'mawjood',
  platforms: ['ios', 'android'],
  version: '0.1.0',
  scheme: 'mawjood',
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
      backgroundColor: '#14523C',
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
        backgroundColor: '#FBF8F2',
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
          'MAWJOOd uses your location to show food you can rescue nearby. It is never stored.',
      },
    ],
    [
      'expo-camera',
      {
        cameraPermission: 'MAWJOOd uses the camera to scan pickup codes at your store.',
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
