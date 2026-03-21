/**
 * ProgressBar.tsx — StreamMG
 * Barre de progression pour les tutoriels.
 *
 * Variante 'card'  : 3px, dans ContentCard sous les métadonnées
 * Variante 'detail': 6px, sur l'écran de détail du tutoriel
 *
 * Usage :
 *   <ProgressBar progress={37} />                    ← variante card
 *   <ProgressBar progress={60} variant="detail" />   ← variante detail
 *   <ProgressBar progress={100} />                   ← complété (vert)
 */

import React from 'react';
import { View, Text } from 'react-native';
import { colors } from '@/lib/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProgressBarProps {
  /** Progression 0–100 */
  progress: number;
  variant?: 'card' | 'detail';
  /** Afficher le pourcentage */
  showPercent?: boolean;
}

// ─── Composant ────────────────────────────────────────────────────────────────

export function ProgressBar({
  progress,
  variant = 'card',
  showPercent,
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, progress));
  const isCard  = variant === 'card';
  const height  = isCard ? 3 : 6;

  // Couleur de la barre : bleu standard, vert si 100% complété
  const fillColor = clamped === 100 ? colors.success : colors.primary;

  // Afficher le % par défaut sur 'detail', optionnel sur 'card'
  const displayPercent = showPercent ?? variant === 'detail';

  return (
    <View style={{ gap: isCard ? 2 : 6 }}>
      {variant === 'detail' && (
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              fontFamily: 'DMSans_400Regular',
              fontSize: 11,
              color: colors.textMuted,
            }}
          >
            Progression
          </Text>
          <Text
            style={{
              fontFamily: 'DMSans_500Medium',
              fontSize: 11,
              color: clamped === 100 ? colors.success : colors.textSecond,
            }}
          >
            {clamped === 100 ? 'Terminé ✓' : `${clamped}%`}
          </Text>
        </View>
      )}

      {/* Track */}
      <View
        style={{
          height,
          backgroundColor: colors.bgRaised,
          borderRadius: 9999,
          overflow: 'hidden',
        }}
      >
        {/* Fill avec dégradé bleu → bleu clair */}
        <View
          style={{
            height,
            width: `${clamped}%`,
            borderRadius: 9999,
            // Dégradé simulé via backgroundColor (react-native ne supporte pas
            // les gradients natifs sans lib — on utilise une couleur plate ici,
            // ajouter expo-linear-gradient si le dégradé est prioritaire)
            backgroundColor: fillColor,
            opacity: clamped === 0 ? 0 : 1,
          }}
        />
      </View>

      {/* Pourcentage en bas à droite (variant card) */}
      {isCard && displayPercent && (
        <Text
          style={{
            fontFamily: 'DMSans_500Medium',
            fontSize: 10,
            color: colors.textMuted,
            textAlign: 'right',
          }}
        >
          {clamped}%
        </Text>
      )}
    </View>
  );
}
