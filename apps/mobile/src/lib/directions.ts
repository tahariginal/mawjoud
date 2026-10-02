import type { GeoPoint } from '@mawjood/contracts';
import { Linking, Platform } from 'react-native';

/** Hands off to the platform maps app (Apple Maps on iOS, Google Maps on Android). */
export async function openDirections(point: GeoPoint, label: string): Promise<void> {
  const destination = `${point.lat},${point.lng}`;
  const url =
    Platform.OS === 'ios'
      ? `https://maps.apple.com/?daddr=${destination}&q=${encodeURIComponent(label)}`
      : `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
  await Linking.openURL(url);
}
