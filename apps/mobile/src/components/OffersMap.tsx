import type { BoundingBox, GeoPoint, OfferSummary } from '@mawjood/contracts';
import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, StyleSheet, View } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';

import { env } from '@/config/env';
import { colors, spacing } from '@/design/tokens';

import { OfferCard } from './OfferCard';
import { Button } from './ui/Button';
import { EmptyState } from './ui/StateViews';

type Props = {
  center: GeoPoint;
  offers: OfferSummary[];
  onSearchArea: (bbox: BoundingBox) => void;
  onShowList: () => void;
};

const INITIAL_DELTA = 0.05;

function regionToBbox(region: Region): BoundingBox {
  return {
    minLat: region.latitude - region.latitudeDelta / 2,
    maxLat: region.latitude + region.latitudeDelta / 2,
    minLng: region.longitude - region.longitudeDelta / 2,
    maxLng: region.longitude + region.longitudeDelta / 2,
  };
}

/**
 * Map of offers in the current results. Viewport search is explicit ("Search this area") so the
 * map never reloads while the user is moving it. Server-side clustering comes with the API
 * (docs/UX_SPECIFICATION.md §3.3).
 */
export function OffersMap({ center, offers, onSearchArea, onShowList }: Props) {
  const { t } = useTranslation();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [movedRegion, setMovedRegion] = useState<Region | null>(null);
  // The first region event is the initial render, not a user pan.
  const initialRegionSettled = useRef(false);
  const selected = useMemo(
    () => offers.find((o) => o.id === selectedId) ?? null,
    [offers, selectedId],
  );

  // PLACEHOLDER: Android needs a Google Maps key (GOOGLE_MAPS_ANDROID_API_KEY). Without it, use the list.
  if (Platform.OS === 'android' && !env.googleMapsAndroidConfigured) {
    return (
      <EmptyState
        icon="map-outline"
        title={t('explore.mapUnavailableTitle')}
        body={t('explore.mapUnavailableBody')}
        actionLabel={t('explore.showList')}
        onAction={onShowList}
      />
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={StyleSheet.absoluteFill}
        initialRegion={{
          latitude: center.lat,
          longitude: center.lng,
          latitudeDelta: INITIAL_DELTA,
          longitudeDelta: INITIAL_DELTA,
        }}
        onRegionChangeComplete={(region) => {
          if (!initialRegionSettled.current) {
            initialRegionSettled.current = true;
            return;
          }
          setMovedRegion(region);
        }}
        toolbarEnabled={false}
        showsPointsOfInterests={false}
      >
        {offers.map((offer) => (
          <Marker
            key={offer.id}
            coordinate={{ latitude: offer.store.location.lat, longitude: offer.store.location.lng }}
            title={offer.store.name}
            description={offer.title}
            pinColor={offer.quantityAvailable > 0 ? colors.bgBrand : colors.iconMuted}
            onPress={() => setSelectedId(offer.id)}
            tracksViewChanges={false}
          />
        ))}
      </MapView>
      {movedRegion ? (
        <View style={styles.searchArea}>
          <Button
            label={t('explore.searchThisArea')}
            icon="refresh-outline"
            variant="secondary"
            onPress={() => {
              onSearchArea(regionToBbox(movedRegion));
              setMovedRegion(null);
            }}
          />
        </View>
      ) : null}
      {selected ? (
        <View style={styles.preview}>
          <OfferCard offer={selected} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchArea: { position: 'absolute', top: spacing.md, alignSelf: 'center' },
  preview: { position: 'absolute', bottom: spacing.lg, start: spacing.lg, end: spacing.lg },
});
