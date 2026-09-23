type AlertPreferenceState = {
  locationAlerts: boolean;
  flood: boolean;
  landslide: boolean;
  severeWeather: boolean;
  communitySafety: boolean;
  pushNotifications: boolean;
  alertSound: boolean;
  vibration: boolean;
  quietHours: boolean;
};

export const defaultAlertPreferences: AlertPreferenceState = {
  locationAlerts: true,
  flood: true,
  landslide: false,
  severeWeather: true,
  communitySafety: true,
  pushNotifications: true,
  alertSound: true,
  vibration: true,
  quietHours: false,
};

export type AssistanceDraft = {
  emergencyType: string;
  urgency: string;
  location: string;
  adults: string;
  children: string;
  elderly: string;
  details: string;
  contactNumber: string;
  specialNeeds: string[];
};

export type HouseholdMember = {
  id: string;
  name: string;
  relationship: string;
  age: number;
  vulnerability: string;
};

export const demoHouseholdMembers: HouseholdMember[] = [
  {
    id: 'demo-1',
    name: 'Kamal Perera',
    relationship: 'Father',
    age: 68,
    vulnerability: 'Elderly',
  },
  {
    id: 'demo-2',
    name: 'Nimali Perera',
    relationship: 'Mother',
    age: 61,
    vulnerability: 'Medical',
  },
  {
    id: 'demo-3',
    name: 'Asha Perera',
    relationship: 'Child',
    age: 9,
    vulnerability: 'Child',
  },
];

export const emergencyContactGroups = [
  {
    title: 'Emergency Services',
    contacts: [
      { label: 'Disaster Management', value: 'Demo number pending official configuration' },
      { label: 'Police', value: 'Demo number pending official configuration' },
      { label: 'Ambulance', value: 'Demo number pending official configuration' },
      { label: 'Fire & Rescue', value: 'Demo number pending official configuration' },
    ],
  },
  {
    title: 'Local Emergency Support',
    contacts: [
      { label: 'Village Officer', value: 'Configured by local authority' },
      { label: 'Nearest Safe Shelter', value: 'Use verified shelter module' },
      { label: 'Local Emergency Response', value: 'Configured by local authority' },
    ],
  },
];
