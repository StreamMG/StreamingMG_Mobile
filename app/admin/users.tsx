/**
 * app/admin/users.tsx — Gestion des utilisateurs
 *
 * Liste tous les utilisateurs, activer/désactiver.
 * Routes :
 *   GET /admin/users
 *   PUT /admin/users/:id
 */

import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, StyleSheet, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useAdminUsers }    from '@/hooks/useAdmin';
import type { AdminUser }   from '@/hooks/useAdmin';
import { colors }           from '@/lib/theme';

const ROLE_COLORS: Record<string, string> = {
  admin:    colors.error,
  provider: colors.teal,
  premium:  colors.gold,
  user:     colors.textMuted,
};

export default function AdminUsersScreen() {
  const { users, total, loading, error, refresh, toggleActive } = useAdminUsers();
  const [search, setSearch] = useState('');

  const filtered = search.trim()
    ? users.filter((u) =>
        u.username.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
      )
    : users;

  const handleToggle = (user: AdminUser) => {
    const action = user.isActive ? 'désactiver' : 'réactiver';
    Alert.alert(
      `${user.isActive ? 'Désactiver' : 'Réactiver'} le compte`,
      `Voulez-vous ${action} le compte de "${user.username}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: user.isActive ? 'Désactiver' : 'Réactiver',
          style: user.isActive ? 'destructive' : 'default',
          onPress: async () => {
            const ok = await toggleActive(user._id, !user.isActive);
            if (!ok) Alert.alert('Erreur', `Impossible de ${action} ce compte.`);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Utilisateurs ({total})</Text>
        <TouchableOpacity onPress={refresh} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="refresh-outline" size={20} color={colors.textSecond} />
        </TouchableOpacity>
      </View>

      {/* Recherche */}
      <View style={s.searchBar}>
        <Ionicons name="search-outline" size={16} color={colors.textMuted} style={{ marginRight: 8 }} />
        <TextInput
          style={s.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Nom ou email…"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={s.centered}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : error ? (
        <View style={s.centered}>
          <Text style={s.errorText}>{error}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={refresh}>
            <Text style={s.retryText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item._id}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={s.centered}>
              <Text style={s.emptyText}>Aucun utilisateur trouvé</Text>
            </View>
          }
          renderItem={({ item }) => (
            <UserRow item={item} onToggle={() => handleToggle(item)} />
          )}
          ItemSeparatorComponent={() => <View style={s.separator} />}
        />
      )}
    </SafeAreaView>
  );
}

// ─── UserRow ──────────────────────────────────────────────────────────────────

function UserRow({ item, onToggle }: { item: AdminUser; onToggle: () => void }) {
  return (
    <View style={[s.row, !item.isActive && { opacity: 0.55 }]}>
      {/* Avatar initiales */}
      <View style={[s.avatar, { backgroundColor: ROLE_COLORS[item.role] + '22' }]}>
        <Text style={[s.avatarText, { color: ROLE_COLORS[item.role] }]}>
          {item.username.slice(0, 2).toUpperCase()}
        </Text>
      </View>

      {/* Infos */}
      <View style={s.info}>
        <View style={s.nameRow}>
          <Text style={s.username}>{item.username}</Text>
          <View style={[s.roleBadge, { backgroundColor: ROLE_COLORS[item.role] + '18' }]}>
            <Text style={[s.roleText, { color: ROLE_COLORS[item.role] }]}>{item.role}</Text>
          </View>
        </View>
        <Text style={s.email}>{item.email}</Text>
        <Text style={s.date}>
          Inscrit le {new Date(item.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
        </Text>
      </View>

      {/* Toggle actif/inactif */}
      <TouchableOpacity
        style={[s.toggleBtn, item.isActive ? s.toggleBtnActive : s.toggleBtnInactive]}
        onPress={onToggle}
        accessibilityLabel={item.isActive ? 'Désactiver' : 'Réactiver'}
      >
        <Ionicons
          name={item.isActive ? 'checkmark-circle' : 'ban-outline'}
          size={20}
          color={item.isActive ? colors.success : colors.error}
        />
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: colors.bgBase },
  header:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, color: colors.textPrimary, fontFamily: 'Sora_600SemiBold' },

  searchBar: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 8, backgroundColor: colors.bgSurface, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(46,51,71,0.7)', paddingHorizontal: 12, paddingVertical: 10 },
  searchInput: { flex: 1, color: colors.textPrimary, fontFamily: 'DMSans_400Regular', fontSize: 14 },

  centered:  { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 60 },
  emptyText: { fontSize: 14, color: colors.textMuted, fontFamily: 'DMSans_400Regular' },
  errorText: { fontSize: 14, color: colors.textSecond, fontFamily: 'DMSans_400Regular', textAlign: 'center' },
  retryBtn:  { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20, backgroundColor: 'rgba(53,132,228,0.12)', borderWidth: 1, borderColor: 'rgba(53,132,228,0.3)' },
  retryText: { color: colors.primary, fontFamily: 'DMSans_500Medium', fontSize: 14 },

  list:      { paddingHorizontal: 16, paddingVertical: 8, paddingBottom: 40 },
  separator: { height: 1, backgroundColor: 'rgba(46,51,71,0.4)', marginLeft: 62 },

  row:    { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 14, fontFamily: 'Sora_700Bold' },
  info:   { flex: 1, gap: 2 },
  nameRow:{ flexDirection: 'row', alignItems: 'center', gap: 8 },
  username:{ fontSize: 14, color: colors.textPrimary, fontFamily: 'DMSans_600SemiBold' },
  roleBadge:{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  roleText: { fontSize: 10, fontFamily: 'DMSans_600SemiBold' },
  email:  { fontSize: 12, color: colors.textSecond, fontFamily: 'DMSans_400Regular' },
  date:   { fontSize: 11, color: colors.textMuted, fontFamily: 'DMSans_400Regular' },
  toggleBtn:       { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  toggleBtnActive: { backgroundColor: 'rgba(87,227,137,0.12)' },
  toggleBtnInactive:{ backgroundColor: 'rgba(237,51,59,0.1)' },
});
