/**
 * hooks/useHistory.ts
 *
 * Historique de lecture de l'utilisateur.
 * Route : GET /history
 *
 * Utilisé par : app/history.tsx
 */

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/apiClient';

export interface HistoryItem {
  _id:      string;
  content: {
    _id:       string;
    title:     string;
    thumbnail: string;
    type:      'video' | 'audio';
    duration:  number;
  };
  progress:   number;   // secondes
  completed:  boolean;
  watchedAt:  string;
}

interface UseHistoryReturn {
  history:  HistoryItem[];
  loading:  boolean;
  error:    string | null;
  refresh:  () => void;
}

export function useHistory(): UseHistoryReturn {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get('/history');
      setHistory(data.history ?? []);
    } catch {
      setError('Impossible de charger l\'historique.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  return { history, loading, error, refresh: fetchHistory };
}
