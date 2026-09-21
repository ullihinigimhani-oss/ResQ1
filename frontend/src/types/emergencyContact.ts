export type RelationshipType =
  | 'Spouse'
  | 'Parent'
  | 'Child'
  | 'Sibling'
  | 'Relative'
  | 'Neighbor'
  | 'Friend'
  | 'Other';

export interface EmergencyContact {
  id: number;
  userId: number;
  name: string;
  phoneNumber: string;
  relationship: RelationshipType | string;
  isPrimary: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEmergencyContactPayload {
  name: string;
  phoneNumber: string;
  relationship: RelationshipType | string;
  isPrimary?: boolean;
  notes?: string | null;
}

export type UpdateEmergencyContactPayload = Partial<CreateEmergencyContactPayload>;

export type EmergencyContactFieldErrors = Partial<
  Record<'name' | 'phoneNumber' | 'relationship' | 'notes', string>
>;

export const RELATIONSHIP_OPTIONS: RelationshipType[] = [
  'Spouse',
  'Parent',
  'Child',
  'Sibling',
  'Relative',
  'Neighbor',
  'Friend',
  'Other',
];
