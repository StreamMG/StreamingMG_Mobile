/**
 * app/player/video/[id].tsx — Lecteur vidéo HLS (Mode Hybride Mobile)
 *
 * Flux :
 *   1. GET /hls/:id/token  → hlsUrl signé (10 min)
 *      Headers ajoutés : X-Platform: mobile, X-Device-Id: <deviceId>
 *      → Le backend génère un token avec platform='mobile' dans le payload
 *      → Le backend réécrit index.m3u8 pour apposer ?token= sur chaque .ts
 *      → Le middleware désactive la vérif IP/UA pour mobile (HMAC suffit)
 *   2. expo-av Video reçoit hlsUrl — lecture transparente sans cookie
 *   3. POST /history/:id toutes les 10s + à la fermeture
 *
 * Spec de référence : SPECIFICATION_HLS_HYBRIDE.md
 *
 * Importe  : apiClient, expo-device, theme
 * Monté par: app/player/video/_layout.tsx
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator,
  StyleSheet, StatusBar, Dimensions,
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as Device from 'expo-device';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '@/lib/apiClient';
import { BASE_URL } from '@/lib/theme';
import { colors } from '@/lib/theme';
import { formatError } from '@/lib/errorFormatter';

// ─── Constantes ───────────────────────────────────────────────────────────────

const HISTORY_INTERVAL_MS = 10_000;

/**
 * Identifiant stable de l'appareil pour le token HLS mobile.
 * expo-device.osBuildId est stable entre les sessions sur le même device.
 * Fallback sur un UUID généré si non disponible (simulateur).
 */
function getDeviceId(): string {
  return Device.osBuildId ?? Device.modelId ?? 'expo-simulator-' + Date.now();
}

// ─── Composant ────────────────────────────────────────────────────────────────

