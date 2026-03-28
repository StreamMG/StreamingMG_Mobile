/**
 * hooks/useExploreData.ts
 *
 * Gère les filtres de l'écran Explorer :
 *   type → category → subCategory
 *
 * Routes : GET /contents avec params type, category, subCategory, page, limit
 *
 * Importe  : apiClient, ContentItem
 * Utilisé par : app/(tabs)/explore.tsx
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '@/lib/apiClient';
import type { ContentItem } from '@/components/content/ContentCard';

// ─── Types ────────────────────────────────────────────────────────────────────

export type MediaType = 'video' | 'audio';

export type Category =
  | 'film'
  | 'musique'
  | 'podcast'
  | 'tutoriel'
  | 'documentaire'
  | 'tantara';

// Catégories disponibles selon le type sélectionné
export const CATEGORIES_BY_TYPE: Record<MediaType, Category[]> = {
  video: ['film', 'musique', 'documentaire', 'podcast', 'tutoriel'],
  audio: ['musique', 'podcast', 'tantara'],
};

// Sous-catégories disponibles selon la catégorie
export const SUBCATEGORIES_BY_CATEGORY: Partial<Record<Category, string[]>> = {
  musique: ['salegy', 'hira-gasy', 'tsapiky', 'beko'],
  podcast: ['tantara'],
};

export interface ExploreFilters {
  type:        MediaType | null;
  category:    Category | null;
  subCategory: string | null;
}

interface UseExploreDataReturn {
  contents:   ContentItem[];
  loading:    boolean;
  loadingMore:boolean;
  error:      string | null;
  hasMore:    boolean;
  filters:    ExploreFilters;
  setType:        (type: MediaType | null) => void;
  setCategory:    (category: Category | null) => void;
  setSubCategory: (sub: string | null) => void;
  loadMore:   () => void;
  refresh:    () => void;
}

const PAGE_SIZE = 20;

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useExploreData(): UseExploreDataReturn {
  const [filters, setFilters] = useState<ExploreFilters>({
    type:        null,
    category:    null,
    subCategory: null,
  });

  const [contents,    setContents]    = useState<ContentItem[]>([]);
  const [page,        setPage]        = useState(1);
  const [hasMore,     setHasMore]     = useState(true);
  const [loading,     setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  // Ref pour éviter les appels en double
  const fetchingRef = useRef(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchPage = useCallback(async (
    currentFilters: ExploreFilters,
    currentPage: number,
    append: boolean,
  ) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    if (append) setLoadingMore(true);
    else        setLoading(true);
    setError(null);

    try {
      const params: Record<string, string | number> = {
        page:  currentPage,
        limit: PAGE_SIZE,
      };
      if (currentFilters.type)        params.type        = currentFilters.type;
      if (currentFilters.category)    params.category    = currentFilters.category;
      if (currentFilters.subCategory) params.subCategory = currentFilters.subCategory;

      const { data } = await apiClient.get('/contents', { params });
      const items: ContentItem[] = data.contents ?? [];

      setContents((prev) => append ? [...prev, ...items] : items);
      setHasMore(currentPage < (data.pages ?? 1));
    } catch {
      setError('Impossible de charger les contenus.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      fetchingRef.current = false;
    }
  }, []);

  // ── Reset + fetch au changement de filtres ─────────────────────────────────

  useEffect(() => {
    setContents([]);
    setPage(1);
    setHasMore(true);
    fetchPage(filters, 1, false);
  }, [filters, fetchPage]);

  // ── Actions filtres ────────────────────────────────────────────────────────

  const setType = useCallback((type: MediaType | null) => {
    setFilters({ type, category: null, subCategory: null });
  }, []);

  const setCategory = useCallback((category: Category | null) => {
    setFilters((prev) => ({ ...prev, category, subCategory: null }));
  }, []);

  const setSubCategory = useCallback((subCategory: string | null) => {
    setFilters((prev) => ({ ...prev, subCategory }));
  }, []);

  // ── Pagination ─────────────────────────────────────────────────────────────

  const loadMore = useCallback(() => {
    if (!hasMore || loadingMore || loading) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchPage(filters, nextPage, true);
  }, [hasMore, loadingMore, loading, page, filters, fetchPage]);

  const refresh = useCallback(() => {
    setContents([]);
    setPage(1);
    setHasMore(true);
    fetchPage(filters, 1, false);
  }, [filters, fetchPage]);

  return {
    contents, loading, loadingMore, error, hasMore,
    filters, setType, setCategory, setSubCategory,
    loadMore, refresh,
  };
}
