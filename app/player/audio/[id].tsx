/**
 * app/player/audio/[id].tsx — Lecteur audio
 *
 * Flux :
 *   1. GET /audio/:id/url        → audioUrl signé (15 min) + métadonnées
 *   2. expo-av Audio.Sound       → lecture
 *   3. playerStore.setTrack      → alimente le MiniPlayer (persistant)
 *   4. POST /history/:id toutes les 10s
 *
 * Importe  : playerStore, apiClient, authStore, theme
 * Monté par: app/player/audio/_layout.tsx (Stack sans header)
 *
 * Quand l'utilisateur quitte cet écran, le son CONTINUE via le MiniPlayer.
 * L'instance Sound est gardée en mémoire dans un ref — elle n'est détruite
 * qu'à l'appel de playerStore.clear() (ex: déconnexion, autre contenu chargé).
 */

import React, {
  useEffect, useRef, useCallback, useState,
} from 'react';
import {
  View, Text, Image, TouchableOpacity,
  ActivityIndicator, StyleSheet, Dimensions,
} from 'react-native';
import { Audio } from 'expo-av';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { usePlayerStore } from '@/stores/playerStore';
import { apiClient } from '@/lib/apiClient';
import { BASE_URL } from '@/lib/theme';
import { colors } from '@/lib/theme';
import { formatError } from '@/lib/errorFormatter';

// ─── Constantes ───────────────────────────────────────────────────────────────

const { width: W }       = Dimensions.get('window');
const COVER_SIZE         = W - 64;
const HISTORY_INTERVAL   = 10_000;

// const BASE_URL           = __DEV__
//   ? 'http://localhost:3001'
//   : 'https://api.streamMG.railway.app';

// ─── Composant ────────────────────────────────────────────────────────────────

