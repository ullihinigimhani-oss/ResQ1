export interface EmergencyContact {
  id: string;
  name: string;
  contactNumber: string;
  type: 'police' | 'ambulance' | 'fire' | 'disaster' | 'other';
  description?: string;
}
