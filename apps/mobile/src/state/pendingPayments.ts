import type { PaymentClientParams } from '@mawjood/contracts';
import { create } from 'zustand';

type PendingPaymentsState = {
  byOrderId: Record<string, PaymentClientParams>;
  set: (orderId: string, params: PaymentClientParams) => void;
  clear: (orderId: string) => void;
};

/**
 * Payment client parameters returned with a new order, handed from checkout to the payment
 * screen. Not persisted: after a restart the payment screen asks the server again (resume).
 */
export const usePendingPayments = create<PendingPaymentsState>((set) => ({
  byOrderId: {},
  set: (orderId, params) => set((s) => ({ byOrderId: { ...s.byOrderId, [orderId]: params } })),
  clear: (orderId) =>
    set((s) => {
      const next = { ...s.byOrderId };
      delete next[orderId];
      return { byOrderId: next };
    }),
}));
