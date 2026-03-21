/**
 * SectionRow.tsx — StreamMG
 * Wrapper réutilisable pour les sections de l'accueil :
 * titre + "Voir tout" + FlatList horizontale de ContentCards.
 *
 * Usage :
 *  <SectionRow
 *    title="Tendances"
 *    data={trending}
 *    onSeeAll={() => router.push('/explorer?section=trending')}
 *    onPressItem={(item) => router.push(`/content/${item._id}`)}
 *  />
 *  <SectionRow title="Tutoriels en cours" data={inProgress} progressMap={progressMap} />
 */

import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { ContentCard, ContentItem } from '@/components/content/ContentCard';
import { colors, spacing } from '@/lib/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SectionRowProps {
  title: string;
  data: ContentItem[];
  /** Map _id → progression pour les tutoriels en cours */
  progressMap?: Record<string, number>;
  onSeeAll?: () => void;
  onPressItem?: (item: ContentItem) => void;
  apiBaseUrl?: string;
  /** Afficher un état vide si data est vide */
  emptyLabel?: string;
}

// ─── Composant ────────────────────────────────────────────────────────────────

export function SectionRow({
  title,
  data,
  progressMap,
  onSeeAll,
  onPressItem,
  apiBaseUrl,
  emptyLabel = 'Aucun contenu disponible',
}: SectionRowProps) {
  if (data.length === 0) return null;

  return (
    <View style={s.section}>
      {/* ── En-tête ── */}
      <View style={s.header}>
        <Text style={s.sectionTitle}>{title}</Text>
        {onSeeAll && (
          <TouchableOpacity
            onPress={onSeeAll}
            style={s.seeAll}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`Voir tout — ${title}`}
          >
            <Text style={s.seeAllTxt}>Voir tout</Text>
            <ChevronRight size={14} color={colors.primary} strokeWidth={2} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Liste horizontale ── */}
      <FlatList
        data={data}
        keyExtractor={(item) => item._id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.list}
        ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
        renderItem={({ item }) => (
          <ContentCard
            content={item}
            size="horizontal"
            progress={progressMap?.[item._id] ?? null}
            onPress={() => onPressItem?.(item)}
            apiBaseUrl={apiBaseUrl}
          />
        )}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  section: {
    gap: 12,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
  },

  sectionTitle: {
    fontFamily: 'Sora_700Bold',
    fontSize: 18,
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },

  seeAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },

  seeAllTxt: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: colors.primary,
  },

  list: {
    paddingHorizontal: spacing[4],
    paddingBottom: 2, // évite que l'ombre des cartes soit coupée
  },
});
