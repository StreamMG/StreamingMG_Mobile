/**
 * Badge.tsx — StreamMG
 * Badge de niveau d'accès : Premium (or) · Payant (teal) · Gratuit (invisible)
 *
 * Usage :
 *   <Badge accessType="premium" />
 *   <Badge accessType="paid" price={800000} />
 *   <Badge accessType="free" />   ← ne rend rien
 */

import React from 'react';
import { View, Text } from 'react-native';
import { Star, Lock } from 'lucide-react-native';
import { colors } from '@/lib/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AccessType = 'free' | 'premium' | 'paid';

export interface BadgeProps {
  accessType: AccessType;
  /** Prix en ariary (centimes) — utilisé si accessType === 'paid' */
  price?: number | null;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

/** 800000 → "8 000 Ar" */
function formatPrice(price: number): string {
  return new Intl.NumberFormat('fr-MG', {
    maximumFractionDigits: 0,
  }).format(price / 100) + ' Ar';
}

// ─── Composant ────────────────────────────────────────────────────────────────

export function Badge({ accessType, price }: BadgeProps) {
  if (accessType === 'free') return null;

  const isPremium = accessType === 'premium';

  const bgColor     = isPremium ? 'rgba(26,61,110,0.92)' : 'rgba(26,115,72,0.92)';
  const borderColor = isPremium ? 'rgba(232,197,71,0.30)' : 'rgba(46,194,126,0.30)';
  const textColor   = isPremium ? colors.gold : colors.teal;
  const label       = isPremium ? 'PREMIUM' : price != null ? formatPrice(price) : 'PAYANT';

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: bgColor,
        borderWidth: 1,
        borderColor,
        borderRadius: 6,
        paddingHorizontal: 7,
        paddingVertical: 3,
        gap: 3,
      }}
    >
      {isPremium ? (
        <Star size={10} color={colors.gold} fill={colors.gold} strokeWidth={0} />
      ) : (
        <Lock size={10} color={colors.teal} strokeWidth={2} />
      )}
      <Text
        style={{
          fontFamily: 'DMSans_600SemiBold',
          fontSize: 10,
          letterSpacing: 0.5,
          color: textColor,
        }}
      >
        {label}
      </Text>
    </View>
  );
}
