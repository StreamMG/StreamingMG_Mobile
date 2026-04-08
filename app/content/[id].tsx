/**
 * app/content/[id].tsx — Écran de détail
 *
 * Interfaces alignées sur les composants existants :
 *  - Badge        → `accessType: AccessType`, `price?`
 *  - StarRating   → `value: number`, `count?`, `size={number}`, `variant="compact"`
 *  - ProgressBar  → `progress`, `variant="card"|"detail"`, `showPercent?`
 *                   completedLessons / totalLessons pour variant="detail"
 */

import React, { useCallback } from 'react';
import {
  View, Text, Image, ScrollView, TouchableOpacity,
  ActivityIndicator, Share, StyleSheet, Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Badge }        from '@/components/ui/Badge';
import { StarRating }   from '@/components/ui/StarRating';
import { ProgressBar }  from '@/components/ui/ProgressBar';
import { useContentDetail } from '@/hooks/useContentDetail';
import { useAuthStore }     from '@/stores/authStore';
import { colors,BASE_URL }           from '@/lib/theme';
import type { Lesson }      from '@/hooks/useContentDetail';
import {Button} from "@/components/ui/Button"


// ─── Constantes ───────────────────────────────────────────────────────────────

const { width: W } = Dimensions.get('window');
const HERO_HEIGHT  = Math.round(W * 0.56);
// const BASE_URL     = __DEV__
//   ? 'http://192.168.43.147:3001'
//   : 'https://api.streamMG.railway.app';

// ─── Composant principal ──────────────────────────────────────────────────────

export default function ContentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { content, tutorial, accessStatus, loading, error, refresh } =
    useContentDetail(id ?? '');
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // ── Navigations ──────────────────────────────────────────────────────────────

  const handleWatch = useCallback(() => {
    if (!content) return;
    if (content.type === 'video') router.push(`/player/video/${content._id}`);
    else                          router.push(`/player/audio/${content._id}`);
  }, [content]);

  const handleLessonPress = useCallback((lesson: Lesson) => {
    if (!content) return;
    if (content.type === 'video') router.push(`/player/video/${content._id}?lessonIndex=${lesson.index}`);
    else                          router.push(`/player/audio/${content._id}?lessonIndex=${lesson.index}`);
  }, [content]);

  const handleShare = useCallback(async () => {
    if (!content) return;
    await Share.share({ title: content.title, message: `Découvre "${content.title}" sur StreamMG !` });
  }, [content]);

  const handleDownload  = useCallback(() => { if (content) router.push(`/download/${content._id}`); }, [content]);
  const handleSubscribe = useCallback(() => router.push('/subscribe'), []);
  const handlePurchase  = useCallback(() => { if (content) router.push(`/purchase/${content._id}`); }, [content]);
  const handleLogin     = useCallback(() => router.push('/(auth)/login'), []);

  // ── États ────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={s.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (error || !content) {
    return (
      <SafeAreaView style={s.centered}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.textMuted} style={{ opacity: 0.5 }} />
        <Text style={s.errorText}>{error ?? 'Contenu introuvable'}</Text>
        <TouchableOpacity style={s.retryBtn} onPress={refresh}>
          <Text style={s.retryText}>Réessayer</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const thumbnailUri = content.thumbnail.startsWith('http')
    ? content.thumbnail
    : `${BASE_URL}${content.thumbnail}`;
    console.log("### thumbnailUri:", thumbnailUri);
    console.log("### content.thumbnail:", content.thumbnail);

  const canAccess = accessStatus === 'granted';
  const isVideo   = content.type === 'video';

  return (
    <View style={s.root}>
      <ScrollView
        style={s.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Hero */}
        <View style={{ height: HERO_HEIGHT }}>
          <Image source={{ uri: thumbnailUri }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
          <View style={s.heroGradient} pointerEvents="none" />
          <SafeAreaView style={s.backBtnContainer} edges={['top']}>
            <TouchableOpacity style={s.backBtn} onPress={() => router.back()} accessibilityLabel="Retour">
              <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </SafeAreaView>
        </View>

        {/* Corps */}
        <View style={s.body}>

          {/* Badges */}
          <View style={s.badgeRow}>
            {/* Badge niveau d'accès — ne s'affiche pas si free */}
            <Badge accessType={content.accessType} price={content.price} />
            {/* Catégorie textuelle */}
            <View style={s.categoryChip}>
              <Text style={s.categoryChipText}>
                {isVideo ? 'Vidéo' : 'Audio'} · {content.category}
              </Text>
            </View>
          </View>

          {/* Titre */}
          <Text style={s.title}>{content.title}</Text>

          {/* Métadonnées */}
          <View style={s.metaRow}>
            <MetaChip icon="time-outline"  label={formatDuration(content.duration)} />
            <MetaChip icon="eye-outline"   label={formatViews(content.viewCount)} />
            {content.language && (
              <MetaChip icon="globe-outline" label={formatLanguage(content.language)} />
            )}
          </View>

          {/* StarRating — aligné sur l'interface réelle du composant */}
          {content.rating != null && (
            <View style={{ marginBottom: 12 }}>
              <StarRating
                value={content.rating}
                count={content.ratingCount ?? undefined}
                size={14}
                variant="compact"
              />
            </View>
          )}

          {/* Access Gate inline */}
          {!canAccess && (
            <InlineAccessGate
              reason={accessStatus}
              price={content.price}
              onSubscribe={handleSubscribe}
              onPurchase={handlePurchase}
              onLogin={handleLogin}
            />
          )}

          {/* Bouton principal */}
          {/* {canAccess && !content.isTutorial && (
            <TouchableOpacity style={s.watchBtn} onPress={handleWatch} activeOpacity={0.85}>
              <Ionicons name={isVideo ? 'play' : 'headset'} size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={s.watchBtnText}>{isVideo ? 'Regarder' : 'Écouter'}</Text>
            </TouchableOpacity>
          )} */}
              {canAccess && !content.isTutorial && (
                        <Button
                          onPress={handleWatch}
                          // style={s.watchBtn}
                          icon={<Ionicons
                            name={isVideo ? 'play' : 'headset'}
                            size={18}
                            color="#fff"
                            style={{ marginRight: 8 }}
                          />}
                          label={isVideo ? 'Regarder' : 'Écouter'}
                        />
            
                      )}
          

          {/* Description */}
          {content.description ? (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Description</Text>
              <Text style={s.description}>{content.description}</Text>
            </View>
          ) : null}

          {/* Leçons tutoriel */}
          {content.isTutorial && canAccess && tutorial && (
            <TutorialSection tutorial={tutorial} onLessonPress={handleLessonPress} />
          )}
        </View>
      </ScrollView>

      {/* Barre d'actions bas */}
      <BottomActionsBar
        canDownload={canAccess}
        onShare={handleShare}
        onDownload={handleDownload}
        onDownloadBlocked={
          accessStatus === 'login_required'       ? handleLogin
          : accessStatus === 'subscription_required' ? handleSubscribe
          : handlePurchase
        }
      />
    </View>
  );
}

