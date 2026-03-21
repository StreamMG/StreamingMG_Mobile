/**
 * components/content/AccessGateModal.tsx
 * À placer une seule fois dans app/_layout.tsx.
 */
import React from 'react';
import { View, Text, TouchableOpacity, Modal, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAccessGateStore } from '@/stores/accessGateStore';
import { colors } from '@/lib/theme';

export function AccessGateModal() {
  const { visible, reason, price, hide } = useAccessGateStore();
  if (!visible || !reason) return null;

  const isPremium  = reason === 'subscription_required';
  const isPurchase = reason === 'purchase_required';
  const accentColor = isPremium ? colors.gold : isPurchase ? colors.teal : colors.primary;
  const accentBg    = isPremium ? 'rgba(232,197,71,0.12)' : isPurchase ? 'rgba(46,194,126,0.12)' : 'rgba(53,132,228,0.12)';

  const handlePrimary = () => {
    hide();
    if (reason === 'login_required') router.push('/(auth)/login');
    else if (isPremium)              router.push('/subscribe');
    else                             router.push('/purchase');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={hide} statusBarTranslucent>
      <Pressable style={s.backdrop} onPress={hide}>
        <Pressable style={s.sheet} onPress={() => {}}>
          <View style={[s.accentLine, { backgroundColor: accentColor }]} />
          <View style={[s.iconCircle, { backgroundColor: accentBg }]}>
            <Ionicons name={isPremium ? 'star' : isPurchase ? 'lock-closed' : 'person'} size={30} color={accentColor} />
          </View>
          <Text style={s.title}>
            {isPremium ? 'Contenu Premium' : isPurchase ? 'Contenu payant' : 'Connexion requise'}
          </Text>
          <Text style={s.description}>
            {isPremium
              ? 'Ce contenu est réservé aux abonnés Premium. Accédez au catalogue complet sans limite.'
              : isPurchase
              ? 'Achetez ce contenu une seule fois pour un accès permanent.'
              : 'Connectez-vous ou créez un compte gratuit pour continuer.'}
          </Text>
          {isPremium && (
            <View style={[s.priceBadge, { backgroundColor: accentBg }]}>
              <Text style={[s.priceText, { color: accentColor }]}>5 000 Ar / mois · 50 000 Ar / an</Text>
            </View>
          )}
          {isPurchase && price != null && (
            <View style={[s.priceBadge, { backgroundColor: accentBg }]}>
              <Text style={[s.priceText, { color: accentColor }]}>{formatPrice(price)} · Accès permanent</Text>
            </View>
          )}
          <TouchableOpacity style={[s.primaryBtn, { backgroundColor: accentColor }]} onPress={handlePrimary} activeOpacity={0.85}>
            <Text style={s.primaryBtnText}>
              {isPremium ? "S'abonner à Premium" : isPurchase ? 'Acheter ce contenu' : 'Se connecter'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.ghostBtn} onPress={hide}>
            <Text style={s.ghostBtnText}>Fermer</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function formatPrice(ar: number) {
  if (ar >= 1_000_000) return `${(ar / 1_000_000).toFixed(1)}M Ar`;
  if (ar >= 1000)      return `${(ar / 1000).toFixed(0)}k Ar`;
  return `${ar} Ar`;
}

const s = StyleSheet.create({
  backdrop:     { flex: 1, backgroundColor: 'rgba(13,16,24,0.75)', justifyContent: 'flex-end' },
  sheet:        { backgroundColor: colors.bgSurface, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderColor: 'rgba(46,51,71,0.8)', padding: 24, paddingBottom: 44, alignItems: 'center', gap: 12, overflow: 'hidden' },
  accentLine:   { position: 'absolute', top: 0, left: 0, right: 0, height: 2, opacity: 0.8 },
  iconCircle:   { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  title:        { fontSize: 19, color: colors.textPrimary, fontFamily: 'Sora_700Bold', letterSpacing: -0.3, textAlign: 'center' },
  description:  { fontSize: 14, color: colors.textSecond, fontFamily: 'DMSans_400Regular', textAlign: 'center', lineHeight: 21, paddingHorizontal: 8 },
  priceBadge:   { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  priceText:    { fontSize: 13, fontFamily: 'DMSans_600SemiBold' },
  primaryBtn:   { width: '100%', paddingVertical: 14, borderRadius: 20, alignItems: 'center', marginTop: 4 },
  primaryBtnText: { color: '#fff', fontSize: 15, fontFamily: 'Sora_600SemiBold' },
  ghostBtn:     { width: '100%', paddingVertical: 12, alignItems: 'center' },
  ghostBtnText: { color: colors.textSecond, fontSize: 14, fontFamily: 'DMSans_400Regular' },
});
