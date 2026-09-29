import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AuthTextField } from '@/components/common/auth-components';
import MapView, { Marker, PROVIDER_GOOGLE } from '@/components/shelters/native-map';
import { BrandColors } from '@/constants/brand';
import { useAuth } from '@/context/auth-context';
import {
  isIncidentApiError,
  reverseGeocodeIncidentLocation,
  searchIncidentLocation,
} from '@/services/incidentService';
import type { GeocodeResult } from '@/types/incident';

const DEFAULT_REGION = {
  latitude: 6.9271,
  longitude: 79.8612,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
};

const SEARCH_DEBOUNCE_MS = 600;

type Coordinate = {
  latitude: number;
  longitude: number;
};

type IncidentLocationPickerProps = {
  latitudeText: string;
  longitudeText: string;
  locationText: string;
  locationError?: string;
  onLocationChange: (text: string) => void;
  onCoordinatesChange: (latitudeText: string, longitudeText: string) => void;
};

function toCoordinate(text: string) {
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
}

function shortLocationName(displayName: string) {
  return displayName
    .split(',')
    .slice(0, 3)
    .join(',')
    .trim();
}

export function IncidentLocationPicker({
  latitudeText,
  longitudeText,
  locationText,
  locationError,
  onLocationChange,
  onCoordinatesChange,
}: IncidentLocationPickerProps) {
  const { token } = useAuth();
  const initialLatitude = toCoordinate(latitudeText);
  const initialLongitude = toCoordinate(longitudeText);
  const hasInitial = initialLatitude !== null && initialLongitude !== null;

  const [marker, setMarker] = useState<Coordinate | null>(
    hasInitial
      ? { latitude: initialLatitude, longitude: initialLongitude }
      : null,
  );
  const [region, setRegion] = useState({
    latitude: hasInitial ? (initialLatitude as number) : DEFAULT_REGION.latitude,
    longitude: hasInitial ? (initialLongitude as number) : DEFAULT_REGION.longitude,
    latitudeDelta: DEFAULT_REGION.latitudeDelta,
    longitudeDelta: DEFAULT_REGION.longitudeDelta,
  });
  const [locating, setLocating] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<GeocodeResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const areaRequestId = useRef(0);
  const searchRequestId = useRef(0);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, []);

  const resolveAreaName = (coordinate: Coordinate) => {
    if (!token || locationText.trim()) {
      return;
    }

    const requestId = areaRequestId.current + 1;
    areaRequestId.current = requestId;

    void (async () => {
      try {
        const result = await reverseGeocodeIncidentLocation(
          coordinate.latitude,
          coordinate.longitude,
          token,
        );

        if (areaRequestId.current === requestId && result && result.shortName) {
          onLocationChange(result.shortName);
        }
      } catch (error) {
        if (__DEV__) {
          console.warn('Reverse geocoding failed:', error);
        }
      }
    })();
  };

  const applyCoordinates = (coordinate: Coordinate, message: string) => {
    setMarker(coordinate);
    setRegion((current) => ({
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
      latitudeDelta: current.latitudeDelta,
      longitudeDelta: current.longitudeDelta,
    }));
    onCoordinatesChange(
      coordinate.latitude.toFixed(6),
      coordinate.longitude.toFixed(6),
    );
    setStatusMessage(message);
    resolveAreaName(coordinate);
  };

  const handleGetCurrentLocation = async () => {
    setLocating(true);
    setStatusMessage(null);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Location permission is required to attach your current GPS location.',
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({});

      applyCoordinates(
        {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        },
        'GPS location attached for your current position.',
      );
    } catch (error) {
      if (__DEV__) {
        console.warn('Failed to fetch current location:', error);
      }

      Alert.alert('Error', 'Failed to get current location. Please try again.');
    } finally {
      setLocating(false);
    }
  };

  const handleMapPress = (event: {
    nativeEvent: { coordinate: Coordinate };
  }) => {
    applyCoordinates(
      {
        latitude: event.nativeEvent.coordinate.latitude,
        longitude: event.nativeEvent.coordinate.longitude,
      },
      'Map location selected.',
    );
  };

  const performSearch = async (query: string) => {
    const trimmed = query.trim();

    if (!trimmed) {
      searchRequestId.current += 1;
      setSearchError(null);
      setSearchResults([]);
      return;
    }

    if (!token) {
      searchRequestId.current += 1;
      setSearchError('Please log in to search for a location.');
      setSearchResults([]);
      return;
    }

    const requestId = searchRequestId.current + 1;
    searchRequestId.current = requestId;

    setSearching(true);
    setSearchError(null);
    setSearchResults([]);

    try {
      const results = await searchIncidentLocation(trimmed, token);

      if (searchRequestId.current !== requestId) {
        return;
      }

      setSearchResults(results);

      if (results.length === 0) {
        setSearchError('No locations found. Try a different search.');
      }
    } catch (error) {
      if (searchRequestId.current !== requestId) {
        return;
      }

      if (isIncidentApiError(error)) {
        setSearchError(error.message);
      } else {
        if (__DEV__) {
          console.warn('Location search failed:', error);
        }

        setSearchError('Unable to search locations. Please check your connection.');
      }
    } finally {
      if (searchRequestId.current === requestId) {
        setSearching(false);
      }
    }
  };

  const handleSearch = () => {
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
      searchTimeout.current = null;
    }

    void performSearch(locationText);
  };

  const handleLocationChange = (value: string) => {
    onLocationChange(value);
    setSearchError(null);
    setSearchResults([]);

    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    searchTimeout.current = setTimeout(() => {
      void performSearch(value);
    }, SEARCH_DEBOUNCE_MS);
  };

  const handleSelectResult = (result: GeocodeResult) => {
    const shortName = shortLocationName(result.displayName);
    onLocationChange(shortName);
    applyCoordinates(
      {
        latitude: result.latitude,
        longitude: result.longitude,
      },
      `Incident location set to ${shortName}.`,
    );
    setSearchResults([]);
    setSearchError(null);
  };

  return (
    <View style={styles.container}>
      <AuthTextField
        autoCapitalize="words"
        autoCorrect={false}
        error={locationError}
        label="Location / Area"
        onChangeText={handleLocationChange}
        onSubmitEditing={handleSearch}
        placeholder="Panadura"
        returnKeyType="search"
        rightAccessory={
          <Pressable
            accessibilityLabel="Search for a location"
            accessibilityRole="button"
            disabled={searching}
            onPress={handleSearch}
            style={({ pressed }) => [
              styles.searchAccessoryButton,
              searching && styles.buttonDisabled,
              pressed && styles.pressed,
            ]}>
            {searching ? (
              <ActivityIndicator color={BrandColors.onPrimary} size="small" />
            ) : (
              <Text style={styles.searchAccessoryText}>Search</Text>
            )}
          </Pressable>
        }
        value={locationText}
      />

      {searchError ? <Text style={styles.errorText}>{searchError}</Text> : null}

      {searchResults.length > 0 ? (
        <View style={styles.resultsList}>
          {searchResults.map((result, index) => (
            <Pressable
              accessibilityRole="button"
              key={`${result.latitude}-${result.longitude}-${index}`}
              onPress={() => handleSelectResult(result)}
              style={({ pressed }) => [styles.resultItem, pressed && styles.pressed]}>
              <Text numberOfLines={2} style={styles.resultText}>
                {result.displayName}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={styles.mapContainer}>
        <MapView
          provider={PROVIDER_GOOGLE}
          region={region}
          onPress={handleMapPress}
          showsUserLocation
          style={styles.map}>
          {marker ? (
            <Marker
              coordinate={marker}
              title="Incident Location"
              description="Drag or tap to set the incident position"
              pinColor={BrandColors.red}
              draggable
              onDragEnd={(event) => {
                applyCoordinates(
                  {
                    latitude: event.nativeEvent.coordinate.latitude,
                    longitude: event.nativeEvent.coordinate.longitude,
                  },
                  'Location updated.',
                );
              }}
            />
          ) : null}
        </MapView>

        <Pressable
          accessibilityRole="button"
          disabled={locating}
          onPress={() => void handleGetCurrentLocation()}
          style={[styles.currentLocationButton, locating && styles.buttonDisabled]}>
          {locating ? (
            <ActivityIndicator color={BrandColors.onPrimary} />
          ) : (
            <Text style={styles.currentLocationButtonText}>Use Current Location</Text>
          )}
        </Pressable>

        {Platform.OS === 'web' ? (
          <Text style={styles.webFallbackText}>
            Not on a map? Use the search above to set the incident location.
          </Text>
        ) : null}
      </View>

      {statusMessage ? <Text style={styles.statusText}>{statusMessage}</Text> : null}

      <Text style={styles.helperText}>
        Search for an area, or tap and drag the map to adjust the incident location.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  helperText: {
    color: BrandColors.muted,
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
  },
  mapContainer: {
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    height: 320,
    overflow: 'hidden',
    position: 'relative',
  },
  map: {
    height: '100%',
    width: '100%',
  },
  currentLocationButton: {
    backgroundColor: BrandColors.navy,
    borderRadius: 8,
    bottom: 12,
    left: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    position: 'absolute',
    zIndex: 5,
  },
  currentLocationButtonText: {
    color: BrandColors.onPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  webFallbackText: {
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    bottom: 12,
    color: BrandColors.muted,
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    padding: 10,
    position: 'absolute',
    right: 12,
  },
  statusText: {
    color: BrandColors.deepBlue,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  searchAccessoryButton: {
    alignItems: 'center',
    backgroundColor: BrandColors.accentAction,
    borderRadius: 8,
    height: 38,
    justifyContent: 'center',
    marginRight: 4,
    minWidth: 84,
    paddingHorizontal: 12,
  },
  searchAccessoryText: {
    color: BrandColors.onPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  errorText: {
    color: BrandColors.red,
    fontSize: 13,
    lineHeight: 18,
  },
  resultsList: {
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  resultItem: {
    borderBottomColor: BrandColors.border,
    borderBottomWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  resultText: {
    color: BrandColors.text,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 19,
  },
  pressed: {
    opacity: 0.72,
  },
});