// ─── InlineAccessGate ─────────────────────────────────────────────────────────

function InlineAccessGate({ reason, price, onSubscribe, onPurchase, onLogin }: {
  reason: string; price: number | null;
  onSubscribe: () => void; onPurchase: () => void; onLogin: () => void;
}) {
  const isPremium  = reason === 'subscription_required';
  const isPurchase = reason === 'purchase_required';
  const accentColor = isPremium ? colors.gold : isPurchase ? colors.teal : colors.primary;
  const accentBg    = isPremium ? 'rgba(232,197,71,0.10)' : isPurchase ? 'rgba(46,194,126,0.10)' : 'rgba(53,132,228,0.10)';
  const handleAction = isPremium ? onSubscribe : isPurchase ? onPurchase : onLogin;

  return (
    <View style={[s.gateCard, { borderColor: `${accentColor}22` }]}>
      <View style={[s.gateIcon, { backgroundColor: accentBg }]}>
        <Ionicons name={isPremium ? 'star' : isPurchase ? 'lock-closed' : 'person'} size={28} color={accentColor} />
      </View>
      <Text style={s.gateTitle}>
        {isPremium ? 'Contenu Premium' : isPurchase ? 'Contenu payant' : 'Connexion requise'}
      </Text>
      <Text style={s.gateDesc}>
        {isPremium
          ? "Abonnez-vous à Premium pour accéder à ce contenu."
          : isPurchase
          ? "Achetez ce contenu pour un accès permanent."
          : "Connectez-vous pour accéder à ce contenu."}
      </Text>
      <TouchableOpacity style={[s.gateBtn, { backgroundColor: accentColor }]} onPress={handleAction} activeOpacity={0.85}>
        <Text style={s.gateBtnText}>
          {isPremium ? "S'abonner à Premium" : isPurchase ? 'Acheter ce contenu' : 'Se connecter'}
        </Text>
      </TouchableOpacity>
      {isPremium && <Text style={[s.gateHint, { color: accentColor }]}>5 000 Ar/mois</Text>}
      {isPurchase && price != null && <Text style={[s.gateHint, { color: accentColor }]}>{formatPrice(price)}</Text>}
    </View>
  );
}

