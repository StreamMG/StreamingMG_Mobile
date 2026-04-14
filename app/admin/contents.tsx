/**
 * app/admin/contents.tsx — Modération des contenus
 *
 * Affiche les contenus en attente + publiés.
 * Approuver / Rejeter / Supprimer.
 * Routes :
 *   GET    /admin/contents
 *   PUT    /admin/contents/:id
 *   DELETE /admin/contents/:id
 */

import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  Image, ActivityIndicator, Alert, TextInput,
  StyleSheet, Modal, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useAdminContents }   from '@/hooks/useAdmin';
import type { AdminContent }  from '@/hooks/useAdmin';
import { BASE_URL, colors } from '@/lib/theme';

type FilterType = 'all' | 'pending' | 'published';

export default function AdminContentsScreen() {
  const [filter,         setFilter]         = useState<FilterType>('pending');
  const [rejectId,       setRejectId]       = useState<string | null>(null);
  const [rejectReason,   setRejectReason]   = useState('');

  const { contents, total, loading, error, refresh, approve, reject, remove } =
    useAdminContents(filter);

  const handleApprove = (item: AdminContent) => {
    Alert.alert(
      'Approuver le contenu',
      `Publier "${item.title}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Approuver', onPress: async () => {
          const ok = await approve(item._id);
          if (!ok) Alert.alert('Erreur', 'Impossible d\'approuver ce contenu.');
        }},
      ]
    );
  };

  const handleReject = async () => {
    if (!rejectId || !rejectReason.trim()) return;
    const ok = await reject(rejectId, rejectReason.trim());
    if (ok) { setRejectId(null); setRejectReason(''); }
    else Alert.alert('Erreur', 'Impossible de rejeter ce contenu.');
  };

  const handleDelete = (item: AdminContent) => {
    Alert.alert(
      'Supprimer le contenu',
      `Supprimer définitivement "${item.title}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: async () => {
          const ok = await remove(item._id);
          if (!ok) Alert.alert('Erreur', 'Impossible de supprimer ce contenu.');
        }},
      ]
    );
  };

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Contenus ({total})</Text>
        <TouchableOpacity onPress={refresh} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="refresh-outline" size={20} color={colors.textSecond} />
        </TouchableOpacity>
      </View>

      {/* Filtres */}
      <View style={s.filterRow}>
        {(['pending', 'published', 'all'] as FilterType[]).map((f) => (
          <TouchableOpacity
            key={f}
            style={[s.filterBtn, filter === f && s.filterBtnActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[s.filterBtnText, filter === f && { color: '#fff' }]}>
              {f === 'pending' ? 'En attente' : f === 'published' ? 'Publiés' : 'Tous'}
            </Text>
          </TouchableOpacity>
        ))}
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
      ) : contents.length === 0 ? (
        <View style={s.centered}>
          <Ionicons name="checkmark-circle-outline" size={48} color={colors.textMuted} style={{ opacity: 0.3 }} />
          <Text style={s.emptyText}>Aucun contenu {filter === 'pending' ? 'en attente' : filter === 'published' ? 'publié' : ''}</Text>
        </View>
      ) : (
        <FlatList
          data={contents}
          keyExtractor={(item) => item._id}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <ContentModerationRow
              item={item}
              onApprove={() => handleApprove(item)}
              onReject={() => { setRejectId(item._id); setRejectReason(''); }}
              onDelete={() => handleDelete(item)}
            />
          )}
          ItemSeparatorComponent={() => <View style={s.separator} />}
        />
      )}

      {/* Modal rejet */}
      <Modal visible={!!rejectId} transparent animationType="slide" onRequestClose={() => setRejectId(null)}>
        <Pressable style={s.modalBackdrop} onPress={() => setRejectId(null)}>
          <Pressable style={s.modalSheet} onPress={() => {}}>
            <Text style={s.modalTitle}>Motif de rejet</Text>
            <TextInput
              style={s.rejectInput}
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="Expliquer la raison du rejet…"
              placeholderTextColor={colors.textMuted}
              multiline
              autoFocus
            />
            <TouchableOpacity
              style={[s.rejectBtn, !rejectReason.trim() && { opacity: 0.5 }]}
              onPress={handleReject}
              disabled={!rejectReason.trim()}
            >
              <Text style={s.rejectBtnText}>Rejeter le contenu</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// ─── ContentModerationRow ─────────────────────────────────────────────────────

