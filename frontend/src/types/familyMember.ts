export type VulnerabilityCategory =
  | 'ELDERLY'
  | 'CHILDREN'
  | 'PREGNANT_WOMEN'
  | 'PERSONS_WITH_DISABILITIES'
  | 'PERSONS_WITH_MEDICAL_CONDITIONS';

export type MedicalCondition = 'DIABETES' | 'ASTHMA' | 'HEART_CONDITION';

export type Gender = 'Male' | 'Female' | 'Other';

export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';

export interface FamilyMember {
  id: number;
  userId: number;
  name: string;
  age: number;
  gender: Gender;
  phoneNumber: string | null;
  nicIdNumber: string | null;
  bloodGroup: BloodGroup;
  vulnerableCategories: VulnerabilityCategory[];
  medicalConditions: MedicalCondition[];
  disabilityDetails: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFamilyMemberPayload {
  name: string;
  age: number | string;
  gender: Gender;
  phoneNumber?: string | null;
  nicIdNumber?: string | null;
  bloodGroup: BloodGroup;
  vulnerableCategories?: VulnerabilityCategory[];
  medicalConditions?: MedicalCondition[];
  disabilityDetails?: string | null;
}

export type UpdateFamilyMemberPayload = Partial<CreateFamilyMemberPayload>;

export type FamilyMemberFieldErrors = Partial<
  Record<
    | 'name'
    | 'age'
    | 'gender'
    | 'phoneNumber'
    | 'nicIdNumber'
    | 'bloodGroup'
    | 'vulnerableCategories'
    | 'medicalConditions'
    | 'disabilityDetails',
    string
  >
>;

export const VULNERABILITY_LABELS: Record<VulnerabilityCategory, string> = {
  ELDERLY: 'Elderly',
  CHILDREN: 'Children',
  PREGNANT_WOMEN: 'Pregnant Women',
  PERSONS_WITH_DISABILITIES: 'Persons with Disabilities',
  PERSONS_WITH_MEDICAL_CONDITIONS: 'Persons with Medical Conditions',
};

export const MEDICAL_CONDITION_LABELS: Record<MedicalCondition, string> = {
  DIABETES: 'Diabetes',
  ASTHMA: 'Asthma',
  HEART_CONDITION: 'Heart Condition',
};

export const GENDER_OPTIONS: Gender[] = ['Male', 'Female', 'Other'];

export const BLOOD_GROUP_OPTIONS: BloodGroup[] = [
  'A+',
  'A-',
  'B+',
  'B-',
  'AB+',
  'AB-',
  'O+',
  'O-',
];
