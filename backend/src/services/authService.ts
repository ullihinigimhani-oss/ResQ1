import { createHash, randomBytes, randomInt } from 'node:crypto';

import bcrypt from 'bcrypt';
import jwt, { type SignOptions } from 'jsonwebtoken';

import { sql } from '../config/database.js';
import type {
  AuthResult,
  ForgotPasswordInput,
  LoginResidentInput,
  PreferredLanguage,
  RegisterResidentInput,
  ResetPasswordInput,
  SafeUser,
  UpdateProfileInput,
  UserRow,
  VerifyResetOtpInput,
} from '../types/auth.js';

const PASSWORD_SALT_ROUNDS = 12;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PREFERRED_LANGUAGES = new Set<PreferredLanguage>(['English', 'Sinhala', 'Tamil']);
const PASSWORD_RESET_GENERIC_MESSAGE =
  'If an account exists for this email, a verification code has been generated.';
const PASSWORD_RESET_OTP_MIN = 100000;
const PASSWORD_RESET_OTP_MAX = 1000000;
const PASSWORD_RESET_OTP_EXPIRES_IN_MINUTES = 5;
const PASSWORD_RESET_RESEND_COOLDOWN_SECONDS = 60;
const PASSWORD_RESET_MAX_ATTEMPTS = 5;
const PASSWORD_RESET_TOKEN_BYTES = 32;
const PASSWORD_RESET_TOKEN_EXPIRES_IN_MINUTES = 10;

type PasswordResetTokenRow = {
  id: number;
  user_id: number;
  otp_hash: string;
  expires_at: Date | string;
  attempt_count: number;
  used: boolean;
};

type VerifiedPasswordResetTokenRow = PasswordResetTokenRow & {
  reset_token_hash: string | null;
  reset_token_expires_at: Date | string | null;
};

export class AuthServiceError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = 'AuthServiceError';
  }
}

