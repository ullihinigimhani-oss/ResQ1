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

export interface ForgotPasswordPayload {
  email: string;
}

export interface VerifyResetOtpPayload {
  email: string;
  otp: string;
}

export interface ResetPasswordPayload {
  resetToken: string;
  newPassword: string;
  confirmPassword?: string;
}

export interface VerifyResetOtpResponse {
  success: boolean;
  message: string;
  resetToken: string;
}

export type FieldErrors = Partial<
  Record<
    | keyof RegisterResidentPayload
    | keyof LoginResidentPayload
    | keyof UpdateProfilePayload
    | keyof ForgotPasswordPayload
    | keyof VerifyResetOtpPayload
    | keyof ResetPasswordPayload,
    string
  >
>;
