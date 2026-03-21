/**
 * app/player/video/[id].tsx — Lecteur vidéo HLS
 *
 * Flux :
 *   1. GET /hls/:id/token  → hlsUrl signé (10 min)
 *   2. expo-av Video reçoit hlsUrl
 *   3. POST /history/:id toutes les 10s + à la fermeture
 *   4. Si 403 → intercepteur → AccessGateModal (via accessGateStore)
 *
 * Importe  : playerStore (non utilisé ici — vidéo locale), apiClient,
 *            authStore, theme, accessGateStore
 * Monté par: app/player/video/_layout.tsx (Stack sans header)
 *
 * Orientation : expo-screen-orientation verrouille en paysage à l'ouverture,
 * restaure le portrait à la fermeture.
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
  Dimensions,
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import * as ScreenOrientation from 'expo-screen-orientation';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '@/lib/apiClient';
import { colors }    from '@/lib/theme';

// ─── Constantes ───────────────────────────────────────────────────────────────

const BASE_URL = __DEV__
  ? 'http://localhost:3001'
  : 'https://api.streamMG.railway.app';

const HISTORY_INTERVAL_MS = 10_000;

// ─── Composant ────────────────────────────────────────────────────────────────

export default function VideoPlayerScreen() {
  const { id, lessonIndex } = useLocalSearchParams<{
    id: string;
    lessonIndex?: string;
  }>();

  const videoRef      = useRef<Video>(null);
  const positionRef   = useRef(0);
  const durationRef   = useRef(0);
  const historyTimer  = useRef<ReturnType<typeof setInterval> | null>(null);

  const [hlsUrl,    setHlsUrl]    = useState<string | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [paused,    setPaused]    = useState(false);
  const [showCtrl,  setShowCtrl]  = useState(true);
  const [title,     setTitle]     = useState('');

  // ── Orientation ─────────────────────────────────────────────────────────────

  useEffect(() => {
    ScreenOrientation.lockAsync(
      ScreenOrientation.OrientationLock.LANDSCAPE
    ).catch(() => {});

    return () => {
      ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT_UP
      ).catch(() => {});
    };
  }, []);

  // ── Chargement token HLS ────────────────────────────────────────────────────

  useEffect(() => {
    if (!id) return;
    loadToken();
  }, [id]);

  const loadToken = async () => {
    setLoading(true);
    setError(null);
    try {
      // Métadonnées (titre)
      const { data: detail } = await apiClient.get(`/contents/${id}`);
      setTitle(detail.title);

      // Token HLS — checkAccess côté backend
      const { data } = await apiClient.get(`/hls/${id}/token`);
      setHlsUrl(`${BASE_URL}${data.hlsUrl}`);

      // Incrémenter vues
      apiClient.post(`/contents/${id}/view`).catch(() => {});
    } catch (e: any) {
      if (e?.response?.status === 403) {
        // L'intercepteur axios a déjà ouvert l'AccessGateModal
        router.back();
      } else {
        setError('Impossible de charger la vidéo.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Historique ──────────────────────────────────────────────────────────────

  const saveHistory = useCallback(async (completed = false) => {
    if (!id || positionRef.current === 0) return;
    try {
      await apiClient.post(`/history/${id}`, {
        progress:  Math.floor(positionRef.current),
        duration:  Math.floor(durationRef.current),
        completed,
      });
    } catch {
      // Silencieux
    }
  }, [id]);

  useEffect(() => {
    historyTimer.current = setInterval(() => saveHistory(), HISTORY_INTERVAL_MS);
    return () => {
      if (historyTimer.current) clearInterval(historyTimer.current);
      saveHistory();
    };
  }, [saveHistory]);

  // ── Playback status ─────────────────────────────────────────────────────────

  const onPlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    positionRef.current = (status.positionMillis ?? 0) / 1000;
    durationRef.current = (status.durationMillis ?? 0) / 1000;

    // Complétion à 90%
    if (
      durationRef.current > 0 &&
      positionRef.current / durationRef.current >= 0.9
    ) {
      saveHistory(true);
    }

    // Token expiré (10 min) → renouveler
    if (status.error) {
      loadToken();
    }
  }, [saveHistory]);

  // ── Contrôles ───────────────────────────────────────────────────────────────

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
    const newPos = Math.max(0, (positionRef.current + seconds) * 1000);
    await videoRef.current.setPositionAsync(newPos);
  };

  const toggleControls = () => {
    setShowCtrl((v) => !v);
  };

  // ── Rendu ───────────────────────────────────────────────────────────────────

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
        onPress={toggleControls}
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
            <TouchableOpacity
              style={s.backBtn}
              onPress={() => router.back()}
              accessibilityLabel="Fermer le lecteur"
            >
              <Ionicons name="chevron-down" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={s.titleText} numberOfLines={1}>{title}</Text>
            <View style={{ width: 40 }} />
          </SafeAreaView>

          {/* Centre — contrôles principaux */}
          <View style={s.centerControls}>
            <TouchableOpacity
              onPress={() => seek(-10)}
              accessibilityLabel="Reculer 10 secondes"
            >
              <Ionicons name="play-back" size={28} color="#fff" />
              <Text style={s.seekLabel}>10</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.playBtn}
              onPress={togglePlay}
              accessibilityLabel={paused ? 'Lire' : 'Pause'}
            >
              <Ionicons
                name={paused ? 'play' : 'pause'}
                size={32}
                color="#fff"
                style={!paused ? undefined : { marginLeft: 3 }}
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => seek(10)}
              accessibilityLabel="Avancer 10 secondes"
            >
              <Ionicons name="play-forward" size={28} color="#fff" />
              <Text style={s.seekLabel}>10</Text>
            </TouchableOpacity>
          </View>

          {/* Pied — barre de progression */}
          <SafeAreaView style={s.footer} edges={['bottom', 'left', 'right']}>
            <Text style={s.timeText}>{formatTime(positionRef.current)}</Text>
            <View style={s.progressTrack}>
              <View
                style={[
                  s.progressFill,
                  {
                    width: durationRef.current > 0
                      ? `${(positionRef.current / durationRef.current) * 100}%`
                      : '0%',
                  },
                ]}
              />
            </View>
            <Text style={s.timeText}>{formatTime(durationRef.current)}</Text>
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

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const { width: W, height: H } = Dimensions.get('window');

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: '#000' },
  centered: {
    flex: 1, backgroundColor: '#000',
    alignItems: 'center', justifyContent: 'center', gap: 16,
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems:    'center',
    paddingHorizontal: 16,
    paddingTop:    8,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  backBtn: {
    width: 40, height: 40,
    alignItems: 'center', justifyContent: 'center',
  },
  titleText: {
    flex: 1,
    textAlign:  'center',
    color:      '#fff',
    fontSize:   15,
    fontFamily: 'Sora_600SemiBold',
  },

  // Centre
  centerControls: {
    flexDirection: 'row',
    alignItems:    'center',
    justifyContent:'center',
    gap:           48,
  },
  playBtn: {
    width:  68, height: 68, borderRadius: 34,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },
  seekLabel: {
    color: '#fff', fontSize: 11,
    fontFamily: 'DMSans_400Regular',
    textAlign: 'center', marginTop: 2, opacity: 0.8,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    alignItems:    'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap:           10,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  progressTrack: {
    flex:            1,
    height:          3,
    borderRadius:    2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    overflow:        'hidden',
  },
  progressFill: {
    height:          3,
    backgroundColor: colors.primary,
    borderRadius:    2,
  },
  timeText: {
    color:      '#fff',
    fontSize:   12,
    fontFamily: 'DMSans_400Regular',
    opacity:    0.85,
    minWidth:   40,
    textAlign:  'center',
  },

  // Erreur
  loadingText: { color: colors.textSecond, fontFamily: 'DMSans_400Regular', fontSize: 14 },
  errorText:   { color: colors.textSecond, fontFamily: 'DMSans_400Regular', textAlign: 'center', paddingHorizontal: 32 },
  retryBtn:    { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20, backgroundColor: 'rgba(53,132,228,0.15)', borderWidth: 1, borderColor: 'rgba(53,132,228,0.3)' },
  retryText:   { color: colors.primary, fontFamily: 'DMSans_500Medium', fontSize: 14 },
});
