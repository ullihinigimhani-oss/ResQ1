import { API_BASE_URL } from '@/services/authService';
import type { CreateShelterPayload, EvacuationRoute, Shelter, ShelterFieldErrors, UpdateShelterPayload } from '@/types/shelter';

type ApiErrorBody = {
  message?: string;
  errors?: Record<string, string>;
};

type ApiShelterListResponse = ApiErrorBody & {
  success: boolean;
  shelters?: Shelter[];
};

type ApiShelterResponse = ApiErrorBody & {
  success: boolean;
  shelter?: Shelter;
};

type ApiShelterRoutesResponse = ApiErrorBody & {
  success: boolean;
  routes?: EvacuationRoute[];
};

export class ShelterApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = 'ShelterApiError';
    Object.setPrototypeOf(this, ShelterApiError.prototype);
  }
}

export function isShelterApiError(error: unknown): error is ShelterApiError {
  return error instanceof ShelterApiError || error instanceof Error && error.name === 'ShelterApiError';
}

async function parseJson(response: Response) {
  try {
    return (await response.json()) as ApiErrorBody;
  } catch {
    return null;
  }
}

async function shelterRequest<T>(
  path: string,
  token: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT';
    body?: unknown;
  } = {},
) {
  if (!token) {
    throw new ShelterApiError(401, 'Please log in to continue.');
  }

  const url = `${API_BASE_URL}${path}`;

  if (__DEV__) {
    console.log(`Shelter request: ${url}`);
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
      console.warn(`Shelter request failed: ${url}`, error);
    }

    throw new ShelterApiError(
      0,
      'Unable to connect to the server. Please check your connection.',
    );
  }

  const data = (await parseJson(response)) as T & ApiErrorBody | null;

  if (__DEV__) {
    console.log(`Shelter response: ${response.status} ${url}`);
  }

  if (!response.ok) {
    throw new ShelterApiError(
      response.status,
      data?.message || 'The request could not be completed.',
      data?.errors,
    );
  }

  if (!data) {
    throw new ShelterApiError(response.status, 'The server returned an unexpected response.');
  }

  return data as T;
}

export async function getShelters(token: string) {
  const response = await shelterRequest<ApiShelterListResponse>('/api/shelters', token);

  return response.shelters ?? [];
}

export async function getShelterById(id: string, token: string) {
  const response = await shelterRequest<ApiShelterResponse>(`/api/shelters/${id}`, token);

  if (!response.shelter) {
    throw new ShelterApiError(500, 'The server returned an unexpected response.');
  }

  return response.shelter;
}

export async function getShelterRoutes(id: string, token: string) {
  const response = await shelterRequest<ApiShelterRoutesResponse>(`/api/shelters/${id}/routes`, token);

  return response.routes ?? [];
}

export async function createShelter(payload: CreateShelterPayload, token: string) {
  const response = await shelterRequest<ApiShelterResponse>('/api/shelters', token, {
    method: 'POST',
    body: payload,
  });

  if (!response.shelter) {
    throw new ShelterApiError(500, 'The server returned an unexpected response.');
  }

  return response.shelter;
}

export async function updateShelter(id: string, payload: UpdateShelterPayload, token: string) {
  const response = await shelterRequest<ApiShelterResponse>(`/api/shelters/${id}`, token, {
    method: 'PUT',
    body: payload,
  });

  if (!response.shelter) {
    throw new ShelterApiError(500, 'The server returned an unexpected response.');
  }

  return response.shelter;
}