function ContentModerationRow({ item, onApprove, onReject, onDelete }: {
  item:      AdminContent;
  onApprove: () => void;
  onReject:  () => void;
  onDelete:  () => void;
}) {
  const uri = item.thumbnail?.startsWith('http')
    ? item.thumbnail
    : `${BASE_URL}${item.thumbnail}`;

  return (
    <View style={s.row}>
      <Image source={{ uri }} style={s.thumbnail} resizeMode="cover" />
      <View style={s.rowInfo}>
        <Text style={s.rowTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={s.rowProvider}>Par {item.provider?.username ?? '—'}</Text>
        <Text style={s.rowMeta}>{item.category} · {item.type === 'video' ? 'Vidéo' : 'Audio'} · {item.accessType}</Text>
      </View>
      <View style={s.rowActions}>
        {!item.isPublished && (
          <TouchableOpacity style={[s.actionBtn, { backgroundColor: 'rgba(87,227,137,0.15)' }]} onPress={onApprove}>
            <Ionicons name="checkmark" size={16} color={colors.success} />
          </TouchableOpacity>
        )}
        {!item.isPublished && (
          <TouchableOpacity style={[s.actionBtn, { backgroundColor: 'rgba(245,194,17,0.12)' }]} onPress={onReject}>
            <Ionicons name="close" size={16} color={colors.warning} />
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[s.actionBtn, { backgroundColor: 'rgba(237,51,59,0.1)' }]} onPress={onDelete}>
          <Ionicons name="trash-outline" size={15} color={colors.error} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: colors.bgBase },
  header:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, color: colors.textPrimary, fontFamily: 'Sora_600SemiBold' },

  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 8 },
  filterBtn:      { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 18, backgroundColor: colors.bgSurface, borderWidth: 1, borderColor: 'rgba(46,51,71,0.7)' },
  filterBtnActive:{ backgroundColor: colors.primary, borderColor: colors.primary },
  filterBtnText:  { fontSize: 13, color: colors.textSecond, fontFamily: 'DMSans_500Medium' },

  centered:  { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontSize: 14, color: colors.textMuted, fontFamily: 'DMSans_400Regular' },
  errorText: { fontSize: 14, color: colors.textSecond, fontFamily: 'DMSans_400Regular' },
  retryBtn:  { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20, backgroundColor: 'rgba(53,132,228,0.12)', borderWidth: 1, borderColor: 'rgba(53,132,228,0.3)' },
  retryText: { color: colors.primary, fontFamily: 'DMSans_500Medium', fontSize: 14 },

  list:      { paddingHorizontal: 16, paddingVertical: 8, paddingBottom: 40 },
  separator: { height: 1, backgroundColor: 'rgba(46,51,71,0.4)', marginLeft: 88 },

  row:        { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  thumbnail:  { width: 72, height: 52, borderRadius: 8, backgroundColor: colors.bgRaised },
  rowInfo:    { flex: 1, gap: 2 },
  rowTitle:   { fontSize: 13, color: colors.textPrimary, fontFamily: 'DMSans_600SemiBold' },
  rowProvider:{ fontSize: 11, color: colors.primary, fontFamily: 'DMSans_400Regular' },
  rowMeta:    { fontSize: 11, color: colors.textMuted, fontFamily: 'DMSans_400Regular' },
  rowActions: { flexDirection: 'row', gap: 6 },
  actionBtn:  { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(13,16,24,0.75)', justifyContent: 'flex-end' },
  modalSheet:    { backgroundColor: colors.bgSurface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 44, gap: 14 },
  modalTitle:    { fontSize: 17, color: colors.textPrimary, fontFamily: 'Sora_700Bold' },
  rejectInput:   { backgroundColor: colors.bgRaised, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(46,51,71,0.7)', padding: 14, color: colors.textPrimary, fontFamily: 'DMSans_400Regular', fontSize: 14, height: 100, textAlignVertical: 'top' },
  rejectBtn:     { paddingVertical: 14, borderRadius: 24, backgroundColor: colors.error, alignItems: 'center' },
  rejectBtnText: { color: '#fff', fontSize: 15, fontFamily: 'Sora_600SemiBold' },
});
