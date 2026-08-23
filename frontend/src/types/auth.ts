export type PreferredLanguage = 'English' | 'Sinhala' | 'Tamil';

export interface AuthUser {
  id: number;
  fullName: string;
  email: string;
  role: 'resident' | 'admin' | 'authority';
  location: string | null;
  preferredLanguage: string;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterResidentPayload {
  fullName: string;
  email: string;
  password: string;
  location: string;
  preferredLanguage: PreferredLanguage;
}

export interface LoginResidentPayload {
  email: string;
  password: string;
}

export interface UpdateProfilePayload {
  fullName: string;
  email: string;
  location: string;
  preferredLanguage: PreferredLanguage;
}

export interface AuthSession {
  user: AuthUser;
  token: string;
}

export type FieldErrors = Partial<
  Record<keyof RegisterResidentPayload | keyof LoginResidentPayload | keyof UpdateProfilePayload, string>
>;
