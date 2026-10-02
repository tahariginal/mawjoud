import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, TextInput, View } from 'react-native';

import { useSearch } from '@/api/hooks';
import { OfferCard } from '@/components/OfferCard';
import { StoreRow } from '@/components/StoreRow';
import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import { Screen, SectionHeader } from '@/components/ui/Layout';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/ui/StateViews';
import { colors, radius, spacing, TOUCH_TARGET, typography } from '@/design/tokens';
import { useLocationStore } from '@/state/location';

/** Debounce so typing does not fire a request per keystroke. */
function useDebounced(value: string, delayMs: number): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export default function SearchScreen() {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const query = useDebounced(text.trim(), 300);
  const point = useLocationStore((s) => s.selected.point);
  const results = useSearch(query, point);

  let body;
  if (query.length < 2) {
    body = (
      <AppText variant="subhead" color={colors.textSecondary} align="center">
        {t('search.hint')}
      </AppText>
    );
  } else if (results.isPending) {
    body = <ListSkeleton rows={3} rowHeight={72} />;
  } else if (results.isError) {
    body = (
      <ErrorState
        error={results.error}
        onRetry={() => void results.refetch()}
        retrying={results.isRefetching}
      />
    );
  } else if (results.data.stores.length === 0 && results.data.offers.length === 0) {
    body = <EmptyState icon="search-outline" title={t('search.empty', { query })} />;
  } else {
    body = (
      <>
        {results.data.stores.length > 0 ? (
          <View style={styles.section}>
            <SectionHeader title={t('search.stores')} />
            {results.data.stores.map((s) => (
              <StoreRow key={s.id} store={s} />
            ))}
          </View>
        ) : null}
        {results.data.offers.length > 0 ? (
          <View style={styles.section}>
            <SectionHeader title={t('search.offers')} />
            {results.data.offers.map((o) => (
              <OfferCard key={o.id} offer={o} />
            ))}
          </View>
        ) : null}
      </>
    );
  }

  return (
    <Screen scroll>
      <Stack.Screen options={{ title: t('home.searchA11y') }} />
      <View style={styles.inputRow}>
        <Icon name="search-outline" size={20} />
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={t('search.placeholder')}
          placeholderTextColor={colors.textSecondary}
          accessibilityLabel={t('search.placeholder')}
          autoFocus
          returnKeyType="search"
          autoCorrect={false}
          style={styles.input}
        />
      </View>
      {body}
    </Screen>
  );
}

const styles = StyleSheet.create({
  inputRow: {
    minHeight: TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderInput,
    backgroundColor: colors.bgSurface,
  },
  input: { ...typography.body, flex: 1, color: colors.textPrimary },
  section: { gap: spacing.md },
});
