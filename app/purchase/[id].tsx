/**
 * app/purchase/[id].tsx — Achat unitaire
 *
 * Flux (conforme API docs §Achat Unitaire) :
 *  1. Charge les métadonnées du contenu
 *  2. POST /payment/purchase { contentId } → clientSecret + amount
 *  3. Stripe CardField (mock en dev)
 *  4. Succès → purchaseStore.addPurchase + retour au contenu
 *
 * Route : /purchase/:id
 * Importe : purchaseStore, apiClient, colors
 */

import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  ActivityIndicator, StyleSheet, Image, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { usePurchaseStore } from '@/stores/purchaseStore';
import { apiClient }        from '@/lib/apiClient';
import {BASE_URL, colors } from '@/lib/theme';

export default function PurchaseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const addPurchase = usePurchaseStore((s) => s.addPurchase);

  const [content,  setContent]  = useState<any>(null);
  const [loading,  setLoading]  = useState(true);
  const [paying,   setPaying]   = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [success,  setSuccess]  = useState(false);

  // Mock carte
  const [cardNumber, setCardNumber] = useState('');
  const [expiry,     setExpiry]     = useState('');
  const [cvc,        setCvc]        = useState('');

  useEffect(() => {
    if (!id) return;
    apiClient.get(`/contents/${id}`)
      .then(({ data }) => setContent(data))
      .catch(() => setError('Contenu introuvable.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handlePurchase = async () => {
    if (!content) return;
    setPaying(true);
    setError(null);

    try {
      // 1. Initier l'achat
      const { data } = await apiClient.post('/payment/purchase', { contentId: id });

      // 2. En dev : succès simulé immédiatement (pas de vrai Stripe)
      // En production : confirmer avec @stripe/stripe-react-native

      // 3. Enregistrer localement
      addPurchase({
        contentId:   id!,
        title:       content.title,
        thumbnail:   content.thumbnail,
        purchasedAt: new Date().toISOString(),
        amount:      data.amount ?? content.price,
      });

      setSuccess(true);
    } catch (e: any) {
      const code = e?.response?.data?.code;
      if (code === 'ALREADY_PURCHASED') {
        setError('Vous avez déjà acheté ce contenu.');
      } else {
        setError('Paiement échoué. Réessayez.');
      }
    } finally {
      setPaying(false);
    }
  };

  // ── Rendu ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={s.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  const thumbnailUri = content?.thumbnail?.startsWith('http')
    ? content.thumbnail
    : `${BASE_URL}${content?.thumbnail}`;

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Achat</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Succès ── */}
        {success ? (
          <View style={s.successContainer}>
            <View style={s.tealCircle}>
              <Ionicons name="checkmark-circle" size={48} color={colors.teal} />
            </View>
            <Text style={s.successTitle}>Achat réussi !</Text>
            <Text style={s.successSubtitle}>
              {content?.title} est maintenant accessible en permanence.
            </Text>
            <TouchableOpacity
              style={[s.ctaBtn, { backgroundColor: colors.teal }]}
              onPress={() => router.replace(`/content/${id}`)}
              activeOpacity={0.85}
            >
              <Text style={s.ctaBtnText}>Regarder maintenant</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Aperçu contenu */}
            {content && (
              <View style={s.contentPreview}>
                <Image
                  source={{ uri: thumbnailUri }}
                  style={s.thumbnail}
                  resizeMode="cover"
                />
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={s.contentTitle} numberOfLines={2}>{content.title}</Text>
                  <Text style={s.contentMeta}>{content.category} · {content.type === 'video' ? 'Vidéo' : 'Audio'}</Text>
                  <View style={s.permanentBadge}>
                    <Ionicons name="infinite-outline" size={12} color={colors.teal} />
                    <Text style={s.permanentText}>Accès permanent</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Prix */}
            <View style={s.priceBox}>
              <Text style={s.priceLabel}>Total à payer</Text>
              <Text style={s.priceAmount}>{formatPrice(content?.price ?? 0)}</Text>
            </View>

            {/* Carte Stripe simulée */}
            <View style={s.cardContainer}>
              <Text style={s.sectionLabel}>Informations de paiement</Text>

              <Text style={s.cardLabel}>Numéro de carte</Text>
              <TextInput
                style={s.cardInput}
                placeholder="4242 4242 4242 4242"
                placeholderTextColor={colors.textMuted}
                value={cardNumber}
                onChangeText={setCardNumber}
                keyboardType="numeric"
                maxLength={19}
              />

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardLabel}>Expiration</Text>
                  <TextInput
                    style={s.cardInput}
                    placeholder="MM/AA"
                    placeholderTextColor={colors.textMuted}
                    value={expiry}
                    onChangeText={setExpiry}
                    keyboardType="numeric"
                    maxLength={5}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardLabel}>CVC</Text>
                  <TextInput
                    style={s.cardInput}
                    placeholder="123"
                    placeholderTextColor={colors.textMuted}
                    value={cvc}
                    onChangeText={setCvc}
                    keyboardType="numeric"
                    maxLength={3}
                    secureTextEntry
                  />
                </View>
              </View>

              <View style={s.testCardHint}>
                <Ionicons name="information-circle-outline" size={13} color={colors.textMuted} />
                <Text style={s.testCardText}>
                  Test : 4242 4242 4242 4242 — exp. 12/26 — cvc 123
                </Text>
              </View>
            </View>

            {error && (
              <View style={s.errorBox}>
                <Ionicons name="alert-circle" size={15} color={colors.error} />
                <Text style={s.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[s.ctaBtn, { backgroundColor: colors.teal }]}
              onPress={handlePurchase}
              disabled={paying}
              activeOpacity={0.85}
            >
              {paying
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.ctaBtnText}>
                    Acheter — {formatPrice(content?.price ?? 0)}
                  </Text>
              }
            </TouchableOpacity>

            <Text style={s.legalText}>
              Paiement simulé (Stripe mode test). Aucun débit réel.
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function formatPrice(ar: number): string {
  if (ar >= 1_000_000) return `${(ar / 1_000_000).toFixed(1)}M Ar`;
  if (ar >= 1000)      return `${(ar / 1000).toFixed(0)}k Ar`;
  return `${ar} Ar`;
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: colors.bgBase },
  centered:{ flex: 1, backgroundColor: colors.bgBase, alignItems: 'center', justifyContent: 'center' },
  scroll:  { paddingHorizontal: 20, paddingBottom: 40 },
  header:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, justifyContent: 'space-between' },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, color: colors.teal, fontFamily: 'Sora_600SemiBold' },

  contentPreview: { flexDirection: 'row', gap: 14, backgroundColor: colors.bgSurface, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(46,51,71,0.7)', padding: 14, marginVertical: 16, alignItems: 'center' },
  thumbnail: { width: 72, height: 100, borderRadius: 8, backgroundColor: colors.bgRaised },
  contentTitle: { fontSize: 15, color: colors.textPrimary, fontFamily: 'Sora_600SemiBold', letterSpacing: -0.2 },
  contentMeta:  { fontSize: 12, color: colors.textMuted, fontFamily: 'DMSans_400Regular' },
  permanentBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  permanentText:  { fontSize: 11, color: colors.teal, fontFamily: 'DMSans_500Medium' },

  priceBox: { backgroundColor: 'rgba(46,194,126,0.08)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(46,194,126,0.2)', padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  priceLabel:  { fontSize: 14, color: colors.textSecond, fontFamily: 'DMSans_400Regular' },
  priceAmount: { fontSize: 20, color: colors.teal, fontFamily: 'Sora_700Bold' },

  sectionLabel: { fontSize: 14, color: colors.textPrimary, fontFamily: 'Sora_600SemiBold', marginBottom: 12 },
  cardContainer: { backgroundColor: colors.bgSurface, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(46,51,71,0.7)', padding: 16, gap: 12, marginBottom: 16 },
  cardLabel: { fontSize: 12, color: colors.textSecond, fontFamily: 'DMSans_500Medium', marginBottom: 4 },
  cardInput: { backgroundColor: colors.bgRaised, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(46,51,71,0.7)', paddingHorizontal: 14, paddingVertical: 12, color: colors.textPrimary, fontFamily: 'DMSans_400Regular', fontSize: 14 },
  testCardHint: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  testCardText: { fontSize: 11, color: colors.textMuted, fontFamily: 'DMSans_400Regular', flex: 1 },

  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(237,51,59,0.1)', borderRadius: 10, padding: 12, marginBottom: 12 },
  errorText: { fontSize: 13, color: colors.error, fontFamily: 'DMSans_400Regular', flex: 1 },

  ctaBtn: { width: '100%', paddingVertical: 15, borderRadius: 28, alignItems: 'center', shadowColor: colors.teal, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
  ctaBtnText: { color: '#fff', fontSize: 16, fontFamily: 'Sora_600SemiBold' },
  legalText: { fontSize: 11, color: colors.textMuted, fontFamily: 'DMSans_400Regular', textAlign: 'center', marginTop: 12 },

  successContainer: { alignItems: 'center', paddingVertical: 60, gap: 16 },
  tealCircle: { width: 96, height: 96, borderRadius: 48, backgroundColor: 'rgba(46,194,126,0.12)', alignItems: 'center', justifyContent: 'center' },
  successTitle:    { fontSize: 24, color: colors.teal, fontFamily: 'Sora_800ExtraBold', letterSpacing: -0.5 },
  successSubtitle: { fontSize: 14, color: colors.textSecond, fontFamily: 'DMSans_400Regular', textAlign: 'center', lineHeight: 20 },
});
