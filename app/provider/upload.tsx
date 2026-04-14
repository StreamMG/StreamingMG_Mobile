/**
 * app/provider/upload.tsx — Dépôt d'un contenu
 *
 * Formulaire multipart complet :
 *  - Vignette (obligatoire) via expo-image-picker
 *  - Fichier média via expo-document-picker
 *  - Métadonnées : titre, description, type, catégorie, langue, accès, prix
 *
 * Route : POST /provider/contents (multipart/form-data)
 */

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  Image, ActivityIndicator, StyleSheet, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

import { useProviderUpload } from '@/hooks/useProvider';
import type { UploadForm }   from '@/hooks/useProvider';
import { colors }            from '@/lib/theme';

// ─── Options ─────────────────────────────────────────────────────────────────

const CATEGORIES = ['film', 'musique', 'documentaire', 'podcast', 'tutoriel', 'tantara'];
const LANGUAGES  = [{ value: 'mg', label: 'Malagasy' }, { value: 'fr', label: 'Français' }, { value: 'en', label: 'English' }];

const DEFAULT_FORM: UploadForm = {
  title: '', description: '', type: 'video', category: 'film',
  language: 'mg', accessType: 'free', price: '', isTutorial: false,
  thumbnailUri: null, mediaUri: null,
  thumbnailName: '', mediaName: '', thumbnailType: '', mediaType: '',
};

// ─── Composant ────────────────────────────────────────────────────────────────

