export interface BasicPhoneResident {
  id: number;
  fullName: string;
  mobileNumber: string;
  area: string;
  registeredBy: number;
  createdAt: string;
  updatedAt: string;
}

export interface BasicPhoneResidentPayload {
  fullName: string;
  mobileNumber: string;
  area: string;
}

export type BasicPhoneResidentFieldErrors = Partial<
  Record<keyof BasicPhoneResidentPayload, string>
>;
