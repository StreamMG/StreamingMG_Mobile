/**
 * stores/purchaseStore.ts
 *
 * Gère :
 *  - La liste des contenus achetés (accès permanent)
 *  - Le statut abonnement Premium
 *
 * Chargé au login via loadPurchases() + loadSubscription().
 * Vidé au logout via clear().
 *
 * Utilisé par :
 *   app/subscribe.tsx    → subscription, setSubscription
 *   app/purchase/[id].tsx → addPurchase
 *   hooks/useContentDetail → isPurchased (override accessStatus)
 */

import { create } from 'zustand';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Purchase {
  contentId:   string;
  title:       string;
  thumbnail:   string;
  purchasedAt: string;
  amount:      number;
}

export interface Subscription {
  isPremium:     boolean;
  plan:          'monthly' | 'annual' | null;
  premiumExpiry: string | null;
}

interface PurchaseState {
  purchases:    Purchase[];
  subscription: Subscription;
  loading:      boolean;

  isPurchased:      (contentId: string) => boolean;
  addPurchase:      (purchase: Purchase) => void;
  setSubscription:  (sub: Subscription) => void;
  loadPurchases:    (apiClient: any) => Promise<void>;
  loadSubscription: (apiClient: any) => Promise<void>;
  clear:            () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

const DEFAULT_SUB: Subscription = {
  isPremium:     false,
  plan:          null,
  premiumExpiry: null,
};

export const usePurchaseStore = create<PurchaseState>((set, get) => ({
  purchases:    [],
  subscription: DEFAULT_SUB,
  loading:      false,

  isPurchased: (contentId) =>
    get().purchases.some((p) => p.contentId === contentId),

  addPurchase: (purchase) =>
    set((state) => ({
      purchases: [...state.purchases.filter((p) => p.contentId !== purchase.contentId), purchase],
    })),

  setSubscription: (subscription) => set({ subscription }),

  loadPurchases: async (apiClient) => {
    set({ loading: true });
    try {
      const { data } = await apiClient.get('/payment/purchases');
      const purchases: Purchase[] = (data.purchases ?? []).map((p: any) => ({
        contentId:   p.contentId?._id ?? p.contentId,
        title:       p.contentId?.title ?? '',
        thumbnail:   p.contentId?.thumbnail ?? '',
        purchasedAt: p.purchasedAt ?? '',
        amount:      p.amount ?? 0,
      }));
      set({ purchases });
    } catch {
      // Silencieux — liste vide
    } finally {
      set({ loading: false });
    }
  },

  loadSubscription: async (apiClient) => {
    try {
      const { data } = await apiClient.get('/payment/status');
      set({
        subscription: {
          isPremium:     data.isPremium ?? false,
          plan:          data.plan ?? null,
          premiumExpiry: data.premiumExpiry ?? null,
        },
      });
    } catch {
      // Silencieux
    }
  },

  clear: () => set({ purchases: [], subscription: DEFAULT_SUB }),
}));
