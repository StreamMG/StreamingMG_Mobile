/**
 * hooks/useContentDetail.ts
 *
 * Données complètes pour l'écran de détail d'un contenu.
 * Gère : métadonnées, droits d'accès, leçons tutoriel, progression.
 */

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/apiClient';
import { useAuthStore } from '@/stores/authStore';
import { formatError } from '@/lib/errorFormatter';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Lesson {
  index: number;
  title: string;
  duration: number;
  thumbnail: string | null;
}

export interface ContentDetail {
  _id: string;
  title: string;
  description: string;
  type: 'video' | 'audio';
  category: string;
  thumbnail: string;
  duration: number;
  accessType: 'free' | 'premium' | 'paid';
  price: number | null;
  isTutorial: boolean;
  artist: string | null;
  album: string | null;
  language: string | null;
  viewCount: number;
  provider: { _id: string; username: string };
  createdAt: string;
  // Rating — champs futurs optionnels
  rating?: number | null;
  ratingCount?: number | null;
}

export interface TutorialData {
  totalLessons: number;
  lessons: Lesson[];
  percentComplete: number;       // 0 si non connecté
  completedLessons: number[];    // indices complétés
  lastLessonIndex: number;       // -1 si pas commencé
}

export type AccessStatus =
  | 'granted'              // accès libre ou droits confirmés
  | 'login_required'       // visiteur
  | 'subscription_required'
  | 'purchase_required'
  | 'loading'
  | 'error';

interface UseContentDetailReturn {
  content: ContentDetail | null;
  tutorial: TutorialData | null;
  accessStatus: AccessStatus;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useContentDetail(id: string): UseContentDetailReturn {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user            = useAuthStore((s) => s.user);

  const [content,      setContent]      = useState<ContentDetail | null>(null);
  const [tutorial,     setTutorial]     = useState<TutorialData | null>(null);
  const [accessStatus, setAccessStatus] = useState<AccessStatus>('loading');
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);

const fetchDetail = useCallback(async () => {
  if (!id) return;
  setLoading(true);
  setError(null);

  try {
    // MODIFICATION ICI : On déstructure "data" de la réponse Axios, 
    // puis on récupère la propriété interne (ex: "content" ou "data")
    const response = await apiClient.get<{ content: ContentDetail }>(`/contents/${id}`);
    
    // On récupère l'objet réel. 
    // Si ton API renvoie { data: { contents: {...} } }, utilise response.data.contents
    const detail = response.data.content; 
    // console.log("-- - - - - - - - - - - -  - - - - ----")
    // console.log(response.data)

    if (!detail) {
        throw new Error("Format de données invalide");
    }

    setContent(detail);

    // Le reste du code utilise "detail", donc il reste inchangé
    const access = resolveAccessStatus(detail, isAuthenticated, user);
    setAccessStatus(access);

      // 3. Leçons tutoriel — seulement si tutoriel ET accès probable
      if (detail.isTutorial && access === 'granted') {
        try {
          const { data: lessonData } = await apiClient.get(`/contents/${id}/lessons`);
          let percentComplete  = 0;
          let completedLessons: number[] = [];
          let lastLessonIndex  = -1;

          // Progression — seulement si connecté
          if (isAuthenticated) {
            try {
              const { data: progressData } = await apiClient.get('/tutorial/progress');
              const found = (progressData.inProgress ?? []).find(
                (p: any) => p.contentId?._id === id || p.contentId === id
              );
              if (found) {
                percentComplete  = found.percentComplete ?? 0;
                completedLessons = found.completedLessons ?? [];
                lastLessonIndex  = found.lastLessonIndex ?? -1;
              }
            } catch {
              // Silencieux — progression non disponible
            }
          }

          setTutorial({
            totalLessons:    lessonData.totalLessons,
            lessons:         lessonData.lessons,
            percentComplete,
            completedLessons,
            lastLessonIndex,
          });
        } catch (e: any) {
          // 403 sur /lessons → access gate géré par l'intercepteur
          // On ne bloque pas le reste de l'écran
        }
      }

      // 4. Incrémenter vues (fire & forget)
      apiClient.post(`/contents/${id}/view`).catch(() => {});

    } catch (e: any) {
      setError(formatError(e, 'Impossible de charger le contenu.'));
    } finally {
      setLoading(false);
    }
  }, [id, isAuthenticated, user]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  return { content, tutorial, accessStatus, loading, error, refresh: fetchDetail };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveAccessStatus(
  content: ContentDetail,
  isAuthenticated: boolean,
  user: any
): AccessStatus {
  if (content.accessType === 'free') return 'granted';

  if (!isAuthenticated) return 'login_required';

  if (content.accessType === 'premium') {
    return user?.isPremium ? 'granted' : 'subscription_required';
  }

  // 'paid' — le backend valide les achats, ici on affiche l'écran d'achat
  // L'intercepteur 403 prend le relais si l'utilisateur tente de lancer la lecture
  return 'purchase_required';
}
