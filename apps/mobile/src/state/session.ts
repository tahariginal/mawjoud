import type { Me } from '@mawjood/contracts';
import { create } from 'zustand';

type Mode = 'customer' | 'merchant';

type SessionState = {
  status: 'loading' | 'signedOut' | 'signedIn';
  me: Me | null;
  mode: Mode;
  setMe: (me: Me | null) => void;
  setMode: (mode: Mode) => void;
};

/** UI-level session state. The server (auth module) remains the source of truth for identity. */
export const useSession = create<SessionState>((set) => ({
  status: 'loading',
  me: null,
  mode: 'customer',
  setMe: (me) =>
    set((state) => ({
      me,
      status: me ? 'signedIn' : 'signedOut',
      mode: me && me.memberships.length > 0 ? state.mode : 'customer',
    })),
  setMode: (mode) => set({ mode }),
}));

export const isMerchant = (me: Me | null): boolean => (me?.memberships.length ?? 0) > 0;
