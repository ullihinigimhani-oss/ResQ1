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

export interface CreateSOSPayload extends Record<string, unknown> {
  latitude: number;
  longitude: number;
}
