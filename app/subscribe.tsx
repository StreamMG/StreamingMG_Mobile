/**
 * app/subscribe.tsx — Écran d'abonnement Premium
 *
 * Flux (conforme API docs §Abonnement) :
 *  1. Afficher les deux plans (monthly / annual)
 *  2. POST /payment/subscribe { plan } → clientSecret
 *  3. Stripe CardField (mock en dev) → confirmer le paiement
 *  4. Succès → mettre à jour authStore + purchaseStore
 *
 * En mode mock (dev) : pas de vrai Stripe — on simule le succès.
 * En production : intégrer @stripe/stripe-react-native CardField.
 *
 * Route : /subscribe
 * Importe : purchaseStore, authStore, apiClient, colors
 */

import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  ActivityIndicator, StyleSheet, TextInput, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { usePurchaseStore } from '@/stores/purchaseStore';
import { useAuthStore }     from '@/stores/authStore';
import { apiClient }        from '@/lib/apiClient';
import { colors }           from '@/lib/theme';
import { formatError }      from '@/lib/errorFormatter';

// ─── Plans ────────────────────────────────────────────────────────────────────

const PLANS = [
  {
    id:       'monthly' as const,
    label:    'Mensuel',
    price:    '5 000 Ar',
    detail:   'par mois',
    amount:   500000,
    badge:    null,
  },
  {
    id:       'annual' as const,
    label:    'Annuel',
    price:    '50 000 Ar',
    detail:   'par an — économisez 17%',
    amount:   5000000,
    badge:    'Meilleure offre',
  },
];

// ─── Composant ────────────────────────────────────────────────────────────────

