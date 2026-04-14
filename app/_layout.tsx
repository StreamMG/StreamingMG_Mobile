/**
 * app/_layout.tsx — Root layout StreamMG
 *
 * Expo Router — règle de nommage des Stack.Screen :
 *  - Les groupes avec _layout.tsx propre (player/video, player/audio)
 *    sont déclarés par leur NOM DE DOSSIER, pas par leur route dynamique.
 *  - Expo Router découvre [id].tsx automatiquement à l'intérieur.
 *  - Déclarer "player/video/[id]" cause un WARN car le router
 *    cherche un enfant nommé exactement "player/video/[id]" au niveau racine.
 */

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import '../styles/global.css';
import {
  Sora_400Regular,
  Sora_500Medium,
  Sora_600SemiBold,
  Sora_700Bold,
  Sora_800ExtraBold,
} from '@expo-google-fonts/sora';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
} from '@expo-google-fonts/dm-sans';

import { AccessGateModal } from '@/components/content/AccessGateModal';
import { MiniPlayer }      from '@/components/player/MiniPlayer';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(auth)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Sora_400Regular,
    Sora_500Medium,
    Sora_600SemiBold,
    Sora_700Bold,
    Sora_800ExtraBold,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
  });

  useEffect(() => { if (error) throw error; }, [error]);
  useEffect(() => { if (loaded) SplashScreen.hideAsync(); }, [loaded]);

  if (!loaded) return null;

  return (
    <>
      <StatusBar style="light" backgroundColor="#0d1018" />

      <Stack screenOptions={{ headerShown: false }}>
        {/* Groupes tab et auth */}
        {/* <Stack.Screen name="(auth)"   options={{ headerShown: false }} /> */}
        <Stack.Screen name="(tabs)"   options={{ headerShown: false }} />
        <Stack.Screen name="(auth)"   options={{ headerShown: false }} />

        {/* Écran de détail — content/[id].tsx */}
        <Stack.Screen name="content/[id]" options={{ headerShown: false }} />

        {/* Groupes lecteurs — Expo découvre [id].tsx via leurs _layout.tsx */}
        <Stack.Screen
          name="player/video"
          options={{ headerShown: false, animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="player/audio"
          options={{ headerShown: false, animation: 'slide_from_bottom' }}
        />

        <Stack.Screen name="download/[id]"   options={{ headerShown: false }} />
        <Stack.Screen name="purchase/[id]"  options={{ headerShown: false }} />
        <Stack.Screen name="subscribe"       options={{ headerShown: false }} />
        <Stack.Screen name="offline"    options={{ headerShown: false }} />
        <Stack.Screen name="history"   options={{ headerShown: false }} />
        <Stack.Screen name="purchases"             options={{ headerShown: false }} />
        <Stack.Screen name="provider"              options={{ headerShown: false }} />
        <Stack.Screen name="provider/upload"       options={{ headerShown: false }} />
        <Stack.Screen name="provider/edit/[id]"    options={{ headerShown: false }} />
        <Stack.Screen name="admin"                 options={{ headerShown: false }} />
        <Stack.Screen name="admin/contents"        options={{ headerShown: false }} />
        <Stack.Screen name="admin/users"           options={{ headerShown: false }} />
        <Stack.Screen name="+not-found"      options={{ headerShown: false }} />
      </Stack>

      <AccessGateModal />
      <MiniPlayer />
    </>
  );
}
