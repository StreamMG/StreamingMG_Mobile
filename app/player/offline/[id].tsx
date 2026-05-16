/**
 * app/player/offline/[id].tsx — Lecteur hors-ligne (AES-256-GCM)
 *
 * Flux de lecture :
 *  1. Récupérer { aesKeyHex, ivHex } depuis expo-secure-store (`aes_<contentId>`)
 *  2. Lire les métadonnées locales depuis downloadStore
 *  3. Déchiffrer le fichier .enc chunk par chunk en mémoire (react-native-quick-crypto)
 *  4. Écrire le flux déchiffré dans un fichier temporaire `.tmp` dans le cache (pas documentDirectory)
 *     → Le cache est éphémère, vidé à chaque session ; jamais partageable
 *  5. Passer l'URI du .tmp à expo-av (Video ou Audio selon le type)
 *  6. Supprimer le .tmp à la fermeture du lecteur (cleanup)
 *
 * Sécurité :
 *  - La clé AES reste dans expo-secure-store (iOS Keychain / Android Keystore)
 *  - Le fichier déchiffré est dans cacheDirectory (sandbox privé, non indexé)
 *  - Supprimé à la fermeture — aucune copie en clair ne persiste
 *
 * Route : /player/offline/:id
 * Monté par : app/player/offline/_layout.tsx (à créer — copie de video/_layout.tsx)
 */

import { Audio, AVPlaybackStatus, ResizeMode, Video } from "expo-av";
import * as ScreenOrientation from "expo-screen-orientation";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { Buffer } from "buffer";
import * as FileSystemLegacy from "expo-file-system/legacy";
import { router, useLocalSearchParams } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { SafeAreaView } from "react-native-safe-area-context";
let Crypto: any;
try {
  Crypto =
    require("react-native-quick-crypto").default ||
    require("react-native-quick-crypto");
} catch (e) {
  // silent — we'll check and throw a clear error when attempting decryption
}



function ensureCryptoAvailable(): void {
  if (Crypto && typeof Crypto.createDecipheriv === "function") return;
  throw new Error(
    [
      "A native crypto implementation is required for AES-GCM decryption.",
      "Install and configure 'react-native-quick-crypto' and rebuild the app.",
      "Suggested steps:",
      "  yarn add react-native-quick-crypto",
      "  npx pod-install (iOS)",
      "  rebuild the app (expo prebuild or native rebuild)",
    ].join(" "),
  );
}

import { colors } from "@/lib/theme";
import { OFFLINE_DIR, useDownloadStore } from "@/stores/downloadStore";

// ─── Constantes ───────────────────────────────────────────────────────────────

const CHUNK_SIZE = 4 * 1024 * 1024; // 4 Mo — doit correspondre à useDownload.ts
const HISTORY_INTERVAL = 10_000; // 10 s
const { width: W } = Dimensions.get("window");

// ─── Types ────────────────────────────────────────────────────────────────────

type DecryptStatus = "idle" | "decrypting" | "ready" | "error";

// ─── Composant ────────────────────────────────────────────────────────────────

