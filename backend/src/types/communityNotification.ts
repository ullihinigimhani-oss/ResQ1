export const communityNotificationCategories = [
  'ROAD_ACCESS',
  'UTILITY_NOTICE',
  'COMMUNITY_EVENT',
  'SAFETY_NOTICE',
  'PUBLIC_INFORMATION',
] as const;

export const communityNotificationStatuses = ['ACTIVE', 'CANCELLED', 'INACTIVE'] as const;

export type CommunityNotificationCategory = (typeof communityNotificationCategories)[number];
export type CommunityNotificationStatus = (typeof communityNotificationStatuses)[number];
export type CommunityNotificationDisplayStatus = CommunityNotificationStatus | 'EXPIRED';

export interface CommunityNotificationRow {
  id: number;
  title: string;
  message: string;
  category: CommunityNotificationCategory | string;
  target_area: string;
  status: CommunityNotificationStatus | string | null;
  created_by: number | null;
  expires_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
  is_read?: boolean | null;
  read_at?: Date | string | null;
  is_relevant_to_resident?: boolean | null;
}

export interface CommunityNotification {
  id: number;
  title: string;
  message: string;
  category: CommunityNotificationCategory;
  targetArea: string;
  status: CommunityNotificationDisplayStatus;
  createdBy: number | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  isRead: boolean;
  readAt: string | null;
  isRelevantToResident: boolean;
}

export interface CommunityNotificationReadRow {
  id: number;
  notification_id: number;
  user_id: number;
  read_at: Date | string;
}

export interface CreateCommunityNotificationInput {
  title?: unknown;
  message?: unknown;
  category?: unknown;
  targetArea?: unknown;
  expiresAt?: unknown;
}

export interface UpdateCommunityNotificationStatusInput {
  status?: unknown;
}

export interface ValidatedCreateCommunityNotificationInput {
  title: string;
  message: string;
  category: CommunityNotificationCategory;
  targetArea: string;
  expiresAt: string | null;
}

export interface ValidatedCommunityNotificationStatusInput {
  status: CommunityNotificationStatus;
}

export type CommunityNotificationFieldErrors = Partial<
  Record<keyof CreateCommunityNotificationInput | keyof UpdateCommunityNotificationStatusInput, string>
>;
