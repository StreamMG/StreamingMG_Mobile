/**
 * app/download/[id].tsx — Écran de téléchargement
 *
 * Flux :
 *  1. Charge les métadonnées du contenu
 *  2. Lance useDownload.start()
 *  3. Affiche progression + état
 *  4. Succès → retour ou navigation hors-ligne
 *
 * Route : /download/:id
 * Importe : useDownload, useDownloadStore, colors
 */

import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity,
  ActivityIndicator, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useDownload }      from '@/hooks/useDownload';
import { useDownloadStore } from '@/stores/downloadStore';
import { apiClient }        from '@/lib/apiClient';
import { colors }           from '@/lib/theme';

export default function DownloadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { start, cancel, progress, status, error } = useDownload();
  const isDownloaded = useDownloadStore((s) => s.isDownloaded);

  const [contentTitle, setContentTitle] = useState('');
  const [loadingMeta,  setLoadingMeta]  = useState(true);

  // Charger les métadonnées puis lancer le téléchargement
  useEffect(() => {
    if (!id) return;

    const init = async () => {
      try {
        const { data } = await apiClient.get(`/contents/${id}`);
        setContentTitle(data.title);
        setLoadingMeta(false);

        // Si déjà téléchargé → pas besoin de relancer
        if (isDownloaded(id)) return;

        await start(id, data.title, data.thumbnail, data.type, data.duration);
      } catch {
        setLoadingMeta(false);
      }
    };

    init();

    return () => {
      // Ne pas annuler si on quitte — le download continue en arrière-plan
    };
  }, [id, isDownloaded, start]);

  // ── Rendu ──────────────────────────────────────────────────────────────────

  const alreadyDone = isDownloaded(id ?? '');

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => router.back()}
          accessibilityLabel="Retour"
        >
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Téléchargement</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={s.body}>
        {/* Icône */}
        <View style={[
          s.iconCircle,
          status === 'complete' || alreadyDone
            ? { backgroundColor: 'rgba(87,227,137,0.12)' }
            : status === 'error'
            ? { backgroundColor: 'rgba(237,51,59,0.12)' }
            : { backgroundColor: 'rgba(53,132,228,0.12)' },
        ]}>
          <Ionicons
            name={
              status === 'complete' || alreadyDone ? 'checkmark-circle'
              : status === 'error' ? 'alert-circle'
              : 'download'
            }
            size={48}
            color={
              status === 'complete' || alreadyDone ? colors.success
              : status === 'error' ? colors.error
              : colors.primary
            }
          />
        </View>

        {/* Titre */}
        <Text style={s.title} numberOfLines={2}>
          {loadingMeta ? '...' : contentTitle}
        </Text>

        {/* État */}
        {(status === 'idle' || status === 'pending' || loadingMeta) && !alreadyDone && (
          <>
            <ActivityIndicator color={colors.primary} />
            <Text style={s.statusText}>Préparation du téléchargement…</Text>
          </>
        )}

        {status === 'downloading' && (
          <>
            {/* Barre de progression */}
            <View style={s.progressTrack}>
              <View style={[s.progressFill, { width: `${progress}%` }]} />
            </View>
            <Text style={s.progressText}>{progress}%</Text>
            <Text style={s.statusText}>Téléchargement en cours…</Text>

            {/* Annuler */}
            <TouchableOpacity style={s.cancelBtn} onPress={cancel}>
              <Text style={s.cancelText}>Annuler</Text>
            </TouchableOpacity>
          </>
        )}

        {(status === 'complete' || alreadyDone) && (
          <>
            <Text style={s.successText}>
              {alreadyDone && status !== 'complete'
                ? 'Ce contenu est déjà disponible hors-ligne.'
                : 'Téléchargement terminé !'}
            </Text>
            <TouchableOpacity
              style={s.primaryBtn}
              onPress={() => router.push('/offline')}
            >
              <Text style={s.primaryBtnText}>Voir mes téléchargements</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.ghostBtn}
              onPress={() => router.back()}
            >
              <Text style={s.ghostBtnText}>Retour au contenu</Text>
            </TouchableOpacity>
          </>
        )}

        {status === 'error' && (
          <>
            <Text style={s.errorText}>{error}</Text>
            <TouchableOpacity
              style={s.primaryBtn}
              onPress={() => router.back()}
            >
              <Text style={s.primaryBtnText}>Retour</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: colors.bgBase },
  header:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, justifyContent: 'space-between' },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, color: colors.textPrimary, fontFamily: 'Sora_600SemiBold' },

  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },

  iconCircle: {
    width: 96, height: 96, borderRadius: 48,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },

  title: {
    fontSize: 20, color: colors.textPrimary,
    fontFamily: 'Sora_700Bold', textAlign: 'center',
    letterSpacing: -0.3,
  },

  progressTrack: {
    width: '100%', height: 6,
    backgroundColor: colors.bgRaised,
    borderRadius: 3, overflow: 'hidden',
  },
  progressFill: {
    height: 6, backgroundColor: colors.primary, borderRadius: 3,
  },
  progressText: {
    fontSize: 24, color: colors.primary,
    fontFamily: 'Sora_700Bold',
  },

  statusText:  { fontSize: 14, color: colors.textSecond, fontFamily: 'DMSans_400Regular', textAlign: 'center' },
  successText: { fontSize: 14, color: colors.success,    fontFamily: 'DMSans_400Regular', textAlign: 'center' },
  errorText:   { fontSize: 14, color: colors.error,      fontFamily: 'DMSans_400Regular', textAlign: 'center' },

  primaryBtn: {
    width: '100%', paddingVertical: 14, borderRadius: 28,
    backgroundColor: colors.primary, alignItems: 'center',
    shadowColor: colors.primary, shadowOpacity: 0.35, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 5,
  },
  primaryBtnText: { color: '#fff', fontSize: 15, fontFamily: 'Sora_600SemiBold' },

  ghostBtn: { width: '100%', paddingVertical: 12, alignItems: 'center' },
  ghostBtnText: { color: colors.textSecond, fontSize: 14, fontFamily: 'DMSans_400Regular' },

  cancelBtn: {
    paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20,
    backgroundColor: 'rgba(237,51,59,0.1)',
    borderWidth: 1, borderColor: 'rgba(237,51,59,0.3)',
  },
  cancelText: { color: colors.error, fontFamily: 'DMSans_500Medium', fontSize: 14 },
});
