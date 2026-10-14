import { useCallback, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import {
  getGpsCurrentArea,
  reverseGeocodeCoordinates,
  type GpsLocationStatus,
} from '@/services/gpsLocationService';

function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371e3; // Earth's radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export function useCurrentLocation(options: { autoFetch?: boolean; autoWatch?: boolean } = {}) {
  const { autoFetch = true, autoWatch = true } = options;

  const [currentArea, setCurrentArea] = useState<string>('Detecting location...');
  const [status, setStatus] = useState<GpsLocationStatus>('detecting');
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const lastGeocodedCoords = useRef<{ latitude: number; longitude: number } | null>(null);
  const isMountedRef = useRef(true);

  const handleCoordinateUpdate = useCallback(
    async (latitude: number, longitude: number) => {
      if (!isMountedRef.current) return;

      setCoordinates({ latitude, longitude });

      // If we haven't geocoded yet, or moved more than 200 meters, re-geocode area name
      const prev = lastGeocodedCoords.current;
      const shouldGeocode =
        !prev || calculateDistanceMeters(prev.latitude, prev.longitude, latitude, longitude) >= 200;

      if (shouldGeocode) {
        lastGeocodedCoords.current = { latitude, longitude };
        const areaName = await reverseGeocodeCoordinates(latitude, longitude);

        if (isMountedRef.current) {
          setCurrentArea(areaName);
          setStatus('ready');
        }
      }
    },
    [],
  );

  const fetchLocation = useCallback(async () => {
    setStatus('detecting');
    setErrorMessage(null);

    const result = await getGpsCurrentArea();

    if (!isMountedRef.current) return;

    setStatus(result.status);
    setCurrentArea(result.areaName);

    if (result.latitude !== null && result.longitude !== null) {
      setCoordinates({ latitude: result.latitude, longitude: result.longitude });
      lastGeocodedCoords.current = { latitude: result.latitude, longitude: result.longitude };
    }

    if (result.errorMessage) {
      setErrorMessage(result.errorMessage);
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    let subscription: Location.LocationSubscription | null = null;

    async function startWatching() {
      if (autoFetch) {
        await fetchLocation();
      }

      if (!autoWatch) return;

      try {
        const { status: permStatus } = await Location.getForegroundPermissionsAsync();
        if (permStatus !== 'granted') return;

        // Automatically watch position as user moves
        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 10000, // checks every 10 seconds
            distanceInterval: 100, // or every 100 meters
          },
          (location) => {
            const { latitude, longitude } = location.coords;
            void handleCoordinateUpdate(latitude, longitude);
          },
        );
      } catch (err) {
        if (__DEV__) {
          console.warn('GPS location watcher error:', err);
        }
      }
    }

    void startWatching();

    return () => {
      isMountedRef.current = false;
      if (subscription) {
        subscription.remove();
      }
    };
  }, [autoFetch, autoWatch, fetchLocation, handleCoordinateUpdate]);

  return {
    currentArea,
    status,
    coordinates,
    errorMessage,
    refreshLocation: fetchLocation,
  };
}
