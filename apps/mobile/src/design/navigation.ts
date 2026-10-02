import type { NativeStackNavigationOptions } from 'expo-router';

import { colors, fontFamily } from './tokens';

/** Shared header styling for every stack navigator. */
export const stackScreenOptions: NativeStackNavigationOptions = {
  headerTintColor: colors.textPrimary,
  headerTitleStyle: { fontFamily: fontFamily.semibold, color: colors.textPrimary },
  headerStyle: { backgroundColor: colors.bgSurface },
  headerShadowVisible: false,
  headerBackButtonDisplayMode: 'minimal',
  contentStyle: { backgroundColor: colors.bgApp },
};

/** Shared bottom tab styling: plain white bar, no top border or shadow. */
export const tabScreenOptions = {
  headerShown: false,
  tabBarActiveTintColor: colors.textPrimary,
  tabBarInactiveTintColor: colors.textSecondary,
  tabBarStyle: {
    backgroundColor: colors.bgSurface,
    borderTopWidth: 0,
    elevation: 0,
    shadowOpacity: 0,
  },
  tabBarLabelStyle: { fontFamily: fontFamily.medium, fontSize: 12 },
  tabBarHideOnKeyboard: true,
} as const;
