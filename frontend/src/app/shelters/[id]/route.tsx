import { StatusBar } from 'expo-status-bar';
import { SymbolView } from 'expo-symbols';
import { Redirect, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthButton, BackButton, StatusBanner } from '@/components/common/auth-components';
import { RoadStatusBadge, ShelterStatusBadge } from '@/components/shelters/shelter-ui';
import { BrandColors } from '@/constants/brand';
import { useAuth } from '@/context/auth-context';
import { getAllIncidents, isIncidentApiError } from '@/services/incidentService';
import {
  getShelterById,
  getShelterRoutes,
  isShelterApiError,
} from '@/services/shelterService';
import type { EvacuationRoute, Shelter } from '@/types/shelter';
import type { Incident } from '@/types/incident';

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizedText(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? '';
}

function routeMatchesResidentArea(route: EvacuationRoute, residentArea: string | null | undefined) {
  const startArea = normalizedText(route.startArea);
  const area = normalizedText(residentArea);

  return Boolean(area && (startArea === area || startArea.includes(area) || area.includes(startArea)));
}

function formatDistance(value: number | null) {
  if (value === null) {
    return 'Not specified';
  }

  return `${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)} km`;
}

function formatTime(value: number | null) {
  if (value === null) {
    return 'Not specified';
  }

  return `${value} min`;
}

function routeTitle(route: EvacuationRoute, index: number) {
  return route.routeName?.trim() || `Route ${index + 1}`;
}

function cleanInstructionPart(value: string) {
  return value.replace(/^\s*(?:\d+[\).:-]\s*|[-*]\s*)/, '').trim();
}

function parseInstructionSteps(instructions: string) {
  const text = instructions.trim();

  if (!text) {
    return [];
  }

  const lineSteps = text
    .split(/\r?\n/)
    .map(cleanInstructionPart)
    .filter(Boolean);

  if (lineSteps.length > 1) {
    return lineSteps;
  }

  const delimitedSteps = text
    .split(/\s*[;|]\s*/)
    .map(cleanInstructionPart)
    .filter(Boolean);

  if (delimitedSteps.length > 1) {
    return delimitedSteps;
  }

  return [text];
}

function coordinatesText(shelter: Shelter) {
  if (shelter.latitude === null || shelter.longitude === null) {
    return 'Coordinates unavailable';
  }

  return `${shelter.latitude.toFixed(6)}, ${shelter.longitude.toFixed(6)}`;
}

function RouteMetric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricItem}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function RouteOptionCard({
  index,
  onPress,
  route,
  selected,
  shelterName,
}: {
  index: number;
  onPress: () => void;
  route: EvacuationRoute;
  selected: boolean;
  shelterName: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.routeOption,
        selected && styles.routeOptionSelected,
        pressed && styles.pressed,
      ]}>
      <View style={styles.routeOptionHeader}>
        <View style={styles.routeOptionTitleBlock}>
          <Text style={styles.routeOptionTitle}>{routeTitle(route, index)}</Text>
          <Text style={styles.routeOptionSubtitle}>{route.startArea} {'>'} {shelterName}</Text>
        </View>
        <RoadStatusBadge status={route.roadStatus} />
      </View>
      {route.isAreaMatch ? (
        <View style={styles.areaMatchBadge}>
          <Text style={styles.areaMatchText}>AREA MATCH</Text>
        </View>
      ) : null}
      <View style={styles.routeOptionMetrics}>
        <RouteMetric label="Distance" value={formatDistance(route.distanceKm)} />
        <RouteMetric label="Estimated Time" value={formatTime(route.estimatedTimeMinutes)} />
      </View>
    </Pressable>
  );
}

function RouteField({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.routeField}>
      <Text style={styles.routeFieldLabel}>{label}</Text>
      <Text style={styles.routeFieldValue}>{value}</Text>
    </View>
  );
}

