/**
 * components/player/MiniPlayer.tsx
 *
 * Mini-player audio persistant.
 * Bouton × en haut à droite — dismiss() cache le player sans arrêter la lecture.
 * Rouvrir : naviguer vers /player/audio/:id.
 *
 * Importe  : playerStore, theme
 * Monté par: app/_layout.tsx
 */

import React from 'react';
import {
  View, Text, Image, TouchableOpacity,
  PanResponder, StyleSheet, Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { usePlayerStore } from '@/stores/playerStore';
import { colors } from '@/lib/theme';

const { width: W } = Dimensions.get('window');
const MINI_HEIGHT  = 68;

export function MiniPlayer() {
  const {
    track, isPlaying, position, duration,
    visible, play, pause, setPosition, dismiss,
  } = usePlayerStore();

  // Caché si pas de piste ou dismissed
  if (!track || !visible) return null;

  const progress = duration > 0 ? position / duration : 0;
  const barWidth = Math.max(0, Math.min(W * progress, W));

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => {
      const ratio = Math.max(0, Math.min(e.nativeEvent.locationX / W, 1));
      setPosition(ratio * duration);
    },
    onPanResponderMove: (e) => {
      const ratio = Math.max(0, Math.min(e.nativeEvent.locationX / W, 1));
      setPosition(ratio * duration);
    },
  });

  return (
    <View style={s.container}>
      {/* Barre de progression scrubable */}
      <View style={s.progressTrack} {...panResponder.panHandlers}>
        <View style={[s.progressFill, { width: barWidth }]} />
      </View>

      {/* Corps */}
      <TouchableOpacity
        style={s.body}
        onPress={() => router.push(`/player/audio/${track.contentId}`)}
        activeOpacity={0.85}
      >
        {/* Pochette */}
        <Image source={{ uri: track.coverArt }} style={s.cover} resizeMode="cover" />

        {/* Titre + artiste */}
        <View style={s.info}>
          <Text style={s.title} numberOfLines={1}>{track.title}</Text>
          {track.artist && (
            <Text style={s.artist} numberOfLines={1}>{track.artist}</Text>
          )}
        </View>

        {/* Contrôles */}
        <View style={s.controls}>
          <TouchableOpacity
            onPress={() => setPosition(Math.max(0, position - 15))}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Reculer 15s"
          >
            <Ionicons name="play-skip-back" size={20} color={colors.textSecond} />
          </TouchableOpacity>

          <TouchableOpacity
            style={s.playBtn}
            onPress={isPlaying ? pause : play}
            accessibilityLabel={isPlaying ? 'Pause' : 'Lecture'}
          >
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={18}
              color="#fff"
              style={!isPlaying ? { marginLeft: 2 } : undefined}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setPosition(Math.min(duration, position + 15))}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Avancer 15s"
          >
            <Ionicons name="play-skip-forward" size={20} color={colors.textSecond} />
          </TouchableOpacity>

          {/* ── Bouton fermer ── */}
          <TouchableOpacity
            onPress={dismiss}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Fermer le mini-player"
            style={s.dismissBtn}
          >
            <Ionicons name="close" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: {
    position:        'absolute',
    bottom:          0,
    left:            0,
    right:           0,
    height:          MINI_HEIGHT + 3,
    backgroundColor: colors.bgSurface,
    borderTopWidth:  1,
    borderTopColor:  'rgba(46,51,71,0.7)',
  },
  progressTrack: {
    height:          3,
    backgroundColor: colors.bgRaised,
    width:           '100%',
  },
  progressFill: {
    height:          3,
    backgroundColor: colors.primary,
    borderRadius:    2,
  },
  body: {
    flex:              1,
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: 14,
    gap:               10,
  },
  cover: {
    width:           44,
    height:          44,
    borderRadius:    6,
    backgroundColor: colors.bgRaised,
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize:   13,
    color:      colors.textPrimary,
    fontFamily: 'Sora_500Medium',
  },
  artist: {
    fontSize:   12,
    color:      colors.textSecond,
    fontFamily: 'DMSans_400Regular',
    marginTop:  2,
  },
  controls: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           12,
  },
  playBtn: {
    width:           36,
    height:          36,
    borderRadius:    18,
    backgroundColor: colors.primary,
    alignItems:      'center',
    justifyContent:  'center',
    shadowColor:     colors.primary,
    shadowOpacity:   0.4,
    shadowRadius:    6,
    shadowOffset:    { width: 0, height: 2 },
    elevation:       4,
  },
  dismissBtn: {
    width:           28,
    height:          28,
    borderRadius:    14,
    backgroundColor: 'rgba(46,51,71,0.5)',
    alignItems:      'center',
    justifyContent:  'center',
    marginLeft:      2,
  },
});
