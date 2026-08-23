import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { registerAlertPushToken } from '@/services/alertService';
import type { AuthUser } from '@/types/auth';
import { isAuthorityRole } from '@/utils/format';

const ALERT_CHANNELS = {
  critical: 'resq1-critical-alerts',
  default: 'resq1-alerts-default',
  silent: 'resq1-alerts-silent',
  soundOnly: 'resq1-alerts-sound-only',
  vibrateOnly: 'resq1-alerts-vibrate-only',
} as const;

let lastRegisteredTokenKey: string | null = null;

export function configureForegroundNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const data = notification.request.content.data as {
        critical?: boolean;
        soundEnabled?: boolean;
      };
      const shouldPlaySound = data.critical === true || data.soundEnabled !== false;

      return {
        priority: Notifications.AndroidNotificationPriority.HIGH,
        shouldPlaySound,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      };
    },
  });
}

async function configureAndroidNotificationChannels() {
  if (Platform.OS !== 'android') {
    return;
  }

  await Promise.all([
    Notifications.setNotificationChannelAsync(ALERT_CHANNELS.critical, {
      enableVibrate: true,
      importance: Notifications.AndroidImportance.HIGH,
      name: 'Critical Emergency Alerts',
      sound: 'default',
      vibrationPattern: [0, 300, 200, 300],
    }),
    Notifications.setNotificationChannelAsync(ALERT_CHANNELS.default, {
      enableVibrate: true,
      importance: Notifications.AndroidImportance.HIGH,
      name: 'Emergency Alerts',
      sound: 'default',
      vibrationPattern: [0, 250, 200, 250],
    }),
    Notifications.setNotificationChannelAsync(ALERT_CHANNELS.soundOnly, {
      enableVibrate: false,
      importance: Notifications.AndroidImportance.HIGH,
      name: 'Emergency Alerts Sound Only',
      sound: 'default',
    }),
    Notifications.setNotificationChannelAsync(ALERT_CHANNELS.vibrateOnly, {
      enableVibrate: true,
      importance: Notifications.AndroidImportance.HIGH,
      name: 'Emergency Alerts Vibrate Only',
      sound: null,
      vibrationPattern: [0, 250, 200, 250],
    }),
    Notifications.setNotificationChannelAsync(ALERT_CHANNELS.silent, {
      enableVibrate: false,
      importance: Notifications.AndroidImportance.DEFAULT,
      name: 'Emergency Alerts Silent',
      sound: null,
    }),
  ]);
}

function getExpoProjectId() {
  const extra = Constants.expoConfig?.extra as {
    eas?: {
      projectId?: string;
    };
  } | undefined;

  return Constants.easConfig?.projectId ?? extra?.eas?.projectId;
}

async function getNotificationPermissionStatus() {
  const currentPermission = await Notifications.getPermissionsAsync();

  if (currentPermission.status === 'granted') {
    return currentPermission.status;
  }

  const requestedPermission = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: false,
      allowSound: true,
    },
  });

  return requestedPermission.status;
}

export async function registerResidentDeviceForPushNotifications(
  user: AuthUser | null,
  token: string | null,
) {
  if (!user || !token || isAuthorityRole(user.role) || Platform.OS === 'web' || !Device.isDevice) {
    return;
  }

  try {
    await configureAndroidNotificationChannels();

    const permissionStatus = await getNotificationPermissionStatus();

    if (permissionStatus !== 'granted') {
      return;
    }

    const projectId = getExpoProjectId();
    const pushToken = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    const registrationKey = `${user.id}:${pushToken.data}`;

    if (lastRegisteredTokenKey === registrationKey) {
      return;
    }

    await registerAlertPushToken({
      deviceName: Device.deviceName ?? null,
      expoPushToken: pushToken.data,
      platform: Platform.OS,
    }, token);

    lastRegisteredTokenKey = registrationKey;
  } catch (error) {
    if (__DEV__) {
      console.warn('Unable to register resident device for push notifications:', error);
    }
  }
}
