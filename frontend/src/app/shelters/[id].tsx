import { StatusBar } from 'expo-status-bar';
import { Redirect, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthButton, BackButton, StatusBanner } from '@/components/common/auth-components';
import { CapacityIndicator, ShelterStatusBadge } from '@/components/shelters/shelter-ui';
import { BrandColors } from '@/constants/brand';
import { useAuth } from '@/context/auth-context';
import { getShelterById, isShelterApiError } from '@/services/shelterService';
import type { Shelter } from '@/types/shelter';

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function displayValue(value: string | null | undefined, fallback: string) {
  const text = value?.trim();

  return text || fallback;
}

function coordinatesText(shelter: Shelter) {
  if (shelter.latitude === null || shelter.longitude === null) {
    return null;
  }

  return `${shelter.latitude.toFixed(6)}, ${shelter.longitude.toFixed(6)}`;
}

function numberValue(value: number | null) {
  return value === null ? 'Unavailable' : value.toLocaleString();
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryItem}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

function FacilitiesList({ facilities }: { facilities: string[] }) {
  if (facilities.length === 0) {
    return (
      <View style={styles.facilityEmpty}>
        <Text style={styles.facilityEmptyText}>Facilities pending verification</Text>
      </View>
    );
  }

  return (
    <View style={styles.facilityGrid}>
      {facilities.map((facility) => (
        <View key={facility} style={styles.facilityChip}>
          <Text style={styles.facilityText}>{facility}</Text>
        </View>
      ))}
    </View>
  );
}

export default function ShelterDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const shelterId = firstParam(params.id);
  const { isLoading, token, user } = useAuth();
  const [shelter, setShelter] = useState<Shelter | null>(null);
  const [loadingShelter, setLoadingShelter] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadShelter = useCallback(async (refresh = false) => {
    if (!token || !shelterId) {
      return;
    }

    if (refresh) {
      setRefreshing(true);
    } else {
      setLoadingShelter(true);
    }

    setErrorMessage(null);

    try {
      const safeShelter = await getShelterById(shelterId, token);
      setShelter(safeShelter);
    } catch (error) {
      if (__DEV__ && !isShelterApiError(error)) {
        console.warn('Unexpected shelter detail error:', error);
      }

      setErrorMessage('Unable to load safe shelters.');
    } finally {
      setLoadingShelter(false);
      setRefreshing(false);
    }
  }, [shelterId, token]);

  useEffect(() => {
    if (token && shelterId) {
      void loadShelter();
    } else if (!shelterId) {
      setLoadingShelter(false);
      setErrorMessage('Unable to load safe shelters.');
    }
  }, [loadShelter, shelterId, token]);

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

  const coordinates = shelter ? coordinatesText(shelter) : null;
  const showInitialLoading = loadingShelter && !shelter;
  const showError = Boolean(errorMessage) && !shelter && !showInitialLoading;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={BrandColors.red}
            onRefresh={() => void loadShelter(true)}
          />
        }
        showsVerticalScrollIndicator={false}>
        <BackButton onPress={() => router.replace('/shelters' as Href)} />

        <View style={styles.header}>
          <Text style={styles.eyebrow}>Safe Shelter</Text>
          <Text style={styles.title}>Shelter Details</Text>
          <Text style={styles.subtitle}>
            {shelter ? shelter.area : 'Verified emergency shelter information'}
          </Text>
        </View>

        {errorMessage && shelter ? <StatusBanner message={errorMessage} type="error" /> : null}

        {showInitialLoading ? (
          <View style={styles.centerState}>
            <ActivityIndicator color={BrandColors.red} size="large" />
            <Text style={styles.stateText}>Loading shelter details...</Text>
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
              onPress={() => void loadShelter()}
            />
          </View>
        ) : null}

        {shelter ? (
          <>
            <View style={styles.summaryPanel}>
              <View style={styles.summaryHeader}>
                <View style={styles.summaryTitleBlock}>
                  <Text style={styles.shelterName}>{shelter.name}</Text>
                  <Text style={styles.shelterArea}>{shelter.area}</Text>
                </View>
                <ShelterStatusBadge status={shelter.status} />
              </View>

              <View style={styles.summaryGrid}>
                <SummaryItem label="Capacity" value={numberValue(shelter.capacity)} />
                <SummaryItem label="Current Occupancy" value={numberValue(shelter.currentOccupancy)} />
                <SummaryItem label="Available Spaces" value={numberValue(shelter.availableSpaces)} />
                <SummaryItem label="Resident Area Match" value={shelter.isAreaMatch ? 'Yes' : 'Not matched'} />
              </View>

              <CapacityIndicator
                availableSpaces={shelter.availableSpaces}
                capacity={shelter.capacity}
                currentOccupancy={shelter.currentOccupancy}
              />
            </View>

            <View style={styles.panel}>
              <Text style={styles.sectionTitle}>Shelter Information</Text>
              <DetailRow label="Address" value={displayValue(shelter.address, 'Address pending verification')} />
              <DetailRow label="Area" value={shelter.area} />
              <DetailRow label="Contact Number" value={displayValue(shelter.contactNumber, 'Contact pending verification')} />
              {coordinates ? <DetailRow label="Coordinates" value={coordinates} /> : null}
            </View>

            <View style={styles.panel}>
              <Text style={styles.sectionTitle}>Facilities</Text>
              <FacilitiesList facilities={shelter.facilities} />
            </View>

            <AuthButton
              title="View Safe Evacuation Route"
              onPress={() => router.push({
                pathname: '/shelters/[id]/route',
                params: { id: String(shelter.id) },
              } as unknown as Href)}
            />
          </>
        ) : null}
      </ScrollView>
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
    paddingVertical: 18,
  },
  header: {
    gap: 6,
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
    color: BrandColors.deepBlue,
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 21,
  },
  summaryPanel: {
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 14,
    padding: 15,
    shadowColor: BrandColors.navy,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 2,
  },
  summaryHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  summaryTitleBlock: {
    flex: 1,
    gap: 4,
  },
  shelterName: {
    color: BrandColors.navy,
    fontSize: 21,
    fontWeight: '900',
    lineHeight: 27,
  },
  shelterArea: {
    color: BrandColors.deepBlue,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 18,
    textTransform: 'uppercase',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  summaryItem: {
    backgroundColor: BrandColors.lightBlue,
    borderRadius: 8,
    flexGrow: 1,
    minWidth: '45%',
    padding: 11,
  },
  summaryLabel: {
    color: BrandColors.muted,
    fontSize: 11,
    fontWeight: '900',
    lineHeight: 15,
    textTransform: 'uppercase',
  },
  summaryValue: {
    color: BrandColors.text,
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 20,
    marginTop: 4,
  },
  panel: {
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 14,
    padding: 15,
  },
  sectionTitle: {
    color: BrandColors.navy,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 24,
  },
  detailRow: {
    borderTopColor: BrandColors.border,
    borderTopWidth: 1,
    gap: 4,
    paddingTop: 12,
  },
  detailLabel: {
    color: BrandColors.muted,
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 16,
    textTransform: 'uppercase',
  },
  detailValue: {
    color: BrandColors.text,
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 21,
  },
  facilityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  facilityChip: {
    backgroundColor: BrandColors.lightBlue,
    borderColor: BrandColors.sky,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  facilityText: {
    color: BrandColors.deepBlue,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 18,
  },
  facilityEmpty: {
    backgroundColor: BrandColors.lightBlue,
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
  },
  facilityEmptyText: {
    color: BrandColors.muted,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
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
    minHeight: 250,
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
});
