/**
 * app/player/video/[id].tsx — Lecteur vidéo HLS Optimisé
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
import { colors, BASE_URL } from '@/lib/theme';

// ─── Constantes & Helpers ───────────────────────────────────────────────────

const HISTORY_INTERVAL_MS = 10_000;

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

// ─── Sous-composant ProgressBar (Mémoïsé pour la performance) ───────────────

const ProgressBar = React.memo(function ProgressBar({ progress }: { progress: number }) {
  return (
    <View style={s.progressTrack}>
      <View
        style={[
          s.progressFill,
          { width: `${Math.min(100, Math.max(0, progress * 100))}%` },
        ]}
      />
    </View>
  );
});

// ─── Composant Principal ─────────────────────────────────────────────────────

export default function VideoPlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  // Refs pour la logique métier (pas de re-render)
  const videoRef = useRef<Video>(null);
  const positionRef = useRef(0);
  const durationRef = useRef(0);
  const historyTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // States pour l'UI
  const [hlsUrl, setHlsUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [showCtrl, setShowCtrl] = useState(true);
  const [title, setTitle] = useState('');
  
  // State dédié uniquement à la barre de progression
  const [progress, setProgress] = useState(0);

  // ── Orientation ─────────────────────────────────────────────────────────────

  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    };
  }, []);

  // ── Chargement ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (id) loadToken();
  }, [id]);

  const loadToken = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: detail } = await apiClient.get(`/contents/${id}`);
      setTitle(detail.title);

      const { data } = await apiClient.get(`/hls/${id}/token`);
      setHlsUrl(`${BASE_URL}${data.hlsUrl}`);

      apiClient.post(`/contents/${id}/view`).catch(() => {});
    } catch (e: any) {
      if (e?.response?.status === 403) {
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
        progress: Math.floor(positionRef.current),
        duration: Math.floor(durationRef.current),
        completed,
      });
    } catch { /* Silencieux */ }
  }, [id]);

  useEffect(() => {
    historyTimer.current = setInterval(() => saveHistory(), HISTORY_INTERVAL_MS);
    return () => {
      if (historyTimer.current) clearInterval(historyTimer.current);
      saveHistory();
    };
  }, [saveHistory]);

  // ── Playback status (Le cœur de l'optimisation) ─────────────────────────────

  const onPlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;

    // Mise à jour des refs pour la logique (sans re-render)
    positionRef.current = status.positionMillis / 1000;
    durationRef.current = (status.durationMillis??0) / 1000;

    // Mise à jour du state UI uniquement si les contrôles sont visibles
    if (showCtrl && (status.durationMillis??0) > 0) {
      setProgress(status.positionMillis / (status.durationMillis??0));
    }

    // Complétion à 90%
    if (durationRef.current > 0 && positionRef.current / durationRef.current >= 0.9) {
      saveHistory(true);
    }
  }, [showCtrl, saveHistory]);

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

          {/* Centre */}
          <View style={s.centerControls}>
            <TouchableOpacity onPress={() => seek(-10)}>
              <Ionicons name="play-back" size={28} color="#fff" />
              <Text style={s.seekLabel}>10</Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.playBtn} onPress={togglePlay}>
              <Ionicons name={paused ? 'play' : 'pause'} size={32} color="#fff" style={paused ? { marginLeft: 3 } : {}} />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => seek(10)}>
              <Ionicons name="play-forward" size={28} color="#fff" />
              <Text style={s.seekLabel}>10</Text>
            </TouchableOpacity>
          </View>

          {/* Footer avec Barre de Progression Optimisée */}
          <SafeAreaView style={s.footer} edges={['bottom', 'left', 'right']}>
            <Text style={s.timeText}>{formatTime(positionRef.current)}</Text>
            <ProgressBar progress={progress} />
            <Text style={s.timeText}>{formatTime(durationRef.current)}</Text>
          </SafeAreaView>
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  centered: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', gap: 16 },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, backgroundColor: 'rgba(0,0,0,0.45)' },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  titleText: { flex: 1, textAlign: 'center', color: '#fff', fontSize: 15, fontFamily: 'Sora_600SemiBold' },
  centerControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 48 },
  playBtn: { 
    width: 68, height: 68, borderRadius: 34, 
    backgroundColor: 'rgba(255,255,255,0.18)', 
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)', 
    alignItems: 'center', justifyContent: 'center' 
  },
  seekLabel: { color: '#fff', fontSize: 11, textAlign: 'center', marginTop: 2, opacity: 0.8 },
  footer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, gap: 10, backgroundColor: 'rgba(0,0,0,0.45)' },
  progressTrack: { flex: 1, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden' },
  progressFill: { height: 4, backgroundColor: colors.primary, borderRadius: 2 },
  timeText: { color: '#fff', fontSize: 12, opacity: 0.85, minWidth: 45, textAlign: 'center' },
  loadingText: { color: colors.textSecond, fontSize: 14 },
  errorText: { color: colors.textSecond, textAlign: 'center', paddingHorizontal: 32 },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20, backgroundColor: 'rgba(53,132,228,0.15)', borderWidth: 1, borderColor: 'rgba(53,132,228,0.3)' },
  retryText: { color: colors.primary, fontSize: 14 },
});