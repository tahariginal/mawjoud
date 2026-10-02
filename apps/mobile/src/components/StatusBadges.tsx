import type { OfferStatus, OrderStatus } from '@mawjood/contracts';
import { useTranslation } from 'react-i18next';

import { env } from '@/config/env';

import { Badge, type BadgeTone } from './ui/Badge';
import type { IconName } from './ui/Icon';

const orderTone: Record<OrderStatus, { tone: BadgeTone; icon: IconName }> = {
  CREATED: { tone: 'info', icon: 'hourglass-outline' },
  PAYMENT_PENDING: { tone: 'warning', icon: 'hourglass-outline' },
  CONFIRMED: { tone: 'success', icon: 'checkmark-circle-outline' },
  READY_FOR_PICKUP: { tone: 'success', icon: 'bag-check-outline' },
  PICKED_UP: { tone: 'neutral', icon: 'checkmark-done-outline' },
  CANCELLED: { tone: 'error', icon: 'close-circle-outline' },
  EXPIRED: { tone: 'neutral', icon: 'time-outline' },
  FAILED: { tone: 'error', icon: 'alert-circle-outline' },
  NO_SHOW: { tone: 'warning', icon: 'alert-circle-outline' },
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const { t } = useTranslation();
  const s = orderTone[status];
  return <Badge label={t(`orders.status.${status}`)} tone={s.tone} icon={s.icon} />;
}

const offerTone: Record<OfferStatus, BadgeTone> = {
  DRAFT: 'neutral',
  SCHEDULED: 'info',
  ACTIVE: 'success',
  PAUSED: 'warning',
  SOLD_OUT: 'neutral',
  ENDED: 'neutral',
  REMOVED: 'error',
};

export function OfferStatusBadge({ status }: { status: OfferStatus }) {
  const { t } = useTranslation();
  return <Badge label={t(`merchant.offerStatus.${status}`)} tone={offerTone[status]} />;
}

/** Visible whenever the isolated demo adapter is active, so demo data is never mistaken for real. */
export function DemoBadge() {
  const { t } = useTranslation();
  if (env.apiMode !== 'demo') return null;
  return <Badge label={t('common.demoData')} tone="warning" icon="flask-outline" />;
}
