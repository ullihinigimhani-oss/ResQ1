import { useCallback, useEffect, useState } from 'react';
import {
  getGpsCurrentArea,
  type GpsLocationStatus,
} from '@/services/gpsLocationService';

export function useCurrentLocation(autoFetch = true) {
  const [currentArea, setCurrentArea] = useState<string>('Detecting location...');
  const [status, setStatus] = useState<GpsLocationStatus>('detecting');
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchLocation = useCallback(async () => {
    setStatus('detecting');
    setCurrentArea('Detecting location...');
    setErrorMessage(null);

    const result = await getGpsCurrentArea();

    setStatus(result.status);
    setCurrentArea(result.areaName);

    if (result.latitude !== null && result.longitude !== null) {
      setCoordinates({ latitude: result.latitude, longitude: result.longitude });
    }

    if (result.errorMessage) {
      setErrorMessage(result.errorMessage);
    }
  }, []);

  useEffect(() => {
    if (autoFetch) {
      void fetchLocation();
    }
  }, [autoFetch, fetchLocation]);

  return {
    currentArea,
    status,
    coordinates,
    errorMessage,
    refreshLocation: fetchLocation,
  };
}
