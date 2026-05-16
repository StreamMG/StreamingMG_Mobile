/**
 * hooks/useAdmin.ts
 *
 * Données et actions de l'espace administrateur.
 *
 * Routes :
 *   GET  /admin/stats            → statistiques globales
 *   GET  /admin/contents         → tous les contenus (publiés + en attente)
 *   PUT  /admin/contents/:id     → approuver / rejeter
 *   DELETE /admin/contents/:id   → supprimer
 *   GET  /admin/users            → liste utilisateurs
 *   PUT  /admin/users/:id        → activer / désactiver
 *
 * Utilisé par :
 *   app/admin/index.tsx
 *   app/admin/contents.tsx
 *   app/admin/users.tsx
 */

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/apiClient';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AdminStats {
  totalUsers:           number;
  premiumUsers:         number;
  totalContents:        number;
  publishedContents:    number;
  pendingContents:      number;
  totalViews:           number;
  recentPurchases30d:   number;
  revenueSimulated30d:  number;
  topPurchasedContents: { title: string; thumbnail: string; totalSales: number; totalRevenue: number }[];
}

export interface AdminContent {
  _id:         string;
  title:       string;
  thumbnail:   string;
  type:        'video' | 'audio';
  category:    string;
  accessType:  'free' | 'premium' | 'paid';
  isPublished: boolean;
  uploadedBy:    { _id: string; username: string };
  createdAt:   string;
}

export interface AdminUser {
  _id:       string;
  username:  string;
  email:     string;
  role:      'user' | 'premium' | 'provider' | 'admin';
  isPremium: boolean;
  isActive:  boolean;
  createdAt: string;
}

// ─── Hook stats ───────────────────────────────────────────────────────────────

export function useAdminStats() {
  const [stats,   setStats]   = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get('/admin/stats');
      setStats(data);
    } catch { setError('Impossible de charger les statistiques.'); }
    finally  { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);
  return { stats, loading, error, refresh: fetch };
}

// ─── Hook contenus admin ──────────────────────────────────────────────────────

export function useAdminContents(filter: 'all' | 'pending' | 'published' = 'all') {
  const [contents, setContents] = useState<AdminContent[]>([]);
  const [total,    setTotal]    = useState(0);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (filter === 'pending')   params.isPublished = 'false';
      if (filter === 'published') params.isPublished = 'true';
      const { data } = await apiClient.get('/admin/contents', { params });
      setContents(data.contents ?? []);
      setTotal(data.total ?? 0);
    } catch { setError('Impossible de charger les contenus.'); }
    finally  { setLoading(false); }
  }, [filter]);

  useEffect(() => { fetchList(); }, [fetchList]);

  const approve = useCallback(async (id: string): Promise<boolean> => {
    try {
      await apiClient.put(`/admin/contents/${id}`, { isPublished: true });
      setContents((prev) => prev.map((c) => c._id === id ? { ...c, isPublished: true } : c));
      return true;
    } catch { return false; }
  }, []);

  const reject = useCallback(async (id: string, reason: string): Promise<boolean> => {
    try {
      await apiClient.put(`/admin/contents/${id}`, { isPublished: false, rejectionReason: reason });
      setContents((prev) => prev.filter((c) => c._id !== id));
      return true;
    } catch { return false; }
  }, []);

  const remove = useCallback(async (id: string): Promise<boolean> => {
    try {
      await apiClient.delete(`/admin/contents/${id}`);
      setContents((prev) => prev.filter((c) => c._id !== id));
      setTotal((prev) => prev - 1);
      return true;
    } catch { return false; }
  }, []);

  return { contents, total, loading, error, refresh: fetchList, approve, reject, remove };
}

// ─── Hook users admin ─────────────────────────────────────────────────────────

export function useAdminUsers() {
  const [users,   setUsers]   = useState<AdminUser[]>([]);
  const [total,   setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get('/admin/users', { params: { limit: 50 } });
      setUsers(data.users ?? []);
      setTotal(data.total ?? 0);
    } catch { setError('Impossible de charger les utilisateurs.'); }
    finally  { setLoading(false); }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const toggleActive = useCallback(async (id: string, isActive: boolean): Promise<boolean> => {
    try {
      await apiClient.put(`/admin/users/${id}`, { isActive });
      setUsers((prev) => prev.map((u) => u._id === id ? { ...u, isActive } : u));
      return true;
    } catch { return false; }
  }, []);

  return { users, total, loading, error, refresh: fetchUsers, toggleActive };
}
