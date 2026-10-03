import {
  type AuthResponse,
  type AuthTokens,
  ForgotPasswordRequest,
  LoginRequest,
  type Me,
  RefreshRequest,
  RegisterRequest,
  ResetPasswordRequest,
  VerifyEmailRequest,
} from '@mazal/contracts';
import { Body, Controller, Headers, HttpCode, Inject, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { type AuthUser, CurrentUser } from '../../shared/security/current-user.ts';
import { Public } from '../../shared/security/public.decorator.ts';
import { ipAndEmailTracker } from '../../shared/security/throttling.ts';
import { AuthService } from './auth.service.ts';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/** Authentication endpoints (docs/API_SPECIFICATION.md §4.2, limits from SECURITY_MODEL.md §5). */
@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  @Throttle({ default: { limit: 5, ttl: HOUR } })
  register(
    @Body({ schema: RegisterRequest }) body: RegisterRequest,
    @Headers('user-agent') userAgent?: string,
  ): Promise<AuthResponse> {
    return this.auth.register(body, userAgent ?? null);
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: MINUTE, getTracker: ipAndEmailTracker } })
  login(
    @Body({ schema: LoginRequest }) body: LoginRequest,
    @Headers('user-agent') userAgent?: string,
  ): Promise<AuthResponse> {
    return this.auth.login(body, userAgent ?? null);
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  @Throttle({ default: { limit: 30, ttl: MINUTE } })
  refresh(
    @Body({ schema: RefreshRequest }) body: RefreshRequest,
    @Headers('user-agent') userAgent?: string,
  ): Promise<AuthTokens> {
    return this.auth.refresh(body.refreshToken, userAgent ?? null);
  }

  @Post('logout')
  @HttpCode(204)
  logout(@CurrentUser() user: AuthUser): Promise<void> {
    return this.auth.logout(user);
  }

  @Post('email/verify')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 15 * MINUTE } })
  verifyEmail(
    @CurrentUser() user: AuthUser,
    @Body({ schema: VerifyEmailRequest }) body: VerifyEmailRequest,
  ): Promise<Me> {
    return this.auth.verifyEmail(user, body.code);
  }

  @Post('email/resend')
  @HttpCode(202)
  @Throttle({ default: { limit: 3, ttl: HOUR } })
  resend(@CurrentUser() user: AuthUser): Promise<void> {
    return this.auth.resendVerification(user);
  }

  @Public()
  @Post('password/forgot')
  @HttpCode(202)
  @Throttle({ default: { limit: 3, ttl: HOUR, getTracker: ipAndEmailTracker } })
  forgot(@Body({ schema: ForgotPasswordRequest }) body: ForgotPasswordRequest): Promise<void> {
    return this.auth.forgotPassword(body);
  }

  @Public()
  @Post('password/reset')
  @HttpCode(204)
  @Throttle({ default: { limit: 10, ttl: HOUR, getTracker: ipAndEmailTracker } })
  reset(@Body({ schema: ResetPasswordRequest }) body: ResetPasswordRequest): Promise<void> {
    return this.auth.resetPassword(body);
  }
}
