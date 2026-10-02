import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { Divider, Group, Screen } from '@/components/ui/Layout';
import { Icon } from '@/components/ui/Icon';
import { ListRow } from '@/components/ui/ListRow';
import { colors, spacing } from '@/design/tokens';
import { MANUAL_AREAS, useLocationStore } from '@/state/location';

type Problem = 'denied' | 'unavailable' | null;

export default function LocationScreen() {
  const { t } = useTranslation();
  const { selected, setSelected } = useLocationStore();
  const [locating, setLocating] = useState(false);
  const [problem, setProblem] = useState<Problem>(null);

  const locateDevice = async () => {
    setLocating(true);
    setProblem(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setProblem('denied');
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setSelected({
        label: t('location.currentLocation'),
        point: { lat: position.coords.latitude, lng: position.coords.longitude },
        source: 'device',
      });
      router.back();
    } catch {
      setProblem('unavailable');
    } finally {
      setLocating(false);
    }
  };

  return (
    <Screen scroll>
      <Button
        label={locating ? t('location.locating') : t('location.useMyLocation')}
        icon="navigate-outline"
        loading={locating}
        onPress={() => void locateDevice()}
        fullWidth
      />
      <AppText variant="footnote" color={colors.textSecondary}>
        {t('location.useMyLocationHint')}
      </AppText>
      {problem ? (
        <Banner
          tone="warning"
          message={
            problem === 'denied' ? t('location.permissionDenied') : t('location.unavailable')
          }
        />
      ) : null}

      <View style={styles.section}>
        <AppText variant="headline">{t('location.areas')}</AppText>
        <AppText variant="footnote" color={colors.textSecondary}>
          {t('location.manualHint')}
        </AppText>
        <Group>
          {MANUAL_AREAS.map((area, index) => (
            <View key={area.id}>
              {index > 0 ? <Divider /> : null}
              <ListRow
                icon="location-outline"
                title={area.label}
                showChevron={false}
                right={
                  selected.source === 'manual' && selected.label === area.label ? (
                    <Icon
                      name="checkmark"
                      size={20}
                      color={colors.textPrimary}
                      accessibilityLabel={t('location.selected')}
                    />
                  ) : undefined
                }
                onPress={() => {
                  setSelected({ label: area.label, point: area.point, source: 'manual' });
                  router.back();
                }}
              />
            </View>
          ))}
        </Group>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
});
