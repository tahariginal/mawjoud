import { QueryClient, focusManager, onlineManager } from '@tanstack/react-query';
import * as Network from 'expo-network';
import { AppState, Platform } from 'react-native';

import { isTransientError } from './errors';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 10 * 60_000,
      // Reads retry only on transient failures (network, timeout, 5xx), at most twice.
      retry: (failureCount, error) => isTransientError(error) && failureCount < 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    },
    mutations: {
      // Mutations never retry automatically (docs/ERROR_HANDLING.md §5).
      retry: false,
    },
  },
});

onlineManager.setEventListener((setOnline) => {
  const subscription = Network.addNetworkStateListener((state) => {
    setOnline(state.isConnected !== false);
  });
  return () => subscription.remove();
});

focusManager.setEventListener((setFocused) => {
  const subscription = AppState.addEventListener('change', (status) => {
    if (Platform.OS !== 'web') setFocused(status === 'active');
  });
  return () => subscription.remove();
});
