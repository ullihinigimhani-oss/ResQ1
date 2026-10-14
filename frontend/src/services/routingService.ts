export interface RouteCoordinate {
  latitude: number;
  longitude: number;
}

export interface RoutingResult {
  coordinates: RouteCoordinate[];
  distance: number; // in meters
  duration: number; // in seconds
}

export async function getRoute(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
): Promise<RoutingResult> {
  try {
    const response = await fetch(
      `https://api.openrouteservice.org/v2/directions/driving-car?start=${startLng},${startLat}&end=${endLng},${endLat}`,
      {
        headers: {
          'Accept': 'application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8',
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Routing API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.features || data.features.length === 0) {
      throw new Error('No route found');
    }

    const route = data.features[0];
    const coordinates = route.geometry.coordinates.map((coord: number[]) => ({
      latitude: coord[1],
      longitude: coord[0],
    }));

    const properties = route.properties;
    const distance = properties.segments?.[0]?.distance || 0;
    const duration = properties.segments?.[0]?.duration || 0;

    return {
      coordinates,
      distance,
      duration,
    };
  } catch (error) {
    console.error('Failed to fetch route:', error);
    // Fallback to straight line if routing fails
    return {
      coordinates: [
        { latitude: startLat, longitude: startLng },
        { latitude: endLat, longitude: endLng },
      ],
      distance: 0,
      duration: 0,
    };
  }
}
