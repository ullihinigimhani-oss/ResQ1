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

export interface CreateCommunityNotificationPayload {
  title: string;
  message: string;
  category: CommunityNotificationCategory;
  targetArea: string;
  expiresAt: string | null;
}

export interface UpdateCommunityNotificationStatusPayload {
  status: CommunityNotificationStatus;
}

export type CommunityNotificationFieldErrors = Partial<
  Record<keyof CreateCommunityNotificationPayload | keyof UpdateCommunityNotificationStatusPayload, string>
>;
