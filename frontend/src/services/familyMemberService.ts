import { API_BASE_URL } from '@/services/authService';
import type {
  CreateFamilyMemberPayload,
  FamilyMember,
  FamilyMemberFieldErrors,
  UpdateFamilyMemberPayload,
} from '@/types/familyMember';

export class FamilyMemberApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly fieldErrors?: FamilyMemberFieldErrors,
  ) {
    super(message);
    this.name = 'FamilyMemberApiError';
    Object.setPrototypeOf(this, FamilyMemberApiError.prototype);
  }
}

export function isFamilyMemberApiError(error: unknown): error is FamilyMemberApiError {
  return (
    error instanceof FamilyMemberApiError ||
    (error instanceof Error && error.name === 'FamilyMemberApiError')
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
      console.warn(`Family Member API request failed: ${url}`, error);
    }
    throw new FamilyMemberApiError(
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
    throw new FamilyMemberApiError(
      response.status,
      data?.message || 'The request could not be completed.',
      data?.errors,
    );
  }

  return data as T;
}

export async function getFamilyMembers(token: string): Promise<FamilyMember[]> {
  const res = await request<{ success: boolean; count: number; familyMembers: FamilyMember[] }>(
    '/api/family-members',
    token,
  );
  return res.familyMembers || [];
}

export async function getFamilyMemberById(
  token: string,
  memberId: number,
): Promise<FamilyMember> {
  const res = await request<{ success: boolean; familyMember: FamilyMember }>(
    `/api/family-members/${memberId}`,
    token,
  );
  return res.familyMember;
}

export async function createFamilyMember(
  token: string,
  payload: CreateFamilyMemberPayload,
): Promise<FamilyMember> {
  const res = await request<{
    success: boolean;
    message: string;
    familyMember: FamilyMember;
  }>('/api/family-members', token, {
    method: 'POST',
    body: payload,
  });
  return res.familyMember;
}

export async function updateFamilyMember(
  token: string,
  memberId: number,
  payload: UpdateFamilyMemberPayload,
): Promise<FamilyMember> {
  const res = await request<{
    success: boolean;
    message: string;
    familyMember: FamilyMember;
  }>(`/api/family-members/${memberId}`, token, {
    method: 'PUT',
    body: payload,
  });
  return res.familyMember;
}

export async function deleteFamilyMember(
  token: string,
  memberId: number,
): Promise<{ success: boolean; message: string }> {
  return request<{ success: boolean; message: string }>(
    `/api/family-members/${memberId}`,
    token,
    {
      method: 'DELETE',
    },
  );
}