function RouteIcon({
  fallback,
  name,
  tintColor,
}: {
  fallback: string;
  name: 'mappin.circle.fill' | 'arrow.down' | 'house.fill';
  tintColor: string;
}) {
  return (
    <SymbolView
      fallback={<Text style={[styles.routeIconFallback, { color: tintColor }]}>{fallback}</Text>}
      name={name}
      size={22}
      tintColor={tintColor}
      type="monochrome"
      weight="bold"
    />
  );
}

function RouteVisualization({
  destination,
  from,
  routeName,
  shelter,
}: {
  destination: string;
  from: string;
  routeName: string;
  shelter: Shelter;
}) {
  return (
    <View style={styles.visualCard}>
      <Text style={styles.sectionTitle}>Route Visualization</Text>
      <View style={styles.visualTimeline}>
        <View style={styles.visualIconRail}>
          <View style={styles.visualIconShell}>
            <RouteIcon fallback="S" name="mappin.circle.fill" tintColor={BrandColors.deepBlue} />
          </View>
          <View style={styles.visualConnector} />
          <View style={styles.visualIconShell}>
            <RouteIcon fallback="R" name="arrow.down" tintColor={BrandColors.blue} />
          </View>
          <View style={styles.visualConnector} />
          <View style={[styles.visualIconShell, styles.visualIconShellDestination]}>
            <RouteIcon fallback="H" name="house.fill" tintColor={BrandColors.success} />
          </View>
        </View>

        <View style={styles.visualContent}>
          <View style={styles.visualNode}>
            <Text style={styles.visualNodeLabel}>Start</Text>
            <Text style={styles.visualNodeTitle}>{from}</Text>
          </View>
          <View style={styles.visualNode}>
            <Text style={styles.visualNodeLabel}>Route</Text>
            <Text style={styles.visualNodeTitle}>{routeName}</Text>
          </View>
          <View style={styles.visualNode}>
            <Text style={styles.visualNodeLabel}>Safe Shelter</Text>
            <Text style={styles.visualNodeTitle}>{destination}</Text>
            <Text style={styles.visualNodeMeta}>{coordinatesText(shelter)}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function ShelterRouteScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const shelterId = firstParam(params.id);
  const { isLoading, token, user } = useAuth();
  const [shelter, setShelter] = useState<Shelter | null>(null);
  const [routes, setRoutes] = useState<EvacuationRoute[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<number | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [routeActionMessage, setRouteActionMessage] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [loadingIncidents, setLoadingIncidents] = useState(false);

  const loadRouteData = useCallback(async (refresh = false) => {
    if (!token || !shelterId) {
      return;
    }

    if (refresh) {
      setRefreshing(true);
    } else {
      setLoadingRoute(true);
    }

    setErrorMessage(null);

    try {
      const [safeShelter, safeRoutes] = await Promise.all([
        getShelterById(shelterId, token),
        getShelterRoutes(shelterId, token),
      ]);

      setShelter(safeShelter);
      setRoutes(safeRoutes);
      setSelectedRouteId((currentRouteId) => {
        const routeStillExists = safeRoutes.some((route) => route.id === currentRouteId);

        return routeStillExists ? currentRouteId : safeRoutes[0]?.id ?? null;
      });
    } catch (error) {
      if (__DEV__ && !isShelterApiError(error)) {
        console.warn('Unexpected evacuation route error:', error);
      }

      setErrorMessage('Unable to load the evacuation route.');
    } finally {
      setLoadingRoute(false);
      setRefreshing(false);
    }
  }, [shelterId, token]);

  const loadUserLocation = useCallback(async () => {
    setLoadingLocation(true);
    try {
      // TODO: Uncomment after installing expo-location
      // const { status } = await Location.requestForegroundPermissionsAsync();
      // if (status !== 'granted') {
      //   console.warn('Location permission denied');
      //   return;
      // }
      // const location = await Location.getCurrentPositionAsync({});
      // setUserLocation({
      //   latitude: location.coords.latitude,
      //   longitude: location.coords.longitude,
      // });
      console.warn('Location package not installed yet');
    } catch (error) {
      console.warn('Failed to get location:', error);
    } finally {
      setLoadingLocation(false);
    }
  }, []);

  const loadIncidents = useCallback(async () => {
    if (!token) {
      return;
    }

    setLoadingIncidents(true);
    try {
      const allIncidents = await getAllIncidents(token);
      setIncidents(allIncidents);
    } catch (error) {
      if (__DEV__ && !isIncidentApiError(error)) {
        console.warn('Failed to load incidents:', error);
      }
    } finally {
      setLoadingIncidents(false);
    }
  }, [token]);

  const fetchOSRMRoute = useCallback(async (startLat: number, startLng: number, endLat: number, endLng: number) => {
    try {
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`
      );
      const data = await response.json();
      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        return data.routes[0].geometry.coordinates;
      }
      return null;
    } catch (error) {
      console.warn('Failed to fetch OSRM route:', error);
      return null;
    }
  }, []);

  useEffect(() => {
    if (token && shelterId) {
      void loadRouteData();
      void loadUserLocation();
      void loadIncidents();
    } else if (!shelterId) {
      setLoadingRoute(false);
      setErrorMessage('Unable to load the evacuation route.');
    }
  }, [loadRouteData, loadUserLocation, loadIncidents, shelterId, token]);

  const selectedRoute = useMemo(
    () => routes.find((route) => route.id === selectedRouteId) ?? routes[0] ?? null,
    [routes, selectedRouteId],
  );
  const instructionSteps = useMemo(
    () => selectedRoute ? parseInstructionSteps(selectedRoute.routeInstructions) : [],
    [selectedRoute],
  );

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

  const showInitialLoading = loadingRoute && !shelter && routes.length === 0;
  const showError = Boolean(errorMessage) && !shelter && !showInitialLoading;
  const showMissingRoute = !showInitialLoading && !showError && shelter && routes.length === 0;
  const currentRouteTitle = selectedRoute ? routeTitle(selectedRoute, 0) : 'Route';
  const officialFrom = selectedRoute?.startArea ?? 'Route start pending verification';
  const residentAreaMatches =
    selectedRoute ? selectedRoute.isAreaMatch || routeMatchesResidentArea(selectedRoute, user.location) : false;
  const fromLabel = user.location?.trim() || officialFrom;
  const selectAlternativeRoute = () => {
    if (!selectedRoute || routes.length < 2) {
      return;
    }

    const currentIndex = routes.findIndex((route) => route.id === selectedRoute.id);
    const nextRoute = routes[(currentIndex + 1) % routes.length];

    if (nextRoute) {
      setSelectedRouteId(nextRoute.id);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={BrandColors.red}
            onRefresh={() => void loadRouteData(true)}
          />
        }
        showsVerticalScrollIndicator={false}>
        <BackButton
          onPress={() => router.replace({
            pathname: '/shelters/[id]',
            params: { id: shelterId ?? '' },
          } as unknown as Href)}
        />

        <View style={styles.header}>
          <Text style={styles.eyebrow}>Emergency Routing</Text>
          <Text style={styles.title}>Safe Evacuation Route</Text>
          <Text style={styles.subtitle}>
            Follow the verified route to your selected emergency shelter.
          </Text>
        </View>

        {errorMessage && shelter ? <StatusBanner message={errorMessage} type="error" /> : null}
        {routeActionMessage ? <StatusBanner message={routeActionMessage} type="success" /> : null}

        {showInitialLoading ? (
          <View style={styles.centerState}>
            <ActivityIndicator color={BrandColors.red} size="large" />
            <Text style={styles.stateText}>Loading verified evacuation route...</Text>
          </View>
        ) : null}

        {showError ? (
          <View style={styles.centerState}>
            <Text style={styles.emptyTitle}>Unable to load the evacuation route.</Text>
            <Text style={styles.stateText}>Please check your connection and try again.</Text>
            <AuthButton
              style={styles.stateButton}
              title="Retry"
              variant="secondary"
              onPress={() => void loadRouteData()}
            />
          </View>
        ) : null}

        {showMissingRoute ? (
          <View style={styles.centerState}>
            <Text style={styles.emptyTitle}>No verified evacuation route is currently available.</Text>
            <Text style={styles.stateText}>Follow official emergency instructions and check again shortly.</Text>
            <AuthButton
              style={styles.stateButton}
              title="Back to Shelters"
              onPress={() => router.replace('/shelters' as Href)}
            />
          </View>
        ) : null}

        {shelter && selectedRoute ? (
          <>
            <View style={styles.shelterStrip}>
              <View style={styles.shelterStripTitleBlock}>
                <Text style={styles.shelterStripLabel}>Selected Shelter</Text>
                <Text style={styles.shelterStripTitle}>{shelter.name}</Text>
                <Text style={styles.shelterStripArea}>{shelter.area}</Text>
              </View>
              <ShelterStatusBadge status={shelter.status} />
            </View>

            {routes.length > 1 ? (
              <View style={styles.panel}>
                <View style={styles.panelTitleBlock}>
                  <Text style={styles.sectionTitle}>Alternative Routes</Text>
                  <Text style={styles.sectionCopy}>
                    Area-matched routes are listed first when your resident area is available.
                  </Text>
                </View>
                <View style={styles.routeOptionsList}>
                  {routes.map((route, index) => (
                    <RouteOptionCard
                      index={index}
                      key={route.id}
                      route={route}
                      selected={route.id === selectedRoute.id}
                      shelterName={shelter.name}
                      onPress={() => setSelectedRouteId(route.id)}
                    />
                  ))}
                </View>
              </View>
            ) : null}

            <View style={styles.routeSummaryPanel}>
              <View style={styles.routeTitleRow}>
                <View style={styles.routeTitleBlock}>
                  <Text style={styles.routeName}>{currentRouteTitle}</Text>
                  <Text style={styles.routeMeta}>{officialFrom} {'>'} {shelter.name}</Text>
                </View>
                <RoadStatusBadge status={selectedRoute.roadStatus} />
              </View>

              <View style={styles.fieldGrid}>
                <RouteField label="From" value={fromLabel} />
                <RouteField label="Official Start" value={officialFrom} />
                <RouteField label="To" value={shelter.name} />
                <RouteField label="Resident Area Match" value={residentAreaMatches ? 'Yes' : 'Not matched'} />
              </View>

              <View style={styles.metricGrid}>
                <RouteMetric label="Distance" value={formatDistance(selectedRoute.distanceKm)} />
                <RouteMetric label="Estimated Time" value={formatTime(selectedRoute.estimatedTimeMinutes)} />
                <RouteMetric label="Road Status" value={selectedRoute.roadStatus} />
                <RouteMetric label="Shelter Status" value={shelter.status} />
              </View>

              {selectedRoute.warningMessage ? (
                <View
                  style={[
                    styles.warningPanel,
                    normalizedText(selectedRoute.roadStatus) === 'blocked' && styles.warningPanelBlocked,
                  ]}>
                  <Text style={styles.warningTitle}>{selectedRoute.roadStatus.toUpperCase()}</Text>
                  <Text style={styles.warningText}>{selectedRoute.warningMessage}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.panel}>
              <Text style={styles.sectionTitle}>Route Instructions</Text>
              {instructionSteps.length > 1 ? (
                <View style={styles.stepsList}>
                  {instructionSteps.map((step, index) => (
                    <View key={`${step}-${index}`} style={styles.stepRow}>
                      <View style={styles.stepNumber}>
                        <Text style={styles.stepNumberText}>{index + 1}</Text>
                      </View>
                      <Text style={styles.stepText}>{step}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.officialInstructions}>
                  <Text style={styles.officialInstructionsText}>
                    {instructionSteps[0] ?? 'Official route instructions are pending verification.'}
                  </Text>
                </View>
              )}
            </View>

            <RouteVisualization
              destination={shelter.name}
              from={officialFrom}
              routeName={currentRouteTitle}
              shelter={shelter}
            />

            <View style={styles.mapSummaryPanel}>
              <Text style={styles.sectionTitle}>Map Foundation</Text>
              <RouteField label="Start Area" value={officialFrom} />
              <RouteField label="Destination" value={shelter.name} />
              <RouteField label="Destination Coordinates" value={coordinatesText(shelter)} />
            </View>

            <View style={styles.panel}>
              <Text style={styles.sectionTitle}>Route Actions</Text>
              <Text style={styles.sectionCopy}>
                Real-time turn-by-turn navigation is not enabled; use verified route instructions.
              </Text>
              <View style={styles.actionButtons}>
                <AuthButton
                  title="View Route Instructions"
                  onPress={() => setRouteActionMessage('Verified route instructions are displayed on this screen. Real-time navigation is not enabled.')}
                />
                <AuthButton
                  title="View Alternative Route"
                  variant="secondary"
                  onPress={selectAlternativeRoute}
                />
                <AuthButton
                  title="Call Emergency Services"
                  variant="secondary"
                  onPress={() => router.push('/contacts' as Href)}
                />
                <AuthButton
                  title="Refresh Route"
                  variant="secondary"
                  onPress={() => void loadRouteData(true)}
                />
              </View>
            </View>

            <View style={styles.safetyPanel}>
              <Text style={styles.safetyTitle}>Emergency Guidance</Text>
              <Text style={styles.safetyText}>
                Use only verified evacuation routes. Do not enter flooded or blocked roads. Follow official emergency instructions at all times.
              </Text>
            </View>
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
    color: BrandColors.muted,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
  },
  shelterStrip: {
    alignItems: 'flex-start',
    backgroundColor: BrandColors.lightBlue,
    borderColor: BrandColors.sky,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    padding: 14,
  },
  shelterStripTitleBlock: {
    flex: 1,
    gap: 3,
  },
  shelterStripLabel: {
    color: BrandColors.deepBlue,
    fontSize: 11,
    fontWeight: '900',
    lineHeight: 15,
    textTransform: 'uppercase',
  },
  shelterStripTitle: {
    color: BrandColors.navy,
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 23,
  },
  shelterStripArea: {
    color: BrandColors.muted,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  panel: {
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 14,
    padding: 15,
  },
  panelTitleBlock: {
    gap: 4,
  },
  sectionTitle: {
    color: BrandColors.navy,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 24,
  },
  sectionCopy: {
    color: BrandColors.muted,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  routeOptionsList: {
    gap: 10,
  },
  routeOption: {
    backgroundColor: BrandColors.background,
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 11,
    padding: 12,
  },
  routeOptionSelected: {
    backgroundColor: BrandColors.lightBlue,
    borderColor: BrandColors.deepBlue,
  },
  routeOptionHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  routeOptionTitleBlock: {
    flex: 1,
    gap: 4,
  },
  routeOptionTitle: {
    color: BrandColors.navy,
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 21,
  },
  routeOptionSubtitle: {
    color: BrandColors.muted,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
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
  routeOptionMetrics: {
    flexDirection: 'row',
    gap: 10,
  },
  routeSummaryPanel: {
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 14,
    padding: 15,
  },
  routeTitleRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  routeTitleBlock: {
    flex: 1,
    gap: 4,
  },
  routeName: {
    color: BrandColors.navy,
    fontSize: 21,
    fontWeight: '900',
    lineHeight: 27,
  },
  routeMeta: {
    color: BrandColors.deepBlue,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 18,
  },
  fieldGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  routeField: {
    backgroundColor: BrandColors.lightBlue,
    borderRadius: 8,
    flexGrow: 1,
    gap: 4,
    minWidth: '45%',
    padding: 11,
  },
  routeFieldLabel: {
    color: BrandColors.muted,
    fontSize: 11,
    fontWeight: '900',
    lineHeight: 15,
    textTransform: 'uppercase',
  },
  routeFieldValue: {
    color: BrandColors.text,
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 20,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricItem: {
    backgroundColor: BrandColors.background,
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexGrow: 1,
    gap: 4,
    minWidth: '45%',
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
  warningPanel: {
    backgroundColor: BrandColors.warningSoft,
    borderColor: '#D69E2E',
    borderLeftColor: '#D69E2E',
    borderLeftWidth: 6,
    borderRadius: 8,
    borderWidth: 1,
    gap: 5,
    padding: 12,
  },
  warningPanelBlocked: {
    backgroundColor: BrandColors.redSoft,
    borderColor: BrandColors.red,
    borderLeftColor: BrandColors.red,
  },
  warningTitle: {
    color: BrandColors.navy,
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 16,
    textTransform: 'uppercase',
  },
  warningText: {
    color: BrandColors.text,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
  },
  stepsList: {
    gap: 12,
  },
  stepRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 11,
  },
  stepNumber: {
    alignItems: 'center',
    backgroundColor: BrandColors.navy,
    borderRadius: 8,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  stepNumberText: {
    color: BrandColors.white,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 17,
  },
  stepText: {
    color: BrandColors.text,
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
  },
  officialInstructions: {
    backgroundColor: BrandColors.lightBlue,
    borderColor: BrandColors.sky,
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
  },
  officialInstructionsText: {
    color: BrandColors.text,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
  },
  visualCard: {
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 14,
    padding: 15,
  },
  visualTimeline: {
    alignItems: 'stretch',
    flexDirection: 'row',
    gap: 12,
  },
  visualIconRail: {
    alignItems: 'center',
    paddingVertical: 2,
    width: 38,
  },
  visualIconShell: {
    alignItems: 'center',
    backgroundColor: BrandColors.lightBlue,
    borderColor: BrandColors.sky,
    borderRadius: 8,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  visualIconShellDestination: {
    backgroundColor: BrandColors.successSoft,
    borderColor: BrandColors.success,
  },
  visualConnector: {
    backgroundColor: BrandColors.sky,
    flex: 1,
    minHeight: 30,
    width: 3,
  },
  routeIconFallback: {
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 17,
  },
  visualContent: {
    flex: 1,
    gap: 12,
  },
  visualNode: {
    backgroundColor: BrandColors.background,
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 3,
    minHeight: 58,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  visualNodeLabel: {
    color: BrandColors.muted,
    fontSize: 11,
    fontWeight: '900',
    lineHeight: 15,
    textTransform: 'uppercase',
  },
  visualNodeTitle: {
    color: BrandColors.text,
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 20,
  },
  visualNodeMeta: {
    color: BrandColors.muted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  mapSummaryPanel: {
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 13,
    padding: 15,
  },
  mapLine: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 34,
    paddingHorizontal: 10,
  },
  mapPointStart: {
    backgroundColor: BrandColors.deepBlue,
    borderRadius: 8,
    height: 16,
    width: 16,
  },
  mapConnector: {
    backgroundColor: BrandColors.sky,
    flex: 1,
    height: 5,
  },
  mapPointEnd: {
    backgroundColor: BrandColors.success,
    borderRadius: 8,
    height: 16,
    width: 16,
  },
  safetyPanel: {
    backgroundColor: BrandColors.navy,
    borderColor: BrandColors.deepBlue,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
    padding: 14,
  },
  actionButtons: {
    gap: 10,
  },
  safetyTitle: {
    color: BrandColors.white,
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 19,
  },
  safetyText: {
    color: BrandColors.sky,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
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
  pressed: {
    opacity: 0.72,
  },
});
