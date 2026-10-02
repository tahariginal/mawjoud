import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { isApiError } from '@/api/errors';

/** Maps any error to safe, translated copy. Never shows raw server messages. */
export function useErrorMessage(): (error: unknown) => string {
  const { t } = useTranslation();
  return useCallback(
    (error: unknown) => {
      if (!isApiError(error)) return t('errors.generic');
      switch (error.code) {
        case 'NETWORK_ERROR':
          return t('errors.offline');
        case 'TIMEOUT':
          return t('errors.timeout');
        case 'NOT_FOUND':
        case 'OFFER_NOT_FOUND':
        case 'ORDER_NOT_FOUND':
          return t('errors.notFound');
        case 'AUTH_REQUIRED':
        case 'AUTH_SESSION_REVOKED':
        case 'AUTH_TOKEN_EXPIRED':
          return t('errors.sessionExpired');
        case 'AUTH_INVALID_CREDENTIALS':
          return t('errors.invalidCredentials');
        case 'AUTH_EMAIL_TAKEN':
          return t('errors.emailTaken');
        case 'AUTH_CODE_INVALID':
          return t('errors.codeInvalid');
        case 'AUTH_EMAIL_NOT_VERIFIED':
          return t('errors.emailNotVerified');
        case 'FORBIDDEN':
          return t('errors.forbidden');
        case 'RATE_LIMITED':
          return t('errors.rateLimited');
        case 'OFFER_SOLD_OUT':
          return t('errors.soldOut');
        case 'OFFER_NOT_AVAILABLE':
          return t('errors.offerUnavailable');
        case 'OFFER_QUANTITY_LIMIT': {
          const max = typeof error.details?.max === 'number' ? error.details.max : 1;
          return t('errors.quantityLimit', { max });
        }
        case 'PRICE_CHANGED':
          return t('errors.priceChanged');
        case 'ORDER_LIMIT_REACHED':
          return t('errors.orderLimit');
        case 'ORDER_CANCELLATION_CLOSED':
          return t('errors.cancellationClosed');
        case 'CONFLICT_STALE_VERSION':
          return t('errors.staleVersion');
        case 'VALIDATION_FAILED':
          return t('errors.validation');
        case 'NOT_AVAILABLE_YET':
          return t('errors.notAvailableYet');
        default:
          return t('errors.generic');
      }
    },
    [t],
  );
}
