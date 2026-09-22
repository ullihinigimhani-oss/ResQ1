import { Platform } from 'react-native';
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

const SRI_LANKA_REGIONS: Array<{ name: string; lat: number; lon: number }> = [
  { name: 'Kaduwela', lat: 6.9324, lon: 79.9836 },
  { name: 'Malabe', lat: 6.9044, lon: 79.9542 },
  { name: 'Pelmadulla', lat: 6.6212, lon: 80.5484 },
  { name: 'Badulla', lat: 6.9934, lon: 81.0550 },
  { name: 'Ratnapura', lat: 6.6828, lon: 80.4038 },
  { name: 'Colombo', lat: 6.9271, lon: 79.8612 },
  { name: 'Battaramulla', lat: 6.9016, lon: 79.9239 },
  { name: 'Dehiwala', lat: 6.8517, lon: 79.8659 },
  { name: 'Moratuwa', lat: 6.7730, lon: 79.8816 },
  { name: 'Gampaha', lat: 7.0840, lon: 79.9939 },
  { name: 'Negombo', lat: 7.2008, lon: 79.8736 },
  { name: 'Kalutara', lat: 6.5854, lon: 79.9607 },
  { name: 'Panadura', lat: 6.7132, lon: 79.9074 },
  { name: 'Kandy', lat: 7.2906, lon: 80.6337 },
  { name: 'Matale', lat: 7.4675, lon: 80.6234 },
  { name: 'Nuwara Eliya', lat: 6.9497, lon: 80.7891 },
  { name: 'Galle', lat: 6.0535, lon: 80.2210 },
  { name: 'Matara', lat: 5.9549, lon: 80.5550 },
  { name: 'Hambantota', lat: 6.1429, lon: 81.1212 },
  { name: 'Jaffna', lat: 9.6615, lon: 80.0255 },
  { name: 'Kilinochchi', lat: 9.3803, lon: 80.3770 },
  { name: 'Mannar', lat: 8.9810, lon: 79.9044 },
  { name: 'Vavuniya', lat: 8.7514, lon: 80.4971 },
  { name: 'Mullaitivu', lat: 9.2671, lon: 80.8142 },
  { name: 'Batticaloa', lat: 7.7310, lon: 81.6747 },
  { name: 'Ampara', lat: 7.2912, lon: 81.6724 },
  { name: 'Trincomalee', lat: 8.5874, lon: 81.2152 },
  { name: 'Kurunegala', lat: 7.4863, lon: 80.3623 },
  { name: 'Puttalam', lat: 8.0362, lon: 79.8283 },
  { name: 'Anuradhapura', lat: 8.3114, lon: 80.4037 },
  { name: 'Polonnaruwa', lat: 7.9403, lon: 81.0188 },
  { name: 'Monaragala', lat: 6.8728, lon: 81.3507 },
  { name: 'Kegalle', lat: 7.2513, lon: 80.3464 },
  { name: 'Balangoda', lat: 6.6496, lon: 80.7027 },
  { name: 'Avissawella', lat: 6.9536, lon: 80.2078 },
  { name: 'Embilipitiya', lat: 6.3392, lon: 80.8494 },
  { name: 'Bandarawela', lat: 6.8306, lon: 80.9981 },
  { name: 'Ella', lat: 6.8667, lon: 81.0466 },
  { name: 'Mahiyanganaya', lat: 7.3167, lon: 81.0000 },
  { name: 'Welimada', lat: 6.9036, lon: 80.9083 },
];

function getNearestRegion(latitude: number, longitude: number): string {
  let nearestName = 'Sri Lanka';
  let minDistanceSq = Number.POSITIVE_INFINITY;

  for (const region of SRI_LANKA_REGIONS) {
    const dLat = region.lat - latitude;
    const dLon = region.lon - longitude;
    const distSq = dLat * dLat + dLon * dLon;

    if (distSq < minDistanceSq) {
      minDistanceSq = distSq;
      nearestName = region.name;
    }
  }

  return nearestName;
}

/**
 * Extracts a concise, human-friendly city/area name from geocoded address items.
 * Prioritizes city/town, followed by subregion, district, locality name, and region.
 * Examples: "Badulla", "Pelmadulla", "Kaduwela", "Malabe", "Colombo".
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
 * Reverse-geocodes coordinates into an area name with multi-tier resolution:
 * 1. BigDataCloud Client Reverse Geocode API (CORS-friendly, no headers required, works in browser & mobile)
 * 2. OpenStreetMap Nominatim reverse geocode (safe without forbidden User-Agent header)
 * 3. Expo Native Geocoder (iOS/Android)
 * 4. Local proximity lookup for Sri Lanka districts/towns
 */
export async function reverseGeocodeCoordinates(
  latitude: number,
  longitude: number,
): Promise<string> {
  // Tier 1: Client reverse geocode API (open CORS, fast, no forbidden headers)
  try {
    const res = await fetch(
      `https://api-bdc.io/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
    );

    if (res.ok) {
      const data = await res.json();
      const area = data?.locality || data?.city || data?.principalSubdivision;

      if (area && typeof area === 'string' && area.trim()) {
        return area.trim();
      }
    }
  } catch {
    // Continue to next tier
  }

  // Tier 2: OpenStreetMap Nominatim
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`,
    );

    if (res.ok) {
      const data = await res.json();
      const address = data?.address || {};
      const fallbackArea =
        address.town ||
        address.city ||
        address.village ||
        address.suburb ||
        address.municipality ||
        address.neighbourhood ||
        address.hamlet ||
        address.county ||
        address.state_district ||
        address.state;

      if (fallbackArea && typeof fallbackArea === 'string' && fallbackArea.trim()) {
        return fallbackArea.trim();
      }
    }
  } catch {
    // Continue to next tier
  }

  // Tier 3: Native Expo Geocoder on iOS/Android
  if (Platform.OS !== 'web') {
    try {
      const addresses = await Location.reverseGeocodeAsync({ latitude, longitude });

      if (addresses && addresses.length > 0) {
        const nativeName = extractAreaName(addresses);
        if (nativeName && nativeName !== 'Unknown Location' && nativeName !== 'Current Location') {
          return nativeName;
        }
      }
    } catch {
      // Continue to next tier
    }
  }

  // Tier 4: Regional Sri Lanka proximity matching (ensures an area name like Badulla / Pelmadulla is always shown)
  return getNearestRegion(latitude, longitude);
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
