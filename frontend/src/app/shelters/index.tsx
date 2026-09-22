import { StatusBar } from 'expo-status-bar';
import { Redirect, useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';

import { AuthButton, BackButton, StatusBanner } from '@/components/common/auth-components';
import { BottomNavigation } from '@/components/ui/app-components';
import { ShelterStatusBadge } from '@/components/shelters/shelter-ui';
import { BrandColors } from '@/constants/brand';
import { useAuth } from '@/context/auth-context';
import { getShelters, isShelterApiError } from '@/services/shelterService';
import { createSOSRequest, getUserSOSStatus } from '@/services/sosService';
import type { Shelter } from '@/types/shelter';
import type { SOSRequestWithVolunteer } from '@/types/sos';

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

function canPublishAlerts(role: string) {
  return role === 'admin' || role === 'authority';
}

function canCreateShelters(role: string) {
  return role === 'admin' || role === 'authority';
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
  onRoutePress,
  shelter,
}: {
  onPress: () => void;
  onRoutePress: () => void;
  shelter: Shelter;
}) {
  const handleCall = () => {
    if (shelter.contactNumber) {
      Linking.openURL(`tel:${shelter.contactNumber}`);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleBlock}>
          <Text style={styles.cardTitle}>{shelter.name}</Text>
          <Text style={styles.cardArea}>{shelter.area}</Text>
        </View>
        <View style={styles.headerRight}>
          <ShelterStatusBadge status={shelter.status} />
          {shelter.contactNumber && (
            <Pressable
              accessibilityRole="button"
              onPress={handleCall}
              style={({ pressed }) => [styles.callButton, pressed && styles.pressed]}>
              <Text style={styles.callIcon}>📞</Text>
            </Pressable>
          )}
        </View>
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

      <View style={styles.cardButtonRow}>
        <Pressable
          accessibilityRole="button"
          onPress={onPress}
          style={({ pressed }) => [styles.cardButton, pressed && styles.pressed]}>
          <Text style={styles.cardButtonText}>View Shelter</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={onRoutePress}
          style={({ pressed }) => [styles.cardButton, pressed && styles.pressed]}>
          <Text style={styles.cardButtonText}>View Safe Evacuation Route</Text>
        </Pressable>
      </View>
    </View>
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
  const [sosModalVisible, setSosModalVisible] = useState(false);
  const [sosRequest, setSosRequest] = useState<SOSRequestWithVolunteer | null>(null);

  // Disable SOS polling on web to prevent network errors
  const isWeb = Platform.OS === 'web';

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

  useEffect(() => {
    if (token && !isWeb) {
      const checkSOSStatus = async () => {
        try {
          const status = await getUserSOSStatus(token);
          setSosRequest(status);
        } catch (error) {
          console.error('Failed to check SOS status:', error);
        }
      };

      checkSOSStatus();
      const interval = setInterval(checkSOSStatus, 5000);

      return () => clearInterval(interval);
    }
  }, [token, isWeb]);

  const filteredShelters = useMemo(() => {
    const query = normalizedText(searchQuery);

    return (shelters || []).filter((shelter) => {
      return (
        !query ||
        normalizedText(shelter.name).includes(query) ||
        normalizedText(shelter.area).includes(query)
      );
    });
  }, [searchQuery, shelters]);

  const handleShareLocation = async () => {
    if (!token) return;

    if (Platform.OS === 'web') {
      alert('Location sharing is not available on web. Please use the mobile app.');
      return;
    }

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert('Location permission is required to share your live location.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      await createSOSRequest(token, {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      setSosModalVisible(false);
    } catch (error) {
      console.error('Failed to create SOS request:', error);
      alert('Failed to share location. Please try again.');
    }
  };

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
  const userCanCreateShelters = canCreateShelters(user.role);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="auto" />
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
          <View style={styles.headerRow}>
            <View style={styles.headerText}>
              <Text style={styles.eyebrow}>Emergency Response</Text>
              <Text style={styles.title}>Nearby Safe Shelters</Text>
            </View>
            {sosRequest && sosRequest.status === 'accepted' && sosRequest.volunteerName ? (
              <View style={styles.volunteerContact}>
                <Text style={styles.volunteerContactLabel}>Rescue Team:</Text>
                <Text style={styles.volunteerName}>{sosRequest.volunteerName}</Text>
                <Pressable
                  onPress={() => Linking.openURL(`tel:${sosRequest.volunteerPhone}`)}
                  style={({ pressed }) => [styles.callVolunteerButton, pressed && styles.callVolunteerButtonPressed]}>
                  <Text style={styles.callVolunteerButtonText}>Call</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={() => setSosModalVisible(true)}
                style={({ pressed }) => [styles.sosButton, pressed && styles.sosButtonPressed]}>
                <Text style={styles.sosButtonText}>SOS</Text>
              </Pressable>
            )}
          </View>
          <Text style={styles.subtitle}>
            Find verified emergency shelters and check their current availability.
          </Text>
        </View>

        {userCanCreateShelters ? (
          <AuthButton
            onPress={() => router.push('/shelters/create' as Href)}
            style={styles.createButton}
            title="Create Safe Shelter"
            variant="primary"
          />
        ) : null}

        <View style={styles.searchPanel}>
          <TextInput
            accessibilityLabel="Search shelters"
            autoCapitalize="words"
            placeholder="Search shelters"
            placeholderTextColor={BrandColors.placeholder}
            returnKeyType="search"
            selectionColor={BrandColors.blue}
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <AuthButton
          onPress={() => router.push('/emergency' as Href)}
          style={styles.emergencyButton}
          title="Emergency Call"
          variant="primary"
        />

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
                onRoutePress={() => router.push({
                  pathname: '/shelters/[id]/route',
                  params: { id: String(shelter.id) },
                } as unknown as Href)}
              />
            ))}
          </View>
        ) : null}
      </ScrollView>
      <BottomNavigation />

      <Modal
        animationType="fade"
        transparent={true}
        visible={sosModalVisible}
        onRequestClose={() => setSosModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Do you need emergency assistance?</Text>
            <Pressable
              style={({ pressed }) => [styles.shareLocationButton, pressed && styles.shareLocationButtonPressed]}
              onPress={handleShareLocation}>
              <Text style={styles.shareLocationButtonText}>Share your live location</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.cancelButton, pressed && styles.cancelButtonPressed]}
              onPress={() => setSosModalVisible(false)}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
    gap: 7,
  },
  eyebrow: {
    color: BrandColors.red,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
    textTransform: 'uppercase',
  },
  title: {
    color: BrandColors.navy,
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 30,
  },
  subtitle: {
    color: BrandColors.muted,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
  },
  sosButton: {
    backgroundColor: '#FF0000',
    borderRadius: 30,
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sosButtonPressed: {
    opacity: 0.8,
  },
  sosButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 20,
  },
  createButton: {
    marginTop: 4,
  },
  emergencyButton: {
    backgroundColor: BrandColors.redAction,
    marginTop: 4,
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
    backgroundColor: BrandColors.controlSurfaceSubtle,
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: BrandColors.text,
    fontSize: 15,
    fontWeight: '400',
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
    backgroundColor: BrandColors.primaryAction,
    borderColor: BrandColors.primaryAction,
  },
  filterText: {
    color: BrandColors.deepBlue,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 17,
  },
  filterTextSelected: {
    color: BrandColors.onPrimary,
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
    position: 'relative',
  },
  cardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  headerRight: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  cardTitleBlock: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    color: BrandColors.navy,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
  },
  cardArea: {
    color: BrandColors.deepBlue,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    textTransform: 'uppercase',
  },
  areaMatchBadge: {
    alignSelf: 'flex-start',
    backgroundColor: BrandColors.primaryAction,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  areaMatchText: {
    color: BrandColors.onPrimary,
    fontSize: 11,
    fontWeight: '700',
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
    fontWeight: '700',
    lineHeight: 15,
    textTransform: 'uppercase',
  },
  metricValue: {
    color: BrandColors.text,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  cardButtonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  cardButton: {
    alignItems: 'center',
    backgroundColor: BrandColors.primaryAction,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 12,
  },
  cardButtonText: {
    color: BrandColors.onPrimary,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 17,
  },
  callButton: {
    alignItems: 'center',
    backgroundColor: BrandColors.successBorder,
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  callIcon: {
    fontSize: 20,
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
    fontWeight: '700',
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
  modalOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: BrandColors.white,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    gap: 16,
  },
  modalTitle: {
    color: BrandColors.navy,
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 26,
    textAlign: 'center',
  },
  modalSubtitle: {
    color: BrandColors.text,
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 8,
  },
  shareLocationButton: {
    backgroundColor: BrandColors.red,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  shareLocationButtonPressed: {
    opacity: 0.8,
  },
  shareLocationButtonText: {
    color: BrandColors.white,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
  cancelButton: {
    backgroundColor: BrandColors.background,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BrandColors.border,
  },
  cancelButtonPressed: {
    opacity: 0.8,
  },
  cancelButtonText: {
    color: BrandColors.text,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  },
  readyButton: {
    backgroundColor: '#00FF00',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  readyButtonPressed: {
    opacity: 0.8,
  },
  readyButtonText: {
    color: BrandColors.navy,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
  notReadyButton: {
    backgroundColor: BrandColors.background,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BrandColors.border,
  },
  notReadyButtonPressed: {
    opacity: 0.8,
  },
  notReadyButtonText: {
    color: BrandColors.text,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  },
  volunteerContact: {
    backgroundColor: '#00FF00',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    gap: 4,
  },
  volunteerContactLabel: {
    color: BrandColors.navy,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 15,
  },
  volunteerName: {
    color: BrandColors.navy,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  callVolunteerButton: {
    backgroundColor: BrandColors.navy,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  callVolunteerButtonPressed: {
    opacity: 0.8,
  },
  callVolunteerButtonText: {
    color: BrandColors.white,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
});
