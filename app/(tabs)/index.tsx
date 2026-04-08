  /**
   * app/(tabs)/index.tsx — Écran d'accueil StreamMG
   *
   * Interfaces alignées sur les composants existants :
   *  - ContentCard  → prop `content: ContentItem`,  `size`, `progress`, `onPress`
   *  - HeroBanner   → prop `content: HeroContent`,  `onWatch`, `onInfo`
   *  - SectionHeader → `title`, `onSeeAll`
   */

  import React, { useCallback } from 'react';
  import {
    View, Text, FlatList, ScrollView,
    RefreshControl, ActivityIndicator,
    TouchableOpacity, StyleSheet,
  } from 'react-native';
  import { SafeAreaView } from 'react-native-safe-area-context';
  import { router } from 'expo-router';
  import { Ionicons } from '@expo/vector-icons';

  import { HeroBanner }       from '@/components/content/HeroBanner';
  import type { HeroContent } from '@/components/content/HeroBanner';
  import { ContentCard }      from '@/components/content/ContentCard';
  import type { ContentItem } from '@/components/content/ContentCard';
  import { SectionHeader }    from '@/components/ui/SectionHeader';
  import { useHomeData }      from '@/hooks/useHomeData';
  import { useAuthStore }     from '@/stores/authStore';
  import { colors }           from '@/lib/theme';

  const CARD_WIDTH = 140;
  const CARD_GAP   = 10;
  const SECTION_MB = 28;

  export default function HomeScreen() {
    const { data, loading, error, refresh } = useHomeData();
    // console.log("- - - - - - - - - -  -- - -- - - - - - - - - - - -");
    // console.log(data);
    // console.log("- - - - - - - - - -  -- - -- - - - - - - - - - - -");
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

    const handleCardPress = useCallback((item: ContentItem) => {
      router.push(`/content/${item._id}`);
    }, []);

    const handleHeroWatch = useCallback((item: HeroContent) => {
      if (item.type === 'video') router.push(`/player/video/${item._id}`);
      else                       router.push(`/player/audio/${item._id}`);
    }, []);

    const handleHeroInfo = useCallback((item: HeroContent) => {
      router.push(`/content/${item._id}`);
    }, []);

    const handleSeeAll = useCallback((section: string) => {
      router.push(`/explore?section=${section}`);
    }, []);

    if (loading) {
      return (
        <SafeAreaView style={s.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </SafeAreaView>
      );
    }

    if (error) {
      return (
        <SafeAreaView style={s.centered}>
          <Ionicons name="wifi-outline" size={48} color={colors.textMuted} style={{ opacity: 0.4 }} />
          <Text style={s.errorText}>{error}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={refresh}>
            <Text style={s.retryText}>Réessayer</Text>
          </TouchableOpacity>
        </SafeAreaView>
      );
    }

    if (!data) return null;

    const heroItem = data.featured[0] ?? null;

    return (
      <SafeAreaView style={s.root} edges={['top']}>
        <ScrollView
          style={s.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={refresh}
              tintColor={colors.primary} colors={[colors.primary]} />
          }
        >
          {/* Logo */}
          <View style={s.header}>
            <Text style={s.logo}>
              Stream<Text style={s.logoAccent}>MG</Text>
            </Text>
          </View>

          {/* HeroBanner */}
          {heroItem && (
            <View style={{ marginBottom: SECTION_MB, paddingHorizontal: 16 }}>
              <HeroBanner
                content={heroItem}
                onWatch={() => handleHeroWatch(heroItem)}
                onInfo={() => handleHeroInfo(heroItem)}
              />
            </View>
          )}

          {/* Tendances */}
          {data.trending.length > 0 && (
            <View style={{ marginBottom: SECTION_MB }}>
              <SectionHeader title="Tendances" onSeeAll={() => handleSeeAll('trending')} />
              <CardRow data={data.trending} onPress={handleCardPress} />
            </View>
          )}

          {/* Tutoriels en cours */}
          {isAuthenticated && data.tutorialsInProgress.length > 0 && (
            <View style={{ marginBottom: SECTION_MB }}>
              <SectionHeader title="Tutoriels en cours" />
              <CardRow data={data.tutorialsInProgress} onPress={handleCardPress} withProgress />
            </View>
          )}

          {/* Gratuit */}
          {data.free.length > 0 && (
            <View style={{ marginBottom: SECTION_MB }}>
              <SectionHeader title="Gratuit" onSeeAll={() => handleSeeAll('free')} />
              <CardRow data={data.free} onPress={handleCardPress} />
            </View>
          )}

          {/* Derniers ajouts */}
          {data.newReleases.length > 0 && (
            <View style={{ marginBottom: SECTION_MB + 16 }}>
              <SectionHeader title="Derniers ajouts" onSeeAll={() => handleSeeAll('new')} />
              <CardRow data={data.newReleases} onPress={handleCardPress} />
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── CardRow ──────────────────────────────────────────────────────────────────

  function CardRow({
    data,
    onPress,
    withProgress = false,
  }: {
    data: ContentItem[];
    onPress: (item: ContentItem) => void;
    withProgress?: boolean;
  }) {
    return (
      <FlatList
        data={data}
        keyExtractor={(item) => item._id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: CARD_GAP }}
        renderItem={({ item }) => (
          <ContentCard
            content={item}
            size="horizontal"
            progress={withProgress ? (item as any).progress ?? null : null}
            onPress={() => onPress(item)}
          />
        )}
        removeClippedSubviews
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={3}
      />
    );
  }

  // ─── Styles ───────────────────────────────────────────────────────────────────

  const s = StyleSheet.create({
    root:    { flex: 1, backgroundColor: colors.bgBase },
    scroll:  { flex: 1 },
    header:  { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
    logo:    { fontSize: 22, color: colors.textPrimary, fontFamily: 'Sora_800ExtraBold', letterSpacing: -0.5 },
    logoAccent: { color: colors.primary },
    centered:   { flex: 1, backgroundColor: colors.bgBase, alignItems: 'center', justifyContent: 'center', gap: 16 },
    errorText:  { fontSize: 14, color: colors.textSecond, fontFamily: 'DMSans_400Regular', textAlign: 'center', paddingHorizontal: 32 },
    retryBtn:   { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20, backgroundColor: 'rgba(53,132,228,0.15)', borderWidth: 1, borderColor: 'rgba(53,132,228,0.3)' },
    retryText:  { color: colors.primary, fontFamily: 'DMSans_500Medium', fontSize: 14 },
  });
