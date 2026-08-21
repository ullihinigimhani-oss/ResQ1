import { StatusBar } from 'expo-status-bar';
import { Redirect, useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthButton, BackButton, StatusBanner } from '@/components/common/auth-components';
import { BottomNavigation } from '@/components/ui/app-components';
import { CapacityIndicator, ShelterStatusBadge } from '@/components/shelters/shelter-ui';
import { BrandColors } from '@/constants/brand';
import { useAuth } from '@/context/auth-context';
import { getShelters, isShelterApiError } from '@/services/shelterService';
import type { Shelter } from '@/types/shelter';

type FilterKey = 'Nearest' | 'Available' | 'Medical Support' | 'Family Friendly' | 'Area';

const baseFilters: FilterKey[] = ['Nearest', 'Available', 'Medical Support', 'Family Friendly'];

function normalizedText(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? '';
}

function areaMatches(shelterArea: string, residentArea: string | null | undefined) {
  const shelter = normalizedText(shelterArea);
  const resident = normalizedText(residentArea);

  return Boolean(resident && (shelter === resident || shelter.includes(resident) || resident.includes(shelter)));
}

function isAvailableShelter(shelter: Shelter) {
  const status = normalizedText(shelter.status);

  if (status === 'closed' || status === 'full') {
    return false;
  }

  if (shelter.availableSpaces !== null) {
    return shelter.availableSpaces > 0;
  }

  return status === 'open' || status === 'limited';
}

function metricValue(value: number | null, suffix = '') {
  return value === null ? 'Unavailable' : `${value.toLocaleString()}${suffix}`;
}

function facilitiesText(facilities: string[]) {
  return facilities.length > 0 ? facilities.slice(0, 4).join(' | ') : 'Facilities pending verification';
}

function ShelterMetric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricItem}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function ShelterCard({
  onPress,
  shelter,
}: {
  onPress: () => void;
  shelter: Shelter;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleBlock}>
          <Text style={styles.cardTitle}>{shelter.name}</Text>
          <Text style={styles.cardArea}>{shelter.area}</Text>
        </View>
        <ShelterStatusBadge status={shelter.status} />
      </View>

      {shelter.isAreaMatch ? (
        <View style={styles.areaMatchBadge}>
          <Text style={styles.areaMatchText}>AREA MATCH</Text>
        </View>
      ) : null}

      <View style={styles.metricGrid}>
        <ShelterMetric label="Capacity" value={metricValue(shelter.capacity)} />
        <ShelterMetric label="Available" value={metricValue(shelter.availableSpaces, ' spaces')} />
      </View>

      <CapacityIndicator
        availableSpaces={shelter.availableSpaces}
        capacity={shelter.capacity}
        currentOccupancy={shelter.currentOccupancy}
      />

      <View style={styles.cardInfoBlock}>
        <Text style={styles.infoLabel}>Contact Number</Text>
        <Text style={styles.infoValue}>{shelter.contactNumber ?? 'Contact pending verification'}</Text>
      </View>

      <View style={styles.cardInfoBlock}>
        <Text style={styles.infoLabel}>Facilities</Text>
        <Text style={styles.infoValue}>{facilitiesText(shelter.facilities)}</Text>
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.viewText}>View Shelter</Text>
        <Text style={styles.cardArrow}>{'>'}</Text>
      </View>
    </Pressable>
  );
}