export default function VideoPlayerScreen() {
  const { id, lessonIndex } = useLocalSearchParams<{
    id:           string;
    lessonIndex?: string;
  }>();

  const videoRef     = useRef<Video>(null);
  const positionRef  = useRef(0);
  const durationRef  = useRef(0);
  const historyTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const [hlsUrl,   setHlsUrl]   = useState<string | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [paused,   setPaused]   = useState(false);
  const [showCtrl, setShowCtrl] = useState(true);
  const [title,    setTitle]    = useState('');
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isReady,  setIsReady]  = useState(false);

  // ── Orientation ──────────────────────────────────────────────────────────────

  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    };
  }, []);

  // ── Chargement token HLS ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!id) return;
    loadToken();
  }, [id]);

  const loadToken = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Métadonnées
      const { data: detail } = await apiClient.get(`/contents/${id}`);
      setTitle(detail.title);

      // 2. Token HLS — headers hybrides mobile
      //    X-Platform  : informe le backend qu'il doit générer un token mobile
      //    X-Device-Id : scellé dans le HMAC — remplace le fingerprint IP/UA
      const { data } = await apiClient.get(`/hls/${id}/token`, {
        headers: {
          'X-Platform':  'mobile',
          'X-Device-Id': getDeviceId(),
        },
      });

      // 3. L'URL reçue pointe vers index.m3u8?token=xxx
      //    Le backend réécrit ce manifest à la volée pour apposer ?token= sur chaque .ts
      const fullUrl = data.hlsUrl.startsWith('http')
        ? data.hlsUrl
        : `${BASE_URL}${data.hlsUrl}`;

      setHlsUrl(fullUrl);

      // 4. Incrémenter vues (fire & forget)
      apiClient.post(`/contents/${id}/view`).catch(() => {});

    } catch (e: any) {
      if (e?.response?.status === 403) {
        router.back(); // AccessGateModal géré par l'intercepteur
      } else {
        setError(formatError(e, 'Impossible de charger la vidéo.'));
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Historique ───────────────────────────────────────────────────────────────

  const saveHistory = useCallback(async (completed = false) => {
    if (!id || positionRef.current === 0) return;
    try {
      await apiClient.post(`/history/${id}`, {
        progress:  Math.floor(positionRef.current),
        duration:  Math.floor(durationRef.current),
        completed,
      });
    } catch { /* silencieux */ }
  }, [id]);

  useEffect(() => {
    historyTimer.current = setInterval(() => saveHistory(), HISTORY_INTERVAL_MS);
    return () => {
      if (historyTimer.current) clearInterval(historyTimer.current);
      saveHistory();
    };
  }, [saveHistory]);

  // ── Playback status ──────────────────────────────────────────────────────────

  const onPlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    
    // Marquer la vidéo comme prête
    setIsReady(true);
    
    positionRef.current = (status.positionMillis ?? 0) / 1000;
    durationRef.current = (status.durationMillis ?? 0) / 1000;

    // Complétion à 90%
    if (durationRef.current > 0 && positionRef.current / durationRef.current >= 0.9) {
      saveHistory(true);
    }

    // Token expiré (10 min) → renouveler automatiquement
    if ((status as { error?: string }).error) {
      loadToken();
    }
  }, [saveHistory]);

  // ── Position update interval (fix: update every second) ─────────────────────

  useEffect(() => {
    if (!isReady || paused) return;

    const interval = setInterval(async () => {
      if (videoRef.current) {
        const status = await videoRef.current.getStatusAsync();
        if (status.isLoaded) {
          const pos = (status.positionMillis ?? 0) / 1000;
          const dur = (status.durationMillis ?? 0) / 1000;
          positionRef.current = pos;
          durationRef.current = dur;
          setPosition(pos);
          setDuration(dur);
        }
      }
    }, 1000); // Update every second

    return () => clearInterval(interval);
  }, [isReady, paused]);

  // ── Contrôles ────────────────────────────────────────────────────────────────

  const togglePlay = async () => {
    if (!videoRef.current) return;
    if (paused) { await videoRef.current.playAsync();  setPaused(false); }
    else        { await videoRef.current.pauseAsync(); setPaused(true);  }
  };

  const seek = async (seconds: number) => {
    if (!videoRef.current) return;
    await videoRef.current.setPositionAsync(
      Math.max(0, (positionRef.current + seconds) * 1000)
    );
  };

  // ── Rendu ────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={s.loadingText}>Chargement…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={s.centered}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.textMuted} />
        <Text style={s.errorText}>{error}</Text>
        <TouchableOpacity style={s.retryBtn} onPress={loadToken}>
          <Text style={s.retryText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <StatusBar hidden />

      {/* Vidéo */}
      <TouchableOpacity
        style={StyleSheet.absoluteFillObject}
        onPress={() => setShowCtrl((v) => !v)}
        activeOpacity={1}
      >
        <Video
          ref={videoRef}
          source={{ uri: hlsUrl! }}
          style={StyleSheet.absoluteFillObject}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay
          onPlaybackStatusUpdate={onPlaybackStatusUpdate}
          useNativeControls={false}
        />
      </TouchableOpacity>

      {/* Overlay contrôles */}
      {showCtrl && (
        <View style={s.overlay} pointerEvents="box-none">
          {/* Header */}
          <SafeAreaView style={s.header} edges={['top', 'left', 'right']}>
            <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
              <Ionicons name="chevron-down" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={s.titleText} numberOfLines={1}>{title}</Text>
            <View style={{ width: 40 }} />
          </SafeAreaView>

          {/* Contrôles centre */}
          <View style={s.centerControls}>
            <TouchableOpacity onPress={() => seek(-10)} accessibilityLabel="Reculer 10s">
              <Ionicons name="play-back" size={28} color="#fff" />
              <Text style={s.seekLabel}>10</Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.playBtn} onPress={togglePlay}>
              <Ionicons
                name={paused ? 'play' : 'pause'}
                size={32}
                color="#fff"
                style={paused ? { marginLeft: 3 } : undefined}
              />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => seek(10)} accessibilityLabel="Avancer 10s">
              <Ionicons name="play-forward" size={28} color="#fff" />
              <Text style={s.seekLabel}>10</Text>
            </TouchableOpacity>
          </View>

          {/* Footer — barre de progression */}
          <SafeAreaView style={s.footer} edges={['bottom', 'left', 'right']}>
            <Text style={s.timeText}>{formatTime(position)}</Text>
            <View style={s.progressTrack}>
              <View
                style={[
                  s.progressFill,
                  {
                    width: duration > 0
                      ? `${(position / duration) * 100}%`
                      : '0%',
                  },
                ]}
              />
            </View>
            <Text style={s.timeText}>{formatTime(duration)}</Text>
          </SafeAreaView>
        </View>
      )}
    </View>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${m}:${pad(s)}`;
}
function pad(n: number): string { return String(n).padStart(2, '0'); }

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: '#000' },
  centered:{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', gap: 16 },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between' },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, backgroundColor: 'rgba(0,0,0,0.45)' },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  titleText: { flex: 1, textAlign: 'center', color: '#fff', fontSize: 15, fontFamily: 'Sora_600SemiBold' },

  centerControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 48 },
  playBtn: { width: 68, height: 68, borderRadius: 34, backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)', alignItems: 'center', justifyContent: 'center' },
  seekLabel: { color: '#fff', fontSize: 11, fontFamily: 'DMSans_400Regular', textAlign: 'center', marginTop: 2, opacity: 0.8 },

  footer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, gap: 10, backgroundColor: 'rgba(0,0,0,0.45)' },
  progressTrack: { flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden' },
  progressFill:  { height: 3, backgroundColor: colors.primary, borderRadius: 2 },
  timeText: { color: '#fff', fontSize: 12, fontFamily: 'DMSans_400Regular', opacity: 0.85, minWidth: 40, textAlign: 'center' },

  loadingText: { color: colors.textSecond, fontFamily: 'DMSans_400Regular', fontSize: 14 },
  errorText:   { color: colors.textSecond, fontFamily: 'DMSans_400Regular', textAlign: 'center', paddingHorizontal: 32 },
  retryBtn:    { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20, backgroundColor: 'rgba(53,132,228,0.15)', borderWidth: 1, borderColor: 'rgba(53,132,228,0.3)' },
  retryText:   { color: colors.primary, fontFamily: 'DMSans_500Medium', fontSize: 14 },
});