export default function ProviderUploadScreen() {
  const { uploading, progress, error, submit } = useProviderUpload();
  const [form,    setForm]    = useState<UploadForm>(DEFAULT_FORM);
  const [success, setSuccess] = useState(false);

  const update = (key: keyof UploadForm, value: any) =>
    setForm((f) => ({ ...f, [key]: value }));

  // ── Sélection vignette ────────────────────────────────────────────────────

  const pickThumbnail = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [5, 7], quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      update('thumbnailUri',  asset.uri);
      update('thumbnailName', asset.fileName ?? 'thumbnail.jpg');
      update('thumbnailType', asset.mimeType ?? 'image/jpeg');
    }
  };

  // ── Sélection média ───────────────────────────────────────────────────────

  const pickMedia = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: form.type === 'video'
        ? ['video/mp4', 'video/quicktime']
        : ['audio/mpeg', 'audio/mp4', 'audio/aac'],
      copyToCacheDirectory: true,
    });
    if (result.canceled === false && result.assets?.[0]) {
      const asset = result.assets[0];
      update('mediaUri',  asset.uri);
      update('mediaName', asset.name ?? 'media');
      update('mediaType', asset.mimeType ?? 'video/mp4');
    }
  };

  // ── Soumission ────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    const ok = await submit(form);
    if (ok) setSuccess(true);
  };

  // ── Succès ────────────────────────────────────────────────────────────────

  if (success) {
    return (
      <SafeAreaView style={s.centered}>
        <View style={s.successIcon}>
          <Ionicons name="checkmark-circle" size={56} color={colors.success} />
        </View>
        <Text style={s.successTitle}>Contenu soumis !</Text>
        <Text style={s.successSub}>
          Il sera visible après validation par l'administrateur.
        </Text>
        <TouchableOpacity style={s.ctaBtn} onPress={() => router.replace('/provider')}>
          <Text style={s.ctaBtnText}>Retour à mes contenus</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ── Rendu ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Déposer un contenu</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Vignette ── */}
        <SectionLabel label="Vignette (obligatoire)" />
        <TouchableOpacity style={s.thumbnailPicker} onPress={pickThumbnail} activeOpacity={0.8}>
          {form.thumbnailUri ? (
            <Image source={{ uri: form.thumbnailUri }} style={s.thumbnailPreview} resizeMode="cover" />
          ) : (
            <View style={s.thumbnailEmpty}>
              <Ionicons name="image-outline" size={32} color={colors.textMuted} />
              <Text style={s.pickerLabel}>Choisir une vignette</Text>
              <Text style={s.pickerSub}>JPEG ou PNG · max 5 Mo · ratio 5:7</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* ── Type ── */}
        <SectionLabel label="Type de contenu" />
        <View style={s.toggleRow}>
          {(['video', 'audio'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={[s.toggleBtn, form.type === t && s.toggleBtnActive]}
              onPress={() => { update('type', t); update('mediaUri', null); }}
            >
              <Ionicons name={t === 'video' ? 'play-circle-outline' : 'headset-outline'} size={16} color={form.type === t ? '#fff' : colors.textSecond} />
              <Text style={[s.toggleBtnText, form.type === t && { color: '#fff' }]}>
                {t === 'video' ? 'Vidéo' : 'Audio'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Fichier média ── */}
        <SectionLabel label={`Fichier ${form.type === 'video' ? 'vidéo (MP4)' : 'audio (MP3/AAC)'}`} />
        <TouchableOpacity style={s.mediaPicker} onPress={pickMedia} activeOpacity={0.8}>
          <Ionicons
            name={form.mediaUri ? 'checkmark-circle' : 'cloud-upload-outline'}
            size={24}
            color={form.mediaUri ? colors.success : colors.textMuted}
          />
          <Text style={[s.pickerLabel, form.mediaUri && { color: colors.success }]}>
            {form.mediaUri ? form.mediaName : `Sélectionner le fichier ${form.type === 'video' ? 'vidéo' : 'audio'}`}
          </Text>
        </TouchableOpacity>

        {/* ── Métadonnées ── */}
        <SectionLabel label="Titre" />
        <TextInput
          style={s.input}
          value={form.title}
          onChangeText={(v) => update('title', v)}
          placeholder="3 à 100 caractères"
          placeholderTextColor={colors.textMuted}
          maxLength={100}
        />

        <SectionLabel label="Description" />
        <TextInput
          style={[s.input, { height: 88, textAlignVertical: 'top' }]}
          value={form.description}
          onChangeText={(v) => update('description', v)}
          placeholder="Description du contenu (optionnel)"
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={1000}
        />

        {/* ── Catégorie ── */}
        <SectionLabel label="Catégorie" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          <View style={s.chipRow}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[s.chip, form.category === cat && s.chipActive]}
                onPress={() => update('category', cat)}
              >
                <Text style={[s.chipText, form.category === cat && { color: '#fff' }]}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* ── Langue ── */}
        <SectionLabel label="Langue" />
        <View style={s.toggleRow}>
          {LANGUAGES.map((lang) => (
            <TouchableOpacity
              key={lang.value}
              style={[s.toggleBtn, form.language === lang.value && s.toggleBtnActive]}
              onPress={() => update('language', lang.value)}
            >
              <Text style={[s.toggleBtnText, form.language === lang.value && { color: '#fff' }]}>
                {lang.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Niveau d'accès ── */}
        <SectionLabel label="Niveau d'accès" />
        <View style={s.toggleRow}>
          {(['free', 'premium', 'paid'] as const).map((a) => (
            <TouchableOpacity
              key={a}
              style={[s.toggleBtn, form.accessType === a && s.toggleBtnActive]}
              onPress={() => update('accessType', a)}
            >
              <Text style={[s.toggleBtnText, form.accessType === a && { color: '#fff' }]}>
                {a === 'free' ? 'Gratuit' : a === 'premium' ? 'Premium' : 'Payant'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {form.accessType === 'paid' && (
          <>
            <SectionLabel label="Prix (en Ariary)" />
            <TextInput
              style={s.input}
              value={form.price}
              onChangeText={(v) => update('price', v)}
              placeholder="Ex: 8000"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
            />
          </>
        )}

        {/* ── Tutoriel ── */}
        <View style={s.switchRow}>
          <View>
            <Text style={s.switchLabel}>C'est un tutoriel</Text>
            <Text style={s.switchSub}>Contenu organisé en leçons</Text>
          </View>
          <Switch
            value={form.isTutorial}
            onValueChange={(v) => update('isTutorial', v)}
            trackColor={{ false: colors.bgRaised, true: colors.primary }}
            thumbColor="#fff"
          />
        </View>

        {/* ── Erreur + CTA ── */}
        {error && (
          <View style={s.errorBox}>
            <Ionicons name="alert-circle" size={15} color={colors.error} />
            <Text style={s.errorText}>{error}</Text>
          </View>
        )}

        {uploading && (
          <View style={s.progressContainer}>
            <View style={s.progressTrack}>
              <View style={[s.progressFill, { width: `${progress}%` }]} />
            </View>
            <Text style={s.progressText}>Envoi en cours… {progress}%</Text>
          </View>
        )}

        <TouchableOpacity
          style={[s.submitBtn, uploading && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={uploading}
          activeOpacity={0.85}
        >
          {uploading
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.submitBtnText}>Soumettre le contenu</Text>
          }
        </TouchableOpacity>

        <Text style={s.legalNote}>
          Le contenu sera visible après validation par un administrateur.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return <Text style={s.sectionLabel}>{label}</Text>;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: colors.bgBase },
  scroll:  { paddingHorizontal: 16, paddingBottom: 48 },
  centered:{ flex: 1, backgroundColor: colors.bgBase, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 },
  header:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, color: colors.textPrimary, fontFamily: 'Sora_600SemiBold' },

  sectionLabel: { fontSize: 12, color: colors.textSecond, fontFamily: 'DMSans_600SemiBold', letterSpacing: 0.5, marginBottom: 8, marginTop: 16 },

  thumbnailPicker: { borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(46,51,71,0.7)', borderStyle: 'dashed', overflow: 'hidden', marginBottom: 4 },
  thumbnailPreview:{ width: '100%', height: 220 },
  thumbnailEmpty:  { height: 160, alignItems: 'center', justifyContent: 'center', gap: 6 },
  pickerLabel:     { fontSize: 14, color: colors.textSecond, fontFamily: 'DMSans_500Medium' },
  pickerSub:       { fontSize: 11, color: colors.textMuted, fontFamily: 'DMSans_400Regular' },

  mediaPicker: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.bgSurface, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(46,51,71,0.7)', padding: 14, marginBottom: 4 },

  input: { backgroundColor: colors.bgSurface, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(46,51,71,0.7)', paddingHorizontal: 14, paddingVertical: 12, color: colors.textPrimary, fontFamily: 'DMSans_400Regular', fontSize: 14, marginBottom: 4 },

  toggleRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  toggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.bgSurface, borderWidth: 1, borderColor: 'rgba(46,51,71,0.7)' },
  toggleBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  toggleBtnText:   { fontSize: 13, color: colors.textSecond, fontFamily: 'DMSans_500Medium' },

  chipRow: { flexDirection: 'row', gap: 8, paddingVertical: 2 },
  chip:    { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.bgSurface, borderWidth: 1, borderColor: 'rgba(46,51,71,0.7)' },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText:   { fontSize: 13, color: colors.textSecond, fontFamily: 'DMSans_500Medium' },

  switchRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.bgSurface, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(46,51,71,0.7)', padding: 14, marginTop: 16, marginBottom: 4 },
  switchLabel: { fontSize: 14, color: colors.textPrimary, fontFamily: 'DMSans_500Medium' },
  switchSub:   { fontSize: 12, color: colors.textMuted, fontFamily: 'DMSans_400Regular', marginTop: 2 },

  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(237,51,59,0.1)', borderRadius: 10, padding: 12, marginTop: 12 },
  errorText:{ fontSize: 13, color: colors.error, fontFamily: 'DMSans_400Regular', flex: 1 },

  progressContainer: { marginTop: 12, gap: 6 },
  progressTrack: { height: 4, backgroundColor: colors.bgRaised, borderRadius: 2, overflow: 'hidden' },
  progressFill:  { height: 4, backgroundColor: colors.primary, borderRadius: 2 },
  progressText:  { fontSize: 12, color: colors.textSecond, fontFamily: 'DMSans_400Regular', textAlign: 'center' },

  submitBtn:     { marginTop: 20, paddingVertical: 15, borderRadius: 28, backgroundColor: colors.primary, alignItems: 'center', shadowColor: colors.primary, shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
  submitBtnText: { color: '#fff', fontSize: 16, fontFamily: 'Sora_600SemiBold' },
  legalNote:     { fontSize: 11, color: colors.textMuted, fontFamily: 'DMSans_400Regular', textAlign: 'center', marginTop: 12, marginBottom: 8 },

  successIcon:  { width: 96, height: 96, borderRadius: 48, backgroundColor: 'rgba(87,227,137,0.12)', alignItems: 'center', justifyContent: 'center' },
  successTitle: { fontSize: 22, color: colors.textPrimary, fontFamily: 'Sora_700Bold' },
  successSub:   { fontSize: 14, color: colors.textSecond, fontFamily: 'DMSans_400Regular', textAlign: 'center', lineHeight: 20 },
  ctaBtn:       { paddingHorizontal: 28, paddingVertical: 13, borderRadius: 28, backgroundColor: colors.primary, marginTop: 8 },
  ctaBtnText:   { color: '#fff', fontSize: 15, fontFamily: 'Sora_600SemiBold' },
});
