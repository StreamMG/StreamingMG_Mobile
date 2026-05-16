/**
 * stores/playerStore.ts
 *
 * État global du lecteur audio.
 *
 * dismiss() → cache le MiniPlayer sans arrêter la lecture.
 *             L'utilisateur peut le rouvrir via /player/audio/:id.
 * clear()   → vide complètement (déconnexion, nouveau contenu).
 */

import { create } from 'zustand';

export interface AudioTrack {
  contentId: string;
  title:     string;
  artist:    string | null;
  coverArt:  string;
  audioUrl:  string;
  duration:  number;
}

interface PlayerState {
  track:      AudioTrack | null;
  isPlaying:  boolean;
  position:   number;
  duration:   number;
  isLoading:  boolean;
  visible:    boolean;        // ← contrôle l'affichage du MiniPlayer
  soundInstance: any;         // Instance Audio.Sound d'expo-av

  setTrack:    (track: AudioTrack) => void;
  setSoundInstance: (sound: any) => void;
  play:        () => void;
  pause:       () => void;
  updatePosition: (pos: number) => void;
  seek:        (pos: number) => void;
  setDuration: (dur: number) => void;
  setLoading:  (val: boolean) => void;
  dismiss:     () => void;   // ← cache sans arrêter
  clear:       () => void;   // ← vide tout
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  track:     null,
  isPlaying: false,
  position:  0,
  duration:  0,
  isLoading: false,
  visible:   false,
  soundInstance: null,

  setTrack:    (track)     => set({ track, position: 0, isPlaying: false, isLoading: true, visible: true }),
  setSoundInstance: (soundInstance) => set({ soundInstance }),
  play:        ()          => {
    get().soundInstance?.playAsync().catch(() => {});
    set({ isPlaying: true });
  },
  pause:       ()          => {
    get().soundInstance?.pauseAsync().catch(() => {});
    set({ isPlaying: false });
  },
  updatePosition: (position) => set({ position }),
  seek:        (position)  => {
    get().soundInstance?.setPositionAsync(position * 1000).catch(() => {});
    set({ position });
  },
  setDuration: (duration)  => set({ duration }),
  setLoading:  (isLoading) => set({ isLoading }),
  dismiss:     ()          => set({ visible: false }),
  clear:       ()          => {
    get().soundInstance?.unloadAsync().catch(() => {});
    set({ track: null, isPlaying: false, position: 0, duration: 0, visible: false, soundInstance: null });
  },
}));
