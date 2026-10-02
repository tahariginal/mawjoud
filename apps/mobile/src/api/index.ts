import { env } from '@/config/env';

import { createDemoApi } from './demo';
import { createHttpApi } from './http';
import type { MawjoodApi } from './types';

export const api: MawjoodApi =
  env.apiMode === 'http' ? createHttpApi(env.apiBaseUrl) : createDemoApi();

export { ApiError, isApiError, errorCodeOf, isTransientError } from './errors';
export type { ClientErrorCode } from './errors';
export type { MawjoodApi, AuthResult } from './types';
