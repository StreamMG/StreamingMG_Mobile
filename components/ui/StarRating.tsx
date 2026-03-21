/**
 * StarRating.tsx — StreamMG
 * Affichage d'une note 1–5 étoiles + valeur chiffrée.
 *
 * Évolutivité : le prop `interactive` prépare le terrain pour la fonctionnalité
 * de notation future (POST /contents/:id/rate) — sans aucun appel API aujourd'hui.
 *
 * Usage — affichage seul (ContentCard) :
 *   <StarRating value={4.2} />
 *
 * Usage — avec nombre d'avis :
 *   <StarRating value={4.2} count={128} />
 *
 * Usage — interactif (futur écran de détail) :
 *   <StarRating value={userRating} interactive onRate={(v) => handleRate(v)} />
 *
 * Usage — si pas encore de note :
 *   <StarRating value={null} />  ← ne rend rien
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Pressable } from 'react-native';
import { Star } from 'lucide-react-native';
import { colors } from '@/lib/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StarRatingProps {
  /** Note moyenne (0–5). null = pas encore de note → le composant ne s'affiche pas */
  value: number | null;
  /** Nombre total d'avis (optionnel) */
  count?: number | null;
  /** Taille des étoiles en px */
  size?: number;
  /**
   * Mode interactif — prépare la fonctionnalité future de notation.
   * En mode interactif, l'utilisateur peut sélectionner une note.
   * L'implémentation API (POST /contents/:id/rate) est à brancher dans `onRate`.
   */
  interactive?: boolean;
  /** Callback appelé quand l'utilisateur sélectionne une note (mode interactif) */
  onRate?: (value: number) => void;
  /** Style d'affichage */
  variant?: 'compact' | 'full';
}

// ─── Composant ────────────────────────────────────────────────────────────────

export function StarRating({
  value,
  count,
  size = 11,
  interactive = false,
  onRate,
  variant = 'compact',
}: StarRatingProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  // Pas de note → invisible (évolutif : s'affichera automatiquement quand
  // le backend commencera à renvoyer le champ `rating`)
  if (value == null && !interactive) return null;

  const displayValue = value ?? 0;
  // En mode interactif avec hover, on affiche la valeur survolée
  const activeValue = hovered ?? (interactive ? Math.round(displayValue) : displayValue);

  const renderStars = () =>
    [1, 2, 3, 4, 5].map((i) => {
      // Étoile pleine, demi, ou vide
      const filled = activeValue >= i;
      const half   = !filled && activeValue >= i - 0.5;

      if (interactive) {
        return (
          <Pressable
            key={i}
            onPress={() => onRate?.(i)}
            onHoverIn={() => setHovered(i)}
            onHoverOut={() => setHovered(null)}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityLabel={`Noter ${i} étoile${i > 1 ? 's' : ''}`}
          >
            <Star
              size={size + 2}
              color={colors.gold}
              fill={filled || i <= (hovered ?? 0) ? colors.gold : 'transparent'}
              strokeWidth={1.75}
            />
          </Pressable>
        );
      }

      return (
        <View key={i}>
          {half ? (
            // Demi-étoile : superposition étoile vide + étoile pleine clippée
            <View style={{ width: size, height: size }}>
              <Star
                size={size}
                color={colors.gold}
                fill="transparent"
                strokeWidth={1.75}
                style={{ position: 'absolute' }}
              />
              {/* Moitié gauche dorée via overflow hidden */}
              <View
                style={{
                  position: 'absolute',
                  width: size / 2,
                  overflow: 'hidden',
                }}
              >
                <Star
                  size={size}
                  color={colors.gold}
                  fill={colors.gold}
                  strokeWidth={0}
                />
              </View>
            </View>
          ) : (
            <Star
              size={size}
              color={filled ? colors.gold : colors.bgBorder}
              fill={filled ? colors.gold : 'transparent'}
              strokeWidth={filled ? 0 : 1.75}
            />
          )}
        </View>
      );
    });

  if (variant === 'compact') {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
        <Star size={size} color={colors.gold} fill={colors.gold} strokeWidth={0} />
        <Text
          style={{
            fontFamily: 'DMSans_500Medium',
            fontSize: size + 1,
            color: colors.textSecond,
            lineHeight: size + 4,
          }}
        >
          {displayValue.toFixed(1)}
          {count != null && (
            <Text style={{ color: colors.textMuted, fontSize: size }}>
              {' '}· {count >= 1000 ? `${(count / 1000).toFixed(1)}k` : count}
            </Text>
          )}
        </Text>
      </View>
    );
  }

  // Variant 'full' : 5 étoiles + note chiffrée (écran détail, mode interactif)
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
        {renderStars()}
      </View>
      {value != null && (
        <Text
          style={{
            fontFamily: 'DMSans_500Medium',
            fontSize: 13,
            color: colors.textSecond,
          }}
        >
          {displayValue.toFixed(1)}
          {count != null && (
            <Text style={{ color: colors.textMuted, fontSize: 11 }}>
              {' '}({count >= 1000 ? `${(count / 1000).toFixed(1)}k` : count} avis)
            </Text>
          )}
        </Text>
      )}
      {interactive && value == null && (
        <Text
          style={{
            fontFamily: 'DMSans_400Regular',
            fontSize: 12,
            color: colors.textMuted,
          }}
        >
          Évaluer
        </Text>
      )}
    </View>
  );
}
