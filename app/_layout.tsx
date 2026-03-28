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
import { AccessGateModal } from '@/components/content/AccessGateModal';
import { MiniPlayer }      from '@/components/player/MiniPlayer';
import "../styles/global.css"


export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};


SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
const [loaded, error] = useFonts({
  Sora_400Regular:    require('../assets/fonts/Sora/static/Sora-Regular.ttf'),
  Sora_500Medium:     require('../assets/fonts/Sora/static/Sora-Medium.ttf'),
  Sora_600SemiBold:   require('../assets/fonts/Sora/static/Sora-SemiBold.ttf'),
  Sora_700Bold:       require('../assets/fonts/Sora/static/Sora-Bold.ttf'),
  Sora_800ExtraBold:  require('../assets/fonts/Sora/static/Sora-ExtraBold.ttf'),
  DMSans_400Regular:  require('../assets/fonts/DM_Sans/static/DMSans-Regular.ttf'),
  DMSans_500Medium:   require('../assets/fonts/DM_Sans/static/DMSans-Medium.ttf'),
  DMSans_600SemiBold: require('../assets/fonts/DM_Sans/static/DMSans-SemiBold.ttf'),
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

        <Stack.Screen name="+not-found" options={{ headerShown: false }} />
      </Stack>

      <AccessGateModal />
      <MiniPlayer />
    </>
  );
}
