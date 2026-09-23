import * as Location from 'expo-location';
import { Redirect, useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import MapView, { Circle, Marker, PROVIDER_GOOGLE } from '@/components/shelters/native-map';
import {
  AppHeader,
  EmptyState,
  FilterChip,
  LoadingState,
  ScreenContainer,
  SearchBar,
  SectionCard,
} from '@/components/ui/app-components';
import { SeverityBadge } from '@/components/incidents/incident-badges';
import { colors, radius, spacing } from '@/constants/design';
import { useAuth } from '@/context/auth-context';
import { getAllIncidents, getNearbyIncidents } from '@/services/incidentService';
import type { Incident, IncidentSeverity } from '@/types/incident';
import { formatDateTime, normalize } from '@/utils/format';

const SEVERITY_ORDER: IncidentSeverity[] = ['Low', 'Medium', 'High', 'Critical'];
const RADIUS_OPTIONS = [2, 5, 10] as const;

const severityPinColor: Record<IncidentSeverity, string> = {
  Low: colors.blueBorder,
  Medium: colors.warningBorderStrong,
  High: colors.red,
  Critical: colors.criticalBorder,
};

const severityAreaRadius: Record<IncidentSeverity, number> = {
  Low: 200,
  Medium: 350,
  High: 500,
  Critical: 700,
};

function withAlpha(hex: string) {
  return `${hex}66`;
}

function distanceLabel(km: number | undefined) {
  if (km === undefined || km === null) {
    return '';
  }

  return km < 1 ? `${Math.round(km * 1000)} m away` : `${km.toFixed(1)} km away`;
}

export default function NearbyIncidentsScreen() {
  const router = useRouter();
  const { isLoading, token, user } = useAuth();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loadingIncidents, setLoadingIncidents] = useState(true);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'All' | 'Flood' | 'Landslide' | 'Road Block'>('All');
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'locating' | 'granted' | 'denied'>('idle');
  const [radiusKm, setRadiusKm] = useState<number | null>(null);
  const mapRef = useRef<React.ElementRef<typeof MapView>>(null);
  const mapReadyRef = useRef(false);
  const fittedOnceRef = useRef(false);
  const pendingRadiusRef = useRef<number | null>(null);

  const locateUser = useCallback(async () => {
    setLocationStatus('locating');

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        setLocationStatus('denied');
        pendingRadiusRef.current = null;
        return;
      }

      const position = await Location.getCurrentPositionAsync({});

      setUserLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
      setLocationStatus('granted');
      setRadiusKm(pendingRadiusRef.current ?? 5);
      pendingRadiusRef.current = null;
    } catch {
      setLocationStatus('denied');
      pendingRadiusRef.current = null;
    }
  }, []);

  const selectRadius = useCallback((value: number | null) => {
    if (value === null) {
      setRadiusKm(null);
      return;
    }

    if (userLocation) {
      setRadiusKm(value);
      return;
    }

    pendingRadiusRef.current = value;
    void locateUser();
  }, [locateUser, userLocation]);

  const loadIncidents = useCallback(async () => {
    if (!token) {
      return;
    }

    setLoadingIncidents(true);

    try {
      if (userLocation && radiusKm !== null) {
        setIncidents(await getNearbyIncidents(userLocation.latitude, userLocation.longitude, radiusKm, token));
      } else {
        setIncidents(await getAllIncidents(token));
      }
    } finally {
      setLoadingIncidents(false);
    }
  }, [radiusKm, token, userLocation]);

  useEffect(() => {
    if (token) {
      void locateUser();
    }
  }, [locateUser, token]);

  useEffect(() => {
    if (token) {
      void loadIncidents();
    }
  }, [loadIncidents, token]);

  const locatedIncidents = useMemo(
    () => incidents.filter((incident) => incident.latitude !== null && incident.longitude !== null),
    [incidents],
  );

  const fitMapToIncidents = useCallback(() => {
    if (!mapReadyRef.current || locatedIncidents.length === 0) {
      return;
    }

    const points = locatedIncidents.map((incident) => ({
      latitude: incident.latitude as number,
      longitude: incident.longitude as number,
    }));

    if (userLocation) {
      points.push(userLocation);
    }

    requestAnimationFrame(() => {
      mapRef.current?.fitToCoordinates(points, {
        animated: true,
        edgePadding: { top: 80, right: 80, bottom: 80, left: 80 },
      });
    });
  }, [locatedIncidents, userLocation]);

  useEffect(() => {
    if (mapReadyRef.current && !fittedOnceRef.current && (locatedIncidents.length > 0 || userLocation)) {
      fittedOnceRef.current = true;
      fitMapToIncidents();
    }
  }, [fitMapToIncidents, locatedIncidents.length, userLocation]);

  const filteredIncidents = useMemo(() => {
    const normalizedQuery = normalize(query);

    return incidents.filter((incident) => {
      const matchesSearch =
        !normalizedQuery ||
        normalize(incident.title).includes(normalizedQuery) ||
        normalize(incident.location).includes(normalizedQuery);
      const matchesFilter = filter === 'All' || incident.incidentType === filter;

      return matchesSearch && matchesFilter;
    });
  }, [filter, incidents, query]);

  if (!isLoading && !user) {
    return <Redirect href={'/auth/welcome' as Href} />;
  }

  if (isLoading || !user) {
    return (
      <ScreenContainer bottomNav={false}>
        <LoadingState message="Loading verified incidents..." />
      </ScreenContainer>
    );
  }

  const openIncident = (incident: Incident) => {
    router.push({
      pathname: '/incidents/[id]',
      params: { id: String(incident.id) },
    } as unknown as Href);
  };

  return (
    <ScreenContainer>
      <AppHeader
        eyebrow="Verified Incidents"
        title="Incident Map"
        subtitle="Verified incidents near you, filtered by a selected radius."
        onBack={() => router.replace('/incidents' as Href)}
      />

      <SectionCard title="My Location & Radius">
        {locationStatus === 'locating' ? (
          <View style={styles.locationStatusRow}>
            <ActivityIndicator color={colors.accentAction} size="small" />
            <Text style={styles.locationStatusText}>Finding your current location...</Text>
          </View>
        ) : null}

        {locationStatus === 'granted' && userLocation ? (
          <Text style={styles.locationStatusText}>
            You are here — showing verified incidents within {radiusKm === null ? 'any radius' : `${radiusKm} km`} of your device.
          </Text>
        ) : null}

        {locationStatus === 'denied' ? (
          <View style={styles.locationStatusRow}>
            <Text style={styles.locationStatusText}>
              Location permission is off — showing all verified incidents.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => void locateUser()}
              style={({ pressed }) => [pressed && styles.pressed]}>
              <Text style={styles.enableLocationText}>Enable</Text>
            </Pressable>
          </View>
        ) : null}

        {locationStatus === 'idle' ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => void locateUser()}
            style={({ pressed }) => [pressed && styles.pressed]}>
            <Text style={styles.enableLocationText}>Use my location</Text>
          </Pressable>
        ) : null}

        <View style={styles.radiusRow}>
          {RADIUS_OPTIONS.map((km) => (
            <FilterChip
              key={km}
              selected={radiusKm === km}
              title={`${km} km`}
              onPress={() => selectRadius(km)}
            />
          ))}
          <FilterChip
            selected={radiusKm === null}
            title="All areas"
            onPress={() => selectRadius(null)}
          />
        </View>
      </SectionCard>

      <SectionCard title="Incident Map">
        <View style={styles.legendRow}>
          {SEVERITY_ORDER.map((severity) => (
            <View key={severity} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: severityPinColor[severity] }]} />
              <Text style={styles.legendText}>{severity}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.mapHint}>Colored circles show the affected area of each verified incident. Larger circles mean higher severity.</Text>

        {loadingIncidents ? <LoadingState message="Loading map markers..." /> : null}

        {!loadingIncidents && locatedIncidents.length === 0 ? (
          <EmptyState title="No verified incidents" body="No verified incidents with a location are available to show on the map." />
        ) : null}

        {!loadingIncidents && locatedIncidents.length > 0 ? (
          Platform.OS === 'web' ? (
            <View style={styles.mapFallbackCard}>
              <Text style={styles.mapFallbackTitle}>Interactive map unavailable on web</Text>
              <Text style={styles.mapFallbackText}>
                {locatedIncidents.length} verified incident{locatedIncidents.length === 1 ? '' : 's'} with locations are listed below.
              </Text>
            </View>
          ) : (
            <View style={styles.mapContainer}>
              <MapView
                provider={PROVIDER_GOOGLE}
                ref={mapRef}
                style={styles.map}
                onMapReady={() => {
                  mapReadyRef.current = true;
                  if (!fittedOnceRef.current && (locatedIncidents.length > 0 || userLocation)) {
                    fittedOnceRef.current = true;
                    fitMapToIncidents();
                  }
                }}>
                {locatedIncidents.map((incident) => {
                  const severityColor = severityPinColor[incident.severity];

                  return (
                    <Circle
                      key={incident.id}
                      center={{
                        latitude: incident.latitude as number,
                        longitude: incident.longitude as number,
                      }}
                      fillColor={withAlpha(severityColor)}
                      radius={severityAreaRadius[incident.severity]}
                      strokeColor={severityColor}
                      strokeWidth={2}
                    />
                  );
                })}
                {locatedIncidents.map((incident) => {
                  const severityColor = severityPinColor[incident.severity];

                  return (
                    <Marker
                      key={`center-${incident.id}`}
                      coordinate={{
                        latitude: incident.latitude as number,
                        longitude: incident.longitude as number,
                      }}
                      onPress={() => openIncident(incident)}
                      stopPropagation
                      tracksViewChanges={false}>
                      <View style={styles.centerDotOuter}>
                        <View style={[styles.centerDot, { backgroundColor: severityColor }]} />
                      </View>
                    </Marker>
                  );
                })}
                {userLocation ? (
                  <Marker
                    coordinate={userLocation}
                    title="You are here"
                    tracksViewChanges={false}>
                    <View style={styles.userDotOuter}>
                      <View style={[styles.centerDot, { backgroundColor: colors.accentAction }]} />
                    </View>
                  </Marker>
                ) : null}
              </MapView>
            </View>
          )
        ) : null}
      </SectionCard>

      <SectionCard>
        <SearchBar placeholder="Search reports or area" value={query} onChangeText={setQuery} />
        <View style={styles.filterRow}>
          {(['All', 'Flood', 'Landslide', 'Road Block'] as const).map((item) => (
            <FilterChip key={item} selected={filter === item} title={item} onPress={() => setFilter(item)} />
          ))}
        </View>
      </SectionCard>

      <SectionCard title="Verified Incident Cards">
        {loadingIncidents ? <LoadingState message="Loading verified incident records..." /> : null}
        {!loadingIncidents && filteredIncidents.length === 0 ? (
          <EmptyState title="No incidents found" body="No verified incident records match this view." />
        ) : null}
        {filteredIncidents.map((incident) => {
          const distance = distanceLabel(incident.distanceKm);

          return (
            <Pressable
              accessibilityRole="button"
              key={incident.id}
              onPress={() => openIncident(incident)}
              style={({ pressed }) => [styles.incidentRow, pressed && styles.pressed]}>
              <View style={styles.incidentTextBlock}>
                <Text style={styles.incidentTitle}>{incident.title}</Text>
                <Text style={styles.incidentMeta}>
                  {incident.location}
                  {distance ? ` | ${distance}` : ''} | {formatDateTime(incident.createdAt)}
                </Text>
              </View>
              <SeverityBadge severity={incident.severity} />
            </Pressable>
          );
        })}
      </SectionCard>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  locationStatusRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  locationStatusText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 19,
  },
  enableLocationText: {
    color: colors.blue,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 19,
  },
  radiusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  legendItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  legendDot: {
    borderRadius: radius.sm,
    height: 12,
    width: 12,
  },
  legendText: {
    color: colors.textStrong,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  mapHint: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 19,
  },
  mapContainer: {
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  map: {
    height: 360,
    width: '100%',
  },
  centerDotOuter: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.white,
    borderRadius: 11,
    borderWidth: 2,
    height: 22,
    justifyContent: 'center',
    shadowColor: colors.navy,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    width: 22,
  },
  userDotOuter: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.accentAction,
    borderRadius: 13,
    borderWidth: 3,
    height: 26,
    justifyContent: 'center',
    shadowColor: colors.navy,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    width: 26,
  },
  centerDot: {
    borderRadius: 7,
    height: 14,
    width: 14,
  },
  mapFallbackCard: {
    backgroundColor: colors.lightBlue,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.lg,
  },
  mapFallbackTitle: {
    color: colors.navy,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  mapFallbackText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 19,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  incidentRow: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  incidentTextBlock: {
    flex: 1,
    gap: 3,
  },
  incidentTitle: {
    color: colors.navy,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  incidentMeta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 17,
  },
  pressed: {
    opacity: 0.72,
  },
});