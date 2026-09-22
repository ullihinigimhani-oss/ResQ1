export interface SOSRequest {
  id: number;
  userId: number;
  latitude: number;
  longitude: number;
  status: 'pending' | 'accepted' | 'completed';
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
