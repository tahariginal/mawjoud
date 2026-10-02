import '@/i18n';

import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { DefaultTheme, Stack, ThemeProvider, router, type ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@/api';
import { useAppConfig } from '@/api/hooks';
import { queryClient } from '@/api/queryClient';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { env } from '@/config/env';
import { stackScreenOptions } from '@/design/navigation';
import { colors, spacing } from '@/design/tokens';
import { isVersionOlder } from '@/lib/version';
import { useSession } from '@/state/session';

void SplashScreen.preventAutoHideAsync();

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.textPrimary,
    background: colors.bgApp,
    card: colors.bgSurface,
    text: colors.textPrimary,
    border: colors.borderDivider,
  },
};

function SessionBootstrap() {
  const setMe = useSession((s) => s.setMe);
  useEffect(() => {
    let active = true;
    api
      .restoreSession()
      .then((me) => active && setMe(me))
      .catch(() => active && setMe(null));
    return () => {
      active = false;
    };
  }, [setMe]);
  return null;
}

function VersionGate() {
  const config = useAppConfig();
  const minimum = config.data?.minSupportedVersion;
  useEffect(() => {
    if (minimum && isVersionOlder(env.appVersion, minimum)) router.replace('/update-required');
  }, [minimum]);
  return null;
}

export default function RootLayout() {
  const { t } = useTranslation();
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const ready = fontsLoaded || fontError !== null;

  useEffect(() => {
    // If fonts fail to load, continue with system fonts rather than blocking the app.
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={navigationTheme}>
        <StatusBar style="dark" />
        <SessionBootstrap />
        <VersionGate />
        <Stack screenOptions={stackScreenOptions}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="merchant" options={{ headerShown: false }} />
          <Stack.Screen
            name="checkout/[offerId]"
            options={{ presentation: 'modal', title: t('checkout.title') }}
          />
          <Stack.Screen
            name="filters"
            options={{ presentation: 'modal', title: t('filters.title') }}
          />
          <Stack.Screen
            name="location"
            options={{ presentation: 'modal', title: t('location.chooseTitle') }}
          />
          <Stack.Screen
            name="review/[orderId]"
            options={{ presentation: 'modal', title: t('review.title') }}
          />
          <Stack.Screen
            name="update-required"
            options={{ headerShown: false, gestureEnabled: false }}
          />
        </Stack>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

/** Route-level error boundary: never a blank screen. */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const { t } = useTranslation();
  if (__DEV__) console.error(error);
  return (
    <SafeAreaView style={styles.errorScreen}>
      <View style={styles.errorBody}>
        <Icon name="alert-circle-outline" size={40} color={colors.errorFg} />
        <AppText variant="title2" align="center">
          {t('errorBoundary.title')}
        </AppText>
        <AppText variant="body" color={colors.textSecondary} align="center">
          {t('errorBoundary.body')}
        </AppText>
        <Button label={t('common.retry')} onPress={() => void retry()} icon="refresh-outline" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  errorScreen: { flex: 1, backgroundColor: colors.bgApp },
  errorBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xxl,
  },
});
