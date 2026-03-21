/**
 * components/ui/SectionHeader.tsx
 */
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { colors } from '@/lib/theme';

interface SectionHeaderProps {
  title: string;
  onSeeAll?: () => void;
}

export function SectionHeader({ title, onSeeAll }: SectionHeaderProps) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 12 }}>
      <Text style={{ fontSize: 20, color: colors.textPrimary, fontFamily: 'Sora_700Bold', letterSpacing: -0.4 }}>
        {title}
      </Text>
      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={{ fontSize: 13, color: colors.primary, fontFamily: 'DMSans_500Medium' }}>
            Voir tout
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
