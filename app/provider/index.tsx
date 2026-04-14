/**
 * app/provider/index.tsx — Espace Fournisseur — Liste
 *
 * Liste les contenus du fournisseur connecté.
 * Accès : rôle provider ou admin.
 * Route : GET /provider/contents
 */

import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  Image, ActivityIndicator, Alert, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useProviderList }    from '@/hooks/useProvider';
import type { ProviderContent } from '@/hooks/useProvider';
import { BASE_URL, colors } from '@/lib/theme';

export default function ProviderIndexScreen() {
  const { contents, total, loading, error, refresh, deleteContent } = useProviderList();

  const handleDelete = (item: ProviderContent) => {
    Alert.alert(
      'Supprimer le contenu',
      `Supprimer "${item.title}" ? Cette action est irréversible.`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: async () => {
          const ok = await deleteContent(item._id);
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
        <View>
          <Text style={s.headerTitle}>Mes contenus</Text>
          {!loading && <Text style={s.headerSub}>{total} contenu{total > 1 ? 's' : ''}</Text>}
        </View>
        <TouchableOpacity
          style={s.uploadBtn}
          onPress={() => router.push('/provider/upload')}
          accessibilityLabel="Déposer un contenu"
        >
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

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
      ) : contents.length === 0 ? (
        <View style={s.centered}>
          <Ionicons name="cloud-upload-outline" size={52} color={colors.textMuted} style={{ opacity: 0.25 }} />
          <Text style={s.emptyTitle}>Aucun contenu</Text>
          <Text style={s.emptySub}>Commencez par déposer votre premier contenu.</Text>
          <TouchableOpacity style={s.ctaBtn} onPress={() => router.push('/provider/upload')}>
            <Text style={s.ctaBtnText}>Déposer un contenu</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={contents}
          keyExtractor={(item) => item._id}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <ContentRow
              item={item}
              onEdit={() => router.push(`/provider/edit/${item._id}`)}
              onDelete={() => handleDelete(item)}
            />
          )}
          ItemSeparatorComponent={() => <View style={s.separator} />}
        />
      )}
    </SafeAreaView>
  );
}

// ─── ContentRow ───────────────────────────────────────────────────────────────

function ContentRow({ item, onEdit, onDelete }: {
  item: ProviderContent;
  onEdit:   () => void;
  onDelete: () => void;
}) {
  const uri = item.thumbnail?.startsWith('http')
    ? item.thumbnail
    : `${BASE_URL}${item.thumbnail}`;

  return (
    <View style={s.row}>
      <Image source={{ uri }} style={s.thumbnail} resizeMode="cover" />
      <View style={s.rowInfo}>
        <Text style={s.rowTitle} numberOfLines={1}>{item.title}</Text>
        <View style={s.rowMeta}>
          <StatusBadge isPublished={item.isPublished} />
          <Text style={s.rowCategory}>{item.category} · {item.type === 'video' ? 'Vidéo' : 'Audio'}</Text>
        </View>
        <Text style={s.rowViews}>{item.viewCount} vue{item.viewCount > 1 ? 's' : ''}</Text>
      </View>
      <View style={s.rowActions}>
        <TouchableOpacity style={s.actionBtn} onPress={onEdit} accessibilityLabel="Modifier">
          <Ionicons name="pencil-outline" size={18} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={s.actionBtn} onPress={onDelete} accessibilityLabel="Supprimer">
          <Ionicons name="trash-outline" size={18} color={colors.error} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function StatusBadge({ isPublished }: { isPublished: boolean }) {
  return (
    <View style={[s.statusBadge, { backgroundColor: isPublished ? 'rgba(87,227,137,0.12)' : 'rgba(245,194,17,0.12)' }]}>
      <View style={[s.statusDot, { backgroundColor: isPublished ? colors.success : colors.warning }]} />
      <Text style={[s.statusText, { color: isPublished ? colors.success : colors.warning }]}>
        {isPublished ? 'Publié' : 'En attente'}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: colors.bgBase },
  header:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, color: colors.textPrimary, fontFamily: 'Sora_700Bold' },
  headerSub:   { fontSize: 12, color: colors.textMuted, fontFamily: 'DMSans_400Regular' },
  uploadBtn:   { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },

  centered:   { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingBottom: 80 },
  emptyTitle: { fontSize: 17, color: colors.textPrimary, fontFamily: 'Sora_600SemiBold' },
  emptySub:   { fontSize: 13, color: colors.textMuted, fontFamily: 'DMSans_400Regular', textAlign: 'center' },
  ctaBtn:     { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24, backgroundColor: colors.primary, marginTop: 8 },
  ctaBtnText: { color: '#fff', fontFamily: 'Sora_600SemiBold', fontSize: 14 },
  errorText:  { fontSize: 14, color: colors.textSecond, fontFamily: 'DMSans_400Regular', textAlign: 'center' },
  retryBtn:   { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20, backgroundColor: 'rgba(53,132,228,0.12)', borderWidth: 1, borderColor: 'rgba(53,132,228,0.3)' },
  retryText:  { color: colors.primary, fontFamily: 'DMSans_500Medium', fontSize: 14 },

  list:      { paddingHorizontal: 16, paddingVertical: 8, paddingBottom: 40 },
  separator: { height: 1, backgroundColor: 'rgba(46,51,71,0.4)', marginLeft: 86 },

  row:       { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  thumbnail: { width: 72, height: 52, borderRadius: 8, backgroundColor: colors.bgRaised },
  rowInfo:   { flex: 1, gap: 3 },
  rowTitle:  { fontSize: 14, color: colors.textPrimary, fontFamily: 'DMSans_600SemiBold' },
  rowMeta:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowCategory:{ fontSize: 11, color: colors.textMuted, fontFamily: 'DMSans_400Regular' },
  rowViews:  { fontSize: 11, color: colors.textMuted, fontFamily: 'DMSans_400Regular' },
  rowActions:{ flexDirection: 'row', gap: 4 },
  actionBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.bgRaised, alignItems: 'center', justifyContent: 'center' },

  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  statusDot:   { width: 6, height: 6, borderRadius: 3 },
  statusText:  { fontSize: 10, fontFamily: 'DMSans_600SemiBold' },
});
