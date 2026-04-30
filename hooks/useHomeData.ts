/**
 * hooks/useHomeData.ts
 *
 * Données de l'écran d'accueil — appels parallèles.
 *
 * Types alignés sur les composants existants :
 *  - ContentItem  (depuis @/components/content/ContentCard)
 *  - HeroContent  (depuis @/components/content/HeroBanner)
 *
 * Routes :
 *  GET /contents/featured  → HeroBanner
 *  GET /contents/trending  → Tendances
 *  GET /contents?accessType=free&limit=10 → Gratuit
 *  GET /contents?limit=10  → Derniers ajouts
 *  GET /tutorial/progress  → Tutoriels en cours (si connecté)
 */

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/apiClient';
import { useAuthStore } from '@/stores/authStore';
import type { ContentItem } from '@/components/content/ContentCard';
import type { HeroContent }  from '@/components/content/HeroBanner';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HomeData {
  featured:            HeroContent[];
  trending:            ContentItem[];
  free:                ContentItem[];
  newReleases:         ContentItem[];
  tutorialsInProgress: (ContentItem & { progress: number })[];
}

interface UseHomeDataReturn {
  data:     HomeData | null;
  loading:  boolean;
  error:    string | null;
  refresh:  () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useHomeData(): UseHomeDataReturn {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [data,    setData]    = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
// console.log("fetching home data - - - - - - - - --  -- - - - -")
    try {
      const [featuredRes, trendingRes, freeRes, newRes] = await Promise.all([
        apiClient.get('/contents/featured'),
        apiClient.get('/contents/trending'),
        apiClient.get('/contents', { params: { accessType: 'free', limit: 10 } }),
        apiClient.get('/contents', { params: { limit: 10 } }),
      ]);

      // Tutoriels en cours — seulement si connecté
      // console.log("data featyred- - - - - - - - - --  -- - - - - ieeeeee")
      // console.log(featuredRes.data.featured)""
      // console.log("- - - - - - - - - --  -- - - - -")

      let tutorialsInProgress: (ContentItem & { progress: number })[] = [];

      if (isAuthenticated) {
        try {
          const { data: progressData } = await apiClient.get('/tutorial/progress');
          const inProgress = (progressData.inProgress ?? []).filter(
            (p: any) => p.percentComplete > 0 && p.percentComplete < 100
          );

          if (inProgress.length > 0) {
            // Les données contentId sont déjà populées par l'API
            tutorialsInProgress = inProgress
              .slice(0, 8)
              .map((p: any) => ({
                // contentId est un objet populé { _id, title, thumbnail }
                _id:       p.contentId._id ?? p.contentId,
                title:     p.contentId.title ?? '',
                thumbnail: p.contentId.thumbnail ?? '',
                type:      'video' as const,
                category:  'tutoriel',
                duration:  0,
                accessType:'free' as const,
                isTutorial: true,
                progress:   Math.round(p.percentComplete),
              }));
          }
        } catch {
          // Silencieux — section masquée si erreur
        }
      }

      setData({
        featured:            featuredRes.data.featured  ?? [],
        trending:            trendingRes.data.trending  ?? [],
        free:                freeRes.data.contents      ?? [],
        newReleases:         newRes.data.contents       ?? [],
        tutorialsInProgress,
      });
    } catch (err) {
      console.error('Error fetching home data:', err);
      setError('Impossible de charger le contenu. Vérifiez votre connexion.');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { data, loading, error, refresh: fetchAll };
}
