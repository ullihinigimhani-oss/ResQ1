import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { alertRiskLevels, type AlertRiskLevel } from '@/types/alert';
import type { PreferredLanguage } from '@/types/auth';
import type {
  OfflineSafetyInstruction,
  SaveOfflineSafetyInstruction,
} from '@/types/offline-safety';

const STORAGE_KEY_PREFIX = 'resq1_offline_safety_v1';
const supportedLanguages: PreferredLanguage[] = ['English', 'Sinhala', 'Tamil'];

function storageKey(residentId: number) {
  return `${STORAGE_KEY_PREFIX}_${residentId}`;
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

  throw new Error('Offline storage is not available on this device.');
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isRiskLevel(value: unknown): value is AlertRiskLevel {
  return typeof value === 'string' && alertRiskLevels.includes(value as AlertRiskLevel);
}

function isPreferredLanguage(value: unknown): value is PreferredLanguage {
  return typeof value === 'string' && supportedLanguages.includes(value as PreferredLanguage);
}

function isOfflineSafetyInstruction(value: unknown): value is OfflineSafetyInstruction {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const item = value as Partial<OfflineSafetyInstruction>;

  return Number.isInteger(item.alertId)
    && Number(item.alertId) > 0
    && isNonEmptyString(item.disasterType)
    && isNonEmptyString(item.title)
    && isRiskLevel(item.riskLevel)
    && isNonEmptyString(item.affectedArea)
    && Array.isArray(item.safetyInstructions)
    && item.safetyInstructions.length > 0
    && item.safetyInstructions.every(isNonEmptyString)
    && isPreferredLanguage(item.language)
    && isNonEmptyString(item.savedAt)
    && !Number.isNaN(new Date(item.savedAt).getTime());
}

function parseStoredInstructions(value: string | null): OfflineSafetyInstruction[] {
  if (!value) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(value);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isOfflineSafetyInstruction);
  } catch {
    return [];
  }
}

export async function getOfflineSafetyInstructions(residentId: number) {
  const storedValue = await readStoredValue(storageKey(residentId));

  return parseStoredInstructions(storedValue).sort((first, second) => (
    new Date(second.savedAt).getTime() - new Date(first.savedAt).getTime()
  ));
}

export async function getOfflineSafetyInstruction(residentId: number, alertId: number) {
  const instructions = await getOfflineSafetyInstructions(residentId);

  return instructions.find((item) => item.alertId === alertId) ?? null;
}

export async function isOfflineSafetyInstructionSaved(residentId: number, alertId: number) {
  return (await getOfflineSafetyInstruction(residentId, alertId)) !== null;
}

export async function saveOfflineSafetyInstruction(
  residentId: number,
  instruction: SaveOfflineSafetyInstruction,
) {
  const instructions = await getOfflineSafetyInstructions(residentId);
  const existing = instructions.find((item) => item.alertId === instruction.alertId);

  if (existing) {
    return existing;
  }

  const savedInstruction: OfflineSafetyInstruction = {
    ...instruction,
    safetyInstructions: instruction.safetyInstructions.map((item) => item.trim()).filter(Boolean),
    savedAt: new Date().toISOString(),
  };

  await writeStoredValue(
    storageKey(residentId),
    JSON.stringify([savedInstruction, ...instructions]),
  );

  return savedInstruction;
}

export async function removeOfflineSafetyInstruction(residentId: number, alertId: number) {
  const instructions = await getOfflineSafetyInstructions(residentId);
  const remainingInstructions = instructions.filter((item) => item.alertId !== alertId);

  if (remainingInstructions.length === instructions.length) {
    return false;
  }

  await writeStoredValue(storageKey(residentId), JSON.stringify(remainingInstructions));
  return true;
}