// ─── TutorialSection ──────────────────────────────────────────────────────────

function TutorialSection({ tutorial, onLessonPress }: {
  tutorial: NonNullable<ReturnType<typeof useContentDetail>['tutorial']>;
  onLessonPress: (lesson: Lesson) => void;
}) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>Leçons ({tutorial.totalLessons})</Text>

      {tutorial.percentComplete > 0 && (
        <View style={{ marginBottom: 16 }}>
          {/* ProgressBar aligné sur l'interface réelle */}
          <ProgressBar
            progress={Math.round(tutorial.percentComplete)}
            variant="detail"
            completedLessons={tutorial.completedLessons.length}
            totalLessons={tutorial.totalLessons}
          />
        </View>
      )}

      {tutorial.lessons.map((lesson, i) => {
        const isCompleted = tutorial.completedLessons.includes(lesson.index);
        const isCurrent   = lesson.index === tutorial.lastLessonIndex + 1;

        return (
          <React.Fragment key={lesson.index}>
            <TouchableOpacity
              style={s.lessonRow}
              onPress={() => onLessonPress(lesson)}
              activeOpacity={0.75}
            >
              <View style={[
                s.lessonNum,
                isCompleted && { backgroundColor: colors.primary },
                isCurrent && !isCompleted && { borderColor: colors.primary, borderWidth: 1.5 },
              ]}>
                {isCompleted
                  ? <Ionicons name="checkmark" size={12} color="#fff" />
                  : <Text style={[s.lessonNumText, isCurrent && { color: colors.primary }]}>{lesson.index + 1}</Text>
                }
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.lessonTitle, isCompleted && { color: colors.textSecond }]}>{lesson.title}</Text>
                <Text style={s.lessonDuration}>{formatDuration(lesson.duration)}</Text>
              </View>
              <Ionicons name="play-circle-outline" size={26} color={isCurrent ? colors.primary : colors.textMuted} />
            </TouchableOpacity>
            {i < tutorial.lessons.length - 1 && <View style={s.separator} />}
          </React.Fragment>
        );
      })}
    </View>
  );
}

// ─── BottomActionsBar ─────────────────────────────────────────────────────────

function BottomActionsBar({ canDownload, onShare, onDownload, onDownloadBlocked }: {
  canDownload: boolean; onShare: () => void;
  onDownload: () => void; onDownloadBlocked: () => void;
}) {
  return (
    <View style={s.bottomBar}>
      <ActionBtn icon="heart-outline"        label="Favoris"    onPress={() => {}} />
      <ActionBtn icon="share-social-outline" label="Partager"   onPress={onShare} />
      <ActionBtn
        icon="download-outline"
        label="Hors-ligne"
        onPress={canDownload ? onDownload : onDownloadBlocked}
        dimmed={!canDownload}
      />
    </View>
  );
}

