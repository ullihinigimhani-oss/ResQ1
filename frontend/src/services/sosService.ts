import { API_BASE_URL } from './authService';
import type { CreateSOSPayload, SOSRequest, SOSRequestWithUser, SOSRequestWithVolunteer } from '../types/sos';

async function sosRequest<T>(
  path: string,
  body: Record<string, unknown> | null,
  options: { method: 'POST' | 'PUT' | 'GET'; token: string },
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${options.token}`,
  };

  try {
    const response = await fetch(url, {
      method: options.method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Request failed');
    }

    return data;
  } catch (error) {
    console.error('SOS API request failed:', url, error);
    throw error;
  }
}

export async function createSOSRequest(token: string, payload: CreateSOSPayload): Promise<SOSRequest> {
  const response = await sosRequest<{ success: boolean; message: string; request: SOSRequest }>(
    '/api/sos',
    payload,
    { method: 'POST', token },
  );
  return response.request;
}

export async function getActiveSOSRequests(token: string): Promise<SOSRequestWithUser[]> {
  const response = await sosRequest<{ success: boolean; requests: SOSRequestWithUser[] }>(
    '/api/sos/active',
    null,
    { method: 'GET', token },
  );
  return response.requests;
}

export async function getActiveSOSRequestsForVolunteer(token: string): Promise<SOSRequestWithUser[]> {
  const response = await sosRequest<{ success: boolean; requests: SOSRequestWithUser[] }>(
    '/api/sos/active-for-volunteer',
    null,
    { method: 'GET', token },
  );
  return response.requests;
}

export async function respondToSOSRequest(token: string, requestId: number, accept: boolean): Promise<SOSRequestWithVolunteer> {
  const response = await sosRequest<{ success: boolean; message: string; request: SOSRequestWithVolunteer }>(
    `/api/sos/${requestId}/respond`,
    { accept },
    { method: 'PUT', token },
  );
  return response.request;
}

export async function getUserSOSStatus(token: string): Promise<SOSRequestWithVolunteer | null> {
  const response = await sosRequest<{ success: boolean; request: SOSRequestWithVolunteer | null }>(
    '/api/sos/my-status',
    null,
    { method: 'GET', token },
  );
  return response.request;
}

export async function updateEvacuationStatus(
  token: string,
  requestId: number,
  evacuationStatus: 'assistant_came' | 'rescued' | 'safe_shelter' | 'still_in_disaster',
): Promise<SOSRequestWithVolunteer> {
  const response = await sosRequest<{ success: boolean; message: string; request: SOSRequestWithVolunteer }>(
    `/api/sos/${requestId}/evacuation-status`,
    { evacuationStatus },
    { method: 'PUT', token },
  );
  return response.request;
}
