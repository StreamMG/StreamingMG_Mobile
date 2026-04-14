/**
 * hooks/useProfile.ts
 *
 * Données et actions de l'écran Profil.
 *
 * Routes :
 *   GET   /user/profile      → infos profil + stats
 *   PATCH /user/profile      → modifier username
 *   PATCH /user/password     → changer mot de passe
 *   GET   /payment/purchases → liste achats
 *   GET   /payment/status    → statut abonnement
 *
 * Utilisé par : app/(tabs)/profile.tsx
 */

import { useState, useEffect, useCallback } from 'react';
import { apiClient }        from '@/lib/apiClient';
import { useAuthStore }     from '@/stores/authStore';
import { usePurchaseStore } from '@/stores/purchaseStore';

export interface UserProfile {
  _id:           string;
  username:      string;
  email:         string;
  role:          'user' | 'premium' | 'provider' | 'admin';
  isPremium:     boolean;
  premiumExpiry: string | null;
  createdAt:     string;
  stats: {
    totalWatched:        number;
    totalPurchases:      number;
    tutorialsInProgress: number;
  };
}

interface UseProfileReturn {
  profile:        UserProfile | null;
  loading:        boolean;
  error:          string | null;
  saving:         boolean;
  saveError:      string | null;
  updateUsername: (username: string) => Promise<boolean>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
  refresh:        () => void;
}

export function useProfile(): UseProfileReturn {
  const user             = useAuthStore((s) => s.user);
  const setAuth          = useAuthStore((s) => s.setAuth);
  const loadPurchases    = usePurchaseStore((s) => s.loadPurchases);
  const loadSubscription = usePurchaseStore((s) => s.loadSubscription);

  const [profile,   setProfile]   = useState<UserProfile | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [saving,    setSaving]    = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get('/user/profile');
      setProfile(data);
      await Promise.all([loadPurchases(apiClient), loadSubscription(apiClient)]);
    } catch {
      setError('Impossible de charger le profil.');
    } finally {
      setLoading(false);
    }
  }, [loadPurchases, loadSubscription]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const updateUsername = useCallback(async (username: string): Promise<boolean> => {
    setSaving(true);
    setSaveError(null);
    try {
      const { data } = await apiClient.patch('/user/profile', { username });
      setProfile((p) => p ? { ...p, username: data.username } : p);
      if (user) {
        const token = useAuthStore.getState().token ?? '';
        const rt    = await useAuthStore.getState().loadStoredRefreshToken() ?? '';
        await setAuth(token, { ...user, username: data.username }, rt);
      }
      return true;
    } catch (e: any) {
      const code = e?.response?.data?.code;
      setSaveError(
        code === 'USERNAME_DUPLICATE' ? 'Ce nom est déjà pris.' :
        code === 'INVALID_USERNAME'   ? 'Nom invalide (3–30 caractères).' :
        'Une erreur est survenue.'
      );
      return false;
    } finally { setSaving(false); }
  }, [user, setAuth]);

  const updatePassword = useCallback(async (
    currentPassword: string, newPassword: string
  ): Promise<boolean> => {
    setSaving(true);
    setSaveError(null);
    try {
      await apiClient.patch('/user/password', { currentPassword, newPassword });
      return true;
    } catch (e: any) {
      const code = e?.response?.data?.code;
      setSaveError(
        code === 'WRONG_PASSWORD' ? 'Mot de passe actuel incorrect.' :
        code === 'WEAK_PASSWORD'  ? 'Nouveau mot de passe trop faible.' :
        'Une erreur est survenue.'
      );
      return false;
    } finally { setSaving(false); }
  }, []);

  return { profile, loading, error, saving, saveError, updateUsername, updatePassword, refresh: fetchProfile };
}