export default function NearbySheltersScreen() {
  const router = useRouter();
  const { isLoading, token, user } = useAuth();
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [loadingShelters, setLoadingShelters] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterKey>('Nearest');

  const loadShelters = useCallback(async (refresh = false) => {
    if (!token) {
      return;
    }

    if (refresh) {
      setRefreshing(true);
    } else {
      setLoadingShelters(true);
    }

    setErrorMessage(null);

    try {
      const safeShelters = await getShelters(token);
      setShelters(safeShelters);
    } catch (error) {
      if (__DEV__ && !isShelterApiError(error)) {
        console.warn('Unexpected shelter list error:', error);
      }

      setErrorMessage('Unable to load safe shelters.');
    } finally {
      setLoadingShelters(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      void loadShelters();
    }
  }, [loadShelters, token]);

  const filterOptions = useMemo(
    () => user?.location ? [...baseFilters, 'Area' as FilterKey] : baseFilters,
    [user?.location],
  );

  const filteredShelters = useMemo(() => {
    const query = normalizedText(searchQuery);

    return shelters.filter((shelter) => {
      const matchesSearch =
        !query ||
        normalizedText(shelter.name).includes(query) ||
        normalizedText(shelter.area).includes(query);

      if (!matchesSearch) {
        return false;
      }

      if (filter === 'Available') {
        return isAvailableShelter(shelter);
      }

      if (filter === 'Medical Support') {
        return shelter.facilities.some((facility) => {
          const normalizedFacility = normalizedText(facility);
          return normalizedFacility.includes('medical') || normalizedFacility.includes('first aid');
        });
      }

      if (filter === 'Family Friendly') {
        return shelter.facilities.some((facility) => normalizedText(facility).includes('family'));
      }

      if (filter === 'Area') {
        return shelter.isAreaMatch || areaMatches(shelter.area, user?.location);
      }

      return true;
    });
  }, [filter, searchQuery, shelters, user?.location]);

  if (!isLoading && !user) {
    return <Redirect href={'/auth/welcome' as Href} />;
  }

  if (isLoading || !user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={BrandColors.red} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  const showInitialLoading = loadingShelters && shelters.length === 0;
  const showError = Boolean(errorMessage) && shelters.length === 0 && !showInitialLoading;
  const showEmpty = !showInitialLoading && !showError && filteredShelters.length === 0;
  const residentArea = user.location?.trim();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={BrandColors.red}
            onRefresh={() => void loadShelters(true)}
          />
        }
        showsVerticalScrollIndicator={false}>
        <BackButton onPress={() => router.replace('/dashboard' as Href)} />

        <View style={styles.header}>
          <Text style={styles.eyebrow}>Emergency Response</Text>
          <Text style={styles.title}>Nearby Safe Shelters</Text>
          <Text style={styles.subtitle}>
            Find verified emergency shelters and check their current availability.
          </Text>
        </View>

        <View style={styles.searchPanel}>
          <TextInput
            accessibilityLabel="Search shelters by name or area"
            autoCapitalize="words"
            placeholder="Search shelter name or area"
            placeholderTextColor="#8B98A9"
            returnKeyType="search"
            selectionColor={BrandColors.blue}
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />

          <View style={styles.filterRow}>
            {filterOptions.map((option) => {
              const selected = filter === option;

              return (
                <Pressable
                  accessibilityRole="button"
                  key={option}
                  onPress={() => setFilter(option)}
                  style={({ pressed }) => [
                    styles.filterChip,
                    selected && styles.filterChipSelected,
                    pressed && styles.pressed,
                  ]}>
                  <Text style={[styles.filterText, selected && styles.filterTextSelected]}>{option}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.summaryStrip}>
          <Text style={styles.summaryText}>
            Showing {filteredShelters.length} of {shelters.length} verified shelters
          </Text>
          <Text style={styles.summarySubtext}>
            {residentArea ? `Resident area: ${residentArea}` : 'Resident area unavailable'}
          </Text>
        </View>

        <View style={styles.mapSummary}>
          <View style={styles.mapPoint} />
          <View style={styles.mapConnector} />
          <View style={[styles.mapPoint, styles.mapPointSafe]} />
          <Text style={styles.mapSummaryText}>Map-ready shelter summary using verified Neon shelter records.</Text>
        </View>

        {errorMessage && shelters.length > 0 ? (
          <StatusBanner message={errorMessage} type="error" />
        ) : null}

        {showInitialLoading ? (
          <View style={styles.centerState}>
            <ActivityIndicator color={BrandColors.red} size="large" />
            <Text style={styles.stateText}>Loading verified shelter availability...</Text>
          </View>
        ) : null}

        {showError ? (
          <View style={styles.centerState}>
            <Text style={styles.emptyTitle}>Unable to load safe shelters.</Text>
            <Text style={styles.stateText}>Please check your connection and try again.</Text>
            <AuthButton
              style={styles.stateButton}
              title="Retry"
              variant="secondary"
              onPress={() => void loadShelters()}
            />
          </View>
        ) : null}

        {showEmpty ? (
          <View style={styles.centerState}>
            <Text style={styles.emptyTitle}>No safe shelters currently available.</Text>
            <Text style={styles.stateText}>
              Check again shortly or follow official emergency instructions.
            </Text>
          </View>
        ) : null}

        {filteredShelters.length > 0 ? (
          <View style={styles.list}>
            {filteredShelters.map((shelter) => (
              <ShelterCard
                key={shelter.id}
                shelter={shelter}
                onPress={() => router.push({
                  pathname: '/shelters/[id]',
                  params: { id: String(shelter.id) },
                } as unknown as Href)}
              />
            ))}
          </View>
        ) : null}
      </ScrollView>
      <BottomNavigation />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: BrandColors.background,
    flex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  content: {
    flexGrow: 1,
    gap: 18,
    paddingHorizontal: 18,
    paddingBottom: 96,
    paddingTop: 18,
  },
  header: {
    gap: 7,
  },
  eyebrow: {
    color: BrandColors.red,
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 16,
    textTransform: 'uppercase',
  },
  title: {
    color: BrandColors.navy,
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 34,
  },
  subtitle: {
    color: BrandColors.muted,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
  },
  searchPanel: {
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 12,
  },
  searchInput: {
    backgroundColor: BrandColors.background,
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: BrandColors.text,
    fontSize: 15,
    fontWeight: '700',
    minHeight: 48,
    paddingHorizontal: 12,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    alignItems: 'center',
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: 12,
  },
  filterChipSelected: {
    backgroundColor: BrandColors.navy,
    borderColor: BrandColors.navy,
  },
  filterText: {
    color: BrandColors.deepBlue,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 17,
  },
  filterTextSelected: {
    color: BrandColors.white,
  },
  summaryStrip: {
    backgroundColor: BrandColors.lightBlue,
    borderColor: BrandColors.sky,
    borderRadius: 8,
    borderWidth: 1,
    gap: 3,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  summaryText: {
    color: BrandColors.navy,
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 19,
  },
  summarySubtext: {
    color: BrandColors.deepBlue,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
  },
  mapSummary: {
    alignItems: 'center',
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 0,
    minHeight: 94,
    padding: 16,
  },
  mapPoint: {
    backgroundColor: BrandColors.deepBlue,
    borderRadius: 8,
    height: 16,
    width: 16,
  },
  mapPointSafe: {
    backgroundColor: BrandColors.success,
  },
  mapConnector: {
    backgroundColor: BrandColors.sky,
    flex: 1,
    height: 5,
  },
  mapSummaryText: {
    color: BrandColors.muted,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
    marginLeft: 12,
    maxWidth: 120,
  },
  list: {
    gap: 14,
    paddingBottom: 12,
  },
  card: {
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 13,
    padding: 15,
  },
  cardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  cardTitleBlock: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    color: BrandColors.navy,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 24,
  },
  cardArea: {
    color: BrandColors.deepBlue,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 18,
    textTransform: 'uppercase',
  },
  areaMatchBadge: {
    alignSelf: 'flex-start',
    backgroundColor: BrandColors.navy,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  areaMatchText: {
    color: BrandColors.white,
    fontSize: 11,
    fontWeight: '900',
    lineHeight: 15,
  },
  metricGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  metricItem: {
    backgroundColor: BrandColors.background,
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    gap: 4,
    padding: 11,
  },
  metricLabel: {
    color: BrandColors.muted,
    fontSize: 11,
    fontWeight: '900',
    lineHeight: 15,
    textTransform: 'uppercase',
  },
  metricValue: {
    color: BrandColors.text,
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 20,
  },
  cardInfoBlock: {
    gap: 4,
  },
  infoLabel: {
    color: BrandColors.muted,
    fontSize: 11,
    fontWeight: '900',
    lineHeight: 15,
    textTransform: 'uppercase',
  },
  infoValue: {
    color: BrandColors.text,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  cardFooter: {
    alignItems: 'center',
    borderTopColor: BrandColors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
  },
  viewText: {
    color: BrandColors.deepBlue,
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 19,
  },
  cardArrow: {
    color: BrandColors.deepBlue,
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 28,
  },
  centerState: {
    alignItems: 'center',
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    justifyContent: 'center',
    marginTop: 8,
    minHeight: 240,
    padding: 22,
  },
  emptyTitle: {
    color: BrandColors.navy,
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 26,
    textAlign: 'center',
  },
  stateText: {
    color: BrandColors.muted,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
    textAlign: 'center',
  },
  stateButton: {
    marginTop: 4,
    width: '100%',
  },
  pressed: {
    opacity: 0.72,
  },
});
