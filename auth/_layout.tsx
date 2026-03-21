import { Stack } from 'expo-router';

/**
 * Layout du groupe (auth).
 * Regroupe les routes : /login, /register, /forgot-password
 * Header masqué — chaque écran gère son propre header.
 */
export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }} />
  );
}
