import { Redirect, useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

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
import { getAllIncidents } from '@/services/incidentService';
import type { Incident, IncidentSeverity } from '@/types/incident';
import { formatDateTime, normalize } from '@/utils/format';

const SEVERITY_ORDER: IncidentSeverity[] = ['Low', 'Medium', 'High', 'Critical'];

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

export default function NearbyIncidentsScreen() {
  const router = useRouter();
  const { isLoading, token, user } = useAuth();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loadingIncidents, setLoadingIncidents] = useState(true);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'All' | 'Flood' | 'Landslide' | 'Road Block'>('All');
  const mapRef = useRef<React.ElementRef<typeof MapView>>(null);
  const mapReadyRef = useRef(false);
  const fittedOnceRef = useRef(false);

  const loadIncidents = useCallback(async () => {
    if (!token) {
      return;
    }

    setLoadingIncidents(true);

    try {
      setIncidents(await getAllIncidents(token));
    } finally {
      setLoadingIncidents(false);
    }
  }, [token]);

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

    requestAnimationFrame(() => {
      mapRef.current?.fitToCoordinates(
        locatedIncidents.map((incident) => ({
          latitude: incident.latitude as number,
          longitude: incident.longitude as number,
        })),
        {
          animated: true,
          edgePadding: { top: 80, right: 80, bottom: 80, left: 80 },
        },
      );
    });
  }, [locatedIncidents]);

  useEffect(() => {
    if (mapReadyRef.current && !fittedOnceRef.current && locatedIncidents.length > 0) {
      fittedOnceRef.current = true;
      fitMapToIncidents();
    }
  }, [fitMapToIncidents, locatedIncidents.length]);

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
        subtitle="Verified incident reports around your area, with severity-colored markers."
        onBack={() => router.replace('/incidents' as Href)}
      />

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
                  if (!fittedOnceRef.current && locatedIncidents.length > 0) {
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
        {filteredIncidents.map((incident) => (
          <Pressable
            accessibilityRole="button"
            key={incident.id}
            onPress={() => openIncident(incident)}
            style={({ pressed }) => [styles.incidentRow, pressed && styles.pressed]}>
            <View style={styles.incidentTextBlock}>
              <Text style={styles.incidentTitle}>{incident.title}</Text>
              <Text style={styles.incidentMeta}>{incident.location} | {formatDateTime(incident.createdAt)}</Text>
            </View>
            <SeverityBadge severity={incident.severity} />
          </Pressable>
        ))}
      </SectionCard>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
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