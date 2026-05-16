/**
 * stores/downloadStore.ts
 *
 * Gère :
 *  - La liste des contenus téléchargés (hors-ligne)
 *  - L'état de progression des téléchargements en cours
 *
 * Stockage persistant : expo-secure-store
 *   - Clés AES par contenu : `aes_<contentId>`
 *   - Index des téléchargements : STORE_KEY
 *
 * Fichiers chiffrés : FileSystem.documentDirectory + "offline/<id>.enc"
 *
 * Utilisé par :
 *   app/download/[id].tsx   → setProgress, markComplete, markError
 *   app/offline.tsx         → downloads, removeDownload
 *   app/content/[id].tsx    → isDownloaded (badge + bouton hors-ligne)
 */

import Constants from "expo-constants";

import * as FileSystemLegacy from "expo-file-system/legacy";
import * as SecureStore from "expo-secure-store";
import { create } from "zustand";

// ─── Constantes ───────────────────────────────────────────────────────────────

/**
 * Clé fixe pour l'index des téléchargements dans SecureStore.
 * NE PAS utiliser process.env ici — SecureStore est local à l'appareil,
 * la valeur est déterministe et ne doit pas changer entre builds.
 */
const STORE_KEY = "streamMG_downloads_v1";

/**
 * Répertoire où sont stockés les fichiers .enc chiffrés.
 * FileSystem.documentDirectory est garanti non-null sur iOS & Android.
 */
export const OFFLINE_DIR = `${FileSystemLegacy.documentDirectory}offline/`;

// ─── Types ────────────────────────────────────────────────────────────────────

export type DownloadStatus = "pending" | "downloading" | "complete" | "error";

export interface DownloadedContent {
  contentId: string;
  title: string;
  thumbnail: string;
  type: "video" | "audio";
  duration: number;
  filePath: string; // chemin absolu vers le .enc chiffré
  downloadedAt: string; // ISO 8601
}

export interface ActiveDownload {
  contentId: string;
  title: string;
  status: DownloadStatus;
  progress: number; // 0–100
  error?: string;
}

interface DownloadState {
  downloads: DownloadedContent[];
  activeDownloads: Record<string, ActiveDownload>;

  // Lecture
  isDownloaded: (contentId: string) => boolean;
  getFilePath: (contentId: string) => string;

  // Actions download
  startDownload: (contentId: string, title: string) => void;
  setProgress: (contentId: string, progress: number) => void;
  markComplete: (content: DownloadedContent) => void;
  markError: (contentId: string, error: string) => void;
  cancelDownload: (contentId: string) => void;

  // Gestion bibliothèque
  removeDownload: (contentId: string) => Promise<void>;
  loadDownloads: () => Promise<void>;
}

// ─── Helper interne ───────────────────────────────────────────────────────────

function buildFilePath(contentId: string): string {
  return `${OFFLINE_DIR}${contentId}.enc`;
}

async function persistDownloads(downloads: DownloadedContent[]): Promise<void> {
  try {
    await SecureStore.setItemAsync(STORE_KEY, JSON.stringify(downloads));
  } catch {
    // Silencieux — la liste en mémoire reste cohérente
  }
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useDownloadStore = create<DownloadState>((set, get) => ({
  downloads: [],
  activeDownloads: {},

  isDownloaded: (contentId) =>
    get().downloads.some((d) => d.contentId === contentId),

  getFilePath: (contentId) => buildFilePath(contentId),

  startDownload: (contentId, title) =>
    set((state) => ({
      activeDownloads: {
        ...state.activeDownloads,
        [contentId]: { contentId, title, status: "pending", progress: 0 },
      },
    })),

  setProgress: (contentId, progress) =>
    set((state) => ({
      activeDownloads: {
        ...state.activeDownloads,
        [contentId]: {
          ...state.activeDownloads[contentId],
          status: "downloading",
          progress,
        },
      },
    })),

  markComplete: (content) => {
    set((state) => {
      // Retirer du activeDownloads
      const { [content.contentId]: _removed, ...restActive } =
        state.activeDownloads;
      // Remplacer l'entrée si elle existe déjà (re-téléchargement)
      const existing = state.downloads.filter(
        (d) => d.contentId !== content.contentId,
      );
      const updated = [...existing, content];

      // Persister de façon asynchrone
      persistDownloads(updated);

      return { downloads: updated, activeDownloads: restActive };
    });
  },

  markError: (contentId, error) =>
    set((state) => ({
      activeDownloads: {
        ...state.activeDownloads,
        [contentId]: {
          ...state.activeDownloads[contentId],
          status: "error",
          error,
        },
      },
    })),

  cancelDownload: (contentId) =>
    set((state) => {
      const { [contentId]: _removed, ...rest } = state.activeDownloads;
      return { activeDownloads: rest };
    }),

  removeDownload: async (contentId) => {
    // 1. Supprimer le fichier .enc
    const path = buildFilePath(contentId);
    await FileSystemLegacy.deleteAsync(path, { idempotent: true }).catch(() => {});

    // 2. Supprimer la clé AES du SecureStore
    await SecureStore.deleteItemAsync(`aes_${contentId}`).catch(() => {});

    // 3. Mettre à jour le store et persister
    set((state) => {
      const updated = state.downloads.filter((d) => d.contentId !== contentId);
      persistDownloads(updated);
      return { downloads: updated };
    });
  },

  loadDownloads: async () => {
    try {
      const raw = await SecureStore.getItemAsync(STORE_KEY);
      if (raw) {
        const downloads: DownloadedContent[] = JSON.parse(raw);
        // Vérifier que les fichiers existent encore (effacement manuel, etc.)
        const verified = await Promise.all(
          downloads.map(async (d) => {
            const info = await FileSystemLegacy.getInfoAsync(d.filePath).catch(
              () => ({ exists: false }),
            );
            return info.exists ? d : null;
          }),
        );
        const valid = verified.filter(Boolean) as DownloadedContent[];
        // Nettoyer les clés AES orphelines
        const removed = downloads.filter(
          (d) => !valid.some((v) => v.contentId === d.contentId),
        );
        for (const d of removed) {
          await SecureStore.deleteItemAsync(`aes_${d.contentId}`).catch(
            () => {},
          );
        }
        if (valid.length !== downloads.length) {
          await persistDownloads(valid);
        }
        set({ downloads: valid });
      }
    } catch {
      // Silencieux — bibliothèque vide au démarrage
    }
  },
}));
