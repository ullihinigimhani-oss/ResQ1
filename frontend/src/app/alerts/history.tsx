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
import { getActiveAlerts } from '@/services/alertService';
import type { Alert } from '@/types/alert';
import { formatDateTime, normalize } from '@/utils/format';

export default function AlertHistoryScreen() {
  const router = useRouter();
  const { isLoading, token, user } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'All' | 'Flood' | 'Weather' | 'Community'>('All');
  const [statusFilter, setStatusFilter] = useState<'Active' | 'Previous'>('Active');

  const loadAlerts = useCallback(async () => {
    if (!token) {
      return;
    }

    setLoadingAlerts(true);

    try {
      setAlerts(await getActiveAlerts(token));
    } finally {
      setLoadingAlerts(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      void loadAlerts();
    }
  }, [loadAlerts, token]);

  const filteredAlerts = useMemo(() => {
    const normalizedQuery = normalize(query);

    return alerts.filter((alert) => {
      const matchesQuery =
        !normalizedQuery ||
        normalize(alert.title).includes(normalizedQuery) ||
        normalize(alert.affectedArea).includes(normalizedQuery);
      const matchesType = typeFilter === 'All' || alert.disasterType === typeFilter;
      const matchesStatus = statusFilter === 'Active';

      return matchesQuery && matchesType && matchesStatus;
    });
  }, [alerts, query, statusFilter, typeFilter]);

  if (!isLoading && !user) {
    return <Redirect href={'/auth/welcome' as Href} />;
  }

  if (isLoading || !user) {
    return (
      <ScreenContainer bottomNav={false}>
        <LoadingState message="Loading alert history..." />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <AppHeader
        eyebrow="Alert History"
        title="Alert Records"
        subtitle="Sprint 1 exposes active alerts only; previous-history UI is ready for a future endpoint."
        onBack={() => router.replace('/alerts' as Href)}
      />

      <DemoNotice text="Only active alerts are fetched from the current backend. Previous alert history is not fabricated." />

      <SectionCard>
        <SearchBar placeholder="Search alerts or area" value={query} onChangeText={setQuery} />
        <View style={styles.filterRow}>
          {(['All', 'Flood', 'Weather', 'Community'] as const).map((item) => (
            <FilterChip key={item} selected={typeFilter === item} title={item} onPress={() => setTypeFilter(item)} />
          ))}
        </View>
        <View style={styles.filterRow}>
          {(['Active', 'Previous'] as const).map((item) => (
            <FilterChip key={item} selected={statusFilter === item} title={item} onPress={() => setStatusFilter(item)} />
          ))}
        </View>
      </SectionCard>

      <SectionCard title="Results">
        {loadingAlerts ? <LoadingState message="Loading alert records..." /> : null}
        {!loadingAlerts && filteredAlerts.length === 0 ? (
          <EmptyState
            title="No alert records"
            body={statusFilter === 'Previous' ? 'Previous alert history requires a Sprint 2 endpoint.' : 'No active alert records match this filter.'}
          />
        ) : null}
        {filteredAlerts.map((alert) => (
          <Pressable
            accessibilityRole="button"
            key={alert.id}
            onPress={() => router.push({
              pathname: '/alerts/[id]',
              params: { id: String(alert.id) },
            } as unknown as Href)}
            style={({ pressed }) => [styles.alertRow, pressed && styles.pressed]}>
            <View style={styles.alertTextBlock}>
              <Text style={styles.alertTitle}>{alert.title}</Text>
              <Text style={styles.alertMeta}>{alert.affectedArea} | {formatDateTime(alert.createdAt)}</Text>
            </View>
            <StatusBadge label={alert.riskLevel} tone={alert.riskLevel === 'Critical' ? 'red' : 'blue'} />
          </Pressable>
        ))}
      </SectionCard>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  alertRow: {
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
  alertTextBlock: {
    flex: 1,
    gap: 3,
  },
  alertTitle: {
    color: colors.navy,
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 20,
  },
  alertMeta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  pressed: {
    opacity: 0.72,
  },
});
