import * as Location from 'expo-location';

export type GpsLocationStatus =
  | 'idle'
  | 'detecting'
  | 'ready'
  | 'permission-denied'
  | 'unavailable'
  | 'error';

export interface GpsLocationResult {
  latitude: number | null;
  longitude: number | null;
  areaName: string;
  status: GpsLocationStatus;
  errorMessage?: string;
  address?: Location.LocationGeocodedAddress | null;
}

/**
 * Extracts a concise, human-friendly city/area name from geocoded address items.
 * Prioritizes city/town, followed by subregion, district, locality name, and region.
 * Examples: "Badulla", "Pelmadulla", "Colombo", "Kandy", "Ratnapura".
 */
export function extractAreaName(addresses: Location.LocationGeocodedAddress[]): string {
  if (!addresses || addresses.length === 0) {
    return 'Unknown Location';
  }

  const primary = addresses[0];

  const clean = (val: string | null | undefined) => (val?.trim() ? val.trim() : null);

  const city = clean(primary.city);
  const subregion = clean(primary.subregion);
  const district = clean(primary.district);
  const name = clean(primary.name);
  const region = clean(primary.region);

  return city || subregion || district || name || region || 'Current Location';
}

/**
 * Reverse-geocodes coordinates into an area name with multi-tier fallback.
 */
export async function reverseGeocodeCoordinates(
  latitude: number,
  longitude: number,
): Promise<string> {
  try {
    const addresses = await Location.reverseGeocodeAsync({ latitude, longitude });

    if (addresses && addresses.length > 0) {
      return extractAreaName(addresses);
    }
  } catch {
    // In web or restricted environments, reverse geocoding may fail; attempt client-side fallback
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
        {
          headers: {
            'User-Agent': 'ResQ1/1.0',
          },
        },
      );
      if (res.ok) {
        const data = await res.json();
        const address = data?.address;
        const fallbackArea =
          address?.city ||
          address?.town ||
          address?.village ||
          address?.suburb ||
          address?.county ||
          address?.state_district ||
          address?.state;

        if (fallbackArea) {
          return fallbackArea;
        }
      }
    } catch {
      // Fallback failed, continue
    }
  }

  return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
}

/**
 * Requests location permission, obtains high/balanced accuracy coordinates,
 * and reverse-geocodes them into a localized town/city area name.
 */
export async function getGpsCurrentArea(): Promise<GpsLocationResult> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();

    if (status !== 'granted') {
      return {
        latitude: null,
        longitude: null,
        areaName: 'Permission required',
        status: 'permission-denied',
        errorMessage: 'Location permission was denied. Please allow location access in your device settings.',
      };
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const { latitude, longitude } = location.coords;
    const areaName = await reverseGeocodeCoordinates(latitude, longitude);

    return {
      latitude,
      longitude,
      areaName,
      status: 'ready',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to acquire GPS location.';
    return {
      latitude: null,
      longitude: null,
      areaName: 'Location unavailable',
      status: 'error',
      errorMessage: message,
    };
  }
}
