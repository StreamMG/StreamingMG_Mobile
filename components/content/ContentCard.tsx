/**
 * ContentCard.tsx — StreamMG
 * Carte de contenu principale. Couvre tous les cas : film, audio, tutoriel.
 *
 * Tailles :
 *  'horizontal' → largeur fixe 140px, scroll horizontal (Tendances, Gratuit…)
 *  'grid'       → 2 colonnes pleine largeur (Catalogue, Recherche)
 *  'featured'   → pleine largeur, ratio 16:9 (section À la une si besoin)
 *
 * Évolutivité rating :
 *  Les champs `rating` et `ratingCount` sur ContentItem sont optionnels/nullables.
 *  Quand le backend commencera à les renvoyer, ils s'affichent automatiquement
 *  sans aucune modification de ce composant.
 *
 * Usage :
 *  <ContentCard content={item} onPress={() => router.push(`/content/${item._id}`)} />
 *  <ContentCard content={item} size="grid" />
 *  <ContentCard content={item} progress={60} />   // tutoriel en cours
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
import { Play, Headphones } from 'lucide-react-native';
import { Badge, AccessType } from '@/components/ui/Badge';
import { StarRating } from '@/components/ui/StarRating';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { colors, spacing, radius } from '@/lib/theme';
import {BASE_URL }from '@/lib/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ContentItem {
  _id: string;
  title: string;
  type: 'video' | 'audio';
  category: string;
  thumbnail: string;          // chemin relatif (/uploads/…) ou URL complète
  duration: number;           // secondes
  accessType: AccessType;
  price?: number | null;
  isTutorial?: boolean;
  artist?: string | null;
  viewCount?: number;
  // ↓ Champs futurs — null aujourd'hui, s'affichent automatiquement quand renseignés
  rating?: number | null;
  ratingCount?: number | null;
}

export interface ContentCardProps {
  content: ContentItem;
  size?: 'horizontal' | 'grid' | 'featured';
  /** Progression du tutoriel 0–100 */
  progress?: number | null;
  onPress?: () => void;
  /** Base URL pour construire l'URL des thumbnails */
  apiBaseUrl?: string;
}

// ─── Dimensions ───────────────────────────────────────────────────────────────

const SCREEN_W  = Dimensions.get('window').width;
const H_PADDING = 16;
const GAP       = 12;

const CARD_DIMS = {
  horizontal: { width: 140,                                          ratio: 5 / 7 },
  grid:       { width: (SCREEN_W - H_PADDING * 2 - GAP) / 2,       ratio: 5 / 7 },
  featured:   { width: SCREEN_W - H_PADDING * 2,                    ratio: 16 / 9 },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDuration(s: number | null): string {
  if (s === null || s === 0) return '--';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}h${m > 0 ? String(m).padStart(2, '0') : ''}`;
  if (m > 0) return `${m}min`;
  return `${sec}s`;
}

function buildUri(thumbnail: string, base?: string): string {
  if (thumbnail.startsWith('http')) return thumbnail;
  const root = base ?? (__DEV__ ? BASE_URL : 'https://api.streamMG.railway.app');
  return `${root}${thumbnail}`;
}

// ─── Composant ────────────────────────────────────────────────────────────────

export function ContentCard({
  content,
  size = 'horizontal',
  progress,
  onPress,
  apiBaseUrl,
}: ContentCardProps) {
  const { width, ratio } = CARD_DIMS[size];
  const imgH      = Math.round(width / ratio);
  const isAudio   = content.type === 'audio';
  const hasRating = content.rating != null;
  const hasProgr  = progress != null && progress > 0;
  console.log(buildUri(content.thumbnail, apiBaseUrl))

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.78}
      style={[s.card, { width }]}
      accessibilityRole="button"
      accessibilityLabel={`${content.title}, ${content.category}`}
    >
      {/* ─── Vignette ─── */}
      <View style={[s.imgWrap, { height: imgH }]}>
        <Image
          source={{ uri: buildUri(content.thumbnail, apiBaseUrl) }}
          style={s.img}
          resizeMode="cover"
        />

        {/* Couche dégradé bas pour lisibilité du texte sur vignette */}
        <View style={s.scrim} />

        {/* Badge Premium / Payant — haut droite */}
        {content.accessType !== 'free' && (
          <View style={s.badgePos}>
            <Badge accessType={content.accessType} price={content.price} />
          </View>
        )}

        {/* Durée — bas gauche */}
        <View style={s.durationPill}>
          <Text style={s.durationTxt}>{formatDuration(content.duration)}</Text>
        </View>

        {/* Play / Headphones — bas droite */}
        <View style={s.playBtn}>
          {isAudio
            ? <Headphones size={15} color="#fff" strokeWidth={2} />
            : <Play size={13} color="#fff" fill="#fff" strokeWidth={0} />
          }
        </View>
      </View>

      {/* ─── Infos ─── */}
      <View style={s.info}>
        <Text style={s.title} numberOfLines={1}>{content.title}</Text>

        <Text style={s.meta} numberOfLines={1}>
          {[content.artist, content.category].filter(Boolean).join(' · ')}
        </Text>

        {/* Rating — invisible si null, visible automatiquement si renseigné */}
        {hasRating && (
          <View style={{ marginTop: 3 }}>
            <StarRating
              value={content.rating!}
              count={content.ratingCount}
              size={10}
              variant="compact"
            />
          </View>
        )}

        {/* Barre de progression tutoriel */}
        {hasProgr && (
          <View style={{ marginTop: 5 }}>
            <ProgressBar progress={progress!} variant="card" showPercent />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  card: {
    // Design minimaliste : fond légèrement opacifié, bordure subtile mais lisible
    backgroundColor: 'rgba(23, 27, 38, 0.80)',
    borderWidth: 1,
    borderColor: 'rgba(46, 51, 71, 0.75)',
    borderRadius: radius.m,
    overflow: 'hidden',
  },

  imgWrap: {
    width: '100%',
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: colors.bgRaised,  // placeholder pendant le chargement
  },

  img: {
    ...StyleSheet.absoluteFillObject,
  },

  // Couche sombre sur le tiers inférieur de la vignette
  // Pour un vrai gradient : remplacer par <LinearGradient> (expo-linear-gradient)
  scrim: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(13, 16, 24, 0.55)',
  },

  badgePos: {
    position: 'absolute',
    top: 8,
    right: 8,
  },

  durationPill: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(13, 16, 24, 0.72)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },

  durationTxt: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 10,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },

  playBtn: {
    position: 'absolute',
    bottom: 6,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.45,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },

  info: {
    paddingHorizontal: spacing[3],
    paddingTop: spacing[2] + 2,
    paddingBottom: spacing[3],
  },

  title: {
    fontFamily: 'Sora_500Medium',
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 18,
    marginBottom: 2,
  },

  meta: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 15,
  },
});
