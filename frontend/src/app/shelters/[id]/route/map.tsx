import { StatusBar } from 'expo-status-bar';
import { Redirect, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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

import { BackButton } from '@/components/common/auth-components';
import { BrandColors } from '@/constants/brand';
import { useAuth } from '@/context/auth-context';
import type { Incident } from '@/types/incident';

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function RouteMapScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { isLoading, user } = useAuth();

  const routeIndex = Number(firstParam(params.routeIndex)) || 0;
  const userLat = Number(firstParam(params.userLat));
  const userLng = Number(firstParam(params.userLng));
  const shelterLat = Number(firstParam(params.shelterLat));
  const shelterLng = Number(firstParam(params.shelterLng));
  const shelterName = firstParam(params.shelterName) || 'Shelter';

  const incidentsParam = firstParam(params.incidents);
  const incidents: Incident[] = incidentsParam ? JSON.parse(incidentsParam) : [];

  const [selectedRoute, setSelectedRoute] = useState(routeIndex);

  if (!isLoading && !user) {
    return <Redirect href={'/auth/welcome' as Href} />;
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerState}>
          <ActivityIndicator color={BrandColors.red} size="large" />
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
            Please use the mobile app to view the live map with evacuation routes.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const routeCoordinatesParam = firstParam(params.routeCoordinates);
  const alternativeRoutesParam = firstParam(params.alternativeRoutes);
  
  const routeCoordinates = routeCoordinatesParam ? JSON.parse(routeCoordinatesParam) : [];
  const alternativeRoutes = alternativeRoutesParam ? JSON.parse(alternativeRoutesParam) : [];

  const allRoutes = [routeCoordinates, ...alternativeRoutes];
  const currentRoute = allRoutes[selectedRoute] || routeCoordinates;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.container}>
        <MapView
          provider={PROVIDER_DEFAULT}
          style={styles.map}
          initialRegion={{
            latitude: (userLat + shelterLat) / 2,
            longitude: (userLng + shelterLng) / 2,
            latitudeDelta: Math.abs(userLat - shelterLat) * 1.5,
            longitudeDelta: Math.abs(userLng - shelterLng) * 1.5,
          }}>
          <Marker
            coordinate={{
              latitude: userLat,
              longitude: userLng,
            }}
            title="Your Location"
            description="Current position"
            pinColor={BrandColors.blue}
          />

          <Marker
            coordinate={{
              latitude: shelterLat,
              longitude: shelterLng,
            }}
            title={shelterName}
            description="Safe Shelter"
            pinColor={BrandColors.success}
          />

          {currentRoute.length > 0 && (
            <Polyline
              coordinates={currentRoute}
              strokeColor={selectedRoute === 0 ? BrandColors.success : BrandColors.navy}
              strokeWidth={4}
            />
          )}

          {allRoutes.map((route, index) => {
            if (index === selectedRoute) return null;
            return (
              <Polyline
                key={index}
                coordinates={route}
                strokeColor={BrandColors.navy}
                strokeWidth={2}
                lineDashPattern={[5, 5]}
              />
            );
          })}

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

        <View style={styles.topBar}>
          <BackButton onPress={() => router.back()} />
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Route Map</Text>
            <Text style={styles.subtitle}>
              {selectedRoute === 0 ? 'Safest Route' : `Alternative Route ${selectedRoute}`}
            </Text>
          </View>
        </View>

        <View style={styles.bottomBar}>
          <View style={styles.routeSelector}>
            {allRoutes.map((_, index) => (
              <Pressable
                key={index}
                onPress={() => setSelectedRoute(index)}
                style={({ pressed }) => [
                  styles.routeButton,
                  selectedRoute === index && styles.routeButtonSelected,
                  pressed && styles.pressed,
                ]}>
                <Text
                  style={[
                    styles.routeButtonText,
                    selectedRoute === index && styles.routeButtonTextSelected,
                  ]}>
                  {index === 0 ? 'Safest' : `Alt ${index}`}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: BrandColors.blue }]} />
              <Text style={styles.legendText}>You</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: BrandColors.success }]} />
              <Text style={styles.legendText}>Shelter</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: BrandColors.red }]} />
              <Text style={styles.legendText}>Danger</Text>
            </View>
          </View>
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
    fontWeight: '900',
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
  container: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  topBar: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    color: BrandColors.navy,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 24,
  },
  subtitle: {
    color: BrandColors.muted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  bottomBar: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    gap: 12,
    padding: 16,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  routeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  routeButton: {
    alignItems: 'center',
    backgroundColor: BrandColors.background,
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 10,
  },
  routeButtonSelected: {
    backgroundColor: BrandColors.navy,
    borderColor: BrandColors.navy,
  },
  routeButtonText: {
    color: BrandColors.text,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 17,
  },
  routeButtonTextSelected: {
    color: BrandColors.white,
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
    fontWeight: '700',
    lineHeight: 16,
  },
  pressed: {
    opacity: 0.72,
  },
});
