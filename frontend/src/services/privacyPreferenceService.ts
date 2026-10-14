import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export type PrivacyPreferenceKey = keyof PrivacyPreferences;

export type PrivacyPreferences = {
  shareLocationDuringEmergencies: boolean;
  emergencyContactAccess: boolean;
  anonymousUsageData: boolean;
};

export const defaultPrivacyPreferences: PrivacyPreferences = {
  shareLocationDuringEmergencies: false,
  emergencyContactAccess: false,
  anonymousUsageData: false,
};

const STORAGE_KEY_PREFIX = 'resq1_privacy_preferences_v1';

function storageKey(userId: number) {
  return `${STORAGE_KEY_PREFIX}_${userId}`;
}

function getWebStorage() {
  if (Platform.OS !== 'web' || typeof globalThis.localStorage === 'undefined') {
    return undefined;
  }

  return globalThis.localStorage;
}

async function secureStoreAvailable() {
  if (Platform.OS === 'web') {
    return false;
  }

  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

async function readStoredValue(key: string) {
  const webStorage = getWebStorage();

  if (webStorage) {
    return webStorage.getItem(key);
  }

  if (await secureStoreAvailable()) {
    return SecureStore.getItemAsync(key);
  }

  return null;
}

async function writeStoredValue(key: string, value: string) {
  const webStorage = getWebStorage();

  if (webStorage) {
    webStorage.setItem(key, value);
    return;
  }

  if (await secureStoreAvailable()) {
    await SecureStore.setItemAsync(key, value);
    return;
  }

  throw new Error('Local privacy preference storage is unavailable.');
}

function parsePrivacyPreferences(value: string | null): PrivacyPreferences {
  if (!value) {
    return { ...defaultPrivacyPreferences };
  }

  try {
    const parsed: unknown = JSON.parse(value);

    if (!parsed || typeof parsed !== 'object') {
      return { ...defaultPrivacyPreferences };
    }

    const stored = parsed as Partial<PrivacyPreferences>;

    return {
      shareLocationDuringEmergencies: typeof stored.shareLocationDuringEmergencies === 'boolean'
        ? stored.shareLocationDuringEmergencies
        : defaultPrivacyPreferences.shareLocationDuringEmergencies,
      emergencyContactAccess: typeof stored.emergencyContactAccess === 'boolean'
        ? stored.emergencyContactAccess
        : defaultPrivacyPreferences.emergencyContactAccess,
      anonymousUsageData: typeof stored.anonymousUsageData === 'boolean'
        ? stored.anonymousUsageData
        : defaultPrivacyPreferences.anonymousUsageData,
    };
  } catch {
    return { ...defaultPrivacyPreferences };
  }
}

export async function getPrivacyPreferences(userId: number) {
  return parsePrivacyPreferences(await readStoredValue(storageKey(userId)));
}

export async function savePrivacyPreferences(userId: number, preferences: PrivacyPreferences) {
  await writeStoredValue(storageKey(userId), JSON.stringify(preferences));
}
