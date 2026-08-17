import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import type {
  AuthSession,
  AuthUser,
  FieldErrors,
  LoginResidentPayload,
  RegisterResidentPayload,
} from '@/types/auth';

type ApiAuthResponse = {
  success: boolean;
  message: string;
  user: AuthUser;
  token?: string;
};

type ApiErrorBody = {
  message?: string;
  errors?: FieldErrors;
};

const AUTH_TOKEN_KEY = 'resq1.auth.token';
const AUTH_USER_KEY = 'resq1.auth.user';
const BACKEND_PORT = '5000';

function getExpoLanHost() {
  const hostUri = Constants.expoConfig?.hostUri;

  if (!hostUri) {
    return undefined;
  }

  return hostUri.replace(/^https?:\/\//, '').replace(/^exp:\/\//, '').split(':')[0];
}

function resolveDefaultApiBaseUrl() {
  if (Platform.OS === 'android') {
    return `http://10.0.2.2:${BACKEND_PORT}`;
  }

  if (Platform.OS === 'ios') {
    const lanHost = getExpoLanHost();

    if (lanHost && lanHost !== 'localhost' && lanHost !== '127.0.0.1') {
      return `http://${lanHost}:${BACKEND_PORT}`;
    }
  }

  return `http://localhost:${BACKEND_PORT}`;
}

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL?.trim() ||
  (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined)?.trim() ||
  resolveDefaultApiBaseUrl();

export class AuthApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly fieldErrors?: FieldErrors,
  ) {
    super(message);
    this.name = 'AuthApiError';
    Object.setPrototypeOf(this, AuthApiError.prototype);
  }
}

export function isAuthApiError(error: unknown): error is AuthApiError {
  return error instanceof AuthApiError || (error instanceof Error && error.name === 'AuthApiError');
}

async function parseJson(response: Response) {
  try {
    return (await response.json()) as ApiAuthResponse & ApiErrorBody;
  } catch {
    return null;
  }
}

async function authRequest(path: string, body: RegisterResidentPayload | LoginResidentPayload) {
  let response: Response;
  const url = `${API_BASE_URL}${path}`;

  if (__DEV__) {
    console.log(`Auth request: ${url}`);
  }

  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    if (__DEV__) {
      console.warn(`Auth request failed: ${url}`, error);
    }

    throw new AuthApiError(
      0,
      'Unable to connect to the server. Please check your connection.',
    );
  }

  const data = await parseJson(response);

  if (__DEV__) {
    console.log(`Auth response: ${response.status} ${url}`);
  }

  if (!response.ok) {
    throw new AuthApiError(
      response.status,
      data?.message || 'The request could not be completed.',
      data?.errors,
    );
  }

  if (!data?.user) {
    throw new AuthApiError(response.status, 'The server returned an unexpected response.');
  }

  return data;
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

async function setStoredValue(key: string, value: string) {
  const storage = getWebStorage();

  if (storage) {
    storage.setItem(key, value);
    return;
  }

  if (await secureStoreAvailable()) {
    await SecureStore.setItemAsync(key, value);
  }
}

async function getStoredValue(key: string) {
  const storage = getWebStorage();

  if (storage) {
    return storage.getItem(key);
  }

  if (await secureStoreAvailable()) {
    return SecureStore.getItemAsync(key);
  }

  return null;
}

async function deleteStoredValue(key: string) {
  const storage = getWebStorage();

  if (storage) {
    storage.removeItem(key);
    return;
  }

  if (await secureStoreAvailable()) {
    await SecureStore.deleteItemAsync(key);
  }
}

export async function registerResident(payload: RegisterResidentPayload) {
  return authRequest('/api/auth/register', payload);
}

export async function loginResident(payload: LoginResidentPayload): Promise<AuthSession> {
  const response = await authRequest('/api/auth/login', payload);

  if (!response.token) {
    throw new AuthApiError(500, 'Login succeeded, but no session token was returned.');
  }

  return {
    user: response.user,
    token: response.token,
  };
}

export async function saveSession(session: AuthSession) {
  await setStoredValue(AUTH_TOKEN_KEY, session.token);
  await setStoredValue(AUTH_USER_KEY, JSON.stringify(session.user));
}

export async function loadSession(): Promise<AuthSession | null> {
  const [token, userJson] = await Promise.all([
    getStoredValue(AUTH_TOKEN_KEY),
    getStoredValue(AUTH_USER_KEY),
  ]);

  if (!token || !userJson) {
    return null;
  }

  try {
    return {
      token,
      user: JSON.parse(userJson) as AuthUser,
    };
  } catch {
    await clearSession();
    return null;
  }
}

export async function clearSession() {
  await Promise.all([deleteStoredValue(AUTH_TOKEN_KEY), deleteStoredValue(AUTH_USER_KEY)]);
}