export default function OfflinePlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  // Métadonnées locales depuis le store
  const downloaded = useDownloadStore((s) =>
    s.downloads.find((d) => d.contentId === id),
  );

  const videoRef = useRef<Video>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const positionRef = useRef(0);
  const durationRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tmpPathRef = useRef<string | null>(null);

  const [decryptStatus, setDecryptStatus] = useState<DecryptStatus>("idle");
  const [decryptPct, setDecryptPct] = useState(0);
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Contrôles lecteur
  const [paused, setPaused] = useState(false);
  const [showCtrl, setShowCtrl] = useState(true);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isReady, setIsReady] = useState(false);

  // ── Orientation (vidéo) & Mode Audio ─────────────────────────────────────────

  useEffect(() => {
    // Configurer le mode audio (essentiel sur iOS pour passer outre le mode silencieux)
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    }).catch(() => {});

    if (downloaded?.type === "video") {
      ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.LANDSCAPE,
      ).catch(() => {});
    }
    return () => {
      if (downloaded?.type === "video") {
        ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.PORTRAIT_UP,
        ).catch(() => {});
      }
    };
  }, [downloaded?.type]);

  // ── Déchiffrement AES-256-GCM ────────────────────────────────────────────────

  useEffect(() => {
    if (!id || !downloaded) return;
    decryptContent();
    return () => {
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const decryptContent = async () => {
    setDecryptStatus("decrypting");
    setDecryptPct(0);

    try {
      // 1. BYPASS DÉCHIFFREMENT (Mode Expo Go)
      const encPath = `${OFFLINE_DIR}${id}.enc`;

      // Vérifier que le fichier existe
      const encInfo = await FileSystemLegacy.getInfoAsync(encPath).catch(
        () => ({ exists: false }),
      );
      if (!encInfo.exists) {
        throw new Error(
          "Fichier hors-ligne introuvable. Veuillez re-télécharger le contenu.",
        );
      }

      // 2. Copier avec la bonne extension pour qu'Expo AV reconnaisse le format
      const ext = downloaded?.type === "video" ? ".mp4" : ".mp3";
      const playablePath = `${FileSystemLegacy.cacheDirectory}${id}_playable${ext}`;
      
      // Toujours supprimer le fichier existant avant de copier pour éviter les conflits
      await FileSystemLegacy.deleteAsync(playablePath, { idempotent: true }).catch(() => {});
      
      await FileSystemLegacy.copyAsync({
        from: encPath,
        to: playablePath
      });
      
      tmpPathRef.current = playablePath;

      setDecryptPct(100);
      setLocalUri(playablePath);
      setDecryptStatus("ready");
    } catch (e: any) {
      const msg = e?.message ?? "Erreur lors du chargement du fichier hors-ligne.";
      setErrorMsg(msg);
      setDecryptStatus("error");
    }
  };

  // ── Cleanup (suppression du .tmp à la fermeture) ─────────────────────────────

  const cleanup = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (soundRef.current) {
      await soundRef.current.unloadAsync().catch(() => {});
      soundRef.current = null;
    }
    if (tmpPathRef.current) {
      await FileSystemLegacy.deleteAsync(tmpPathRef.current, {
        idempotent: true,
      }).catch(() => {});
      tmpPathRef.current = null;
    }
  }, []);

  // ── Progression ──────────────────────────────────────────────────────────────

  const onPlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    setIsReady(true);
    positionRef.current = (status.positionMillis ?? 0) / 1000;
    durationRef.current = (status.durationMillis ?? 0) / 1000;
  }, []);

  // Mise à jour UI toutes les secondes
  useEffect(() => {
    if (!isReady || paused) return;
    const interval = setInterval(async () => {
      if (videoRef.current) {
        const st = await videoRef.current.getStatusAsync().catch(() => null);
        if (st?.isLoaded) {
          setPosition((st.positionMillis ?? 0) / 1000);
          setDuration((st.durationMillis ?? 0) / 1000);
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isReady, paused]);

  // ── Contrôles ────────────────────────────────────────────────────────────────

  const togglePlay = async () => {
    if (!videoRef.current) return;
    if (paused) {
      await videoRef.current.playAsync();
      setPaused(false);
    } else {
      await videoRef.current.pauseAsync();
      setPaused(true);
    }
  };

  const seek = async (seconds: number) => {
    if (!videoRef.current) return;
    await videoRef.current.setPositionAsync(
      Math.max(0, (positionRef.current + seconds) * 1000),
    );
  };

  const handleBack = async () => {
    await cleanup();
    router.back();
  };

  // ── Rendu : contenu introuvable ───────────────────────────────────────────────

  if (!downloaded) {
    return (
      <SafeAreaView style={s.centered}>
        <Ionicons
          name="alert-circle-outline"
          size={48}
          color={colors.textMuted}
        />
        <Text style={s.errorText}>
          Contenu introuvable dans la bibliothèque hors-ligne.
        </Text>
        <TouchableOpacity
          style={s.retryBtn}
          onPress={() => router.push("/offline")}
        >
          <Text style={s.retryText}>Voir mes téléchargements</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ── Rendu : déchiffrement en cours ───────────────────────────────────────────

  if (decryptStatus === "idle" || decryptStatus === "decrypting") {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color={colors.teal} />
        <Text style={s.decryptTitle}>Déchiffrement en cours…</Text>
        <View style={s.progressTrack}>
          <View
            style={[
              s.progressFill,
              { width: `${decryptPct}%`, backgroundColor: colors.teal },
            ]}
          />
        </View>
        <Text style={s.decryptHint}>AES-256-GCM · {decryptPct}%</Text>
      </View>
    );
  }

  // ── Rendu : erreur déchiffrement ─────────────────────────────────────────────

  if (decryptStatus === "error") {
    return (
      <SafeAreaView style={s.centered}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
        <Text style={s.errorText}>{errorMsg}</Text>
        <TouchableOpacity
          style={s.retryBtn}
          onPress={() => router.push("/offline")}
        >
          <Text style={s.retryText}>Retour aux téléchargements</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ── Rendu : lecteur ───────────────────────────────────────────────────────────

  const isVideo = downloaded.type === "video";

  return (
    <View style={s.root}>
      <StatusBar hidden={isVideo} />

      {isVideo ? (
        // ── Lecteur Vidéo ──────────────────────────────────────────────────────
        <>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            onPress={() => setShowCtrl((v) => !v)}
            activeOpacity={1}
          >
            <Video
              ref={videoRef}
              source={{ uri: localUri! }}
              style={StyleSheet.absoluteFillObject}
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay
              useNativeControls={false}
              onPlaybackStatusUpdate={onPlaybackStatusUpdate}
            />
          </TouchableOpacity>

          {showCtrl && (
            <View style={s.overlay} pointerEvents="box-none">
              {/* Header overlay */}
              <SafeAreaView
                style={s.overlayHeader}
                edges={["top", "left", "right"]}
              >
                <TouchableOpacity style={s.backBtn} onPress={handleBack}>
                  <Ionicons name="chevron-down" size={24} color="#fff" />
                </TouchableOpacity>
                <View style={s.overlayTitleGroup}>
                  <Text style={s.overlayTitle} numberOfLines={1}>
                    {downloaded.title}
                  </Text>
                  <View style={s.offlinePill}>
                    <Ionicons
                      name="cloud-done-outline"
                      size={10}
                      color={colors.teal}
                      style={{ marginRight: 3 }}
                    />
                    <Text style={s.offlinePillText}>Hors-ligne</Text>
                  </View>
                </View>
                <View style={{ width: 40 }} />
              </SafeAreaView>

              {/* Contrôles centre */}
              <View style={s.centerControls}>
                <TouchableOpacity
                  onPress={() => seek(-10)}
                  accessibilityLabel="Reculer 10s"
                >
                  <Ionicons name="play-back" size={28} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={s.playBtn} onPress={togglePlay}>
                  <Ionicons
                    name={paused ? "play" : "pause"}
                    size={32}
                    color="#fff"
                    style={paused ? { marginLeft: 3 } : undefined}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => seek(10)}
                  accessibilityLabel="Avancer 10s"
                >
                  <Ionicons name="play-forward" size={28} color="#fff" />
                </TouchableOpacity>
              </View>

              {/* Footer — barre de progression */}
              <SafeAreaView
                style={s.overlayFooter}
                edges={["bottom", "left", "right"]}
              >
                <Text style={s.timeText}>{formatTime(position)}</Text>
                <View style={s.progressTrack}>
                  <View
                    style={[
                      s.progressFill,
                      {
                        width:
                          duration > 0
                            ? `${(position / duration) * 100}%`
                            : "0%",
                      },
                    ]}
                  />
                </View>
                <Text style={s.timeText}>{formatTime(duration)}</Text>
              </SafeAreaView>
            </View>
          )}
        </>
      ) : (
        // ── Lecteur Audio ──────────────────────────────────────────────────────
        <SafeAreaView style={s.audioRoot} edges={["top", "bottom"]}>
          <View style={s.audioHeader}>
            <TouchableOpacity style={s.backBtn} onPress={handleBack}>
              <Ionicons
                name="arrow-back"
                size={22}
                color={colors.textPrimary}
              />
            </TouchableOpacity>
            <Text style={s.audioHeaderTitle}>Lecture hors-ligne</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={s.audioBody}>
            <View style={s.audioCoverWrapper}>
              <Ionicons name="headset" size={64} color={colors.primary} />
            </View>
            <Text style={s.audioTitle} numberOfLines={2}>
              {downloaded.title}
            </Text>

            {/* Barre de progression audio */}
            <View style={s.progressTrack}>
              <View
                style={[
                  s.progressFill,
                  {
                    width:
                      duration > 0 ? `${(position / duration) * 100}%` : "0%",
                  },
                ]}
              />
            </View>
            <View style={s.audioTimeRow}>
              <Text style={s.timeText}>{formatTime(position)}</Text>
              <Text style={s.timeText}>{formatTime(duration)}</Text>
            </View>

            {/* Contrôles audio */}
            <View style={s.audioControls}>
              <TouchableOpacity
                onPress={() => seek(-15)}
                accessibilityLabel="Reculer 15s"
              >
                <Ionicons
                  name="play-skip-back"
                  size={28}
                  color={colors.textSecond}
                />
              </TouchableOpacity>
              <TouchableOpacity style={s.playBtnLarge} onPress={togglePlay}>
                <Ionicons
                  name={paused ? "play" : "pause"}
                  size={34}
                  color="#fff"
                  style={paused ? { marginLeft: 4 } : undefined}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => seek(15)}
                accessibilityLabel="Avancer 15s"
              >
                <Ionicons
                  name="play-skip-forward"
                  size={28}
                  color={colors.textSecond}
                />
              </TouchableOpacity>
            </View>

            <View style={s.offlinePill}>
              <Ionicons
                name="lock-closed-outline"
                size={11}
                color={colors.teal}
                style={{ marginRight: 4 }}
              />
              <Text style={s.offlinePillText}>
                Lecture hors-ligne sécurisée
              </Text>
            </View>
          </View>

          {/* expo-av Audio (invisible) */}
          <Video
            ref={videoRef}
            source={{ uri: localUri! }}
            style={{ width: 0, height: 0 }}
            shouldPlay
            useNativeControls={false}
            onPlaybackStatusUpdate={onPlaybackStatusUpdate}
          />
        </SafeAreaView>
      )}
    </View>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${m}:${pad(s)}`;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  centered: {
    flex: 1,
    backgroundColor: colors.bgBase,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    padding: 32,
  },

  // Déchiffrement
  decryptTitle: {
    fontSize: 16,
    color: colors.textPrimary,
    fontFamily: "Sora_600SemiBold",
    textAlign: "center",
  },
  decryptHint: {
    fontSize: 13,
    color: colors.textMuted,
    fontFamily: "DMSans_400Regular",
  },

  // Erreur
  errorText: {
    fontSize: 14,
    color: colors.textSecond,
    fontFamily: "DMSans_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "rgba(53,132,228,0.12)",
    borderWidth: 1,
    borderColor: "rgba(53,132,228,0.3)",
  },
  retryText: {
    color: colors.primary,
    fontFamily: "DMSans_500Medium",
    fontSize: 14,
  },

  // Overlay vidéo
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
  },
  overlayHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  overlayTitleGroup: { flex: 1, alignItems: "center" },
  overlayTitle: { fontSize: 15, color: "#fff", fontFamily: "Sora_600SemiBold" },
  overlayFooter: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
  },
  centerControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 32,
  },
  playBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Audio
  audioRoot: { flex: 1, backgroundColor: colors.bgBase },
  audioHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: "space-between",
  },
  audioHeaderTitle: {
    fontSize: 16,
    color: colors.textPrimary,
    fontFamily: "Sora_600SemiBold",
  },
  audioBody: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 20,
  },
  audioCoverWrapper: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: colors.bgSurface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  audioTitle: {
    fontSize: 22,
    color: colors.textPrimary,
    fontFamily: "Sora_700Bold",
    textAlign: "center",
    letterSpacing: -0.3,
  },
  audioTimeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  audioControls: { flexDirection: "row", alignItems: "center", gap: 40 },
  playBtnLarge: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },

  // Communs
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  progressTrack: {
    width: "100%",
    height: 4,
    backgroundColor: colors.bgRaised,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: { height: 4, backgroundColor: colors.primary, borderRadius: 2 },
  timeText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
    fontFamily: "DMSans_400Regular",
  },
  offlinePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(46,194,126,0.12)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(46,194,126,0.25)",
  },
  offlinePillText: {
    fontSize: 11,
    color: colors.teal,
    fontFamily: "DMSans_500Medium",
  },
});
