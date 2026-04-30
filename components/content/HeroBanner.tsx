/**
 * HeroBanner.tsx — StreamMG
 * Bannière héro de l'écran d'accueil.
 * Affiche le contenu mis en avant avec titre, catégorie, description et CTA.
 *
 * Usage :
 *  <HeroBanner
 *    content={featured[0]}
 *    onWatch={() => router.push(`/player/${id}`)}
 *    onInfo={() => router.push(`/content/${id}`)}
 *  />
 */

import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Play, Info } from 'lucide-react-native';
import { Badge, AccessType } from '@/components/ui/Badge';
import { colors, radius, spacing, BASE_URL } from '@/lib/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HeroContent {
  _id: string;
  title: string;
  type: 'video' | 'audio';
  category: string;
  thumbnail: string;
  description?: string | null;
  accessType: AccessType;
  price?: number | null;
  duration?: number;
}

export interface HeroBannerProps {
  content: HeroContent;
  onWatch?: () => void;
  onInfo?: () => void;
  apiBaseUrl?: string;
}

// ─── Dimensions ───────────────────────────────────────────────────────────────

const SCREEN_W = Dimensions.get('window').width;
const HERO_H   = Math.round(SCREEN_W * 0.68); // ~68% de la largeur → hauteur naturelle

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildUri(thumbnail: string, base?: string): string {
  if (thumbnail.startsWith('http')) return thumbnail;
  const root = base ?? BASE_URL;
  return `${root}${thumbnail}`;
}

// ─── Composant ────────────────────────────────────────────────────────────────

export function HeroBanner({ content, onWatch, onInfo, apiBaseUrl }: HeroBannerProps) {
  const thumbnailUri = buildUri(content.thumbnail, apiBaseUrl);

  return (
    <View style={s.container}>
      {/* ── Image de fond ── */}
      <Image
        source={{ uri: thumbnailUri }}
        style={s.image}
        resizeMode="cover"
      />

      {/* ── Scrim gradient (noir bas → transparent haut) ── */}
      <View style={s.scrimTop} />
      <View style={s.scrimBottom} />

      {/* ── Contenu overlay ── */}
      <View style={s.overlay}>
        {/* Badge catégorie */}
        <View style={s.categoryBadge}>
          <Text style={s.categoryTxt}>
            {content.category.replace('_', ' ').toUpperCase()}
          </Text>
        </View>

        {/* Titre */}
        <Text style={s.title} numberOfLines={2}>{content.title}</Text>

        {/* Description */}
        {content.description && (
          <Text style={s.description} numberOfLines={2}>
            {content.description}
          </Text>
        )}

        {/* CTA */}
        <View style={s.actions}>
          <TouchableOpacity
            onPress={onWatch}
            activeOpacity={0.85}
            style={s.btnWatch}
            accessibilityRole="button"
            accessibilityLabel={`Regarder ${content.title}`}
          >
            <Play size={16} color="#fff" fill="#fff" strokeWidth={0} />
            <Text style={s.btnWatchTxt}>Regarder</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onInfo}
            activeOpacity={0.75}
            style={s.btnInfo}
            accessibilityRole="button"
            accessibilityLabel="Informations"
          >
            <Info size={20} color={colors.textPrimary} strokeWidth={1.75} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Badge d'accès — haut droite */}
      {content.accessType !== 'free' && (
        <View style={s.accessBadge}>
          <Badge accessType={content.accessType} price={content.price} />
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: {
    width: '100%',
    height: HERO_H,
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: colors.bgSurface,
    // Bordure légère — cohérente avec ContentCard
    borderWidth: 1,
    borderColor: 'rgba(46, 51, 71, 0.60)',
  },

  image: {
    ...StyleSheet.absoluteFillObject,
  },

  // Légère couche sombre en haut (pour lisibilité du badge)
  scrimTop: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: '30%',
    backgroundColor: 'rgba(13, 16, 24, 0.35)',
  },

  // Couche forte en bas (pour lisibilité titre + CTA)
  scrimBottom: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: '65%',
    backgroundColor: 'rgba(13, 16, 24, 0.78)',
  },

  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing[4],
    gap: 8,
  },

  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(53, 132, 228, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(53, 132, 228, 0.35)',
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },

  categoryTxt: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 10,
    letterSpacing: 0.8,
    color: colors.primaryLight,
  },

  title: {
    fontFamily: 'Sora_800ExtraBold',
    fontSize: 24,
    color: colors.textPrimary,
    lineHeight: 30,
    letterSpacing: -0.5,
  },

  description: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: colors.textSecond,
    lineHeight: 19,
  },

  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },

  btnWatch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    paddingHorizontal: 20,
    paddingVertical: 11,
    shadowColor: colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },

  btnWatchTxt: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: 14,
    color: '#fff',
  },

  btnInfo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(46, 51, 71, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(46, 51, 71, 0.90)',
  },

  accessBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
});
