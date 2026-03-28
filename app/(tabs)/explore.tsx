/**
 * app/(tabs)/explore.tsx — Écran Explorer StreamMG
 *
 * Filtrage hiérarchique : type → category → subCategory
 * Affichage : grille 2 colonnes avec pagination au scroll
 *
 * Importe  : useExploreData, ContentCard, colors
 * Monté par: app/(tabs)/_layout.tsx
 */

import React, { useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  ActivityIndicator, ScrollView, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ContentCard }  from '@/components/content/ContentCard';
import type { ContentItem } from '@/components/content/ContentCard';
import {
  useExploreData,
  CATEGORIES_BY_TYPE,
  SUBCATEGORIES_BY_CATEGORY,
  type MediaType,
  type Category,
} from '@/hooks/useExploreData';
import { colors } from '@/lib/theme';

// ─── Labels affichage ────────────────────────────────────────────────────────

const TYPE_LABELS: Record<MediaType, string> = {
  video: 'Vidéo',
  audio: 'Audio',
};

const CATEGORY_LABELS: Record<Category, string> = {
  film:         'Film',
  musique:      'Musique',
  podcast:      'Podcast',
  tutoriel:     'Tutoriel',
  documentaire: 'Documentaire',
  tantara:      'Tantara',
};

const SUBCATEGORY_LABELS: Record<string, string> = {
  'salegy':   'Salegy',
  'hira-gasy':'Hira Gasy',
  'tsapiky':  'Tsapiky',
  'beko':     'Beko',
  'tantara':  'Tantara',
};

// ─── Composant ────────────────────────────────────────────────────────────────