export default function AudioPlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const soundRef     = useRef<Audio.Sound | null>(null);
  const historyTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const {
    track, isPlaying, position, duration, soundInstance,
    setTrack, play, pause, seek, updatePosition, setDuration, setLoading, clear, setSoundInstance,
  } = usePlayerStore();

  const [loading,   setLoadingLocal] = useState(true);
  const [error,     setError]        = useState<string | null>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);

  // ── Chargement ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!id) return;

    // Configurer le mode audio iOS (lecture en arrière-plan)
    Audio.setAudioModeAsync({
      allowsRecordingIOS:         false,
      staysActiveInBackground:    true,
      // interruptionModeIOS:        Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
      playsInSilentModeIOS:       true,
      shouldDuckAndroid:          true,
      // interruptionModeAndroid:    Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
      playThroughEarpieceAndroid: false,
    }).catch(() => {});

    // Si on navigue vers ce même contenu déjà en lecture
    if (usePlayerStore.getState().track?.contentId === id && usePlayerStore.getState().soundInstance) {
      setLoadingLocal(false);
    } else {
      loadAudio();
    }

    return () => {
      if (historyTimer.current) clearInterval(historyTimer.current);
      saveHistory();
      // Ne pas détruire le son — MiniPlayer continue
    };
  }, [id]);

  const loadAudio = async () => {
    setLoadingLocal(true);
    setError(null);
    try {
      console.log("AVANT FECTH url audio")
      
      // 1. Obtenir l'URL audio (format actuel du serveur: { url: "/uploads/audio/test-audio.mp3" })
      const { data: urlData } = await apiClient.get(`/audio/${id}/url`);
      
      // 2. Obtenir les métadonnées complètes via /contents/:id
      const { data: contentData } = await apiClient.get(`/contents/${id}`);

      // Construire l'URL complète
      const audioUrl = urlData.url.startsWith('http')
        ? urlData.url
        : `${BASE_URL}${urlData.url}`;

      const coverArt = contentData.content.thumbnail?.startsWith('http')
        ? contentData.content.thumbnail
        : `${BASE_URL}${contentData.content.thumbnail}`;

      console.log("URL audio:", audioUrl);
      console.log("Métadonnées:", contentData.content);

      // Alimenter le store → MiniPlayer l'utilise
      setTrack({
        contentId: id,
        title:     contentData.content.title,
        artist:    contentData.content.artist ?? null,
        coverArt,
        audioUrl,
        duration:  contentData.content.duration ?? 0, // La durée sera mise à jour par expo-av
      });
      setLoading(true);

      // Détruire l'ancien son si existant
      if (soundInstance) {
        await soundInstance.unloadAsync();
        setSoundInstance(null);
      }

      // Créer et démarrer le son
      console.log("AVANT LE CHARGEMENT DU SON")
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: false }, // Ne pas démarrer automatiquement pour éviter le double son
        onPlaybackUpdate
      );
      console.log("APRES")
      setSoundInstance(sound);
      setLoading(false);
      play(); // Démarrer manuellement via le store
      console.log("APRES LANCEMENT")
      // Incrémenter vues
      apiClient.post(`/contents/${id}/view`).catch(() => {});
      console.log("APRES FETCH VIEW")

    } catch (e: any) {
      if (e?.response?.status === 403) {
        router.back();
      } else {
        console.log("Erreur de chargement audio:", e.message);
        setError(formatError(e, 'Impossible de charger l\'audio.'));
      }
    } finally {
      setLoadingLocal(false);
    }
  };

  // ── Historique ──────────────────────────────────────────────────────────────

  const saveHistory = useCallback(async (completed = false) => {
    if (!id || position === 0) return;
    try {
      await apiClient.post(`/history/${id}`, {
        progress:  Math.floor(position),
        duration:  Math.floor(duration),
        completed,
      });
    } catch { /* silencieux */ }
  }, [id, position, duration]);

  // ── Playback update ─────────────────────────────────────────────────────────

  const onPlaybackUpdate = useCallback(
    (status: any) => {
      if (!status.isLoaded) return;
      const pos = (status.positionMillis ?? 0) / 1000;
      const dur = (status.durationMillis ?? 0) / 1000;

      if (!isScrubbing) updatePosition(pos);
      setDuration(dur);

      if (status.didJustFinish) {
        pause();
        updatePosition(0);
        saveHistory(true);
      }
    },
    [isScrubbing, pause, saveHistory]
  );

  // ── Sync play/pause store → Sound ──────────────────────────────────────────
  // The store now directly controls playAsync and pauseAsync on soundInstance!

  useEffect(() => {
    historyTimer.current = setInterval(() => saveHistory(), HISTORY_INTERVAL);
    return () => { if (historyTimer.current) clearInterval(historyTimer.current); };
  }, [saveHistory]);

  // ── Seek ────────────────────────────────────────────────────────────────────

  const handleSeek = async (newPosition: number) => {
    seek(newPosition);
  };

  // ── Rendu ───────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={s.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (error || !track) {
    return (
      <SafeAreaView style={s.centered}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.textMuted} />
        <Text style={s.errorText}>{error ?? 'Contenu introuvable'}</Text>
        <TouchableOpacity style={s.retryBtn} onPress={loadAudio}>
          <Text style={s.retryText}>Réessayer</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const progress = duration > 0 ? position / duration : 0;

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>

      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => router.back()}
          accessibilityLabel="Retour"
        >
          <Ionicons name="chevron-down" size={26} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerLabel}>En écoute</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* ── Pochette ── */}
      <View style={s.coverContainer}>
        <Image
          source={{ uri: track.coverArt }}
          style={s.cover}
          resizeMode="cover"
        />
      </View>

      {/* ── Infos ── */}
      <View style={s.infoContainer}>
        <Text style={s.title} numberOfLines={1}>{track.title}</Text>
        {track.artist && (
          <Text style={s.artist} numberOfLines={1}>{track.artist}</Text>
        )}
      </View>

      {/* ── Barre de progression ── */}
      <View style={s.progressContainer}>
        <TouchableOpacity
          style={s.progressTrack}
          onPress={(e) => {
            const ratio = e.nativeEvent.locationX / (W - 48);
            handleSeek(ratio * duration);
          }}
          activeOpacity={1}
        >
          <View style={[s.progressFill, { width: `${progress * 100}%` }]} />
          {/* Thumb */}
          <View
            style={[
              s.progressThumb,
              { left: `${progress * 100}%` },
            ]}
          />
        </TouchableOpacity>
        <View style={s.timeRow}>
          <Text style={s.timeText}>{formatTime(position)}</Text>
          <Text style={s.timeText}>{formatTime(duration)}</Text>
        </View>
      </View>

      {/* ── Contrôles ── */}
      <View style={s.controls}>
        {/* -30s */}
        <TouchableOpacity
          onPress={() => handleSeek(Math.max(0, position - 30))}
          accessibilityLabel="Reculer 30 secondes"
        >
          <Ionicons name="play-back-outline" size={26} color={colors.textSecond} />
          <Text style={s.skipLabel}>30</Text>
        </TouchableOpacity>

        {/* -10s */}
        <TouchableOpacity
          onPress={() => handleSeek(Math.max(0, position - 10))}
          accessibilityLabel="Reculer 10 secondes"
        >
          <Ionicons name="play-back" size={28} color={colors.textSecond} />
          <Text style={s.skipLabel}>10</Text>
        </TouchableOpacity>

        {/* Play/Pause */}
        <TouchableOpacity
          style={s.playBtn}
          onPress={isPlaying ? pause : play}
          accessibilityLabel={isPlaying ? 'Pause' : 'Lire'}
        >
          <Ionicons
            name={isPlaying ? 'pause' : 'play'}
            size={34}
            color="#fff"
            style={!isPlaying ? { marginLeft: 3 } : undefined}
          />
        </TouchableOpacity>

        {/* +10s */}
        <TouchableOpacity
          onPress={() => handleSeek(Math.min(duration, position + 10))}
          accessibilityLabel="Avancer 10 secondes"
        >
          <Ionicons name="play-forward" size={28} color={colors.textSecond} />
          <Text style={s.skipLabel}>10</Text>
        </TouchableOpacity>

        {/* +30s */}
        <TouchableOpacity
          onPress={() => handleSeek(Math.min(duration, position + 30))}
          accessibilityLabel="Avancer 30 secondes"
        >
          <Ionicons name="play-forward-outline" size={26} color={colors.textSecond} />
          <Text style={s.skipLabel}>30</Text>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: colors.bgBase, paddingBottom: 75 }, // Espace pour le MiniPlayer
  centered: {
    flex: 1, backgroundColor: colors.bgBase,
    alignItems: 'center', justifyContent: 'center', gap: 16,
  },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16,
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 40, height: 40,
    alignItems: 'center', justifyContent: 'center',
  },
  headerLabel: {
    fontSize: 13, color: colors.textSecond,
    fontFamily: 'DMSans_500Medium', textTransform: 'uppercase',
    letterSpacing: 1.5,
  },

  coverContainer: {
    alignItems: 'center',
    paddingHorizontal: 32,
    marginBottom: 32,
  },
  cover: {
    width:  COVER_SIZE,
    height: COVER_SIZE,
    borderRadius: 16,
    backgroundColor: colors.bgSurface,
    // Ombre subtile
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },

  infoContainer: {
    paddingHorizontal: 32,
    marginBottom: 24,
    gap: 4,
  },
  title: {
    fontSize: 22, color: colors.textPrimary,
    fontFamily: 'Sora_700Bold', letterSpacing: -0.4,
  },
  artist: {
    fontSize: 15, color: colors.textSecond,
    fontFamily: 'DMSans_400Regular',
  },

  progressContainer: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  progressTrack: {
    height: 4,
    backgroundColor: colors.bgRaised,
    borderRadius: 2,
    position: 'relative',
    justifyContent: 'center',
  },
  progressFill: {
    height: 4,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  progressThumb: {
    position: 'absolute',
    width: 14, height: 14,
    borderRadius: 7,
    backgroundColor: colors.primary,
    marginLeft: -7,
    top: -5,
    shadowColor: colors.primary,
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  timeText: {
    fontSize: 12, color: colors.textMuted,
    fontFamily: 'DMSans_400Regular',
  },

  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    paddingHorizontal: 24,
  },
  playBtn: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    marginHorizontal: 8,
  },
  skipLabel: {
    fontSize: 10, color: colors.textMuted,
    fontFamily: 'DMSans_400Regular',
    textAlign: 'center', marginTop: 2,
  },

  errorText: {
    color: colors.textSecond, fontFamily: 'DMSans_400Regular',
    textAlign: 'center', paddingHorizontal: 32,
  },
  retryBtn: {
    paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20,
    backgroundColor: 'rgba(53,132,228,0.12)',
    borderWidth: 1, borderColor: 'rgba(53,132,228,0.3)',
  },
  retryText: {
    color: colors.primary, fontFamily: 'DMSans_500Medium', fontSize: 14,
  },
});
