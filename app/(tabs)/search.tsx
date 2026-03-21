/**
 * app/(tabs)/search.tsx — Placeholder
 * Remplacer par l'écran de recherche complet quand prêt.
 */
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/lib/theme';

export default function SearchScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgBase, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: colors.textMuted, fontFamily: 'DMSans_400Regular', fontSize: 14 }}>
        Recherche — à venir
      </Text>
    </SafeAreaView>
  );
}