export default function SubscribeScreen() {
  const setSubscription = usePurchaseStore((s) => s.setSubscription);
  const user            = useAuthStore((s) => s.user);
  const setAuth         = useAuthStore((s) => s.setAuth);

  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('monthly');
  const [step,         setStep]         = useState<'plan' | 'payment' | 'success'>('plan');
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState<string | null>(null);

  // Mock carte Stripe
  const [cardNumber,   setCardNumber]   = useState('');
  const [expiry,       setExpiry]       = useState('');
  const [cvc,          setCvc]          = useState('');

  const plan = PLANS.find((p) => p.id === selectedPlan)!;

  // ── Étape 1 → 2 ──────────────────────────────────────────────────────────

  const handleContinue = () => {
    setError(null);
    setStep('payment');
  };

  // ── Étape 2 → 3 ──────────────────────────────────────────────────────────

  const handlePayment = async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Créer le PaymentIntent
      await apiClient.post('/payment/subscribe', { plan: selectedPlan });

      // 2. En dev (mock) : on simule le succès Stripe immédiatement
      // En production : confirmer avec @stripe/stripe-react-native

      // 3. Charger le nouveau statut
      const { data } = await apiClient.get('/payment/status');
      setSubscription({
        isPremium:     data.isPremium,
        plan:          data.plan,
        premiumExpiry: data.premiumExpiry,
      });

      // 4. Mettre à jour l'utilisateur en mémoire
      if (user) {
        const token = useAuthStore.getState().token ?? '';
        const refreshToken = await useAuthStore.getState().loadStoredRefreshToken() ?? '';
        await setAuth(token, { ...user, isPremium: true }, refreshToken);
      }

      setStep('success');
    } catch (e: any) {
      setError(formatError(e, 'Paiement échoué. Vérifiez vos informations.'));
    } finally {
      setLoading(false);
    }
  };

  // ── Rendu ──────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Image 
            source={require('../assets/images/logo.png')} 
            style={{ width: 28, height: 28 }}
            resizeMode="contain"
          />
          <Text style={s.headerTitle}>Premium</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Étape 1 : Choix du plan ── */}
        {step === 'plan' && (
          <>
            {/* Hero Premium */}
            <View style={s.heroContainer}>
              <View style={s.goldCircle}>
                <Ionicons name="star" size={36} color={colors.gold} />
              </View>
              <Text style={s.heroTitle}>Accès illimité</Text>
              <Text style={s.heroSubtitle}>
                Tous les contenus Premium, sans limite.{'\n'}
                Annulez à tout moment.
              </Text>
            </View>

            {/* Avantages */}
            {[
              'Accès à tout le catalogue Premium',
              'Lecture hors-ligne illimitée',
              'Qualité audio maximale',
              'Sans publicité',
            ].map((benefit) => (
              <View key={benefit} style={s.benefitRow}>
                <Ionicons name="checkmark-circle" size={18} color={colors.gold} />
                <Text style={s.benefitText}>{benefit}</Text>
              </View>
            ))}

            {/* Plans */}
            <View style={s.plansContainer}>
              {PLANS.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[
                    s.planCard,
                    selectedPlan === p.id && s.planCardActive,
                  ]}
                  onPress={() => setSelectedPlan(p.id)}
                  activeOpacity={0.8}
                >
                  {p.badge && (
                    <View style={s.planBadge}>
                      <Text style={s.planBadgeText}>{p.badge}</Text>
                    </View>
                  )}
                  <View style={s.planRadio}>
                    {selectedPlan === p.id && <View style={s.planRadioInner} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.planLabel}>{p.label}</Text>
                    <Text style={s.planDetail}>{p.detail}</Text>
                  </View>
                  <Text style={s.planPrice}>{p.price}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={s.ctaBtn} onPress={handleContinue} activeOpacity={0.85}>
              <Text style={s.ctaBtnText}>Continuer</Text>
            </TouchableOpacity>

            <Text style={s.legalText}>
              Paiement simulé (Stripe mode test). Aucun débit réel.
            </Text>
          </>
        )}

        {/* ── Étape 2 : Paiement ── */}
        {step === 'payment' && (
          <>
            <View style={s.paymentHeader}>
              <Text style={s.paymentTitle}>Paiement</Text>
              <Text style={s.paymentSubtitle}>{plan.label} — {plan.price}</Text>
            </View>

            {/* Carte Stripe simulée */}
            <View style={s.cardContainer}>
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
                <Ionicons name="information-circle-outline" size={14} color={colors.textMuted} />
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
              style={[s.ctaBtn, { backgroundColor: colors.gold }]}
              onPress={handlePayment}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="#1a1200" />
                : <Text style={[s.ctaBtnText, { color: '#1a1200' }]}>
                    Payer {plan.price}
                  </Text>
              }
            </TouchableOpacity>

            <TouchableOpacity style={s.ghostBtn} onPress={() => setStep('plan')}>
              <Text style={s.ghostBtnText}>Modifier le plan</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ── Étape 3 : Succès ── */}
        {step === 'success' && (
          <View style={s.successContainer}>
            <View style={[s.goldCircle, { width: 100, height: 100, borderRadius: 50 }]}>
              <Ionicons name="checkmark-circle" size={48} color={colors.gold} />
            </View>
            <Text style={s.successTitle}>Bienvenue Premium !</Text>
            <Text style={s.successSubtitle}>
              Votre abonnement {plan.label.toLowerCase()} est maintenant actif.{'\n'}
              Profitez de tous les contenus Premium.
            </Text>
            <TouchableOpacity
              style={[s.ctaBtn, { backgroundColor: colors.gold }]}
              onPress={() => router.replace('/(tabs)')}
              activeOpacity={0.85}
            >
              <Text style={[s.ctaBtnText, { color: '#1a1200' }]}>
                Découvrir le catalogue
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: colors.bgBase },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, justifyContent: 'space-between' },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, color: colors.gold, fontFamily: 'Sora_600SemiBold' },

  heroContainer: { alignItems: 'center', paddingVertical: 24, gap: 10 },
  goldCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(232,197,71,0.12)', alignItems: 'center', justifyContent: 'center' },
  heroTitle:    { fontSize: 24, color: colors.textPrimary, fontFamily: 'Sora_800ExtraBold', letterSpacing: -0.5 },
  heroSubtitle: { fontSize: 14, color: colors.textSecond, fontFamily: 'DMSans_400Regular', textAlign: 'center', lineHeight: 20 },

  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  benefitText: { fontSize: 14, color: colors.textPrimary, fontFamily: 'DMSans_400Regular' },

  plansContainer: { gap: 10, marginVertical: 20 },
  planCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.bgSurface, borderRadius: 14,
    borderWidth: 1.5, borderColor: 'rgba(46,51,71,0.7)',
    padding: 16, position: 'relative', overflow: 'hidden',
  },
  planCardActive: { borderColor: colors.gold, backgroundColor: 'rgba(232,197,71,0.06)' },
  planBadge: { position: 'absolute', top: 0, right: 0, backgroundColor: colors.gold, paddingHorizontal: 10, paddingVertical: 3, borderBottomLeftRadius: 8 },
  planBadgeText: { fontSize: 10, color: '#1a1200', fontFamily: 'DMSans_600SemiBold' },
  planRadio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  planRadioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.gold },
  planLabel:  { fontSize: 15, color: colors.textPrimary, fontFamily: 'Sora_600SemiBold' },
  planDetail: { fontSize: 12, color: colors.textSecond, fontFamily: 'DMSans_400Regular', marginTop: 2 },
  planPrice:  { fontSize: 15, color: colors.gold, fontFamily: 'Sora_700Bold' },

  ctaBtn: { width: '100%', paddingVertical: 15, borderRadius: 28, backgroundColor: colors.primary, alignItems: 'center', shadowColor: colors.primary, shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
  ctaBtnText: { color: '#fff', fontSize: 16, fontFamily: 'Sora_600SemiBold' },

  legalText: { fontSize: 11, color: colors.textMuted, fontFamily: 'DMSans_400Regular', textAlign: 'center', marginTop: 12 },

  paymentHeader: { paddingVertical: 20, alignItems: 'center', gap: 4 },
  paymentTitle:    { fontSize: 20, color: colors.textPrimary, fontFamily: 'Sora_700Bold' },
  paymentSubtitle: { fontSize: 14, color: colors.textSecond, fontFamily: 'DMSans_400Regular' },

  cardContainer: { backgroundColor: colors.bgSurface, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(46,51,71,0.7)', padding: 16, gap: 12, marginBottom: 16 },
  cardLabel: { fontSize: 12, color: colors.textSecond, fontFamily: 'DMSans_500Medium', marginBottom: 4 },
  cardInput: { backgroundColor: colors.bgRaised, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(46,51,71,0.7)', paddingHorizontal: 14, paddingVertical: 12, color: colors.textPrimary, fontFamily: 'DMSans_400Regular', fontSize: 14 },
  testCardHint: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  testCardText: { fontSize: 11, color: colors.textMuted, fontFamily: 'DMSans_400Regular', flex: 1 },

  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(237,51,59,0.1)', borderRadius: 10, padding: 12, marginBottom: 12 },
  errorText: { fontSize: 13, color: colors.error, fontFamily: 'DMSans_400Regular', flex: 1 },

  ghostBtn: { paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  ghostBtnText: { color: colors.textSecond, fontSize: 14, fontFamily: 'DMSans_400Regular' },

  successContainer: { alignItems: 'center', paddingVertical: 40, gap: 16 },
  successTitle:    { fontSize: 24, color: colors.gold, fontFamily: 'Sora_800ExtraBold', letterSpacing: -0.5 },
  successSubtitle: { fontSize: 14, color: colors.textSecond, fontFamily: 'DMSans_400Regular', textAlign: 'center', lineHeight: 20 },
});
