/**
 * app/offline.tsx — Bibliothèque hors-ligne
 *
 * Liste tous les contenus téléchargés avec :
 *  - Lecture directe hors-ligne via /player/offline/:id (plus /content/:id)
 *  - Suppression avec confirmation + nettoyage du fichier .enc et de la clé AES
 *  - Indicateur visuel "Chiffré" sur chaque item
 *
 * Route : /offline
 */

import React from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  Alert, StyleSheet, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useDownloadStore } from '@/stores/downloadStore';
import { BASE_URL, colors } from '@/lib/theme';

export default function OfflineScreen() {
  const { downloads, removeDownload } = useDownloadStore();

  const handleDelete = (contentId: string, title: string) => {
    Alert.alert(
      'Supprimer le téléchargement',
      `Supprimer "${title}" de vos téléchargements ?\n\nLe fichier chiffré sera définitivement supprimé.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => removeDownload(contentId),
        },
      ]
    );
  };

  /**
   * Ouvre le lecteur hors-ligne adapté au type de contenu.
   * /player/offline/:id gère vidéo et audio chiffrés (déchiffrement en mémoire).
   */
  const handlePlay = (contentId: string) => {
    router.push(`/player/offline/${contentId}`);
  };

  return (
    <SafeAreaView style={s.root} edges={['top']}>

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Téléchargements</Text>
        <View style={{ width: 40 }} />
      </View>

      {downloads.length === 0 ? (
        <View style={s.empty}>
          <Ionicons
            name="download-outline"
            size={56}
            color={colors.textMuted}
            style={{ opacity: 0.3 }}
          />
          <Text style={s.emptyTitle}>Aucun téléchargement</Text>
          <Text style={s.emptySubtitle}>
            Les contenus téléchargés apparaîtront ici pour une lecture hors-ligne.
          </Text>
          <TouchableOpacity
            style={s.browseBtn}
            onPress={() => router.replace('/(tabs)')}
          >
            <Text style={s.browseBtnText}>Parcourir le catalogue</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={downloads}
          keyExtractor={(item) => item.contentId}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const thumbnailUri = item.thumbnail?.startsWith('http')
              ? item.thumbnail
              : `${BASE_URL}${item.thumbnail}`;

            return (
              <TouchableOpacity
                style={s.item}
                onPress={() => handlePlay(item.contentId)}
                activeOpacity={0.78}
              >
                {/* Thumbnail + badge play */}
                <View style={s.thumbnailWrapper}>
                  <Image
                    source={{ uri: thumbnailUri }}
                    style={s.thumbnail}
                    resizeMode="cover"
                  />
                  <View style={s.playOverlay}>
                    <Ionicons
                      name={item.type === 'video' ? 'play' : 'headset'}
                      size={18}
                      color="#fff"
                    />
                  </View>
                </View>

                {/* Infos */}
                <View style={s.itemInfo}>
                  <Text style={s.itemTitle} numberOfLines={2}>{item.title}</Text>
                  <View style={s.itemMeta}>
                    <Ionicons
                      name={item.type === 'video' ? 'film-outline' : 'musical-notes-outline'}
                      size={12}
                      color={colors.textMuted}
                    />
                    <Text style={s.itemMetaText}>{formatDuration(item.duration)}</Text>
                    <Text style={s.itemMetaDot}>·</Text>
                    <Ionicons name="lock-closed-outline" size={11} color={colors.teal} />
                    <Text style={[s.itemMetaText, { color: colors.teal }]}>Chiffré</Text>
                  </View>
                  <Text style={s.itemDate}>
                    Téléchargé le {formatDate(item.downloadedAt)}
                  </Text>
                </View>

                {/* Bouton supprimer */}
                <TouchableOpacity
                  style={s.deleteBtn}
                  onPress={() => handleDelete(item.contentId, item.title)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel={`Supprimer ${item.title}`}
                >
                  <Ionicons name="trash-outline" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          }}
          ItemSeparatorComponent={() => <View style={s.separator} />}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(sec: number | null): string {
  if (!sec) return '--';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) return `${h}h${m > 0 ? m + 'min' : ''}`;
  if (m > 0) return `${m}min`;
  return `${s}s`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'long',
    });
  } catch {
    return '';
  }
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: colors.bgBase },
  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, justifyContent: 'space-between' },
  backBtn:     { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, color: colors.textPrimary, fontFamily: 'Sora_600SemiBold' },

  empty:         { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 40, paddingBottom: 80 },
  emptyTitle:    { fontSize: 18, color: colors.textPrimary, fontFamily: 'Sora_700Bold' },
  emptySubtitle: { fontSize: 14, color: colors.textSecond, fontFamily: 'DMSans_400Regular', textAlign: 'center', lineHeight: 20 },
  browseBtn:     { marginTop: 8, paddingHorizontal: 24, paddingVertical: 11, borderRadius: 24, backgroundColor: 'rgba(53,132,228,0.12)', borderWidth: 1, borderColor: 'rgba(53,132,228,0.3)' },
  browseBtnText: { color: colors.primary, fontFamily: 'DMSans_500Medium', fontSize: 14 },

  list:            { paddingHorizontal: 16, paddingVertical: 8, paddingBottom: 40 },
  item:            { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 },
  thumbnailWrapper:{ position: 'relative' },
  thumbnail:       { width: 72, height: 52, borderRadius: 8, backgroundColor: colors.bgRaised },
  playOverlay:     { position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 8 },
  itemInfo:        { flex: 1, gap: 3 },
  itemTitle:       { fontSize: 14, color: colors.textPrimary, fontFamily: 'DMSans_500Medium', lineHeight: 19 },
  itemMeta:        { flexDirection: 'row', alignItems: 'center', gap: 4 },
  itemMetaText:    { fontSize: 12, color: colors.textMuted, fontFamily: 'DMSans_400Regular' },
  itemMetaDot:     { fontSize: 12, color: colors.textMuted },
  itemDate:        { fontSize: 11, color: colors.textMuted, fontFamily: 'DMSans_400Regular', marginTop: 2 },
  deleteBtn:       { padding: 6 },
  separator:       { height: 1, backgroundColor: 'rgba(46,51,71,0.4)', marginLeft: 86 },
});
