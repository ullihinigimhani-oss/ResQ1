import { API_BASE_URL } from '@/services/authService';
import type {
  CreateEmergencyContactPayload,
  EmergencyContact,
  EmergencyContactFieldErrors,
  UpdateEmergencyContactPayload,
} from '@/types/emergencyContact';

export class EmergencyContactApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly fieldErrors?: EmergencyContactFieldErrors,
  ) {
    super(message);
    this.name = 'EmergencyContactApiError';
    Object.setPrototypeOf(this, EmergencyContactApiError.prototype);
  }
}

export function isEmergencyContactApiError(error: unknown): error is EmergencyContactApiError {
  return (
    error instanceof EmergencyContactApiError ||
    (error instanceof Error && error.name === 'EmergencyContactApiError')
  );
}

async function request<T>(
  path: string,
  token: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: unknown;
  } = {},
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };

  if (options.body) {
    headers['Content-Type'] = 'application/json';
  }

  let response: Response;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    response = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
  } catch (error) {
    if (__DEV__) {
      console.warn(`Emergency Contact API request failed: ${url}`, error);
    }
    throw new EmergencyContactApiError(
      0,
      'Unable to connect to the server. Please check your network connection.',
    );
  } finally {
    clearTimeout(timeoutId);
  }

  let data: any = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new EmergencyContactApiError(
      response.status,
      data?.message || 'The request could not be completed.',
      data?.errors,
    );
  }

  return data as T;
}

export async function getEmergencyContacts(token: string): Promise<EmergencyContact[]> {
  const res = await request<{ success: boolean; count: number; contacts: EmergencyContact[] }>(
    '/api/emergency-contacts',
    token,
  );
  return res.contacts || [];
}

export async function getEmergencyContactById(
  token: string,
  contactId: number,
): Promise<EmergencyContact> {
  const res = await request<{ success: boolean; contact: EmergencyContact }>(
    `/api/emergency-contacts/${contactId}`,
    token,
  );
  return res.contact;
}

export async function createEmergencyContact(
  token: string,
  payload: CreateEmergencyContactPayload,
): Promise<EmergencyContact> {
  const res = await request<{
    success: boolean;
    message: string;
    contact: EmergencyContact;
  }>('/api/emergency-contacts', token, {
    method: 'POST',
    body: payload,
  });
  return res.contact;
}

export async function updateEmergencyContact(
  token: string,
  contactId: number,
  payload: UpdateEmergencyContactPayload,
): Promise<EmergencyContact> {
  const res = await request<{
    success: boolean;
    message: string;
    contact: EmergencyContact;
  }>(`/api/emergency-contacts/${contactId}`, token, {
    method: 'PUT',
    body: payload,
  });
  return res.contact;
}

export async function deleteEmergencyContact(
  token: string,
  contactId: number,
): Promise<{ success: boolean; message: string }> {
  return request<{ success: boolean; message: string }>(
    `/api/emergency-contacts/${contactId}`,
    token,
    {
      method: 'DELETE',
    },
  );
}
