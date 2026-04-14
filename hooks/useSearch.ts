/**
 * hooks/useSearch.ts
 *
 * Recherche textuelle avec debounce 400ms.
 * Route : GET /contents?search=<query>&limit=30
 *
 * Utilisé par : app/(tabs)/search.tsx
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '@/lib/apiClient';
import type { ContentItem } from '@/components/content/ContentCard';

interface UseSearchReturn {
  query:      string;
  setQuery:   (q: string) => void;
  results:    ContentItem[];
  loading:    boolean;
  error:      string | null;
  hasSearched:boolean;
}

export function useSearch(): UseSearchReturn {
  const [query,       setQuery]       = useState('');
  const [results,     setResults]     = useState<ContentItem[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Annuler le timer précédent
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = query.trim();

    if (!trimmed) {
      setResults([]);
      setHasSearched(false);
      setLoading(false);
      return;
    }

    // Debounce 400ms
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await apiClient.get('/contents', {
          params: { search: trimmed, limit: 30 },
        });
        setResults(data.contents ?? []);
        setHasSearched(true);
      } catch {
        setError('Erreur lors de la recherche.');
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  return { query, setQuery, results, loading, error, hasSearched };
}
