import { z } from 'zod';

import { Uuid, IsoDateTime } from './common.ts';
import { BusinessRole, PlatformRole } from './enums.ts';

export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 128;

export const Email = z.email().max(254);
export const Password = z.string().min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH);
export const DisplayName = z.string().trim().min(1).max(60);
export const OneTimeCode = z.string().regex(/^\d{6}$/, '6 digits');
export const Locale = z.enum(['en', 'fr', 'ar']);
export type Locale = z.infer<typeof Locale>;

export const RegisterRequest = z.strictObject({
  email: Email,
  password: Password,
  displayName: DisplayName,
  locale: Locale,
});
export type RegisterRequest = z.infer<typeof RegisterRequest>;

export const LoginRequest = z.strictObject({
  email: Email,
  // Login does not enforce the password policy, so old accounts can still sign in.
  password: z.string().min(1).max(PASSWORD_MAX_LENGTH),
});
export type LoginRequest = z.infer<typeof LoginRequest>;

export const VerifyEmailRequest = z.strictObject({ code: OneTimeCode });
export type VerifyEmailRequest = z.infer<typeof VerifyEmailRequest>;

export const ForgotPasswordRequest = z.strictObject({ email: Email });
export type ForgotPasswordRequest = z.infer<typeof ForgotPasswordRequest>;

export const ResetPasswordRequest = z.strictObject({
  email: Email,
  code: OneTimeCode,
  newPassword: Password,
});
export type ResetPasswordRequest = z.infer<typeof ResetPasswordRequest>;

export const AuthTokens = z.object({
  accessToken: z.string().min(1),
  accessTokenExpiresAt: IsoDateTime,
  refreshToken: z.string().min(1),
});
export type AuthTokens = z.infer<typeof AuthTokens>;

export const BusinessMembership = z.object({
  businessId: Uuid,
  businessName: z.string(),
  role: BusinessRole,
});
export type BusinessMembership = z.infer<typeof BusinessMembership>;

export const Me = z.object({
  id: Uuid,
  email: Email,
  emailVerified: z.boolean(),
  displayName: DisplayName,
  locale: Locale,
  platformRole: PlatformRole,
  memberships: z.array(BusinessMembership),
});
export type Me = z.infer<typeof Me>;

export const UpdateMeRequest = z.strictObject({
  displayName: DisplayName.optional(),
  locale: Locale.optional(),
});
export type UpdateMeRequest = z.infer<typeof UpdateMeRequest>;

export const DeleteAccountRequest = z.strictObject({
  password: z.string().min(1).max(PASSWORD_MAX_LENGTH),
});
export type DeleteAccountRequest = z.infer<typeof DeleteAccountRequest>;

/** Response of register, login and OAuth endpoints. */
export const AuthResponse = z.object({
  me: Me,
  tokens: AuthTokens,
});
export type AuthResponse = z.infer<typeof AuthResponse>;

export const RefreshRequest = z.strictObject({ refreshToken: z.string().min(1) });
export type RefreshRequest = z.infer<typeof RefreshRequest>;
