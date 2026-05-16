/**
 * app/player/offline/_layout.tsx
 *
 * Stack sans header pour le lecteur hors-ligne.
 * Identique à app/player/video/_layout.tsx et app/player/audio/_layout.tsx.
 */

import { Stack } from 'expo-router';

export default function OfflinePlayerLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_bottom',
      }}
    />
  );
}
