import { Redirect, useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  AppHeader,
  DemoNotice,
  EmptyState,
  FilterChip,
  LoadingState,
  ScreenContainer,
  SearchBar,
  SectionCard,
  StatusBadge,
} from '@/components/ui/app-components';
import { colors, radius, spacing } from '@/constants/design';
import { useAuth } from '@/context/auth-context';
import { getMyIncidents } from '@/services/incidentService';
import type { Incident } from '@/types/incident';
import { formatDateTime, normalize } from '@/utils/format';

export default function NearbyIncidentsScreen() {
  const router = useRouter();
  const { isLoading, token, user } = useAuth();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loadingIncidents, setLoadingIncidents] = useState(true);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'All' | 'Flood' | 'Landslide' | 'Road Block'>('All');

  const loadIncidents = useCallback(async () => {
    if (!token) {
      return;
    }

    setLoadingIncidents(true);

    try {
      setIncidents(await getMyIncidents(token));
    } finally {
      setLoadingIncidents(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      void loadIncidents();
    }
  }, [loadIncidents, token]);

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
        <LoadingState message="Loading nearby incidents..." />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <AppHeader
        eyebrow="Nearby Incidents"
        title="Community Incident View"
        subtitle="Map-ready UI using only available resident incident data for now."
        onBack={() => router.replace('/incidents' as Href)}
      />

      <DemoNotice text="The backend exposes the current resident's reports, not a public GIS incident feed. This screen avoids fake live map data." />

      <SectionCard title="Map Summary">
        <View style={styles.mapBox}>
          <View style={styles.mapPoint} />
          <View style={styles.mapLine} />
          <View style={[styles.mapPoint, styles.mapPointEnd]} />
        </View>
        <Text style={styles.mapText}>Static map summary placeholder. Real map/GIS integration is a Sprint 2 gap.</Text>
      </SectionCard>

      <SectionCard>
        <SearchBar placeholder="Search reports or area" value={query} onChangeText={setQuery} />
        <View style={styles.filterRow}>
          {(['All', 'Flood', 'Landslide', 'Road Block'] as const).map((item) => (
            <FilterChip key={item} selected={filter === item} title={item} onPress={() => setFilter(item)} />
          ))}
        </View>
      </SectionCard>

      <SectionCard title="Incident Cards">
        {loadingIncidents ? <LoadingState message="Loading available incident records..." /> : null}
        {!loadingIncidents && filteredIncidents.length === 0 ? (
          <EmptyState title="No incidents found" body="No available incident records match this view." />
        ) : null}
        {filteredIncidents.map((incident) => (
          <Pressable
            accessibilityRole="button"
            key={incident.id}
            onPress={() => router.push({
              pathname: '/incidents/[id]',
              params: { id: String(incident.id) },
            } as unknown as Href)}
            style={({ pressed }) => [styles.incidentRow, pressed && styles.pressed]}>
            <View style={styles.incidentTextBlock}>
              <Text style={styles.incidentTitle}>{incident.title}</Text>
              <Text style={styles.incidentMeta}>{incident.location} | {formatDateTime(incident.createdAt)}</Text>
            </View>
            <StatusBadge label={incident.status} tone={incident.status === 'Resolved' ? 'green' : 'blue'} />
          </Pressable>
        ))}
      </SectionCard>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  mapBox: {
    alignItems: 'center',
    backgroundColor: colors.lightBlue,
    borderColor: colors.sky,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    height: 140,
    paddingHorizontal: spacing.xl,
  },
  mapPoint: {
    backgroundColor: colors.red,
    borderRadius: 8,
    height: 16,
    width: 16,
  },
  mapPointEnd: {
    backgroundColor: colors.success,
  },
  mapLine: {
    backgroundColor: colors.deepBlue,
    flex: 1,
    height: 4,
  },
  mapText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
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
    fontWeight: '900',
    lineHeight: 20,
  },
  incidentMeta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  pressed: {
    opacity: 0.72,
  },
});
