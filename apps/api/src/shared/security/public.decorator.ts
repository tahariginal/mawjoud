import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC = 'mazal:isPublic';

/** Marks a route or controller as reachable without an access token (deny by default otherwise). */
export const Public = () => SetMetadata(IS_PUBLIC, true);

export const IS_OPTIONAL_AUTH = 'mazal:optionalAuth';

/** Route is public, but a valid token (if sent) identifies the user for personalization. */
export const OptionalAuth = () => SetMetadata(IS_OPTIONAL_AUTH, true);
