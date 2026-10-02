import { DietaryTag, RADIUS_OPTIONS_M } from '@mawjood/contracts';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useCategories } from '@/api/hooks';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Group, Screen, SwitchRow } from '@/components/ui/Layout';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { spacing } from '@/design/tokens';
import { currentLocale } from '@/i18n';
import { formatDistance, formatMoney } from '@/lib/format';
import { DEFAULT_FILTERS, useFilters, type ExploreFilters, type PickupDay } from '@/state/filters';

// PLACEHOLDER price steps (MAD, minor units) until real price distribution data exists.
const PRICE_STEPS = [3000, 5000, 10000] as const;
const RATING_STEPS = [4, 4.5] as const;

function toggle<T>(list: readonly T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <AppText variant="headline" accessibilityRole="header">
        {title}
      </AppText>
      <View style={styles.chips}>{children}</View>
    </View>
  );
}

export default function FiltersScreen() {
  const { t } = useTranslation();
  const locale = currentLocale();
  const stored = useFilters((s) => s.filters);
  const setFilters = useFilters((s) => s.setFilters);
  const categories = useCategories();
  const [draft, setDraft] = useState<ExploreFilters>(stored);
  const update = (patch: Partial<ExploreFilters>) => setDraft((d) => ({ ...d, ...patch }));

  const footer = (
    <View style={styles.footer}>
      <Button
        label={t('filters.reset')}
        variant="secondary"
        fullWidth={false}
        onPress={() => setDraft(DEFAULT_FILTERS)}
      />
      <View style={styles.flex}>
        <Button
          label={t('filters.apply')}
          fullWidth
          onPress={() => {
            setFilters(draft);
            router.back();
          }}
        />
      </View>
    </View>
  );

  return (
    <Screen scroll footer={footer}>
      <View style={styles.section}>
        <AppText variant="headline">{t('filters.pickupDay')}</AppText>
        <SegmentedControl<PickupDay>
          options={[
            { value: 'any', label: t('filters.any') },
            { value: 'today', label: t('filters.today') },
            { value: 'tomorrow', label: t('filters.tomorrow') },
          ]}
          value={draft.pickupDay}
          onChange={(pickupDay) => update({ pickupDay })}
        />
      </View>

      <Section title={t('filters.distance')}>
        {RADIUS_OPTIONS_M.map((r) => (
          <Chip
            key={r}
            label={formatDistance(r, locale)}
            selected={draft.radiusM === r}
            onPress={() => update({ radiusM: r })}
          />
        ))}
      </Section>

      <Section title={t('filters.maxPrice')}>
        <Chip
          label={t('filters.any')}
          selected={draft.maxPriceMinor === null}
          onPress={() => update({ maxPriceMinor: null })}
        />
        {PRICE_STEPS.map((p) => (
          <Chip
            key={p}
            label={`≤ ${formatMoney({ amountMinor: p, currency: 'MAD' }, locale)}`}
            selected={draft.maxPriceMinor === p}
            onPress={() => update({ maxPriceMinor: p })}
          />
        ))}
      </Section>

      {categories.data && categories.data.length > 0 ? (
        <Section title={t('filters.categories')}>
          {categories.data.map((c) => (
            <Chip
              key={c.id}
              label={c.name}
              selected={draft.categoryIds.includes(c.id)}
              onPress={() => update({ categoryIds: toggle(draft.categoryIds, c.id) })}
            />
          ))}
        </Section>
      ) : null}

      <Section title={t('filters.dietary')}>
        {DietaryTag.options.map((d) => (
          <Chip
            key={d}
            label={t(`dietary.${d}`)}
            selected={draft.dietary.includes(d)}
            onPress={() => update({ dietary: toggle(draft.dietary, d) })}
          />
        ))}
      </Section>

      <Section title={t('filters.minRating')}>
        <Chip
          label={t('filters.any')}
          selected={draft.minRating === null}
          onPress={() => update({ minRating: null })}
        />
        {RATING_STEPS.map((r) => (
          <Chip
            key={r}
            label={`★ ${r}+`}
            selected={draft.minRating === r}
            onPress={() => update({ minRating: r })}
          />
        ))}
      </Section>

      <Group>
        <SwitchRow
          label={t('filters.availableOnly')}
          value={draft.availableOnly}
          onValueChange={(availableOnly) => update({ availableOnly })}
        />
      </Group>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  footer: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  flex: { flex: 1 },
});
