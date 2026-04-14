/**
 * app/provider/edit/[id].tsx — Édition d'un contenu
 *
 * Permet de modifier :
 *  - Métadonnées (titre, description, catégorie, langue)
 *  - Niveau d'accès et prix
 *
 * Routes :
 *   PUT /provider/contents/:id         → métadonnées
 *   PUT /provider/contents/:id/access  → accès/prix
 */

import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, StyleSheet, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useProviderEdit } from '@/hooks/useProvider';
import { colors }          from '@/lib/theme';

const CATEGORIES = ['film', 'musique', 'documentaire', 'podcast', 'tutoriel', 'tantara'];
const LANGUAGES  = [{ value: 'mg', label: 'Malagasy' }, { value: 'fr', label: 'Français' }, { value: 'en', label: 'English' }];

export default function ProviderEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { content, loading, saving, error, saveError, updateMeta, updateAccess } = useProviderEdit(id ?? '');

  const [title,       setTitle]       = useState('');
  const [description, setDescription] = useState('');
  const [category,    setCategory]    = useState('film');
  const [language,    setLanguage]    = useState<'mg' | 'fr' | 'en'>('mg');
  const [accessType,  setAccessType]  = useState<'free' | 'premium' | 'paid'>('free');
  const [price,       setPrice]       = useState('');

  // Pré-remplir quand le contenu est chargé
  useEffect(() => {
    if (!content) return;
    setTitle(content.title);
    setCategory(content.category);
    setAccessType(content.accessType);
    setPrice(content.price ? String(content.price / 100) : '');
  }, [content]);

  const handleSaveMeta = async () => {
    if (!id) return;
    const ok = await updateMeta(id, { title, description, category, language });
    if (ok) Alert.alert('Succès', 'Modifications soumises. Revalidation admin requise.');
  };

  const handleSaveAccess = async () => {
    if (!id) return;
    if (accessType === 'paid' && (!price || isNaN(Number(price)))) {
      Alert.alert('Erreur', 'Le prix est requis pour un contenu payant.');
      return;
    }
    const ok = await updateAccess(id, {
      accessType,
      price: accessType === 'paid' ? Math.round(Number(price) * 100) : null,
    });
    if (ok) Alert.alert('Succès', 'Niveau d\'accès modifié. Revalidation admin requise.');
  };

  if (loading) {
    return <SafeAreaView style={s.centered}><ActivityIndicator size="large" color={colors.primary} /></SafeAreaView>;
  }

  if (error || !content) {
    return (
      <SafeAreaView style={s.centered}>
        <Text style={s.errorText}>{error ?? 'Contenu introuvable'}</Text>
        <TouchableOpacity style={s.retryBtn} onPress={() => router.back()}>
          <Text style={s.retryText}>Retour</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>Modifier</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {saveError && (
          <View style={s.errorBox}>
            <Ionicons name="alert-circle" size={15} color={colors.error} />
            <Text style={s.errorBoxText}>{saveError}</Text>
          </View>
        )}

        {/* ── Métadonnées ── */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Métadonnées</Text>

          <Text style={s.label}>Titre</Text>
          <TextInput
            style={s.input}
            value={title}
            onChangeText={setTitle}
            placeholder="3 à 100 caractères"
            placeholderTextColor={colors.textMuted}
            maxLength={100}
          />

          <Text style={s.label}>Description</Text>
          <TextInput
            style={[s.input, { height: 80, textAlignVertical: 'top' }]}
            value={description}
            onChangeText={setDescription}
            placeholder="Description du contenu"
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={1000}
          />

          <Text style={s.label}>Catégorie</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            <View style={s.chipRow}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[s.chip, category === cat && s.chipActive]}
                  onPress={() => setCategory(cat)}
                >
                  <Text style={[s.chipText, category === cat && { color: '#fff' }]}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <Text style={s.label}>Langue</Text>
          <View style={s.toggleRow}>
            {LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang.value}
                style={[s.toggleBtn, language === lang.value && s.toggleBtnActive]}
                onPress={() => setLanguage(lang.value as any)}
              >
                <Text style={[s.toggleBtnText, language === lang.value && { color: '#fff' }]}>
                  {lang.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={s.saveBtn} onPress={handleSaveMeta} disabled={saving} activeOpacity={0.85}>
            {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.saveBtnText}>Enregistrer les métadonnées</Text>}
          </TouchableOpacity>
        </View>

        {/* ── Niveau d'accès ── */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Niveau d'accès</Text>

          <View style={s.toggleRow}>
            {(['free', 'premium', 'paid'] as const).map((a) => (
              <TouchableOpacity
                key={a}
                style={[s.toggleBtn, accessType === a && s.toggleBtnActive]}
                onPress={() => setAccessType(a)}
              >
                <Text style={[s.toggleBtnText, accessType === a && { color: '#fff' }]}>
                  {a === 'free' ? 'Gratuit' : a === 'premium' ? 'Premium' : 'Payant'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {accessType === 'paid' && (
            <>
              <Text style={[s.label, { marginTop: 12 }]}>Prix (en Ariary)</Text>
              <TextInput
                style={s.input}
                value={price}
                onChangeText={setPrice}
                placeholder="Ex: 8000"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
              />
            </>
          )}

          <TouchableOpacity style={[s.saveBtn, { backgroundColor: colors.teal }]} onPress={handleSaveAccess} disabled={saving} activeOpacity={0.85}>
            {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.saveBtnText}>Enregistrer l'accès</Text>}
          </TouchableOpacity>
        </View>

        <View style={s.infoBox}>
          <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
          <Text style={s.infoText}>
            Toute modification soumet le contenu à une revalidation par l'administrateur.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: colors.bgBase },
  scroll:  { padding: 16, paddingBottom: 48 },
  centered:{ flex: 1, backgroundColor: colors.bgBase, alignItems: 'center', justifyContent: 'center', gap: 12 },
  header:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, color: colors.textPrimary, fontFamily: 'Sora_600SemiBold', flex: 1, textAlign: 'center' },

  card:      { backgroundColor: colors.bgSurface, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(46,51,71,0.7)', padding: 16, marginBottom: 16 },
  cardTitle: { fontSize: 15, color: colors.textPrimary, fontFamily: 'Sora_600SemiBold', marginBottom: 14 },
  label:     { fontSize: 12, color: colors.textSecond, fontFamily: 'DMSans_500Medium', marginBottom: 6 },
  input:     { backgroundColor: colors.bgRaised, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(46,51,71,0.7)', paddingHorizontal: 14, paddingVertical: 11, color: colors.textPrimary, fontFamily: 'DMSans_400Regular', fontSize: 14, marginBottom: 12 },

  chipRow: { flexDirection: 'row', gap: 8 },
  chip:    { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 18, backgroundColor: colors.bgRaised, borderWidth: 1, borderColor: 'rgba(46,51,71,0.7)' },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText:   { fontSize: 12, color: colors.textSecond, fontFamily: 'DMSans_500Medium' },

  toggleRow:       { flexDirection: 'row', gap: 8, marginBottom: 4 },
  toggleBtn:       { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.bgRaised, borderWidth: 1, borderColor: 'rgba(46,51,71,0.7)', alignItems: 'center' },
  toggleBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  toggleBtnText:   { fontSize: 13, color: colors.textSecond, fontFamily: 'DMSans_500Medium' },

  saveBtn:     { marginTop: 14, paddingVertical: 13, borderRadius: 24, backgroundColor: colors.primary, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 14, fontFamily: 'Sora_600SemiBold' },

  errorBox:     { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(237,51,59,0.1)', borderRadius: 10, padding: 12, marginBottom: 12 },
  errorBoxText: { fontSize: 13, color: colors.error, fontFamily: 'DMSans_400Regular', flex: 1 },
  infoBox:      { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: 'rgba(46,51,71,0.3)', borderRadius: 10, padding: 12 },
  infoText:     { fontSize: 12, color: colors.textMuted, fontFamily: 'DMSans_400Regular', flex: 1, lineHeight: 18 },

  errorText: { fontSize: 14, color: colors.textSecond, fontFamily: 'DMSans_400Regular' },
  retryBtn:  { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20, backgroundColor: 'rgba(53,132,228,0.12)', borderWidth: 1, borderColor: 'rgba(53,132,228,0.3)' },
  retryText: { color: colors.primary, fontFamily: 'DMSans_500Medium', fontSize: 14 },
});