export default function ExploreScreen() {
  const {
    contents, loading, loadingMore, error, hasMore,
    filters, setType, setCategory, setSubCategory,
    loadMore, refresh,
  } = useExploreData();

  const handleCardPress = useCallback((item: ContentItem) => {
    router.push(`/content/${item._id}`);
  }, []);

  // Catégories et sous-catégories disponibles selon les filtres actifs
  const availableCategories = filters.type
    ? CATEGORIES_BY_TYPE[filters.type]
    : null;

  const availableSubCategories = filters.category
    ? SUBCATEGORIES_BY_CATEGORY[filters.category] ?? null
    : null;

  // ── Rendu ──────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      {/* ── Header ── */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Explorer</Text>
      </View>

      {/* ── Filtres ── */}
      <View style={s.filtersBlock}>

        {/* Niveau 1 — Type */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.filterRow}
        >
          {/* Tous */}
          <FilterChip
            label="Tous"
            active={filters.type === null}
            onPress={() => setType(null)}
          />
          {(['video', 'audio'] as MediaType[]).map((t) => (
            <FilterChip
              key={t}
              label={TYPE_LABELS[t]}
              active={filters.type === t}
              onPress={() => setType(filters.type === t ? null : t)}
              icon={t === 'video' ? 'play-circle-outline' : 'headset-outline'}
            />
          ))}
        </ScrollView>

        {/* Niveau 2 — Catégorie (visible si type sélectionné) */}
        {availableCategories && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.filterRow}
          >
            {availableCategories.map((cat) => (
              <FilterChip
                key={cat}
                label={CATEGORY_LABELS[cat]}
                active={filters.category === cat}
                onPress={() => setCategory(filters.category === cat ? null : cat)}
                variant="secondary"
              />
            ))}
          </ScrollView>
        )}

        {/* Niveau 3 — Sous-catégorie (visible si catégorie sélectionnée) */}
        {availableSubCategories && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.filterRow}
          >
            {availableSubCategories.map((sub) => (
              <FilterChip
                key={sub}
                label={SUBCATEGORY_LABELS[sub] ?? sub}
                active={filters.subCategory === sub}
                onPress={() => setSubCategory(filters.subCategory === sub ? null : sub)}
                variant="tertiary"
              />
            ))}
          </ScrollView>
        )}
      </View>

      {/* ── Résultats ── */}
      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={s.centered}>
          <Ionicons name="wifi-outline" size={40} color={colors.textMuted} style={{ opacity: 0.4 }} />
          <Text style={s.errorText}>{error}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={refresh}>
            <Text style={s.retryText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : contents.length === 0 ? (
        <View style={s.centered}>
          <Ionicons name="search-outline" size={40} color={colors.textMuted} style={{ opacity: 0.3 }} />
          <Text style={s.emptyText}>Aucun contenu pour ces filtres</Text>
        </View>
      ) : (
        <FlatList
          data={contents}
          keyExtractor={(item) => item._id}
          numColumns={2}
          contentContainerStyle={s.grid}
          columnWrapperStyle={s.gridRow}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <ContentCard
              content={item}
              size="grid"
              onPress={() => handleCardPress(item)}
            />
          )}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            loadingMore ? (
              <View style={s.footerLoader}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : !hasMore && contents.length > 0 ? (
              <Text style={s.footerEnd}>— Fin des résultats —</Text>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

// ─── FilterChip ───────────────────────────────────────────────────────────────

type ChipVariant = 'primary' | 'secondary' | 'tertiary';

function FilterChip({
  label,
  active,
  onPress,
  icon,
  variant = 'primary',
}: {
  label:    string;
  active:   boolean;
  onPress:  () => void;
  icon?:    string;
  variant?: ChipVariant;
}) {
  const activeColors: Record<ChipVariant, { bg: string; text: string; border: string }> = {
    primary:   { bg: colors.primary,     text: '#fff',             border: colors.primary },
    secondary: { bg: colors.primaryMuted,text: colors.primaryLight, border: colors.primaryLight },
    tertiary:  { bg: 'rgba(46,194,126,0.15)', text: colors.teal,  border: colors.teal },
  };

  const ac = active ? activeColors[variant] : null;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[
        s.chip,
        active
          ? { backgroundColor: ac!.bg, borderColor: ac!.border }
          : { backgroundColor: colors.bgSurface, borderColor: 'rgba(46,51,71,0.7)' },
      ]}
    >
      {icon && (
        <Ionicons
          name={icon as any}
          size={13}
          color={active ? ac!.text : colors.textSecond}
          style={{ marginRight: 4 }}
        />
      )}
      <Text
        style={[
          s.chipText,
          { color: active ? ac!.text : colors.textSecond },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: colors.bgBase },

  header: {
    paddingHorizontal: 16,
    paddingTop:        8,
    paddingBottom:     12,
  },
  headerTitle: {
    fontSize:    22,
    color:       colors.textPrimary,
    fontFamily:  'Sora_800ExtraBold',
    letterSpacing: -0.5,
  },

  filtersBlock: {
    gap:           6,
    marginBottom:  8,
  },
  filterRow: {
    paddingHorizontal: 16,
    gap:               8,
    paddingVertical:   2,
  },

  chip: {
    flexDirection:   'row',
    alignItems:      'center',
    paddingHorizontal: 12,
    paddingVertical:   7,
    borderRadius:    20,
    borderWidth:     1,
  },
  chipText: {
    fontSize:   13,
    fontFamily: 'DMSans_500Medium',
  },

  grid: {
    paddingHorizontal: 16,
    paddingTop:        8,
    paddingBottom:     32,
  },
  gridRow: {
    gap:           12,
    marginBottom:  12,
  },

  centered: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    gap:            12,
    paddingBottom:  80,
  },
  errorText: {
    fontSize:   14,
    color:      colors.textSecond,
    fontFamily: 'DMSans_400Regular',
    textAlign:  'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize:   14,
    color:      colors.textMuted,
    fontFamily: 'DMSans_400Regular',
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical:   10,
    borderRadius:      20,
    backgroundColor:   'rgba(53,132,228,0.12)',
    borderWidth:       1,
    borderColor:       'rgba(53,132,228,0.3)',
  },
  retryText: {
    color:      colors.primary,
    fontFamily: 'DMSans_500Medium',
    fontSize:   14,
  },

  footerLoader: {
    paddingVertical: 16,
    alignItems:      'center',
  },
  footerEnd: {
    textAlign:   'center',
    color:       colors.textMuted,
    fontFamily:  'DMSans_400Regular',
    fontSize:    12,
    paddingVertical: 16,
  },
});
