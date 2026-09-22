export interface SOSRequestRow {
  id: number;
  user_id: number;
  latitude: number;
  longitude: number;
  status: 'pending' | 'accepted' | 'completed';
  evacuation_status: 'pending' | 'assistant_came' | 'rescued' | 'safe_shelter' | 'still_in_disaster';
  volunteer_id: number | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface CreateSOSRequestInput {
  latitude?: unknown;
  longitude?: unknown;
}

export interface RespondSOSRequestInput {
  accept?: boolean;
}

export interface SOSRequest {
  id: number;
  userId: number;
  latitude: number;
  longitude: number;
  status: 'pending' | 'accepted' | 'completed';
  evacuationStatus: 'pending' | 'assistant_came' | 'rescued' | 'safe_shelter' | 'still_in_disaster';
  volunteerId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface SOSRequestWithUser extends SOSRequest {
  userName: string;
  userLocation: string | null;
}

export interface SOSRequestWithVolunteer extends SOSRequest {
  volunteerName: string | null;
  volunteerPhone: string | null;
}