function trimmedText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function passwordText(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function normalizeEmail(value: unknown): string {
  return trimmedText(value).toLowerCase();
}

function formatTimestamp(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

function toSafeUser(row: UserRow): SafeUser {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    role: row.role,
    location: row.location,
    preferredLanguage: row.preferred_language,
    createdAt: formatTimestamp(row.created_at),
    updatedAt: formatTimestamp(row.updated_at),
  };
}

function validateRegistrationInput(input: RegisterResidentInput) {
  const fullName = trimmedText(input.fullName);
  const email = normalizeEmail(input.email);
  const password = passwordText(input.password);
  const location = trimmedText(input.location);
  const preferredLanguage = trimmedText(input.preferredLanguage);
  const fieldErrors: Record<string, string> = {};

  if (!fullName) {
    fieldErrors.fullName = 'Full name is required.';
  }

  if (!email) {
    fieldErrors.email = 'Email address is required.';
  } else if (!EMAIL_PATTERN.test(email)) {
    fieldErrors.email = 'Enter a valid email address.';
  }

  if (!password) {
    fieldErrors.password = 'Password is required.';
  } else if (password.length < 8) {
    fieldErrors.password = 'Password must be at least 8 characters.';
  }

  if (!location) {
    fieldErrors.location = 'Location or area is required.';
  }

  if (!preferredLanguage) {
    fieldErrors.preferredLanguage = 'Preferred language is required.';
  } else if (!PREFERRED_LANGUAGES.has(preferredLanguage as PreferredLanguage)) {
    fieldErrors.preferredLanguage = 'Choose English, Sinhala, or Tamil.';
  }

  if (Object.keys(fieldErrors).length > 0) {
    throw new AuthServiceError(400, 'Please correct the highlighted fields.', fieldErrors);
  }

  return {
    fullName,
    email,
    password,
    location,
    preferredLanguage: preferredLanguage as PreferredLanguage,
  };
}

function validateLoginInput(input: LoginResidentInput) {
  const email = normalizeEmail(input.email);
  const password = passwordText(input.password);
  const fieldErrors: Record<string, string> = {};

  if (!email) {
    fieldErrors.email = 'Email address is required.';
  } else if (!EMAIL_PATTERN.test(email)) {
    fieldErrors.email = 'Enter a valid email address.';
  }

  if (!password) {
    fieldErrors.password = 'Password is required.';
  }

  if (Object.keys(fieldErrors).length > 0) {
    throw new AuthServiceError(400, 'Please correct the highlighted fields.', fieldErrors);
  }

  return { email, password };
}

function validateForgotPasswordInput(input: ForgotPasswordInput) {
  const email = normalizeEmail(input.email);
  const fieldErrors: Record<string, string> = {};

  if (!email) {
    fieldErrors.email = 'Email address is required.';
  } else if (!EMAIL_PATTERN.test(email)) {
    fieldErrors.email = 'Enter a valid email address.';
  }

  if (Object.keys(fieldErrors).length > 0) {
    throw new AuthServiceError(400, 'Please correct the highlighted fields.', fieldErrors);
  }

  return { email };
}

function validateVerifyResetOtpInput(input: VerifyResetOtpInput) {
  const email = normalizeEmail(input.email);
  const otp = trimmedText(input.otp);
  const fieldErrors: Record<string, string> = {};

  if (!email) {
    fieldErrors.email = 'Email address is required.';
  } else if (!EMAIL_PATTERN.test(email)) {
    fieldErrors.email = 'Enter a valid email address.';
  }

  if (!otp) {
    fieldErrors.otp = 'Verification code is required.';
  } else if (!/^\d{6}$/.test(otp)) {
    fieldErrors.otp = 'Enter the 6-digit verification code.';
  }

  if (Object.keys(fieldErrors).length > 0) {
    throw new AuthServiceError(400, 'Please correct the highlighted fields.', fieldErrors);
  }

  return { email, otp };
}

function validateNewPassword(value: unknown) {
  const password = passwordText(value);

  if (!password) {
    return 'Password is required.';
  }

  if (password.length < 8) {
    return 'Password must be at least 8 characters.';
  }

  if (!/[A-Z]/.test(password)) {
    return 'Password must include at least one uppercase letter.';
  }

  if (!/[a-z]/.test(password)) {
    return 'Password must include at least one lowercase letter.';
  }

  if (!/\d/.test(password)) {
    return 'Password must include at least one number.';
  }

  return null;
}

function validateResetPasswordInput(input: ResetPasswordInput) {
  const resetToken = trimmedText(input.resetToken);
  const newPassword = passwordText(input.newPassword);
  const fieldErrors: Record<string, string> = {};

  if (!resetToken) {
    fieldErrors.resetToken = 'Password reset session is required.';
  }

  const passwordError = validateNewPassword(newPassword);

  if (passwordError) {
    fieldErrors.newPassword = passwordError;
  }

  if (Object.keys(fieldErrors).length > 0) {
    throw new AuthServiceError(400, 'Please correct the highlighted fields.', fieldErrors);
  }

  return { resetToken, newPassword };
}

function validateProfileInput(input: UpdateProfileInput) {
  const fullName = trimmedText(input.fullName);
  const email = normalizeEmail(input.email);
  const location = trimmedText(input.location);
  const preferredLanguage = trimmedText(input.preferredLanguage);
  const fieldErrors: Record<string, string> = {};

  if (!fullName) {
    fieldErrors.fullName = 'Full name is required.';
  }

  if (!email) {
    fieldErrors.email = 'Email address is required.';
  } else if (!EMAIL_PATTERN.test(email)) {
    fieldErrors.email = 'Enter a valid email address.';
  }

  if (!location) {
    fieldErrors.location = 'Location or area is required.';
  }

  if (!preferredLanguage) {
    fieldErrors.preferredLanguage = 'Preferred language is required.';
  } else if (!PREFERRED_LANGUAGES.has(preferredLanguage as PreferredLanguage)) {
    fieldErrors.preferredLanguage = 'Choose English, Sinhala, or Tamil.';
  }

  if (Object.keys(fieldErrors).length > 0) {
    throw new AuthServiceError(400, 'Please correct the highlighted fields.', fieldErrors);
  }

  return {
    fullName,
    email,
    location,
    preferredLanguage: preferredLanguage as PreferredLanguage,
  };
}

function createAuthToken(user: SafeUser): string {
  const jwtSecret = process.env.JWT_SECRET?.trim();

  if (!jwtSecret) {
    throw new AuthServiceError(500, 'Authentication is not configured.');
  }

  const signOptions: SignOptions = {
    expiresIn: (process.env.JWT_EXPIRES_IN?.trim() || '7d') as SignOptions['expiresIn'],
  };

  return jwt.sign(
    {
      sub: String(user.id),
      email: user.email,
      role: user.role,
    },
    jwtSecret,
    signOptions,
  );
}

function invalidCredentialsError() {
  return new AuthServiceError(401, 'Invalid email or password.');
}

function generateOtp() {
  return String(randomInt(PASSWORD_RESET_OTP_MIN, PASSWORD_RESET_OTP_MAX));
}

function generateResetToken() {
  return randomBytes(PASSWORD_RESET_TOKEN_BYTES).toString('hex');
}

function hashResetToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function expiresAtFromNow(minutes: number) {
  return new Date(Date.now() + minutes * 60 * 1000);
}

function isPast(value: Date | string) {
  return new Date(value).getTime() <= Date.now();
}

function maskEmail(email: string) {
  const [name, domain] = email.split('@');

  if (!name || !domain) {
    return 'unknown email';
  }

  const visibleName = name.length <= 2 ? `${name[0] ?? '*'}***` : `${name.slice(0, 2)}***`;
  return `${visibleName}@${domain}`;
}

export async function registerResident(input: RegisterResidentInput): Promise<AuthResult> {
  const resident = validateRegistrationInput(input);

  const existingUsers = await sql`
    SELECT id
    FROM users
    WHERE email = ${resident.email}
    LIMIT 1
  `;

  if (existingUsers.length > 0) {
    throw new AuthServiceError(409, 'An account with this email already exists.', {
      email: 'An account with this email already exists.',
    });
  }

  const passwordHash = await bcrypt.hash(resident.password, PASSWORD_SALT_ROUNDS);

  const rows = await sql`
    INSERT INTO users (full_name, email, password_hash, role, location, preferred_language)
    VALUES (
      ${resident.fullName},
      ${resident.email},
      ${passwordHash},
      'resident',
      ${resident.location},
      ${resident.preferredLanguage}
    )
    RETURNING id, full_name, email, role, location, preferred_language, created_at, updated_at
  `;

  const createdUser = rows[0] as UserRow | undefined;

  if (!createdUser) {
    throw new AuthServiceError(500, 'Registration could not be completed.');
  }

  return { user: toSafeUser(createdUser) };
}

export async function loginResident(input: LoginResidentInput): Promise<AuthResult> {
  const credentials = validateLoginInput(input);

  const rows = await sql`
    SELECT id, full_name, email, password_hash, role, location, preferred_language, created_at, updated_at
    FROM users
    WHERE email = ${credentials.email}
    LIMIT 1
  `;

  const user = rows[0] as UserRow | undefined;

  if (!user?.password_hash) {
    throw invalidCredentialsError();
  }

  const passwordMatches = await bcrypt.compare(credentials.password, user.password_hash);

  if (!passwordMatches) {
    throw invalidCredentialsError();
  }

  const safeUser = toSafeUser(user);

  return {
    user: safeUser,
    token: createAuthToken(safeUser),
  };
}

export async function requestPasswordReset(input: ForgotPasswordInput) {
  const { email } = validateForgotPasswordInput(input);

  const users = await sql`
    SELECT id, email
    FROM users
    WHERE email = ${email}
    LIMIT 1
  `;
  const user = users[0] as { id: number; email: string } | undefined;

  if (!user) {
    return { message: PASSWORD_RESET_GENERIC_MESSAGE };
  }

  const cooldownStartedAt = new Date(Date.now() - PASSWORD_RESET_RESEND_COOLDOWN_SECONDS * 1000);
  const recentTokens = await sql`
    SELECT id
    FROM password_reset_tokens
    WHERE user_id = ${user.id}
      AND used = FALSE
      AND created_at > ${cooldownStartedAt}
    ORDER BY created_at DESC
    LIMIT 1
  `;

  if (recentTokens.length > 0) {
    return { message: PASSWORD_RESET_GENERIC_MESSAGE };
  }

  const otp = generateOtp();
  const otpHash = await bcrypt.hash(otp, PASSWORD_SALT_ROUNDS);
  const expiresAt = expiresAtFromNow(PASSWORD_RESET_OTP_EXPIRES_IN_MINUTES);

  await sql`
    UPDATE password_reset_tokens
    SET used = TRUE
    WHERE user_id = ${user.id}
      AND used = FALSE
  `;

  await sql`
    INSERT INTO password_reset_tokens (
      user_id,
      otp_hash,
      expires_at,
      attempt_count,
      used
    )
    VALUES (
      ${user.id},
      ${otpHash},
      ${expiresAt},
      0,
      FALSE
    )
  `;

  if (process.env.NODE_ENV !== 'production') {
    console.info(`[DEV] Password reset OTP for ${maskEmail(user.email)}: ${otp}`);
  }

  return { message: PASSWORD_RESET_GENERIC_MESSAGE };
}

export async function verifyResetOtp(input: VerifyResetOtpInput) {
  const { email, otp } = validateVerifyResetOtpInput(input);

  const users = await sql`
    SELECT id
    FROM users
    WHERE email = ${email}
    LIMIT 1
  `;
  const user = users[0] as { id: number } | undefined;

  if (!user) {
    throw new AuthServiceError(400, 'Invalid verification code.', {
      otp: 'Invalid verification code.',
    });
  }

  const tokenRows = await sql`
    SELECT id, user_id, otp_hash, expires_at, attempt_count, used
    FROM password_reset_tokens
    WHERE user_id = ${user.id}
      AND used = FALSE
    ORDER BY created_at DESC
    LIMIT 1
  `;
  const resetRecord = tokenRows[0] as PasswordResetTokenRow | undefined;

  if (!resetRecord) {
    throw new AuthServiceError(400, 'Your verification code has expired. Please request a new code.', {
      otp: 'Your verification code has expired. Please request a new code.',
    });
  }

  if (isPast(resetRecord.expires_at)) {
    await sql`
      UPDATE password_reset_tokens
      SET used = TRUE
      WHERE id = ${resetRecord.id}
    `;

    throw new AuthServiceError(400, 'Your verification code has expired. Please request a new code.', {
      otp: 'Your verification code has expired. Please request a new code.',
    });
  }

  if (resetRecord.attempt_count >= PASSWORD_RESET_MAX_ATTEMPTS) {
    await sql`
      UPDATE password_reset_tokens
      SET used = TRUE
      WHERE id = ${resetRecord.id}
    `;

    throw new AuthServiceError(429, 'Too many incorrect attempts. Please request a new code.', {
      otp: 'Too many incorrect attempts. Please request a new code.',
    });
  }

  const otpMatches = await bcrypt.compare(otp, resetRecord.otp_hash);

  if (!otpMatches) {
    const nextAttemptCount = resetRecord.attempt_count + 1;
    const attemptsExceeded = nextAttemptCount >= PASSWORD_RESET_MAX_ATTEMPTS;

    await sql`
      UPDATE password_reset_tokens
      SET
        attempt_count = ${nextAttemptCount},
        used = ${attemptsExceeded}
      WHERE id = ${resetRecord.id}
    `;

    throw new AuthServiceError(
      attemptsExceeded ? 429 : 400,
      attemptsExceeded ? 'Too many incorrect attempts. Please request a new code.' : 'Invalid verification code.',
      {
        otp: attemptsExceeded
          ? 'Too many incorrect attempts. Please request a new code.'
          : 'Invalid verification code.',
      },
    );
  }

  const resetToken = generateResetToken();
  const resetTokenHash = hashResetToken(resetToken);
  const resetTokenExpiresAt = expiresAtFromNow(PASSWORD_RESET_TOKEN_EXPIRES_IN_MINUTES);

  await sql`
    UPDATE password_reset_tokens
    SET
      verified_at = CURRENT_TIMESTAMP,
      reset_token_hash = ${resetTokenHash},
      reset_token_expires_at = ${resetTokenExpiresAt}
    WHERE id = ${resetRecord.id}
  `;

  return {
    message: 'Verification successful.',
    resetToken,
  };
}

export async function resetPassword(input: ResetPasswordInput) {
  const { resetToken, newPassword } = validateResetPasswordInput(input);
  const resetTokenHash = hashResetToken(resetToken);

  const tokenRows = await sql`
    SELECT
      id,
      user_id,
      otp_hash,
      expires_at,
      attempt_count,
      used,
      reset_token_hash,
      reset_token_expires_at
    FROM password_reset_tokens
    WHERE reset_token_hash = ${resetTokenHash}
      AND used = FALSE
    ORDER BY verified_at DESC
    LIMIT 1
  `;
  const resetRecord = tokenRows[0] as VerifiedPasswordResetTokenRow | undefined;

  if (!resetRecord?.reset_token_expires_at) {
    throw new AuthServiceError(400, 'Invalid or expired password reset session.', {
      resetToken: 'Invalid or expired password reset session.',
    });
  }

  if (isPast(resetRecord.reset_token_expires_at)) {
    await sql`
      UPDATE password_reset_tokens
      SET used = TRUE
      WHERE id = ${resetRecord.id}
    `;

    throw new AuthServiceError(400, 'Invalid or expired password reset session.', {
      resetToken: 'Invalid or expired password reset session.',
    });
  }

  const passwordHash = await bcrypt.hash(newPassword, PASSWORD_SALT_ROUNDS);

  await sql`
    UPDATE users
    SET
      password_hash = ${passwordHash},
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ${resetRecord.user_id}
  `;

  await sql`
    UPDATE password_reset_tokens
    SET
      used = TRUE,
      reset_at = CURRENT_TIMESTAMP
    WHERE id = ${resetRecord.id}
  `;

  return { message: 'Password reset successfully.' };
}

export async function updateResidentProfile(
  userId: number,
  input: UpdateProfileInput,
): Promise<AuthResult> {
  const profile = validateProfileInput(input);

  const existingUsers = await sql`
    SELECT id
    FROM users
    WHERE email = ${profile.email}
      AND id <> ${userId}
    LIMIT 1
  `;

  if (existingUsers.length > 0) {
    throw new AuthServiceError(409, 'An account with this email already exists.', {
      email: 'An account with this email already exists.',
    });
  }

  const rows = await sql`
    UPDATE users
    SET
      full_name = ${profile.fullName},
      email = ${profile.email},
      location = ${profile.location},
      preferred_language = ${profile.preferredLanguage},
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ${userId}
    RETURNING id, full_name, email, role, location, preferred_language, created_at, updated_at
  `;

  const updatedUser = rows[0] as UserRow | undefined;

  if (!updatedUser) {
    throw new AuthServiceError(404, 'Resident account was not found.');
  }

  return { user: toSafeUser(updatedUser) };
}
