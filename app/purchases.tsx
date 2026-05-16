/**
 * app/purchases.tsx — Mes achats
 *
 * Liste des contenus achetés définitivement.
 * Route : GET /payment/purchases (via purchaseStore déjà chargé dans useProfile)
 */

import React from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  Image, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { usePurchaseStore }   from '@/stores/purchaseStore';
import{BASE_URL, colors } from '@/lib/theme';

export default function PurchasesScreen() {
  const purchases = usePurchaseStore((s) => s.purchases);

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Mes achats</Text>
        <View style={{ width: 40 }} />
      </View>

      {purchases.length === 0 ? (
        <View style={s.centered}>
          <Ionicons name="bag-check-outline" size={52} color={colors.textMuted} style={{ opacity: 0.25 }} />
          <Text style={s.emptyTitle}>Aucun achat</Text>
          <Text style={s.emptySubtitle}>Vos contenus achetés apparaîtront ici.</Text>
          <TouchableOpacity style={s.browseBtn} onPress={() => router.replace('/(tabs)')}>
            <Text style={s.browseBtnText}>Parcourir le catalogue</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={purchases}
          keyExtractor={(item) => item.contentId}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const uri = item.thumbnail?.startsWith('http')
              ? item.thumbnail
              : `${BASE_URL}${item.thumbnail}`;
            return (
              <TouchableOpacity
                style={s.row}
                onPress={() => router.push(`/content/${item.contentId}`)}
                activeOpacity={0.75}
              >
                <Image source={{ uri }} style={s.thumbnail} resizeMode="cover" />
                <View style={s.info}>
                  <Text style={s.title} numberOfLines={2}>{item.title}</Text>
                  <Text style={s.price}>{formatPrice(item.amount)}</Text>
                  <View style={s.permanentBadge}>
                    <Ionicons name="infinite-outline" size={11} color={colors.teal} />
                    <Text style={s.permanentText}>Accès permanent</Text>
                  </View>
                  <Text style={s.date}>
                    Acheté le {new Date(item.purchasedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            );
          }}
          ItemSeparatorComponent={() => <View style={s.separator} />}
        />
      )}
    </SafeAreaView>
  );
}

function formatPrice(ar: number): string {
  if (ar >= 1_000_000) return `${(ar / 1_000_000).toFixed(1)}M Ar`;
  if (ar >= 1000)      return `${(ar / 1000).toFixed(0)}k Ar`;
  return `${ar} Ar`;
}


const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: colors.bgBase },
  header:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, justifyContent: 'space-between' },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, color: colors.textPrimary, fontFamily: 'Sora_600SemiBold' },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingBottom: 80 },
  emptyTitle:   { fontSize: 17, color: colors.textPrimary, fontFamily: 'Sora_600SemiBold' },
  emptySubtitle:{ fontSize: 13, color: colors.textMuted, fontFamily: 'DMSans_400Regular', textAlign: 'center' },
  browseBtn:    { paddingHorizontal: 24, paddingVertical: 11, borderRadius: 24, backgroundColor: 'rgba(53,132,228,0.12)', borderWidth: 1, borderColor: 'rgba(53,132,228,0.3)', marginTop: 8 },
  browseBtnText:{ color: colors.primary, fontFamily: 'DMSans_500Medium', fontSize: 14 },

  list:      { paddingHorizontal: 16, paddingVertical: 8, paddingBottom: 40 },
  separator: { height: 1, backgroundColor: 'rgba(46,51,71,0.4)', marginLeft: 90 },

  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 },
  thumbnail: { width: 72, height: 100, borderRadius: 8, backgroundColor: colors.bgRaised },
  info:  { flex: 1, gap: 3 },
  title: { fontSize: 14, color: colors.textPrimary, fontFamily: 'DMSans_600SemiBold', lineHeight: 19 },
  price: { fontSize: 13, color: colors.teal, fontFamily: 'Sora_600SemiBold' },
  permanentBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  permanentText:  { fontSize: 11, color: colors.teal, fontFamily: 'DMSans_400Regular' },
  date:  { fontSize: 11, color: colors.textMuted, fontFamily: 'DMSans_400Regular' },
});
