/**
 * app/(tabs)/profile.tsx — Placeholder
 * Remplacer par l'écran de profil complet quand prêt.
 */
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/lib/theme';

export default function ProfileScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgBase, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: colors.textMuted, fontFamily: 'DMSans_400Regular', fontSize: 14 }}>
        Profil — à venir
      </Text>
    </SafeAreaView>
  );
}
