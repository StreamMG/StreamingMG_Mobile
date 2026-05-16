/**
 * app/_layout.tsx — Root layout StreamMG
 *
 * Modification : ajout de <Stack.Screen name="player/offline" />
 * pour le lecteur hors-ligne déchiffré AES-256-GCM.
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
        <Stack.Screen name="(tabs)"   options={{ headerShown: false }} />
        <Stack.Screen name="(auth)"   options={{ headerShown: false }} />

        <Stack.Screen name="content/[id]" options={{ headerShown: false }} />

        {/* Lecteurs en ligne */}
        <Stack.Screen
          name="player/video"
          options={{ headerShown: false, animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="player/audio"
          options={{ headerShown: false, animation: 'slide_from_bottom' }}
        />

        {/* ─── Lecteur hors-ligne (AES-256-GCM) ─── */}
        <Stack.Screen
          name="player/offline"
          options={{ headerShown: false, animation: 'slide_from_bottom' }}
        />

        <Stack.Screen name="download/[id]"          options={{ headerShown: false }} />
        <Stack.Screen name="purchase/[id]"          options={{ headerShown: false }} />
        <Stack.Screen name="subscribe"              options={{ headerShown: false }} />
        <Stack.Screen name="offline"                options={{ headerShown: false }} />
        <Stack.Screen name="history"                options={{ headerShown: false }} />
        <Stack.Screen name="purchases"              options={{ headerShown: false }} />
        <Stack.Screen name="provider"               options={{ headerShown: false }} />
        <Stack.Screen name="provider/upload"        options={{ headerShown: false }} />
        <Stack.Screen name="provider/edit/[id]"     options={{ headerShown: false }} />
        <Stack.Screen name="admin"                  options={{ headerShown: false }} />
        <Stack.Screen name="admin/contents"         options={{ headerShown: false }} />
        <Stack.Screen name="admin/users"            options={{ headerShown: false }} />
        <Stack.Screen name="+not-found"             options={{ headerShown: false }} />
      </Stack>

      <AccessGateModal />
      <MiniPlayer />
    </>
  );
}
