import { apiClient } from "@/lib/apiClient";
import { BASE_URL } from "@/lib/theme";
import { useDownloadStore } from "@/stores/downloadStore";
import { Directory, File, Paths } from "expo-file-system";
import { createDownloadResumable, deleteAsync, moveAsync, DownloadResumable } from "expo-file-system/legacy";
import * as SecureStore from "expo-secure-store";
import { useCallback, useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UseDownloadReturn {
  start: (
    contentId: string,
    title: string,
    thumbnail: string,
    type: "video" | "audio",
    duration: number,
  ) => Promise<void>;
  cancel: () => void;
  progress: number;
  status: "idle" | "pending" | "downloading" | "complete" | "error";
  error: string | null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useDownload(): UseDownloadReturn {
  const {
    startDownload,
    setProgress,
    markComplete,
    markError,
    cancelDownload,
  } = useDownloadStore();

  const [progress, setLocalProgress] = useState(0);
  const [status, setStatus] = useState<UseDownloadReturn["status"]>("idle");
  const [error, setError] = useState<string | null>(null);

  // Référence vers l'objet de téléchargement (legacy DownloadResumable)
  const downloadTaskRef = useRef<DownloadResumable | null>(null);
  const currentIdRef = useRef<string | null>(null);

  const start = useCallback(
    async (
      contentId: string,
      title: string,
      thumbnail: string,
      type: "video" | "audio",
      duration: number,
    ) => {
      setStatus("pending");
      setError(null);
      setLocalProgress(0);
      startDownload(contentId, title);
      currentIdRef.current = contentId;

      try {
        // ── 1. Obtenir clé AES + URL signée ──────────────────────────────────
        const { data } = await apiClient.post(`/download/${contentId}`);
        const { aesKeyHex, ivHex, signedUrl } = data;

        console.log("[Download] AES Key (hex):", aesKeyHex);
        console.log("[Download] IV (hex):", ivHex);
        console.log("[Download] Signed URL:", signedUrl);

        // ── 2. Stocker la clé AES dans secure store ───────────────────────────
        await SecureStore.setItemAsync(
          `aes_${contentId}`,
          JSON.stringify({ aesKeyHex, ivHex }),
        );

        // ── 3. Préparer le répertoire offline (API moderne)
        const offlineDir = new Directory(Paths.document, 'offline');
        // Vérifier si le répertoire existe avant de le créer
        // L'API moderne Directory.create() rejette si le répertoire existe déjà
        if (!offlineDir.exists) {
          await offlineDir.create({ intermediates: true });
        }

        const tempFile = new File(offlineDir, `${contentId}.tmp`);
        const encFile = new File(offlineDir, `${contentId}.enc`);

        const tempPath = tempFile.uri;
        const encPath = encFile.uri;

        // ── 4. Télécharger le fichier ─────────────────────────────────────────
        setStatus("downloading");

        const fullUrl = signedUrl.startsWith("http")
          ? signedUrl
          : `${BASE_URL}${signedUrl}`;

          const downloadTask = createDownloadResumable(
          fullUrl,
          tempPath,
          {},
          (downloadProgress) => {
            const totalExpected = downloadProgress.totalBytesExpectedToWrite;
            const written = downloadProgress.totalBytesWritten;

            if (totalExpected > 0) {
              const pct = Math.round((written / totalExpected) * 100);
              setLocalProgress(pct);
              setProgress(contentId, pct);
            }
          },
        );

        downloadTaskRef.current = downloadTask;
        const result: any =
          await downloadTask.downloadAsync();

        if (!result || currentIdRef.current !== contentId) {
          // Annulé ou ID corrompu
          await deleteAsync(tempPath, { idempotent: true });
          return;
        }

        // ── 5. Chiffrement AES-256-GCM ────────────────────────────────────────
        // Note: Simulation du chiffrement par un renommage
        await moveAsync({ from: tempPath, to: encPath });

        // ── 6. Marquer comme complété ─────────────────────────────────────────
        markComplete({
          contentId,
          title,
          thumbnail,
          type,
          duration,
          filePath: encPath,
          downloadedAt: new Date().toISOString(),
        });

        setStatus("complete");
        setLocalProgress(100);
      } catch (e: any) {
        console.error("[Download Error]", e);
        const msg =
          e?.response?.status === 404
            ? "Fichier source introuvable. Le transcodage est peut-être en cours."
            : e?.response?.status === 409
              ? "Ce contenu est déjà téléchargé."
              : e?.response?.status === 403
                ? "Vous n'avez pas les droits pour télécharger ce contenu."
                : "Erreur lors du téléchargement. Réessayez.";

        setError(msg);
        setStatus("error");
        markError(contentId, msg);
      }
    },
    [startDownload, setProgress, markComplete, markError],
  );

  const cancel = useCallback(() => {
    if (downloadTaskRef.current) {
      // On utilise pauseAsync car cancelAsync n'est pas toujours dispo
      // selon les versions, ou on laisse simplement tomber la ref.
      downloadTaskRef.current.pauseAsync().catch(() => {});
      downloadTaskRef.current = null;
    }
    if (currentIdRef.current) {
      cancelDownload(currentIdRef.current);
      currentIdRef.current = null;
    }
    setStatus("idle");
    setLocalProgress(0);
  }, [cancelDownload]);

  return { start, cancel, progress, status, error };
}
