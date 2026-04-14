/**
 * app/admin/index.tsx — Dashboard administrateur
 *
 * Statistiques globales de la plateforme.
 * Route : GET /admin/stats
 */

import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, Image, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useAdminStats }    from '@/hooks/useAdmin';
import { BASE_URL, colors } from '@/lib/theme';

export default function AdminIndexScreen() {
  const { stats, loading, error, refresh } = useAdminStats();

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Administration</Text>
        <TouchableOpacity onPress={refresh} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="refresh-outline" size={22} color={colors.textSecond} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.centered}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : error ? (
        <View style={s.centered}>
          <Text style={s.errorText}>{error}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={refresh}>
            <Text style={s.retryText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : stats ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

          {/* ── Navigation rapide ── */}
          <View style={s.navRow}>
            <AdminNavBtn icon="document-text-outline" label="Contenus" badge={stats.pendingContents} onPress={() => router.push('/admin/contents')} />
            <AdminNavBtn icon="people-outline" label="Utilisateurs" onPress={() => router.push('/admin/users')} />
          </View>

          {/* ── Stats principales ── */}
          <Text style={s.sectionTitle}>{"Vue d'ensemble"}</Text>
          <View style={s.statsGrid}>
            <StatCard icon="people"          label="Utilisateurs"  value={stats.totalUsers}        color={colors.primary} />
            <StatCard icon="star"            label="Premium"       value={stats.premiumUsers}       color={colors.gold} />
            <StatCard icon="film"            label="Contenus"      value={stats.publishedContents}  color={colors.teal} />
            <StatCard icon="time"            label="En attente"    value={stats.pendingContents}    color={colors.warning} />
            <StatCard icon="eye"             label="Vues totales"  value={stats.totalViews}         color={colors.primaryLight} />
            <StatCard icon="bag-check"       label="Achats 30j"    value={stats.recentPurchases30d} color={colors.teal} />
          </View>

          {/* ── Revenus simulés ── */}
          <View style={s.revenueCard}>
            <Text style={s.revenueLabel}>Revenus simulés (30 jours)</Text>
            <Text style={s.revenueValue}>{formatPrice(stats.revenueSimulated30d)}</Text>
            <Text style={s.revenueSub}>Stripe mode test — aucun débit réel</Text>
          </View>

          {/* ── Top contenus ── */}
          {stats.topPurchasedContents.length > 0 && (
            <>
              <Text style={s.sectionTitle}>Top achats</Text>
              {stats.topPurchasedContents.map((item, i) => {
                const uri = item.thumbnail?.startsWith('http') ? item.thumbnail : `${BASE_URL}${item.thumbnail}`;
                return (
                  <View key={i} style={s.topRow}>
                    <Text style={s.topRank}>#{i + 1}</Text>
                    <Image source={{ uri }} style={s.topThumb} resizeMode="cover" />
                    <View style={{ flex: 1 }}>
                      <Text style={s.topTitle} numberOfLines={1}>{item.title}</Text>
                      <Text style={s.topMeta}>{item.totalSales} vente{item.totalSales > 1 ? 's' : ''} · {formatPrice(item.totalRevenue)}</Text>
                    </View>
                  </View>
                );
              })}
            </>
          )}
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

function AdminNavBtn({ icon, label, badge, onPress }: {
  icon: string; label: string; badge?: number; onPress: () => void;
}) {
  return (
    <TouchableOpacity style={s.navBtn} onPress={onPress} activeOpacity={0.8}>
      <View style={s.navBtnIcon}>
        <Ionicons name={icon as any} size={22} color={colors.primary} />
        {badge !== undefined && badge > 0 && (
          <View style={s.navBtnBadge}><Text style={s.navBtnBadgeText}>{badge}</Text></View>
        )}
      </View>
      <Text style={s.navBtnLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function StatCard({ icon, label, value, color }: {
  icon: string; label: string; value: number; color: string;
}) {
  return (
    <View style={s.statCard}>
      <Ionicons name={icon as any} size={20} color={color} />
      <Text style={s.statValue}>{value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function formatPrice(ar: number): string {
  if (ar >= 1_000_000) return `${(ar / 1_000_000).toFixed(1)}M Ar`;
  if (ar >= 1000)      return `${(ar / 1000).toFixed(0)}k Ar`;
  return `${ar} Ar`;
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: colors.bgBase },
  scroll:  { padding: 16, paddingBottom: 40 },
  centered:{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  header:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, color: colors.textPrimary, fontFamily: 'Sora_700Bold' },

  navRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  navBtn: { flex: 1, backgroundColor: colors.bgSurface, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(46,51,71,0.7)', padding: 16, alignItems: 'center', gap: 8 },
  navBtnIcon: { position: 'relative' },
  navBtnBadge:     { position: 'absolute', top: -6, right: -8, backgroundColor: colors.warning, borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1 },
  navBtnBadgeText: { fontSize: 10, color: '#1a1200', fontFamily: 'DMSans_600SemiBold' },
  navBtnLabel: { fontSize: 13, color: colors.textSecond, fontFamily: 'DMSans_500Medium' },

  sectionTitle: { fontSize: 14, color: colors.textSecond, fontFamily: 'DMSans_600SemiBold', letterSpacing: 0.5, marginBottom: 10, marginTop: 4 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statCard:  { width: '30%', flexGrow: 1, backgroundColor: colors.bgSurface, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(46,51,71,0.7)', padding: 12, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 20, color: colors.textPrimary, fontFamily: 'Sora_700Bold' },
  statLabel: { fontSize: 10, color: colors.textMuted, fontFamily: 'DMSans_400Regular', textAlign: 'center' },

  revenueCard: { backgroundColor: 'rgba(53,132,228,0.08)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(53,132,228,0.2)', padding: 16, marginBottom: 20, alignItems: 'center', gap: 4 },
  revenueLabel:{ fontSize: 12, color: colors.textSecond, fontFamily: 'DMSans_400Regular' },
  revenueValue:{ fontSize: 28, color: colors.primary, fontFamily: 'Sora_800ExtraBold', letterSpacing: -0.5 },
  revenueSub:  { fontSize: 11, color: colors.textMuted, fontFamily: 'DMSans_400Regular' },

  topRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(46,51,71,0.4)' },
  topRank:  { fontSize: 14, color: colors.textMuted, fontFamily: 'Sora_700Bold', width: 24, textAlign: 'center' },
  topThumb: { width: 52, height: 36, borderRadius: 6, backgroundColor: colors.bgRaised },
  topTitle: { fontSize: 13, color: colors.textPrimary, fontFamily: 'DMSans_500Medium' },
  topMeta:  { fontSize: 11, color: colors.textMuted, fontFamily: 'DMSans_400Regular', marginTop: 2 },

  errorText: { fontSize: 14, color: colors.textSecond, fontFamily: 'DMSans_400Regular', textAlign: 'center' },
  retryBtn:  { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20, backgroundColor: 'rgba(53,132,228,0.12)', borderWidth: 1, borderColor: 'rgba(53,132,228,0.3)' },
  retryText: { color: colors.primary, fontFamily: 'DMSans_500Medium', fontSize: 14 },
});
