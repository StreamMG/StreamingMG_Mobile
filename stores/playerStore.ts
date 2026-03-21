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

  setTrack:    (track: AudioTrack) => void;
  play:        () => void;
  pause:       () => void;
  setPosition: (pos: number) => void;
  setDuration: (dur: number) => void;
  setLoading:  (val: boolean) => void;
  dismiss:     () => void;   // ← cache sans arrêter
  clear:       () => void;   // ← vide tout
}

export const usePlayerStore = create<PlayerState>((set) => ({
  track:     null,
  isPlaying: false,
  position:  0,
  duration:  0,
  isLoading: false,
  visible:   false,

  setTrack:    (track)     => set({ track, position: 0, isPlaying: false, isLoading: true, visible: true }),
  play:        ()          => set({ isPlaying: true }),
  pause:       ()          => set({ isPlaying: false }),
  setPosition: (position)  => set({ position }),
  setDuration: (duration)  => set({ duration }),
  setLoading:  (isLoading) => set({ isLoading }),
  dismiss:     ()          => set({ visible: false }),
  clear:       ()          => set({ track: null, isPlaying: false, position: 0, duration: 0, visible: false }),
}));
