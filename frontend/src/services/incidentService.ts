import { API_BASE_URL } from '@/services/authService';
import { Platform } from 'react-native';
import type {
  CreateIncidentPayload,
  Incident,
  IncidentFieldErrors,
  IncidentPhoto,
  SelectedIncidentPhoto,
} from '@/types/incident';

type ApiErrorBody = {
  message?: string;
  errors?: IncidentFieldErrors;
};

type ApiIncidentResponse = ApiErrorBody & {
  success: boolean;
  message: string;
  incident?: Incident;
};

type ApiIncidentListResponse = ApiErrorBody & {
  success: boolean;
  incidents?: Incident[];
};

type ApiIncidentPhotoResponse = ApiErrorBody & {
  success: boolean;
  message: string;
  photo?: IncidentPhoto;
};

export class IncidentApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly fieldErrors?: IncidentFieldErrors,
  ) {
    super(message);
    this.name = 'IncidentApiError';
    Object.setPrototypeOf(this, IncidentApiError.prototype);
  }
}

export function isIncidentApiError(error: unknown): error is IncidentApiError {
  return error instanceof IncidentApiError || error instanceof Error && error.name === 'IncidentApiError';
}

async function parseJson(response: Response) {
  try {
    return (await response.json()) as ApiErrorBody;
  } catch {
    return null;
  }
}

async function incidentRequest<T>(
  path: string,
  token: string,
  options: {
    method?: 'GET' | 'POST';
    body?: unknown;
  } = {},
) {
  if (!token) {
    throw new IncidentApiError(401, 'Please log in to continue.');
  }

  const url = `${API_BASE_URL}${path}`;

  if (__DEV__) {
    console.log(`Incident request: ${url}`);
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
      console.warn(`Incident request failed: ${url}`, error);
    }

    throw new IncidentApiError(
      0,
      'Unable to connect to the server. Please check your connection.',
    );
  }

  const data = (await parseJson(response)) as T & ApiErrorBody | null;

  if (__DEV__) {
    console.log(`Incident response: ${response.status} ${url}`);
  }

  if (!response.ok) {
    throw new IncidentApiError(
      response.status,
      data?.message || 'The request could not be completed.',
      data?.errors,
    );
  }

  if (!data) {
    throw new IncidentApiError(response.status, 'The server returned an unexpected response.');
  }

  return data as T;
}

export async function createIncident(payload: CreateIncidentPayload, token: string) {
  const response = await incidentRequest<ApiIncidentResponse>('/api/incidents', token, {
    method: 'POST',
    body: payload,
  });

  if (!response.incident) {
    throw new IncidentApiError(500, 'The server returned an unexpected response.');
  }

  return response.incident;
}

export async function uploadIncidentPhoto(
  incidentId: number,
  photo: SelectedIncidentPhoto,
  token: string,
) {
  const formData = new FormData();

  if (photo.file) {
    // Expo ImagePicker provides the browser File object only on web.
    formData.append('photo', photo.file, photo.fileName);
  } else if (Platform.OS === 'web') {
    const blob = await (await fetch(photo.uri)).blob();
    formData.append('photo', blob, photo.fileName);
  } else {
    // React Native accepts this file descriptor for Android and iOS uploads.
    formData.append('photo', {
      uri: photo.uri,
      name: photo.fileName,
      type: photo.mimeType,
    } as unknown as Blob);
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/api/incidents/${incidentId}/photos`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
  } catch {
    throw new IncidentApiError(0, 'Unable to upload photo evidence. Please check your connection.');
  }

  const data = await parseJson(response) as ApiIncidentPhotoResponse | null;

  if (!response.ok) {
    throw new IncidentApiError(response.status, data?.message || 'Unable to upload photo evidence.');
  }

  if (!data?.photo) {
    throw new IncidentApiError(500, 'The server returned an unexpected upload response.');
  }

  return data.photo;
}

export async function getMyIncidents(token: string) {
  const response = await incidentRequest<ApiIncidentListResponse>('/api/incidents/my', token);

  return response.incidents ?? [];
}

export async function getIncidentById(id: string, token: string) {
  const response = await incidentRequest<ApiIncidentResponse>(`/api/incidents/${id}`, token);

  if (!response.incident) {
    throw new IncidentApiError(500, 'The server returned an unexpected response.');
  }

  return response.incident;
}
