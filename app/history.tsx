/**
 * app/history.tsx — Historique de lecture
 *
 * Liste chronologique des contenus regardés/écoutés.
 * Route : GET /history
 * Naviguer vers le contenu ou reprendre la lecture.
 */

import React from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  Image, ActivityIndicator, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useHistory }         from '@/hooks/useHistory';
import { API_BASE_URL, colors } from '@/lib/theme';

export default function HistoryScreen() {
  const { history, loading, error, refresh } = useHistory();

  return (
    <SafeAreaView style={s.root} edges={['top']}>

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Historique</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Contenu */}
      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={s.centered}>
          <Ionicons name="alert-circle-outline" size={40} color={colors.textMuted} style={{ opacity: 0.4 }} />
          <Text style={s.errorText}>{error}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={refresh}>
            <Text style={s.retryText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : history.length === 0 ? (
        <View style={s.centered}>
          <Ionicons name="time-outline" size={52} color={colors.textMuted} style={{ opacity: 0.25 }} />
          <Text style={s.emptyTitle}>Aucun historique</Text>
          <Text style={s.emptySubtitle}>Les contenus regardés apparaîtront ici.</Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item._id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.list}
          renderItem={({ item }) => <HistoryRow item={item} />}
          ItemSeparatorComponent={() => <View style={s.separator} />}
        />
      )}
    </SafeAreaView>
  );
}

// ─── HistoryRow ───────────────────────────────────────────────────────────────

function HistoryRow({ item }: { item: ReturnType<typeof useHistory>['history'][0] }) {
  const thumbnailUri = item.content.thumbnail?.startsWith('http')
    ? item.content.thumbnail
    : `${API_BASE_URL}${item.content.thumbnail}`;

  const progress = item.content.duration > 0
    ? Math.round((item.progress / item.content.duration) * 100)
    : 0;

  const handlePress = () => router.push(`/content/${item.content._id}`);

  const handleResume = () => {
    if (item.content.type === 'video') router.push(`/player/video/${item.content._id}`);
    else                               router.push(`/player/audio/${item.content._id}`);
  };

  return (
    <TouchableOpacity style={s.row} onPress={handlePress} activeOpacity={0.75}>
      {/* Thumbnail */}
      <View style={s.thumbContainer}>
        <Image source={{ uri: thumbnailUri }} style={s.thumbnail} resizeMode="cover" />
        {/* Barre de progression sur la vignette */}
        {progress > 0 && !item.completed && (
          <View style={s.progressBar}>
            <View style={[s.progressFill, { width: `${progress}%` }]} />
          </View>
        )}
        {item.completed && (
          <View style={s.completedBadge}>
            <Ionicons name="checkmark" size={10} color="#fff" />
          </View>
        )}
      </View>

      {/* Infos */}
      <View style={s.info}>
        <Text style={s.title} numberOfLines={2}>{item.content.title}</Text>
        <View style={s.metaRow}>
          <Ionicons
            name={item.content.type === 'video' ? 'play-circle-outline' : 'headset-outline'}
            size={13}
            color={colors.textMuted}
          />
          <Text style={s.meta}>
            {item.completed ? 'Terminé' : `${progress}% · ${formatTime(item.progress)} / ${formatTime(item.content.duration)}`}
          </Text>
        </View>
        <Text style={s.date}>{formatDate(item.watchedAt)}</Text>
      </View>

      {/* Bouton reprendre */}
      {!item.completed && (
        <TouchableOpacity style={s.resumeBtn} onPress={handleResume} accessibilityLabel="Reprendre">
          <Ionicons name="play" size={14} color="#fff" style={{ marginLeft: 2 }} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${m}:${pad(s)}`;
}
function pad(n: number): string { return String(n).padStart(2, '0'); }

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / 86_400_000);
    if (days === 0) return 'Aujourd\'hui';
    if (days === 1) return 'Hier';
    if (days < 7)  return `Il y a ${days} jours`;
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  } catch { return ''; }
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: colors.bgBase },
  header:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, justifyContent: 'space-between' },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, color: colors.textPrimary, fontFamily: 'Sora_600SemiBold' },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingBottom: 80 },
  emptyTitle:   { fontSize: 17, color: colors.textPrimary, fontFamily: 'Sora_600SemiBold' },
  emptySubtitle:{ fontSize: 13, color: colors.textMuted, fontFamily: 'DMSans_400Regular', textAlign: 'center' },
  errorText: { fontSize: 14, color: colors.textSecond, fontFamily: 'DMSans_400Regular', textAlign: 'center' },
  retryBtn:  { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20, backgroundColor: 'rgba(53,132,228,0.12)', borderWidth: 1, borderColor: 'rgba(53,132,228,0.3)' },
  retryText: { color: colors.primary, fontFamily: 'DMSans_500Medium', fontSize: 14 },

  list:      { paddingHorizontal: 16, paddingVertical: 8, paddingBottom: 40 },
  separator: { height: 1, backgroundColor: 'rgba(46,51,71,0.4)', marginLeft: 92 },

  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 },

  thumbContainer: { width: 76, height: 56, borderRadius: 8, overflow: 'hidden', backgroundColor: colors.bgRaised, position: 'relative' },
  thumbnail:      { width: '100%', height: '100%' },
  progressBar:    { position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, backgroundColor: 'rgba(0,0,0,0.4)' },
  progressFill:   { height: 3, backgroundColor: colors.primary },
  completedBadge: { position: 'absolute', bottom: 4, right: 4, width: 16, height: 16, borderRadius: 8, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center' },

  info:    { flex: 1, gap: 3 },
  title:   { fontSize: 14, color: colors.textPrimary, fontFamily: 'DMSans_500Medium', lineHeight: 19 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  meta:    { fontSize: 12, color: colors.textMuted, fontFamily: 'DMSans_400Regular' },
  date:    { fontSize: 11, color: colors.textMuted, fontFamily: 'DMSans_400Regular' },

  resumeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: colors.primary, shadowOpacity: 0.4, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
});
