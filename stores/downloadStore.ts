/**
 * stores/downloadStore.ts
 *
 * Gère :
 *  - La liste des contenus téléchargés (hors-ligne)
 *  - L'état de progression des téléchargements en cours
 *
 * Stockage persistant : expo-secure-store pour les clés AES
 * Fichiers chiffrés   : FileSystem.documentDirectory/offline/<id>.enc
 *
 * Utilisé par :
 *   app/download/[id].tsx   → setProgress, markComplete, markError
 *   app/offline.tsx         → downloads, removeDownload
 *   components/content/ContentCard → isDownloaded (futur badge)
 */

import { create } from 'zustand';
import * as FileSystem from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';

// ─── Types ────────────────────────────────────────────────────────────────────

export type DownloadStatus = 'pending' | 'downloading' | 'complete' | 'error';

export interface DownloadedContent {
  contentId:   string;
  title:       string;
  thumbnail:   string;
  type:        'video' | 'audio';
  duration:    number;
  filePath:    string;   // chemin local chiffré
  downloadedAt:string;
}

export interface ActiveDownload {
  contentId:  string;
  title:      string;
  status:     DownloadStatus;
  progress:   number;   // 0–100
  error?:     string;
}

interface DownloadState {
  downloads:       DownloadedContent[];
  activeDownloads: Record<string, ActiveDownload>;

  // Lecture
  isDownloaded:    (contentId: string) => boolean;
  getFilePath:     (contentId: string) => string;

  // Actions download
  startDownload:   (contentId: string, title: string) => void;
  setProgress:     (contentId: string, progress: number) => void;
  markComplete:    (content: DownloadedContent) => void;
  markError:       (contentId: string, error: string) => void;
  cancelDownload:  (contentId: string) => void;

  // Gestion bibliothèque
  removeDownload:  (contentId: string) => Promise<void>;
  loadDownloads:   () => Promise<void>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const OFFLINE_DIR = `${FileSystem.documentDirectory}offline/`;
const STORE_KEY   = 'streamMG_downloads';

function getFilePath(contentId: string) {
  return `${OFFLINE_DIR}${contentId}.enc`;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useDownloadStore = create<DownloadState>((set, get) => ({
  downloads:       [],
  activeDownloads: {},

  isDownloaded: (contentId) =>
    get().downloads.some((d) => d.contentId === contentId),

  getFilePath: (contentId) => getFilePath(contentId),

  startDownload: (contentId, title) =>
    set((state) => ({
      activeDownloads: {
        ...state.activeDownloads,
        [contentId]: { contentId, title, status: 'pending', progress: 0 },
      },
    })),

  setProgress: (contentId, progress) =>
    set((state) => ({
      activeDownloads: {
        ...state.activeDownloads,
        [contentId]: {
          ...state.activeDownloads[contentId],
          status: 'downloading',
          progress,
        },
      },
    })),

  markComplete: (content) => {
    set((state) => {
      const { [content.contentId]: _, ...rest } = state.activeDownloads;
      const existing = state.downloads.filter((d) => d.contentId !== content.contentId);
      const updated  = [...existing, content];

      // Persister la liste
      SecureStore.setItemAsync(STORE_KEY, JSON.stringify(updated)).catch(() => {});

      return { downloads: updated, activeDownloads: rest };
    });
  },

  markError: (contentId, error) =>
    set((state) => ({
      activeDownloads: {
        ...state.activeDownloads,
        [contentId]: { ...state.activeDownloads[contentId], status: 'error', error },
      },
    })),

  cancelDownload: (contentId) =>
    set((state) => {
      const { [contentId]: _, ...rest } = state.activeDownloads;
      return { activeDownloads: rest };
    }),

  removeDownload: async (contentId) => {
    // Supprimer le fichier chiffré
    const path = getFilePath(contentId);
    await FileSystem.deleteAsync(path, { idempotent: true }).catch(() => {});

    // Supprimer la clé AES
    await SecureStore.deleteItemAsync(`aes_${contentId}`).catch(() => {});

    set((state) => {
      const updated = state.downloads.filter((d) => d.contentId !== contentId);
      SecureStore.setItemAsync(STORE_KEY, JSON.stringify(updated)).catch(() => {});
      return { downloads: updated };
    });
  },

  loadDownloads: async () => {
    try {
      const raw = await SecureStore.getItemAsync(STORE_KEY);
      if (raw) {
        const downloads: DownloadedContent[] = JSON.parse(raw);
        set({ downloads });
      }
    } catch {
      // Silencieux — bibliothèque vide
    }
  },
}));
