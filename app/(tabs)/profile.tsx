/**
 * app/(tabs)/profile.tsx — Écran Profil
 *
 * Sections :
 *  - Avatar + nom + badge rôle
 *  - Stats (contenus vus, achats, tutoriels)
 *  - Statut abonnement Premium
 *  - Mes achats
 *  - Modifier le profil (username)
 *  - Changer le mot de passe
 *  - Liens : Téléchargements, Historique
 *  - Déconnexion
 *
 * Routes : GET /user/profile · PATCH /user/profile · PATCH /user/password
 *          GET /payment/purchases · GET /payment/status
 */

import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, StyleSheet, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useProfile }       from '@/hooks/useProfile';
import { useAuthStore }     from '@/stores/authStore';
import { usePurchaseStore } from '@/stores/purchaseStore';
import { validateUsername, validatePassword } from '@/lib/validation';
import { colors }           from '@/lib/theme';

export default function ProfileScreen() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { profile, loading, error, saving, saveError, updateUsername, updatePassword, refresh } = useProfile();
  const logout       = useAuthStore((s) => s.logout);
  const purchases    = usePurchaseStore((s) => s.purchases);
  const subscription = usePurchaseStore((s) => s.subscription);

  // Rediriger si non connecté
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={s.centered}>
        <View style={s.loginPrompt}>
          <Ionicons name="person-outline" size={48} color={colors.textMuted} style={{ marginBottom: 16 }} />
          <Text style={s.loginPromptTitle}>Connectez-vous pour accéder à votre profil</Text>
          <TouchableOpacity style={s.loginBtn} onPress={() => router.push('/(auth)/login')}>
            <Text style={s.loginBtnText}>Se connecter</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Édition username
  const [editingUsername, setEditingUsername] = useState(false);
  const [newUsername,     setNewUsername]     = useState('');
  const [usernameError,   setUsernameError]   = useState<string | null>(null);

  // Édition mot de passe
  const [editingPassword,   setEditingPassword]   = useState(false);
  const [currentPassword,   setCurrentPassword]   = useState('');
  const [newPassword,       setNewPassword]       = useState('');
  const [confirmPassword,   setConfirmPassword]   = useState('');
  const [passwordError,     setPasswordError]     = useState<string | null>(null);
  const [showCurrentPwd,    setShowCurrentPwd]    = useState(false);
  const [showNewPwd,        setShowNewPwd]        = useState(false);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Voulez-vous vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Déconnexion', style: 'destructive', onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        }},
      ]
    );
  };

  const handleSaveUsername = async () => {
    const err = validateUsername(newUsername);
    if (err) { setUsernameError(err); return; }
    const ok = await updateUsername(newUsername);
    if (ok) { setEditingUsername(false); setNewUsername(''); }
  };

  const handleSavePassword = async () => {
    if (!currentPassword) { setPasswordError('Mot de passe actuel requis.'); return; }
    const err = validatePassword(newPassword);
    if (err) { setPasswordError(err); return; }
    if (newPassword !== confirmPassword) { setPasswordError('Les mots de passe ne correspondent pas.'); return; }
    const ok = await updatePassword(currentPassword, newPassword);
    if (ok) {
      setEditingPassword(false);
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      Alert.alert('Succès', 'Mot de passe mis à jour.');
    }
  };

  // ── États ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={s.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (error || !profile) {
    return (
      <SafeAreaView style={s.centered}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.textMuted} style={{ opacity: 0.5 }} />
        <Text style={s.errorText}>{error ?? 'Profil introuvable'}</Text>
        <TouchableOpacity style={s.retryBtn} onPress={refresh}>
          <Text style={s.retryText}>Réessayer</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const isAdmin    = profile.role === 'admin';
  const isProvider = profile.role === 'provider' || isAdmin;

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* ── Header profil ── */}
        <View style={s.header}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{profile.username.slice(0, 2).toUpperCase()}</Text>
          </View>
          <Text style={s.username}>{profile.username}</Text>
          <Text style={s.email}>{profile.email}</Text>
          <RoleBadge role={profile.role} isPremium={profile.isPremium} />
        </View>

        {/* ── Stats ── */}
        <View style={s.statsRow}>
          <StatCard label="Vus" value={profile.stats.totalWatched} />
          <StatCard label="Achats" value={profile.stats.totalPurchases} />
          <StatCard label="Tutoriels" value={profile.stats.tutorialsInProgress} />
        </View>

        {/* ── Abonnement ── */}
        {subscription.isPremium ? (
          <View style={s.premiumCard}>
            <Ionicons name="star" size={18} color={colors.gold} />
            <View style={{ flex: 1 }}>
              <Text style={s.premiumTitle}>Abonnement Premium actif</Text>
              {subscription.premiumExpiry && (
                <Text style={s.premiumSub}>
                  Expire le {new Date(subscription.premiumExpiry).toLocaleDateString('fr-FR')}
                </Text>
              )}
            </View>
          </View>
        ) : (
          <TouchableOpacity style={s.premiumCta} onPress={() => router.push('/subscribe')} activeOpacity={0.85}>
            <Ionicons name="star-outline" size={16} color={colors.gold} />
            <Text style={s.premiumCtaText}>Passer à Premium</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.gold} />
          </TouchableOpacity>
        )}

        {/* ── Navigation ── */}
        <SectionTitle title="Mes contenus" />
        <NavRow icon="download-outline"  label="Téléchargements"     onPress={() => router.push('/offline')} />
        <NavRow icon="time-outline"      label="Historique"           onPress={() => router.push('/history')} />
        <NavRow icon="bag-check-outline" label="Mes achats"           onPress={() => router.push('/purchases')}
          badge={purchases.length > 0 ? String(purchases.length) : undefined} />
        {isProvider && (
          <NavRow icon="cloud-upload-outline" label="Espace fournisseur" onPress={() => router.push('/provider')} />
        )}
        {isAdmin && (
          <NavRow icon="shield-checkmark-outline" label="Administration" onPress={() => router.push('/admin')} />
        )}

        {/* ── Modifier profil ── */}
        <SectionTitle title="Mon compte" />

        {/* Username */}
        {!editingUsername ? (
          <NavRow
            icon="person-outline"
            label="Nom d'utilisateur"
            value={profile.username}
            onPress={() => { setNewUsername(profile.username); setEditingUsername(true); setUsernameError(null); }}
          />
        ) : (
          <View style={s.editCard}>
            <Text style={s.editLabel}>Nouveau nom d'utilisateur</Text>
            <TextInput
              style={s.editInput}
              value={newUsername}
              onChangeText={(v) => { setNewUsername(v); setUsernameError(null); }}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              placeholder="3 à 30 caractères"
              placeholderTextColor={colors.textMuted}
            />
            {(usernameError || saveError) && (
              <Text style={s.inputError}>{usernameError ?? saveError}</Text>
            )}
            <View style={s.editActions}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => { setEditingUsername(false); setUsernameError(null); }}>
                <Text style={s.cancelBtnText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.saveBtn} onPress={handleSaveUsername} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.saveBtnText}>Enregistrer</Text>}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Mot de passe */}
        {!editingPassword ? (
          <NavRow icon="lock-closed-outline" label="Mot de passe" value="••••••••" onPress={() => { setEditingPassword(true); setPasswordError(null); }} />
        ) : (
          <View style={s.editCard}>
            <Text style={s.editLabel}>Changer le mot de passe</Text>
            <PasswordInput label="Mot de passe actuel" value={currentPassword} onChangeText={setCurrentPassword} show={showCurrentPwd} onToggle={() => setShowCurrentPwd(!showCurrentPwd)} />
            <PasswordInput label="Nouveau mot de passe" value={newPassword} onChangeText={setNewPassword} show={showNewPwd} onToggle={() => setShowNewPwd(!showNewPwd)} />
            <PasswordInput label="Confirmer" value={confirmPassword} onChangeText={setConfirmPassword} show={showNewPwd} onToggle={() => {}} />
            {(passwordError || saveError) && (
              <Text style={s.inputError}>{passwordError ?? saveError}</Text>
            )}
            <View style={s.editActions}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => { setEditingPassword(false); setPasswordError(null); }}>
                <Text style={s.cancelBtnText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.saveBtn} onPress={handleSavePassword} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.saveBtnText}>Enregistrer</Text>}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Déconnexion ── */}
        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={20} color={colors.error} />
          <Text style={s.logoutText}>Déconnexion</Text>
        </TouchableOpacity>

        <Text style={s.version}>
          Membre depuis {new Date(profile.createdAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

function SectionTitle({ title }: { title: string }) {
  return (
    <Text style={s.sectionTitle}>{title}</Text>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <View style={s.statCard}>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function NavRow({ icon, label, value, onPress, badge }: {
  icon: string; label: string; value?: string;
  onPress: () => void; badge?: string;
}) {
  return (
    <TouchableOpacity style={s.navRow} onPress={onPress} activeOpacity={0.7}>
      <View style={s.navRowLeft}>
        <Ionicons name={icon as any} size={20} color={colors.textSecond} />
        <Text style={s.navLabel}>{label}</Text>
      </View>
      <View style={s.navRowRight}>
        {value && <Text style={s.navValue}>{value}</Text>}
        {badge && <View style={s.badgePill}><Text style={s.badgeText}>{badge}</Text></View>}
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </View>
    </TouchableOpacity>
  );
}

function RoleBadge({ role, isPremium }: { role: string; isPremium: boolean }) {
  const label = isPremium ? 'Premium' : role === 'admin' ? 'Admin' : role === 'provider' ? 'Fournisseur' : 'Standard';
  const bg    = isPremium ? 'rgba(232,197,71,0.15)' : role === 'admin' ? 'rgba(237,51,59,0.12)' : 'rgba(53,132,228,0.12)';
  const color = isPremium ? colors.gold : role === 'admin' ? colors.error : colors.primary;
  return (
    <View style={[s.roleBadge, { backgroundColor: bg }]}>
      {isPremium && <Ionicons name="star" size={11} color={color} style={{ marginRight: 4 }} />}
      <Text style={[s.roleBadgeText, { color }]}>{label}</Text>
    </View>
  );
}

function PasswordInput({ label, value, onChangeText, show, onToggle }: {
  label: string; value: string; onChangeText: (v: string) => void;
  show: boolean; onToggle: () => void;
}) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={s.editLabel}>{label}</Text>
      <View style={s.pwdInputRow}>
        <TextInput
          style={[s.editInput, { flex: 1, marginBottom: 0 }]}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!show}
          autoCapitalize="none"
          autoCorrect={false}
          placeholderTextColor={colors.textMuted}
        />
        <TouchableOpacity onPress={onToggle} style={{ padding: 10 }}>
          <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: colors.bgBase },
  centered:{ flex: 1, backgroundColor: colors.bgBase, alignItems: 'center', justifyContent: 'center', gap: 16 },
  loginPrompt: { alignItems: 'center', paddingHorizontal: 32, gap: 16 },
  loginPromptTitle: { fontSize: 16, color: colors.textPrimary, fontFamily: 'Sora_600SemiBold', textAlign: 'center', marginBottom: 8 },
  loginBtn: { paddingHorizontal: 32, paddingVertical: 12, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center' },
  loginBtnText: { color: '#fff', fontFamily: 'Sora_600SemiBold', fontSize: 14 },

  header: { alignItems: 'center', paddingVertical: 28, gap: 6 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  avatarText: { fontSize: 28, color: '#fff', fontFamily: 'Sora_700Bold' },
  username: { fontSize: 20, color: colors.textPrimary, fontFamily: 'Sora_700Bold' },
  email:    { fontSize: 13, color: colors.textSecond, fontFamily: 'DMSans_400Regular' },
  roleBadge:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginTop: 4 },
  roleBadgeText:{ fontSize: 12, fontFamily: 'DMSans_600SemiBold' },

  statsRow: { flexDirection: 'row', marginHorizontal: 16, gap: 10, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: colors.bgSurface, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(46,51,71,0.7)', padding: 14, alignItems: 'center', gap: 2 },
  statValue:{ fontSize: 22, color: colors.textPrimary, fontFamily: 'Sora_700Bold' },
  statLabel:{ fontSize: 11, color: colors.textMuted, fontFamily: 'DMSans_400Regular' },

  premiumCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 16, marginBottom: 16, backgroundColor: 'rgba(232,197,71,0.08)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(232,197,71,0.2)', padding: 14 },
  premiumTitle:{ fontSize: 14, color: colors.textPrimary, fontFamily: 'DMSans_600SemiBold' },
  premiumSub:  { fontSize: 12, color: colors.textSecond, fontFamily: 'DMSans_400Regular', marginTop: 2 },
  premiumCta:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginBottom: 16, backgroundColor: 'rgba(232,197,71,0.08)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(232,197,71,0.2)', padding: 14 },
  premiumCtaText:{ flex: 1, fontSize: 14, color: colors.gold, fontFamily: 'DMSans_600SemiBold' },

  sectionTitle: { fontSize: 12, color: colors.textMuted, fontFamily: 'DMSans_600SemiBold', letterSpacing: 0.8, paddingHorizontal: 16, paddingTop: 20, paddingBottom: 6 },

  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(46,51,71,0.4)' },
  navRowLeft:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  navRowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  navLabel: { fontSize: 14, color: colors.textPrimary, fontFamily: 'DMSans_400Regular' },
  navValue: { fontSize: 13, color: colors.textMuted, fontFamily: 'DMSans_400Regular' },
  badgePill: { backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  badgeText: { fontSize: 11, color: '#fff', fontFamily: 'DMSans_600SemiBold' },

  editCard: { marginHorizontal: 16, marginVertical: 4, backgroundColor: colors.bgSurface, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(46,51,71,0.7)', padding: 16, gap: 4 },
  editLabel:{ fontSize: 12, color: colors.textSecond, fontFamily: 'DMSans_500Medium', marginBottom: 4 },
  editInput:{ backgroundColor: colors.bgRaised, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(46,51,71,0.7)', paddingHorizontal: 14, paddingVertical: 11, color: colors.textPrimary, fontFamily: 'DMSans_400Regular', fontSize: 14, marginBottom: 8 },
  pwdInputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgRaised, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(46,51,71,0.7)' },
  inputError: { fontSize: 12, color: colors.error, fontFamily: 'DMSans_400Regular' },
  editActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  cancelBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(46,51,71,0.7)', alignItems: 'center' },
  cancelBtnText: { color: colors.textSecond, fontFamily: 'DMSans_500Medium', fontSize: 14 },
  saveBtn:  { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontFamily: 'Sora_600SemiBold', fontSize: 14 },

  logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, margin: 16, marginTop: 24, backgroundColor: 'rgba(237,51,59,0.08)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(237,51,59,0.2)', padding: 14 },
  logoutText:{ fontSize: 14, color: colors.error, fontFamily: 'DMSans_600SemiBold' },

  version: { textAlign: 'center', fontSize: 11, color: colors.textMuted, fontFamily: 'DMSans_400Regular', marginTop: 8 },

  errorText: { fontSize: 14, color: colors.textSecond, fontFamily: 'DMSans_400Regular', textAlign: 'center', paddingHorizontal: 32 },
  retryBtn:  { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20, backgroundColor: 'rgba(53,132,228,0.12)', borderWidth: 1, borderColor: 'rgba(53,132,228,0.3)' },
  retryText: { color: colors.primary, fontFamily: 'DMSans_500Medium', fontSize: 14 },
});
