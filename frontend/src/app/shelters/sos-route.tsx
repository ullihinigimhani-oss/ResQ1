import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';

import { BackButton } from '@/components/common/auth-components';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from '@/components/shelters/native-map';
import { BrandColors } from '@/constants/brand';
import { useAuth } from '@/context/auth-context';
import { getRoute } from '@/services/routingService';

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function SOSRouteScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { isLoading, user } = useAuth();

  const volunteerLat = Number(firstParam(params.volunteerLat));
  const volunteerLng = Number(firstParam(params.volunteerLng));
  const victimLat = Number(firstParam(params.victimLat));
  const victimLng = Number(firstParam(params.victimLng));
  const victimName = firstParam(params.victimName) || 'Disaster Victim';

  const [routeCoordinates, setRouteCoordinates] = useState<Array<{ latitude: number; longitude: number }>>([]);
  const [loadingRoute, setLoadingRoute] = useState(true);
  const [routeDistance, setRouteDistance] = useState<number>(0);
  const [routeDuration, setRouteDuration] = useState<number>(0);

  useEffect(() => {
    const fetchRoute = async () => {
      setLoadingRoute(true);
      try {
        const route = await getRoute(volunteerLat, volunteerLng, victimLat, victimLng);
        setRouteCoordinates(route.coordinates);
        setRouteDistance(route.distance);
        setRouteDuration(route.duration);
      } catch (error) {
        console.error('Failed to fetch route:', error);
        // Fallback to straight line
        setRouteCoordinates([
          { latitude: volunteerLat, longitude: volunteerLng },
          { latitude: victimLat, longitude: victimLng },
        ]);
      } finally {
        setLoadingRoute(false);
      }
    };

    fetchRoute();
  }, [volunteerLat, volunteerLng, victimLat, victimLng]);

  if (!isLoading && !user) {
    return <View style={styles.centerState}><Text style={styles.stateText}>Please log in to continue.</Text></View>;
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerState}>
          <Text style={styles.stateText}>Loading route...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (Platform.OS === 'web') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerState}>
          <BackButton onPress={() => router.back()} />
          <Text style={styles.emptyTitle}>Map Not Available on Web</Text>
          <Text style={styles.stateText}>
            Please use the mobile app to view the live route to the disaster victim.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const formatDistance = (meters: number) => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km`;
    }
    return `${Math.round(meters)} m`;
  };

  const formatDuration = (seconds: number) => {
    if (seconds >= 3600) {
      const hours = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${mins}m`;
    }
    const mins = Math.ceil(seconds / 60);
    return `${mins} min`;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="auto" />
      <View style={styles.container}>
        <MapView
          provider={PROVIDER_DEFAULT}
          style={styles.map}
          initialRegion={{
            latitude: (volunteerLat + victimLat) / 2,
            longitude: (volunteerLng + victimLng) / 2,
            latitudeDelta: Math.abs(volunteerLat - victimLat) * 2,
            longitudeDelta: Math.abs(volunteerLng - victimLng) * 2,
          }}>
          <Marker
            coordinate={{
              latitude: volunteerLat,
              longitude: volunteerLng,
            }}
            title="Your Location"
            description="Volunteer Position"
            pinColor={BrandColors.blue}
          />

          <Marker
            coordinate={{
              latitude: victimLat,
              longitude: victimLng,
            }}
            title={victimName}
            description="Disaster Victim"
            pinColor={BrandColors.red}
          />

          {!loadingRoute && routeCoordinates.length > 0 && (
            <Polyline
              coordinates={routeCoordinates}
              strokeColor={BrandColors.success}
              strokeWidth={4}
            />
          )}
        </MapView>

        <View style={styles.topBar}>
          <BackButton onPress={() => router.back()} />
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Route to Disaster Victim</Text>
            <Text style={styles.subtitle}>
              Navigate to {victimName}
            </Text>
          </View>
        </View>

        <View style={styles.bottomBar}>
          {loadingRoute ? (
            <Text style={styles.loadingText}>Calculating optimal route...</Text>
          ) : (
            <>
              <View style={styles.routeInfo}>
                <View style={styles.routeInfoItem}>
                  <Text style={styles.routeInfoLabel}>Distance</Text>
                  <Text style={styles.routeInfoValue}>{formatDistance(routeDistance)}</Text>
                </View>
                <View style={styles.routeInfoItem}>
                  <Text style={styles.routeInfoLabel}>Duration</Text>
                  <Text style={styles.routeInfoValue}>{formatDuration(routeDuration)}</Text>
                </View>
              </View>
              <View style={styles.legend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: BrandColors.blue }]} />
                  <Text style={styles.legendText}>You (Volunteer)</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: BrandColors.red }]} />
                  <Text style={styles.legendText}>Disaster Victim</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: BrandColors.success }]} />
                  <Text style={styles.legendText}>Route</Text>
                </View>
              </View>
            </>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: BrandColors.background,
    flex: 1,
  },
  centerState: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    gap: 12,
  },
  emptyTitle: {
    color: BrandColors.navy,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
    textAlign: 'center',
  },
  stateText: {
    color: BrandColors.muted,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    textAlign: 'center',
  },
  loadingText: {
    color: BrandColors.text,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    textAlign: 'center',
  },
  routeInfo: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'center',
    marginBottom: 12,
  },
  routeInfoItem: {
    alignItems: 'center',
  },
  routeInfoLabel: {
    color: BrandColors.muted,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 15,
    textTransform: 'uppercase',
  },
  routeInfoValue: {
    color: BrandColors.text,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 20,
  },
  container: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  topBar: {
    alignItems: 'center',
    backgroundColor: BrandColors.mapOverlay,
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    ...Platform.select({
      web: { boxShadow: '0 2px 6px rgba(8, 29, 56, 0.08)' },
      default: {
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
    }),
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    color: BrandColors.navy,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
  },
  subtitle: {
    color: BrandColors.muted,
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
  },
  bottomBar: {
    backgroundColor: BrandColors.mapOverlay,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    gap: 12,
    padding: 16,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    ...Platform.select({
      web: { boxShadow: '0 -2px 6px rgba(8, 29, 56, 0.08)' },
      default: {
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
    }),
  },
  legend: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'center',
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
  legendText: {
    color: BrandColors.text,
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
  },
});
