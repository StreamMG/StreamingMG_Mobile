/**
 * components/ui/Button.tsx — Bouton StreamMG
 *
 * Variantes :
 *  'primary'  → fond bleu cobalt    — actions principales
 *  'ghost'    → transparent + bord  — actions secondaires
 *  'teal'     → fond teal           — achat unitaire
 *  'gold'     → fond or             — abonnement Premium
 *  'danger'   → fond rouge          — actions destructrices
 *
 * Tailles :
 *  'md' → hauteur 48px  (défaut)
 *  'sm' → hauteur 38px  (compact, inline)
 *  'lg' → hauteur 56px  (CTA pleine largeur)
 *
 * Utilisé dans :
 *  HeroBanner, content/[id].tsx, AccessGateModal, auth screens
 *
 * Importe : colors, radius depuis @/lib/theme
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { colors, radius } from '@/lib/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'ghost' | 'teal' | 'gold' | 'danger';
type ButtonSize    = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label:      string;
  onPress:    () => void;
  variant?:   ButtonVariant;
  size?:      ButtonSize;
  loading?:   boolean;
  disabled?:  boolean;
  fullWidth?: boolean;
  icon?:      React.ReactNode;
  style?:     ViewStyle;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const VARIANT_CONFIG: Record<ButtonVariant, {
  bg: string; text: string; border?: string;
}> = {
  primary: { bg: colors.primary,     text: '#ffffff' },
  ghost:   { bg: 'transparent',      text: colors.primary,    border: colors.primary },
  teal:    { bg: colors.teal,        text: '#ffffff' },
  gold:    { bg: colors.gold,        text: '#1a1200' },
  danger:  { bg: 'rgba(237,51,59,0.15)', text: '#ed333b', border: 'rgba(237,51,59,0.4)' },
};

const SIZE_CONFIG: Record<ButtonSize, {
  height: number; fontSize: number; paddingH: number; iconGap: number;
}> = {
  sm: { height: 38, fontSize: 13, paddingH: 16, iconGap: 6 },
  md: { height: 48, fontSize: 15, paddingH: 20, iconGap: 8 },
  lg: { height: 56, fontSize: 16, paddingH: 24, iconGap: 10 },
};

// ─── Composant ────────────────────────────────────────────────────────────────

export function Button({
  label,
  onPress,
  variant  = 'primary',
  size     = 'md',
  loading  = false,
  disabled = false,
  fullWidth = false,
  icon,
  style,
}: ButtonProps) {
  const vc = VARIANT_CONFIG[variant];
  const sc = SIZE_CONFIG[size];

  const isDisabled = disabled || loading;
  const opacity    = isDisabled ? 0.55 : 1;

  // Ombre colorée uniquement sur les boutons pleins (pas ghost/danger)
  const shadow = (variant === 'primary' || variant === 'teal' || variant === 'gold')
    ? {
        shadowColor:   vc.bg,
        shadowOpacity: 0.35,
        shadowRadius:  10,
        shadowOffset:  { width: 0, height: 3 },
        elevation:     4,
      }
    : {};

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.82}
      style={[
        s.retryBtn,
        {
          // height:           sc.height,
          paddingHorizontal: sc.paddingH,
        //   backgroundColor:  vc.bg,
        //   borderRadius:     sc.height / 2,   // pill shape
        //   borderWidth:      vc.border ? 1.5 : 0,
        //   borderColor:      vc.border ?? 'transparent',
        //   opacity,
        //   alignSelf:        fullWidth ? 'stretch' : 'flex-start',
        //   ...shadow,
        },
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {loading ? (
        <ActivityIndicator color={vc.text} size="small" />
      ) : (
        <View style={[s.inner, { gap: sc.iconGap }]}>
          {icon && <View>{icon}</View>}
          <Text
            style={[
              s.retryText,
              { color: vc.text, fontSize: sc.fontSize },
            ]}
          >
            {label}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  base: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
  },
  inner: {
    flexDirection: 'row',
    alignItems:    'center',
  },
  label: {
    fontFamily:  'Sora_600SemiBold',
    letterSpacing: -0.1,
  },
  retryBtn: { 
    paddingHorizontal: 24,
     paddingVertical: 10,
      borderRadius: 20,
      backgroundColor: 'rgba(53,132,228,0.2)',
      borderWidth: 1, 
      borderColor: 'rgba(53,132,228,0.8)' },
  retryText: { color: colors.primary, fontFamily: 'DMSans_500Medium', fontSize: 14 },
});