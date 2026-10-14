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
