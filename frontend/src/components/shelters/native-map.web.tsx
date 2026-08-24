import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

function WebMapFallback({
  children,
  style,
}: {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={style}>{children}</View>;
}

export function Marker() {
  return null;
}

export function Polyline() {
  return null;
}

export const PROVIDER_DEFAULT = undefined;
export const PROVIDER_GOOGLE = undefined;

export default WebMapFallback;
