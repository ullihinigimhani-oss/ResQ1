export interface BasicPhoneResidentRow {
  id: number;
  full_name: string;
  phone_number: string;
  area: string;
  registered_by: number;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface BasicPhoneResident {
  id: number;
  fullName: string;
  mobileNumber: string;
  area: string;
  registeredBy: number;
  createdAt: string;
  updatedAt: string;
}

export interface BasicPhoneResidentInput {
  fullName?: unknown;
  mobileNumber?: unknown;
  area?: unknown;
}

export type BasicPhoneResidentFieldErrors = Partial<
  Record<'fullName' | 'mobileNumber' | 'area', string>
>;
