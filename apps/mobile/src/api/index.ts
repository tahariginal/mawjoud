import { env } from '@/config/env';

import { createDemoApi } from './demo';
import { createHttpApi } from './http';
import type { MazalApi } from './types';

export const api: MazalApi =
  env.apiMode === 'http' ? createHttpApi(env.apiBaseUrl) : createDemoApi();

export { ApiError, isApiError, errorCodeOf, isTransientError } from './errors';
export type { ClientErrorCode } from './errors';
export type { MazalApi, AuthResult } from './types';
