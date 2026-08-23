import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import { Redirect, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import * as Location from 'expo-location';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

let MapView: any = null;
let Marker: any = null;
let Polyline: any = null;
let PROVIDER_DEFAULT: any = null;

if (Platform.OS !== 'web') {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
  Polyline = Maps.Polyline;
  PROVIDER_DEFAULT = Maps.PROVIDER_DEFAULT;
}

import { AuthButton, BackButton, StatusBanner } from '@/components/common/auth-components';
import { ShelterStatusBadge } from '@/components/shelters/shelter-ui';
import { BrandColors } from '@/constants/brand';
import { useAuth } from '@/context/auth-context';
import { getAllIncidents, isIncidentApiError } from '@/services/incidentService';
import { getShelterById, isShelterApiError } from '@/services/shelterService';
import type { Shelter } from '@/types/shelter';
import type { Incident } from '@/types/incident';

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function coordinatesText(shelter: Shelter) {
  if (shelter.latitude === null || shelter.longitude === null) {
    return 'Coordinates unavailable';
  }

  return `${shelter.latitude.toFixed(6)}, ${shelter.longitude.toFixed(6)}`;
}

type RoutePoint = {
  latitude: number;
  longitude: number;
};

type SafeRoute = {
  id: string;
  points: RoutePoint[];
  incidentCount: number;
  isSafest: boolean;
};

export default function ShelterRouteScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const shelterId = firstParam(params.id);
  const { isLoading, token, user } = useAuth();
  const [shelter, setShelter] = useState<Shelter | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [loadingIncidents, setLoadingIncidents] = useState(false);
  const [routeCoordinates, setRouteCoordinates] = useState<Array<{ latitude: number; longitude: number }>>([]);
  const [alternativeRoutes, setAlternativeRoutes] = useState<Array<Array<{ latitude: number; longitude: number }>>>([]);
  const [loadingOSRMRoute, setLoadingOSRMRoute] = useState(false);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);

  const loadRouteData = useCallback(async (refresh = false) => {
  const [safeRoutes, setSafeRoutes] = useState<SafeRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mapRegion, setMapRegion] = useState({
    latitude: 6.9271,
    longitude: 79.8612,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  const loadShelter = useCallback(async () => {
    if (!token || !shelterId) {
      return;
    }

    try {
      const safeShelter = await getShelterById(shelterId, token);
      setShelter(safeShelter);

      if (safeShelter.latitude && safeShelter.longitude) {
        setMapRegion({
          latitude: safeShelter.latitude,
          longitude: safeShelter.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        });
      }
    } catch (error) {
      if (__DEV__ && !isShelterApiError(error)) {
        console.warn('Unexpected shelter error:', error);
      }
      setErrorMessage('Unable to load shelter information.');
    }
  }, [shelterId, token]);

  const loadUserLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Location permission denied');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      setMapRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
    } catch (error) {
      console.warn('Failed to get location:', error);
    }
  }, []);

  const loadIncidents = useCallback(async () => {
    if (!token) {
      return;
    }

    try {
      const allIncidents = await getAllIncidents(token);
      const incidentsWithCoords = allIncidents.filter(
        (incident) => incident.latitude !== null && incident.longitude !== null
      );
      setIncidents(incidentsWithCoords);
    } catch (error) {
      if (__DEV__ && !isIncidentApiError(error)) {
        console.warn('Failed to load incidents:', error);
      }
    }
  }, [token]);

  const calculateDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }, []);

  const fetchOSRMRoute = useCallback(async (startLat: number, startLng: number, endLat: number, endLng: number, alternatives = true) => {
  const generateSafeRoutes = useCallback(async () => {
    if (!userLocation || !shelter || !shelter.latitude || !shelter.longitude) {
      return;
    }

    try {
      const routes: SafeRoute[] = [];

      // Generate 3 different route variations using OSRM
      const baseRoute = await fetchOSRMRoute(
        userLocation.latitude,
        userLocation.longitude,
        shelter.latitude,
        shelter.longitude
      );

      if (baseRoute) {
        const routePoints = baseRoute.map(([lng, lat]: [number, number]) => ({ latitude: lat, longitude: lng }));

        // Count incidents near this route
        const incidentCount = countIncidentsNearRoute(routePoints, incidents);

        // Route 1: Direct route (will be colored based on incidents)
        routes.push({
          id: 'route-1',
          points: routePoints,
          incidentCount,
          isSafest: incidentCount === 0,
        });

        // Generate alternative routes by adding waypoints
        const midLat = (userLocation.latitude + shelter.latitude) / 2;
        const midLng = (userLocation.longitude + shelter.longitude) / 2;

        // Alternative 1: Offset route
        const alt1Route = await fetchOSRMRoute(
          userLocation.latitude,
          userLocation.longitude,
          midLat + 0.01,
          midLng + 0.01,
          shelter.latitude,
          shelter.longitude
        );

        if (alt1Route) {
          const alt1Points = alt1Route.map(([lng, lat]: [number, number]) => ({ latitude: lat, longitude: lng }));
          const alt1IncidentCount = countIncidentsNearRoute(alt1Points, incidents);
          routes.push({
            id: 'route-2',
            points: alt1Points,
            incidentCount: alt1IncidentCount,
            isSafest: alt1IncidentCount === 0,
          });
        }

        // Alternative 2: Different offset
        const alt2Route = await fetchOSRMRoute(
          userLocation.latitude,
          userLocation.longitude,
          midLat - 0.01,
          midLng - 0.01,
          shelter.latitude,
          shelter.longitude
        );

        if (alt2Route) {
          const alt2Points = alt2Route.map(([lng, lat]: [number, number]) => ({ latitude: lat, longitude: lng }));
          const alt2IncidentCount = countIncidentsNearRoute(alt2Points, incidents);
          routes.push({
            id: 'route-3',
            points: alt2Points,
            incidentCount: alt2IncidentCount,
            isSafest: alt2IncidentCount === 0,
          });
        }
      }

      // Sort routes: safest first, then by incident count
      routes.sort((a, b) => {
        if (a.isSafest && !b.isSafest) return -1;
        if (!a.isSafest && b.isSafest) return 1;
        return a.incidentCount - b.incidentCount;
      });

      setSafeRoutes(routes);
    } catch (error) {
      console.warn('Failed to generate safe routes:', error);
    }
  }, [userLocation, shelter, incidents]);

  const countIncidentsNearRoute = (routePoints: RoutePoint[], incidentList: Incident[]) => {
    const threshold = 0.01; // ~1km threshold
    let count = 0;

    for (const incident of incidentList) {
      if (incident.latitude === null || incident.longitude === null) continue;

      for (const point of routePoints) {
        const distance = Math.sqrt(
          Math.pow(point.latitude - incident.latitude, 2) +
          Math.pow(point.longitude - incident.longitude, 2)
        );

        if (distance < threshold) {
          count++;
          break;
        }
      }
    }

    return count;
  };

  const fetchOSRMRoute = async (startLat: number, startLng: number, ...waypoints: number[]) => {
    try {
      const coords = [startLng, startLat, ...waypoints].join(';');
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson&alternatives=${alternatives ? 'true' : 'false'}`
        `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`
      );
      const data = await response.json();
      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        return data.routes.map((route: any) => {
          const coords = route.geometry.coordinates.map((coord: number[]) => ({
            latitude: coord[1],
            longitude: coord[0],
          }));
          return {
            coordinates: coords,
            distance: route.distance,
            duration: route.duration,
          };
        });
      }
      return [];
    } catch (error) {
      console.warn('Failed to fetch OSRM route:', error);
      return [];
    }
  };

  const openInExternalMap = useCallback(() => {
    if (!userLocation || !shelter || !shelter.latitude || !shelter.longitude) {
      Alert.alert('Error', 'Location or shelter coordinates not available');
      return;
    }

    // Get the safest route (first one in the sorted array)
    const safestRoute = safeRoutes.find(route => route.isSafest) || safeRoutes[0];

    if (safestRoute && safestRoute.points.length > 2) {
      // Include waypoints from the safest route
      // Take a few intermediate points to approximate the route (avoid too many waypoints)
      const waypointCount = Math.min(safestRoute.points.length, 5);
      const step = Math.floor(safestRoute.points.length / waypointCount);
      
      const waypoints: string[] = [];
      for (let i = step; i < safestRoute.points.length - 1; i += step) {
        if (waypoints.length < 3) { // Limit to 3 waypoints max
          waypoints.push(`${safestRoute.points[i].latitude},${safestRoute.points[i].longitude}`);
        }
      }

      const url = Platform.select({
        ios: `maps://app?saddr=${userLocation.latitude},${userLocation.longitude}&daddr=${shelter.latitude},${shelter.longitude}&dirflg=d`,
        android: waypoints.length > 0
          ? `google.navigation:q=${shelter.latitude},${shelter.longitude}&waypoints=${waypoints.join('|')}`
          : `google.navigation:q=${shelter.latitude},${shelter.longitude}`,
      });

      if (url) {
        Linking.openURL(url).catch(() => {
          Alert.alert('Error', 'Unable to open maps application');
        });
      }
    } else {
      // Fallback to direct route if no safest route available
      const url = Platform.select({
        ios: `maps://app?saddr=${userLocation.latitude},${userLocation.longitude}&daddr=${shelter.latitude},${shelter.longitude}`,
        android: `google.navigation:q=${shelter.latitude},${shelter.longitude}`,
      });

      if (url) {
        Linking.openURL(url).catch(() => {
          Alert.alert('Error', 'Unable to open maps application');
        });
      }
    }
  }, [userLocation, shelter, safeRoutes]);

  const refreshData = useCallback(async () => {
    setRefreshing(true);
    setErrorMessage(null);
    await Promise.all([loadShelter(), loadUserLocation(), loadIncidents()]);
    setRefreshing(false);
  }, [loadShelter, loadUserLocation, loadIncidents]);

  const calculateRouteSafety = useCallback((routeCoords: Array<{ latitude: number; longitude: number }>, incidentPoints: Incident[]) => {
    let minDistanceToIncident = Infinity;
    let incidentCountNearRoute = 0;

    incidentPoints.forEach((incident) => {
      if (incident.latitude === null || incident.longitude === null) return;

      routeCoords.forEach((coord) => {
        const distance = calculateDistance(coord.latitude, coord.longitude, incident.latitude!, incident.longitude!);
        if (distance < 0.5) {
          incidentCountNearRoute++;
        }
        if (distance < minDistanceToIncident) {
          minDistanceToIncident = distance;
        }
      });
    });

    return {
      minDistanceToIncident,
      incidentCountNearRoute,
      safetyScore: incidentCountNearRoute === 0 ? 100 : Math.max(0, 100 - (incidentCountNearRoute * 20) - (minDistanceToIncident < 1 ? 30 : 0)),
    };
  }, [calculateDistance]);

  const loadRoutesWithSafety = useCallback(async () => {
    if (!userLocation || !shelter || !shelter.latitude || !shelter.longitude) {
      return;
    }

    setLoadingOSRMRoute(true);
    try {
      const routes = await fetchOSRMRoute(
        userLocation.latitude,
        userLocation.longitude,
        shelter.latitude,
        shelter.longitude,
        true
      );

      if (routes.length === 0) {
        setRouteCoordinates([]);
        setAlternativeRoutes([]);
        return;
      }

      const routesWithSafety = routes.map((route: any) => {
        const safety = calculateRouteSafety(route.coordinates, incidents);
        return {
          ...route,
          safety,
        };
      });

      routesWithSafety.sort((a: any, b: any) => b.safety.safetyScore - a.safety.safetyScore);

      setRouteCoordinates(routesWithSafety[0].coordinates);
      setAlternativeRoutes(routesWithSafety.slice(1).map((r: any) => r.coordinates));
    } catch (error) {
      console.warn('Failed to load routes:', error);
    } finally {
      setLoadingOSRMRoute(false);
    }
  }, [userLocation, shelter, incidents, fetchOSRMRoute, calculateRouteSafety]);

  useEffect(() => {
    if (token && shelterId) {
      const init = async () => {
        setLoading(true);
        await Promise.all([loadShelter(), loadUserLocation(), loadIncidents()]);
        setLoading(false);
      };
      init();
    }
  }, [token, shelterId, loadShelter, loadUserLocation, loadIncidents]);

  useEffect(() => {
    if (userLocation && shelter && shelter.latitude && shelter.longitude && incidents.length >= 0) {
      void loadRoutesWithSafety();
    }
  }, [userLocation, shelter, incidents, loadRoutesWithSafety]);

  const selectedRoute = useMemo(
    () => routes.find((route) => route.id === selectedRouteId) ?? routes[0] ?? null,
    [routes, selectedRouteId],
  );
  const instructionSteps = useMemo(
    () => selectedRoute ? parseInstructionSteps(selectedRoute.routeInstructions) : [],
    [selectedRoute],
  );
    if (userLocation && shelter && incidents.length > 0) {
      generateSafeRoutes();
    }
  }, [userLocation, shelter, incidents, generateSafeRoutes]);

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

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={BrandColors.red} size="large" />
          <Text style={styles.loadingText}>Loading evacuation map...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.container}>
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
            Live map with incident-aware routing to your selected shelter
          </Text>
        </View>

        {errorMessage ? <StatusBanner message={errorMessage} type="error" /> : null}

        {shelter ? (
          <View style={styles.mapContainer}>
            <MapView
              provider={PROVIDER_GOOGLE}
              style={styles.map}
              region={mapRegion}
              showsUserLocation
              showsMyLocationButton>
              {/* User location marker */}
              {userLocation && (
                <Marker
                  coordinate={userLocation}
                  title="Your Location"
                  description="Starting point"
                  pinColor={BrandColors.blue}
                />
              )}

              {/* Shelter marker */}
              {shelter.latitude && shelter.longitude && (
                <Marker
                  coordinate={{ latitude: shelter.latitude, longitude: shelter.longitude }}
                  title={shelter.name}
                  description={shelter.area}
                  pinColor={BrandColors.success}
                />
              )}

              {/* Incident markers */}
              {incidents.map((incident) =>
                incident.latitude && incident.longitude ? (
                  <Marker
                    key={incident.id}
                    coordinate={{ latitude: incident.latitude, longitude: incident.longitude }}
                    title={incident.title}
                    description={incident.severity}
                    pinColor={BrandColors.red}
                  />
                ) : null
              )}

              {/* Safe routes */}
              {safeRoutes.map((route, index) => (
                <Polyline
                  key={route.id}
                  coordinates={route.points}
                  strokeColor={route.isSafest ? '#22C55E' : '#000000'}
                  strokeWidth={route.isSafest ? 5 : 3}
                  lineDashPattern={route.isSafest ? undefined : [10, 5]}
                />
              ))}
            </MapView>

            <View style={styles.mapOverlay}>
              <View style={styles.legend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: BrandColors.blue }]} />
                  <Text style={styles.legendText}>Your Location</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: BrandColors.success }]} />
                  <Text style={styles.legendText}>Shelter</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: BrandColors.red }]} />
                  <Text style={styles.legendText}>Incident</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendLine, { backgroundColor: '#22C55E' }]} />
                  <Text style={styles.legendText}>Safest Route</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendLine, { backgroundColor: '#000000', borderStyle: 'dashed' }]} />
                  <Text style={styles.legendText}>Alternative Routes</Text>
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
              <Text style={styles.sectionTitle}>Live Map</Text>
              {Platform.OS === 'web' ? (
                <View style={styles.centerState}>
                  <Text style={styles.emptyTitle}>Map Not Available on Web</Text>
                  <Text style={styles.stateText}>
                    Please use the mobile app to view the live map with evacuation routes.
                  </Text>
                </View>
              ) : loadingOSRMRoute ? (
                <View style={styles.centerState}>
                  <ActivityIndicator color={BrandColors.red} size="large" />
                  <Text style={styles.stateText}>Loading safe routes...</Text>
                </View>
              ) : userLocation && shelter && shelter.latitude && shelter.longitude ? (
                <View style={styles.mapContainer}>
                  <MapView
                    provider={PROVIDER_DEFAULT}
                    style={styles.map}
                    initialRegion={{
                      latitude: (userLocation.latitude + shelter.latitude) / 2,
                      longitude: (userLocation.longitude + shelter.longitude) / 2,
                      latitudeDelta: Math.abs(userLocation.latitude - shelter.latitude) * 1.5,
                      longitudeDelta: Math.abs(userLocation.longitude - shelter.longitude) * 1.5,
                    }}>
                    {userLocation && (
                      <Marker
                        coordinate={{
                          latitude: userLocation.latitude,
                          longitude: userLocation.longitude,
                        }}
                        title="Your Location"
                        description="Current position"
                        pinColor={BrandColors.blue}
                      />
                    )}

                    {shelter && shelter.latitude && shelter.longitude && (
                      <Marker
                        coordinate={{
                          latitude: shelter.latitude,
                          longitude: shelter.longitude,
                        }}
                        title={shelter.name}
                        description="Safe Shelter"
                        pinColor={BrandColors.success}
                      />
                    )}

                    {routeCoordinates.length > 0 && (
                      <Polyline
                        coordinates={routeCoordinates}
                        strokeColor="#22C55E"
                        strokeWidth={5}
                      />
                    )}

                    {alternativeRoutes.map((altRoute, index) => (
                      <Polyline
                        key={index}
                        coordinates={altRoute}
                        strokeColor="#000000"
                        strokeWidth={3}
                        lineDashPattern={[10, 5]}
                      />
                    ))}

                    {incidents.map((incident) => (
                      incident.latitude && incident.longitude ? (
                        <Marker
                          key={incident.id}
                          coordinate={{
                            latitude: incident.latitude,
                            longitude: incident.longitude,
                          }}
                          title={incident.title}
                          description={`Severity: ${incident.severity}`}
                          pinColor={BrandColors.red}
                        />
                      ) : null
                    ))}
                  </MapView>

                  <View style={styles.mapLegend}>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: BrandColors.blue }]} />
                      <Text style={styles.legendText}>Your Location</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendLine, { backgroundColor: '#22C55E' }]} />
                      <Text style={styles.legendText}>Safest Route</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendLine, { backgroundColor: '#000000', borderStyle: 'dashed' }]} />
                      <Text style={styles.legendText}>Alternative Routes</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: BrandColors.red }]} />
                      <Text style={styles.legendText}>Disaster Points</Text>
                    </View>
                  </View>
                </View>
              ) : (
                <View style={styles.centerState}>
                  <Text style={styles.emptyTitle}>Map Unavailable</Text>
                  <Text style={styles.stateText}>
                    {userLocation ? 'Shelter coordinates missing' : 'Location permission required'}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.panel}>
              <Text style={styles.sectionTitle}>Route Actions</Text>
              <Text style={styles.sectionCopy}>
                Real-time turn-by-turn navigation is not enabled; use verified route instructions.
              </Text>
              <View style={styles.actionButtons}>
                <AuthButton
                  title="View Route on Map"
                  onPress={() => {
                    if (userLocation && shelter && shelter.latitude && shelter.longitude) {
                      router.push({
                        pathname: '/shelters/[id]/route/map',
                        params: {
                          id: shelterId ?? '',
                          userLat: String(userLocation.latitude),
                          userLng: String(userLocation.longitude),
                          shelterLat: String(shelter.latitude),
                          shelterLng: String(shelter.longitude),
                          shelterName: shelter.name,
                          routeCoordinates: JSON.stringify(routeCoordinates),
                          alternativeRoutes: JSON.stringify(alternativeRoutes),
                          incidents: JSON.stringify(incidents),
                        },
                      } as unknown as Href);
                    }
                  }}
                />
                <AuthButton
                  title="View Route Instructions"
                  variant="secondary"
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

              <TouchableOpacity style={styles.openMapButton} onPress={openInExternalMap}>
                <Text style={styles.openMapButtonText}>Open in Maps App</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.centerState}>
            <Text style={styles.emptyTitle}>Unable to load shelter information.</Text>
            <Text style={styles.stateText}>Please check your connection and try again.</Text>
            <AuthButton
              style={styles.stateButton}
              title="Retry"
              variant="secondary"
              onPress={refreshData}
            />
          </View>
        )}
      </View>
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
  loadingText: {
    color: BrandColors.muted,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
    marginTop: 12,
  },
  container: {
    flex: 1,
    gap: 18,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  mapContainer: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 8,
  },
  map: {
    flex: 1,
  },
  mapOverlay: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    gap: 12,
  },
  legend: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  legendItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  legendDot: {
    borderRadius: 4,
    height: 12,
    width: 12,
  },
  legendLine: {
    borderRadius: 2,
    height: 3,
    width: 20,
  },
  legendText: {
    color: BrandColors.text,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  openMapButton: {
    backgroundColor: BrandColors.navy,
    borderRadius: 8,
    padding: 14,
  },
  openMapButtonText: {
    color: BrandColors.white,
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 20,
    textAlign: 'center',
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
  mapContainer: {
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  map: {
    height: 300,
    width: '100%',
  },
  mapLegend: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 10,
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
  },
  legendItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  legendDot: {
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  legendLine: {
    borderRadius: 2,
    height: 3,
    width: 20,
  },
  legendText: {
    color: BrandColors.text,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 15,
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
  stateButton: {
    marginTop: 4,
    width: '100%',
  },
});
