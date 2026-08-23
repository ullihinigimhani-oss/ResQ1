import { API_BASE_URL } from '@/services/authService';
import type {
  Alert,
  AlertAuditEvent,
  AlertFieldErrors,
  AlertRiskHistoryPoint,
  CreateAlertPayload,
  School,
  UpdateAlertPayload,
} from '@/types/alert';
import type {
  AlertPreferences,
  UpdateAlertPreferencesPayload,
} from '@/types/alertPreference';

type ApiErrorBody = {
  message?: string;
  errors?: AlertFieldErrors;
};

type ApiAlertResponse = ApiErrorBody & {
  success: boolean;
  message: string;
  alert?: Alert;
};

type ApiAlertListResponse = ApiErrorBody & {
  success: boolean;
  alerts?: Alert[];
};

type ApiAlertHistoryResponse = ApiErrorBody & {
  success: boolean;
  history?: AlertAuditEvent[];
};

type ApiAlertRiskHistoryResponse = ApiErrorBody & {
  success: boolean;
  riskHistory?: AlertRiskHistoryPoint[];
};

type ApiAlertPreferencesResponse = ApiErrorBody & {
  success: boolean;
  message?: string;
  preferences?: AlertPreferences;
};

type ApiSchoolListResponse = ApiErrorBody & {
  success: boolean;
  schools?: School[];
};

type ApiPushTokenResponse = ApiErrorBody & {
  success: boolean;
  message?: string;
};

export class AlertApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly fieldErrors?: AlertFieldErrors,
  ) {
    super(message);
    this.name = 'AlertApiError';
    Object.setPrototypeOf(this, AlertApiError.prototype);
  }
}

export function isAlertApiError(error: unknown): error is AlertApiError {
  return error instanceof AlertApiError || error instanceof Error && error.name === 'AlertApiError';
}

async function parseJson(response: Response) {
  try {
    return (await response.json()) as ApiErrorBody;
  } catch {
    return null;
  }
}

async function alertRequest<T>(
  path: string,
  token: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT';
    body?: unknown;
  } = {},
) {
  if (!token) {
    throw new AlertApiError(401, 'Please log in to continue.');
  }

  const url = `${API_BASE_URL}${path}`;

  if (__DEV__) {
    console.log(`Alert request: ${url}`);
  }

  let response: Response;

  try {
    response = await fetch(url, {
      method: options.method ?? 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch (error) {
    if (__DEV__) {
      console.warn(`Alert request failed: ${url}`, error);
    }

    throw new AlertApiError(
      0,
      'Unable to connect to the server. Please check your connection.',
    );
  }

  const data = (await parseJson(response)) as T & ApiErrorBody | null;

  if (__DEV__) {
    console.log(`Alert response: ${response.status} ${url}`);
  }

  if (!response.ok) {
    throw new AlertApiError(
      response.status,
      data?.message || 'The request could not be completed.',
      data?.errors,
    );
  }

  if (!data) {
    throw new AlertApiError(response.status, 'The server returned an unexpected response.');
  }

  return data as T;
}

export async function getActiveAlerts(token: string) {
  const response = await alertRequest<ApiAlertListResponse>('/api/alerts', token);

  return response.alerts ?? [];
}

export async function getAlertHistory(token: string) {
  const response = await alertRequest<ApiAlertHistoryResponse>('/api/alerts/history', token);

  return response.history ?? [];
}

export async function getAlertRiskHistory(id: string, token: string) {
  const response = await alertRequest<ApiAlertRiskHistoryResponse>(`/api/alerts/${id}/risk-history`, token);

  return response.riskHistory ?? [];
}

export async function getAlertPreferences(token: string) {
  const response = await alertRequest<ApiAlertPreferencesResponse>('/api/alerts/preferences', token);

  if (!response.preferences) {
    throw new AlertApiError(500, 'The server returned an unexpected response.');
  }

  return response.preferences;
}

export async function getSchoolsByArea(area: string, token: string) {
  const response = await alertRequest<ApiSchoolListResponse>(
    `/api/alerts/schools?area=${encodeURIComponent(area)}`,
    token,
  );

  return response.schools ?? [];
}

export async function getAlertById(id: string, token: string) {
  const response = await alertRequest<ApiAlertResponse>(`/api/alerts/${id}`, token);

  if (!response.alert) {
    throw new AlertApiError(500, 'The server returned an unexpected response.');
  }

  return response.alert;
}

export async function createAlert(payload: CreateAlertPayload, token: string) {
  const response = await alertRequest<ApiAlertResponse>('/api/alerts', token, {
    method: 'POST',
    body: payload,
  });

  if (!response.alert) {
    throw new AlertApiError(500, 'The server returned an unexpected response.');
  }

  return response.alert;
}

export async function updateAlert(id: string, payload: UpdateAlertPayload, token: string) {
  const response = await alertRequest<ApiAlertResponse>(`/api/alerts/${id}`, token, {
    method: 'PUT',
    body: payload,
  });

  if (!response.alert) {
    throw new AlertApiError(500, 'The server returned an unexpected response.');
  }

  return response.alert;
}

export async function updateAlertPreferences(payload: UpdateAlertPreferencesPayload, token: string) {
  const response = await alertRequest<ApiAlertPreferencesResponse>('/api/alerts/preferences', token, {
    method: 'PUT',
    body: payload,
  });

  if (!response.preferences) {
    throw new AlertApiError(500, 'The server returned an unexpected response.');
  }

  return response.preferences;
}

export async function registerAlertPushToken(
  payload: {
    deviceName?: string | null;
    expoPushToken: string;
    platform?: string | null;
  },
  token: string,
) {
  await alertRequest<ApiPushTokenResponse>('/api/alerts/push-token', token, {
    method: 'POST',
    body: payload,
  });
}