function ActionBtn({ icon, label, onPress, dimmed = false }: {
  icon: string; label: string; onPress: () => void; dimmed?: boolean;
}) {
  return (
    <TouchableOpacity style={s.actionBtn} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name={icon as any} size={22} color={dimmed ? colors.textMuted : colors.textSecond} style={{ opacity: dimmed ? 0.5 : 1 }} />
      <Text style={[s.actionLabel, dimmed && { opacity: 0.5 }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function MetaChip({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={s.metaChip}>
      <Ionicons name={icon as any} size={13} color={colors.textMuted} style={{ marginRight: 4 }} />
      <Text style={s.metaText}>{label}</Text>
    </View>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h${m > 0 ? m + 'min' : ''}`;
  return `${m}min`;
}
function formatViews(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k vues` : `${n} vues`;
}
function formatLanguage(lang: string): string {
  return ({ mg: 'Malagasy', fr: 'Français', en: 'English' } as any)[lang] ?? lang;
}
function formatPrice(ar: number): string {
  if (ar >= 1_000_000) return `${(ar / 1_000_000).toFixed(1)}M Ar`;
  if (ar >= 1000)      return `${(ar / 1000).toFixed(0)}k Ar`;
  return `${ar} Ar`;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: colors.bgBase },
  scroll:  { flex: 1 },
  centered: { flex: 1, backgroundColor: colors.bgBase, alignItems: 'center', justifyContent: 'center', gap: 16 },
  heroGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%', backgroundColor: 'rgba(13,16,24,0.6)' },
  backBtnContainer: { position: 'absolute', top: 0, left: 0 },
  backBtn: { margin: 16, width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(13,16,24,0.65)', borderWidth: 1, borderColor: 'rgba(46,51,71,0.7)', alignItems: 'center', justifyContent: 'center' },
  body: { padding: 20 },
  badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' },
  categoryChip: { backgroundColor: 'rgba(46,51,71,0.5)', borderRadius: 4, paddingHorizontal: 7, paddingVertical: 3 },
  categoryChipText: { fontSize: 10, color: colors.textSecond, fontFamily: 'DMSans_500Medium', letterSpacing: 0.3 },
  title: { fontSize: 28, color: colors.textPrimary, fontFamily: 'Sora_800ExtraBold', letterSpacing: -0.7, lineHeight: 34, marginBottom: 12 },
  metaRow: { flexDirection: 'row', gap: 16, marginBottom: 14, flexWrap: 'wrap' },
  metaChip: { flexDirection: 'row', alignItems: 'center' },
  metaText: { fontSize: 13, color: colors.textSecond, fontFamily: 'DMSans_400Regular' },
  watchBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 14, marginBottom: 24, shadowColor: colors.primary, shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
  watchBtnText: { color: '#fff', fontSize: 16, fontFamily: 'Sora_600SemiBold' },
  section: { marginTop: 8, marginBottom: 8 },
  sectionTitle: { fontSize: 16, color: colors.textPrimary, fontFamily: 'Sora_700Bold', marginBottom: 10 },
  description: { fontSize: 14, color: colors.textSecond, fontFamily: 'DMSans_400Regular', lineHeight: 22 },
  gateCard: { backgroundColor: colors.bgSurface, borderRadius: 16, borderWidth: 1, padding: 20, alignItems: 'center', gap: 10, marginBottom: 24 },
  gateIcon: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  gateTitle: { fontSize: 18, color: colors.textPrimary, fontFamily: 'Sora_700Bold', textAlign: 'center' },
  gateDesc: { fontSize: 13, color: colors.textSecond, fontFamily: 'DMSans_400Regular', textAlign: 'center', lineHeight: 20, paddingHorizontal: 8 },
  gateBtn: { flexDirection: 'row', alignItems: 'center', width: '100%', paddingVertical: 13, borderRadius: 14, justifyContent: 'center', marginTop: 4 },
  gateBtnText: { color: '#fff', fontSize: 15, fontFamily: 'Sora_600SemiBold' },
  gateHint: { fontSize: 13, fontFamily: 'DMSans_500Medium' },
  lessonRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  lessonNum: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.bgRaised, alignItems: 'center', justifyContent: 'center' },
  lessonNumText: { fontSize: 13, color: colors.textSecond, fontFamily: 'DMSans_600SemiBold' },
  lessonTitle: { fontSize: 14, color: colors.textPrimary, fontFamily: 'DMSans_500Medium' },
  lessonDuration: { fontSize: 12, color: colors.textMuted, fontFamily: 'DMSans_400Regular', marginTop: 2 },
  separator: { height: 1, backgroundColor: 'rgba(46,51,71,0.5)' },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 12, paddingBottom: 28, backgroundColor: colors.bgBase, borderTopWidth: 1, borderTopColor: 'rgba(46,51,71,0.6)' },
  actionBtn: { alignItems: 'center', gap: 5, paddingHorizontal: 16 },
  actionLabel: { fontSize: 11, color: colors.textSecond, fontFamily: 'DMSans_400Regular' },
  errorText: { fontSize: 14, color: colors.textSecond, fontFamily: 'DMSans_400Regular', textAlign: 'center', paddingHorizontal: 32 },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20, backgroundColor: 'rgba(53,132,228,0.12)', borderWidth: 1, borderColor: 'rgba(53,132,228,0.3)' },
  retryText: { color: colors.primary, fontFamily: 'DMSans_500Medium', fontSize: 14 },
});
