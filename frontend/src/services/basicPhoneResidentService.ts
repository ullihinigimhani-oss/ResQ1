import { API_BASE_URL } from '@/services/authService';
import type {
  BasicPhoneResident,
  BasicPhoneResidentFieldErrors,
  BasicPhoneResidentPayload,
} from '@/types/basicPhoneResident';

export class BasicPhoneResidentApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly fieldErrors?: BasicPhoneResidentFieldErrors,
  ) {
    super(message);
    this.name = 'BasicPhoneResidentApiError';
    Object.setPrototypeOf(this, BasicPhoneResidentApiError.prototype);
  }
}

export function isBasicPhoneResidentApiError(
  error: unknown,
): error is BasicPhoneResidentApiError {
  return (
    error instanceof BasicPhoneResidentApiError
    || (error instanceof Error && error.name === 'BasicPhoneResidentApiError')
  );
}

async function request<T>(
  path: string,
  token: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: unknown;
  } = {},
) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
  } catch (error) {
    if (__DEV__) {
      console.warn('Basic phone resident API request failed.', error);
    }

    throw new BasicPhoneResidentApiError(
      0,
      'Unable to connect to the server. Please check your connection.',
    );
  } finally {
    clearTimeout(timeoutId);
  }

  let data: {
    message?: string;
    errors?: BasicPhoneResidentFieldErrors;
  } | null = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new BasicPhoneResidentApiError(
      response.status,
      data?.message ?? 'The request could not be completed.',
      data?.errors,
    );
  }

  return data as T;
}

export async function getBasicPhoneResidents(token: string) {
  const response = await request<{
    success: boolean;
    residents: BasicPhoneResident[];
  }>('/api/basic-phone-residents', token);

  return response.residents ?? [];
}

export async function getBasicPhoneResident(token: string, residentId: number) {
  const response = await request<{
    success: boolean;
    resident: BasicPhoneResident;
  }>(`/api/basic-phone-residents/${residentId}`, token);

  return response.resident;
}

export async function createBasicPhoneResident(
  token: string,
  payload: BasicPhoneResidentPayload,
) {
  const response = await request<{
    success: boolean;
    message: string;
    resident: BasicPhoneResident;
  }>('/api/basic-phone-residents', token, { method: 'POST', body: payload });

  return response.resident;
}

export async function updateBasicPhoneResident(
  token: string,
  residentId: number,
  payload: BasicPhoneResidentPayload,
) {
  const response = await request<{
    success: boolean;
    message: string;
    resident: BasicPhoneResident;
  }>(`/api/basic-phone-residents/${residentId}`, token, {
    method: 'PUT',
    body: payload,
  });

  return response.resident;
}

export async function deleteBasicPhoneResident(token: string, residentId: number) {
  return request<{ success: boolean; message: string }>(
    `/api/basic-phone-residents/${residentId}`,
    token,
    { method: 'DELETE' },
  );
}
