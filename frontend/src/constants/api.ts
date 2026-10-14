const configuredApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

if (!configuredApiBaseUrl) {
  throw new Error('Set EXPO_PUBLIC_API_BASE_URL in frontend/.env before starting the app.');
}

export const API_BASE_URL = configuredApiBaseUrl.replace(/\/+$/, '');
