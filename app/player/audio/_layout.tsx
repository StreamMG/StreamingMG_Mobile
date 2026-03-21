/**
 * app/player/video/_layout.tsx
 * app/player/audio/_layout.tsx
 *
 * Stack sans header pour les deux groupes lecteur.
 * Fichier identique — à copier dans les deux dossiers.
 */

import { Stack } from 'expo-router';

export default function PlayerLayout() {
  return <Stack screenOptions={{ headerShown: false, animation: 'slide_from_bottom' }} />;
}
