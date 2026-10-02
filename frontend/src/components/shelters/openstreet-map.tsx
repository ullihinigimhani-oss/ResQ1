import { useRef, useState } from 'react';
import { Platform, StyleSheet, View, ActivityIndicator } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

type Marker = {
  latitude: number;
  longitude: number;
  title?: string;
  color?: string;
};

type Circle = {
  center: {
    latitude: number;
    longitude: number;
  };
  radius: number;
  strokeColor?: string;
  fillColor?: string;
};

type Polyline = {
  coordinates: Array<{ latitude: number; longitude: number }>;
  color?: string;
  strokeWidth?: number;
  lineDashPattern?: number[];
};

type OpenStreetMapProps = {
  initialRegion?: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  region?: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  markers?: Marker[];
  circles?: Circle[];
  polylines?: Polyline[];
  style?: any;
  onMapPress?: (event: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) => void;
  onMapReady?: () => void;
  showsUserLocation?: boolean;
  showsMyLocationButton?: boolean;
  onDragEnd?: (event: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) => void;
};

export default function OpenStreetMap({
  initialRegion,
  region,
  markers = [],
  circles = [],
  polylines = [],
  style,
  onMapPress,
  onMapReady,
  showsUserLocation = false,
  showsMyLocationButton = false,
  onDragEnd,
}: OpenStreetMapProps) {
  const webViewRef = useRef<WebView<any>>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);

  const center = region || initialRegion || { latitude: 6.9271, longitude: 79.8612, latitudeDelta: 0.0922, longitudeDelta: 0.0421 };

  const generateHTML = () => {
    const markersJS = markers.map((marker, index) => {
      const color = marker.color || '#ff0000';
      return `
        L.circleMarker([${marker.latitude}, ${marker.longitude}], {
          radius: 8,
          fillColor: '${color}',
          color: '#ffffff',
          weight: 2,
          opacity: 1,
          fillOpacity: 1
        }).addTo(map)
          .bindPopup('${marker.title || 'Marker'}')
          .on('click', () => {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'markerPress',
              index: ${index},
              coordinate: { latitude: ${marker.latitude}, longitude: ${marker.longitude} }
            }));
          });
      `;
    }).join('\n');

    const circlesJS = circles.map((circle, index) => {
      const strokeColor = circle.strokeColor || 'rgba(255, 0, 0, 0.5)';
      const fillColor = circle.fillColor || 'rgba(255, 0, 0, 0.1)';
      return `
        L.circle([${circle.center.latitude}, ${circle.center.longitude}], {
          radius: ${circle.radius},
          color: '${strokeColor}',
          fillColor: '${fillColor}',
          fillOpacity: 1
        }).addTo(map);
      `;
    }).join('\n');

    const polylinesJS = polylines.map((polyline, index) => {
      const coords = polyline.coordinates.map(c => `[${c.latitude}, ${c.longitude}]`).join(',');
      const color = polyline.color || '#0000ff';
      const dashArray = polyline.lineDashPattern ? '5, 5' : null;
      return `
        L.polyline([${coords}], {
          color: '${color}',
          weight: ${polyline.strokeWidth || 3},
          dashArray: '${dashArray || ''}'
        }).addTo(map);
      `;
    }).join('\n');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
          <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
          <style>
            html, body {
              margin: 0;
              padding: 0;
              height: 100%;
              width: 100%;
            }
            #map {
              height: 100%;
              width: 100%;
            }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <script>
            var map = L.map('map', {
              zoomControl: false,
              attributionControl: false
            }).setView([${center.latitude}, ${center.longitude}], 13);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '© OpenStreetMap contributors',
              maxZoom: 19
            }).addTo(map);

            ${markersJS}

            ${circlesJS}

            ${polylinesJS}

            map.on('click', function(e) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'mapPress',
                coordinate: { latitude: e.latlng.lat, longitude: e.latlng.lng }
              }));
            });

            map.on('moveend', function() {
              var center = map.getCenter();
              var bounds = map.getBounds();
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'regionChange',
                coordinate: { latitude: center.lat, longitude: center.lng },
                bounds: {
                  north: bounds.getNorth(),
                  south: bounds.getSouth(),
                  east: bounds.getEast(),
                  west: bounds.getWest()
                }
              }));
            });

            window.mapReady = true;
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mapReady' }));
          </script>
        </body>
      </html>
    `;
  };

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      if (data.type === 'mapReady' && !mapReady) {
        setMapReady(true);
        setIsLoading(false);
        onMapReady?.();
      } else if (data.type === 'mapPress' && onMapPress) {
        onMapPress({ nativeEvent: { coordinate: data.coordinate } });
      } else if (data.type === 'markerPress' && onDragEnd) {
        onDragEnd({ nativeEvent: { coordinate: data.coordinate } });
      }
    } catch (error) {
      console.warn('Failed to parse WebView message:', error);
    }
  };

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webViewRef}
        source={{ html: generateHTML() }}
        style={styles.webView}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={false}
        bounces={false}
        scrollEnabled={false}
        onLoad={() => setIsLoading(false)}
      />
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#071A35" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
