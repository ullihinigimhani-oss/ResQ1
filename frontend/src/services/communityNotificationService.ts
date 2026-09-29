import { API_BASE_URL } from '@/services/authService';
import type {
  CommunityNotification,
  CommunityNotificationFieldErrors,
  CreateCommunityNotificationPayload,
  UpdateCommunityNotificationStatusPayload,
} from '@/types/communityNotification';

type ApiErrorBody = {
  message?: string;
  errors?: CommunityNotificationFieldErrors;
};

type ApiCommunityNotificationResponse = ApiErrorBody & {
  success: boolean;
  message?: string;
  notification?: CommunityNotification;
};

type ApiCommunityNotificationListResponse = ApiErrorBody & {
  success: boolean;
  notifications?: CommunityNotification[];
};

export class CommunityNotificationApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly fieldErrors?: CommunityNotificationFieldErrors,
  ) {
    super(message);
    this.name = 'CommunityNotificationApiError';
    Object.setPrototypeOf(this, CommunityNotificationApiError.prototype);
  }
}

export function isCommunityNotificationApiError(error: unknown): error is CommunityNotificationApiError {
  return error instanceof CommunityNotificationApiError
    || error instanceof Error && error.name === 'CommunityNotificationApiError';
}

async function parseJson(response: Response) {
  try {
    return (await response.json()) as ApiErrorBody;
  } catch {
    return null;
  }
}

async function communityNotificationRequest<T>(
  path: string,
  token: string,
  options: {
    body?: unknown;
    method?: 'GET' | 'PATCH' | 'POST';
  } = {},
) {
  if (!token) {
    throw new CommunityNotificationApiError(401, 'Please log in to continue.');
  }

  const url = `${API_BASE_URL}${path}`;

  if (__DEV__) {
    console.log(`Community notification request: ${url}`);
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
      console.warn(`Community notification request failed: ${url}`, error);
    }

    throw new CommunityNotificationApiError(
      0,
      'Unable to connect to the server. Please check your connection.',
    );
  }

  const data = (await parseJson(response)) as T & ApiErrorBody | null;

  if (__DEV__) {
    console.log(`Community notification response: ${response.status} ${url}`);
  }

  if (!response.ok) {
    throw new CommunityNotificationApiError(
      response.status,
      data?.message || 'The request could not be completed.',
      data?.errors,
    );
  }

  if (!data) {
    throw new CommunityNotificationApiError(response.status, 'The server returned an unexpected response.');
  }

  return data as T;
}

export async function getCommunityNotifications(token: string) {
  const response = await communityNotificationRequest<ApiCommunityNotificationListResponse>(
    '/api/community-notifications',
    token,
  );

  return response.notifications ?? [];
}

export async function getManagedCommunityNotifications(token: string) {
  const response = await communityNotificationRequest<ApiCommunityNotificationListResponse>(
    '/api/community-notifications/manage',
    token,
  );

  return response.notifications ?? [];
}

export async function getCommunityNotificationById(id: string, token: string) {
  const response = await communityNotificationRequest<ApiCommunityNotificationResponse>(
    `/api/community-notifications/${id}`,
    token,
  );

  if (!response.notification) {
    throw new CommunityNotificationApiError(500, 'The server returned an unexpected response.');
  }

  return response.notification;
}

export async function createCommunityNotification(payload: CreateCommunityNotificationPayload, token: string) {
  const response = await communityNotificationRequest<ApiCommunityNotificationResponse>(
    '/api/community-notifications',
    token,
    {
      body: payload,
      method: 'POST',
    },
  );

  if (!response.notification) {
    throw new CommunityNotificationApiError(500, 'The server returned an unexpected response.');
  }

  return response.notification;
}

export async function markCommunityNotificationRead(id: string, token: string) {
  const response = await communityNotificationRequest<ApiCommunityNotificationResponse>(
    `/api/community-notifications/${id}/read`,
    token,
    {
      method: 'POST',
    },
  );

  if (!response.notification) {
    throw new CommunityNotificationApiError(500, 'The server returned an unexpected response.');
  }

  return response.notification;
}

export async function updateCommunityNotificationStatus(
  id: string,
  payload: UpdateCommunityNotificationStatusPayload,
  token: string,
) {
  const response = await communityNotificationRequest<ApiCommunityNotificationResponse>(
    `/api/community-notifications/${id}/status`,
    token,
    {
      body: payload,
      method: 'PATCH',
    },
  );

  if (!response.notification) {
    throw new CommunityNotificationApiError(500, 'The server returned an unexpected response.');
  }

  return response.notification;
}
