import { create } from 'zustand';

interface AccessGateState {
  visible: boolean;
  reason: 'subscription_required' | 'purchase_required' | 'login_required' | null;
  price: number | null;
  show: (payload: { reason: string; price?: number }) => void;
  hide: () => void;
}

export const useAccessGateStore = create<AccessGateState>((set) => ({
  visible: false,
  reason: null,
  price: null,
  show: ({ reason, price }) =>
    set({ visible: true, reason: reason as AccessGateState['reason'], price: price ?? null }),
  hide: () => set({ visible: false, reason: null, price: null }),
}));
