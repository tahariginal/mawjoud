import type { NativeStackNavigationOptions } from 'expo-router';

import { colors, fontFamily } from './tokens';

/** Shared header styling for every stack navigator. */
export const stackScreenOptions: NativeStackNavigationOptions = {
  headerTintColor: colors.textBrand,
  headerTitleStyle: { fontFamily: fontFamily.semibold, color: colors.textPrimary },
  headerStyle: { backgroundColor: colors.bgSurface },
  headerShadowVisible: false,
  headerBackButtonDisplayMode: 'minimal',
  contentStyle: { backgroundColor: colors.bgApp },
};

/** Shared bottom tab styling. */
export const tabScreenOptions = {
  headerShown: false,
  tabBarActiveTintColor: colors.textBrand,
  tabBarInactiveTintColor: colors.textSecondary,
  tabBarStyle: { backgroundColor: colors.bgSurface, borderTopColor: colors.borderDivider },
  tabBarLabelStyle: { fontFamily: fontFamily.medium, fontSize: 12 },
  tabBarHideOnKeyboard: true,
} as const;
