/**
 * app/(tabs)/search.tsx — Écran Recherche
 *
 * Barre de recherche avec debounce 400ms.
 * Résultats en grille 2 colonnes (ContentCard size="grid").
 * Route : GET /contents?search=<query>
 */

import React, { useRef } from 'react';
import {
  View, Text, TextInput, FlatList,
  TouchableOpacity, ActivityIndicator, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ContentCard }      from '@/components/content/ContentCard';
import type { ContentItem } from '@/components/content/ContentCard';
import { useSearch }        from '@/hooks/useSearch';
import { colors }           from '@/lib/theme';

export default function SearchScreen() {
  const { query, setQuery, results, loading, error, hasSearched } = useSearch();
  const inputRef = useRef<TextInput>(null);

  const handleCardPress = (item: ContentItem) => {
    router.push(`/content/${item._id}`);
  };

  const handleClear = () => {
    setQuery('');
    inputRef.current?.focus();
  };

  return (
    <SafeAreaView style={s.root} edges={['top']}>

      {/* ── Barre de recherche ── */}
      <View style={s.searchBar}>
        <Ionicons name="search-outline" size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
        <TextInput
          ref={inputRef}
          style={s.input}
          value={query}
          onChangeText={setQuery}
          placeholder="Titres, artistes, catégories…"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="never"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={handleClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Contenu ── */}
      {!query.trim() ? (
        <View style={s.emptyState}>
          <Ionicons name="search-outline" size={52} color={colors.textMuted} style={{ opacity: 0.25 }} />
          <Text style={s.emptyTitle}>Recherchez dans StreamMG</Text>
          <Text style={s.emptySubtitle}>Titres, artistes, catégories…</Text>
        </View>
      ) : loading ? (
        <View style={s.emptyState}>
          <ActivityIndicator color={colors.primary} />
          <Text style={s.emptySubtitle}>Recherche en cours…</Text>
        </View>
      ) : error ? (
        <View style={s.emptyState}>
          <Ionicons name="alert-circle-outline" size={40} color={colors.textMuted} style={{ opacity: 0.4 }} />
          <Text style={s.emptySubtitle}>{error}</Text>
        </View>
      ) : hasSearched && results.length === 0 ? (
        <View style={s.emptyState}>
          <Ionicons name="musical-notes-outline" size={52} color={colors.textMuted} style={{ opacity: 0.25 }} />
          <Text style={s.emptyTitle}>Aucun résultat</Text>
          <Text style={s.emptySubtitle}>Essayez un autre terme</Text>
        </View>
      ) : results.length > 0 ? (
        <>
          <Text style={s.resultCount}>{results.length} résultat{results.length > 1 ? 's' : ''}</Text>
          <FlatList
            data={results}
            keyExtractor={(item) => item._id}
            numColumns={2}
            contentContainerStyle={s.grid}
            columnWrapperStyle={s.gridRow}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <ContentCard
                content={item}
                size="grid"
                onPress={() => handleCardPress(item)}
              />
            )}
          />
        </>
      ) : null}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:  { flex: 1, backgroundColor: colors.bgBase },

  searchBar: {
    flexDirection:     'row',
    alignItems:        'center',
    marginHorizontal:  16,
    marginVertical:    12,
    backgroundColor:   colors.bgSurface,
    borderRadius:      14,
    borderWidth:       1,
    borderColor:       'rgba(46,51,71,0.7)',
    paddingHorizontal: 14,
    paddingVertical:   11,
  },
  input: {
    flex:        1,
    color:       colors.textPrimary,
    fontFamily:  'DMSans_400Regular',
    fontSize:    15,
  },

  emptyState: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    gap:            10,
    paddingBottom:  80,
  },
  emptyTitle:    { fontSize: 17, color: colors.textPrimary, fontFamily: 'Sora_600SemiBold' },
  emptySubtitle: { fontSize: 13, color: colors.textMuted, fontFamily: 'DMSans_400Regular' },

  resultCount: {
    fontSize:         12,
    color:            colors.textMuted,
    fontFamily:       'DMSans_400Regular',
    paddingHorizontal:16,
    marginBottom:     8,
  },
  grid:    { paddingHorizontal: 16, paddingBottom: 32 },
  gridRow: { gap: 12, marginBottom: 12 },
});
