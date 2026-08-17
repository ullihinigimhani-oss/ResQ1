export type PreferredLanguage = 'English' | 'Sinhala' | 'Tamil';

export type UserRole = 'resident' | 'admin' | 'authority';

export interface UserRow {
  id: number;
  full_name: string;
  email: string;
  password_hash?: string;
  role: UserRole;
  location: string | null;
  preferred_language: PreferredLanguage | string;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface SafeUser {
  id: number;
  fullName: string;
  email: string;
  role: UserRole;
  location: string | null;
  preferredLanguage: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthenticatedUser {
  id: number;
  email: string;
  role: UserRole | string;
}

export interface RegisterResidentInput {
  fullName?: unknown;
  email?: unknown;
  password?: unknown;
  location?: unknown;
  preferredLanguage?: unknown;
}

export interface LoginResidentInput {
  email?: unknown;
  password?: unknown;
}

export interface AuthResult {
  user: SafeUser;
  token?: string;
}
