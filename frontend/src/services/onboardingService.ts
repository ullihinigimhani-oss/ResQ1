import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ONBOARDING_KEY = 'resq1.onboarding.completed';

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

export async function hasCompletedOnboarding() {
  const storage = getWebStorage();

  if (storage) {
    return storage.getItem(ONBOARDING_KEY) === '1';
  }

  if (await secureStoreAvailable()) {
    return (await SecureStore.getItemAsync(ONBOARDING_KEY)) === '1';
  }

  return false;
}

export async function completeOnboarding() {
  const storage = getWebStorage();

  if (storage) {
    storage.setItem(ONBOARDING_KEY, '1');
    return;
  }

  if (await secureStoreAvailable()) {
    await SecureStore.setItemAsync(ONBOARDING_KEY, '1');
  }
}
