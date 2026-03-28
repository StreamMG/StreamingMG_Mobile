import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '@/lib/apiClient';
import { useAuthStore } from '@/stores/authStore';
import {
  validateUsername,
  validateEmail,
  validatePassword,
  validateConfirmPassword,
  getPasswordStrength,
} from '@/lib/validation';
import { colors } from '@/lib/theme';
import {FieldWrapper,InputField,PasswordStrengthBar} from "@/components/Field"


interface FormErrors {
  username?: string | null;
  email?: string | null;
  password?: string | null;
  confirmPassword?: string | null;
  global?: string | null;
}

// ─── Composant ────────────────────────────────────────────────────────────────

export default function RegisterScreen() {
  const setAuth = useAuthStore((s) => s.setAuth);

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Refs pour navigation clavier
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const passwordStrength = password ? getPasswordStrength(password) : null;

  // ─── Validation en temps réel ────────────────────────────────────────────────

  const validateField = (field: string, value: string) => {
    let error: string | null = null;
    switch (field) {
      case 'username':   error = validateUsername(value); break;
      case 'email':      error = validateEmail(value); break;
      case 'password':   error = validatePassword(value); break;
      case 'confirmPassword': error = validateConfirmPassword(password, value); break;
    }
    setErrors((prev) => ({ ...prev, [field]: error }));
  };

  const handleBlur = (field: string, value: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validateField(field, value);
  };

  // ─── Soumission ──────────────────────────────────────────────────────────────

  const handleRegister = async () => {
    // Valider tous les champs
    // console.log("BALALALLALALAL")
    const allErrors: FormErrors = {
      username: validateUsername(username),
      email: validateEmail(email),
      password: validatePassword(password),
      confirmPassword: validateConfirmPassword(password, confirmPassword),
    };

    setErrors(allErrors);
    setTouched({ username: true, email: true, password: true, confirmPassword: true });

    const hasError = Object.values(allErrors).some(Boolean);
    if (hasError) return;

    setLoading(true);
    setErrors((prev) => ({ ...prev, global: null }));

    try {
      const { data } = await apiClient.post('/auth/register', {
        username: username.trim(),
        email: email.trim().toLowerCase(),
        password,
      });

      // Stocker token + refresh token + user
      await setAuth(data.token, data.user, data.refreshToken ?? '');
      router.replace('/(tabs)');
    } catch (err: any) {
      console.log(err)
      const status = err?.response?.status;
      const code = err?.response?.data?.code;
      const message = err?.response?.data?.message;

      if (status === 409 && code === 'EMAIL_DUPLICATE') {
        setErrors((prev) => ({ ...prev, email: 'Cet email est déjà utilisé' }));
      } else if (status === 400 && code === 'WEAK_PASSWORD') {
        setErrors((prev) => ({ ...prev, password: message ?? 'Mot de passe trop faible' }));
      } else if (status === 429) {
        setErrors({ global: 'Trop de tentatives. Réessayez dans 15 minutes.' });
      } else {
        setErrors({ global: 'Une erreur est survenue. Veuillez réessayer.' });
      }
    } finally {
      setLoading(false);
    }
  };

  // ─── Rendu ───────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView className="flex-1 bg-[#0d1018]">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        {/* ── Header ── */}
        <View className="flex-row items-center px-5 pt-2 pb-4 border-b border-[#2e3347]">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 items-center justify-center"
            accessibilityLabel="Retour"
          >
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text
            className="text-base font-semibold ml-2"
            style={{ color: colors.primary, fontFamily: 'Sora_600SemiBold' }}
          >
            Inscription
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Titre ── */}
<View style={{ alignItems: 'center', marginBottom: 40, gap: 8 }}>
  <Text style={{ fontFamily: 'Sora_800ExtraBold', fontSize: 32, color: '#ffffff' }}>
    Stream<Text style={{ color: '#3b82f6' }}>MG</Text>
  </Text>
  <Text style={{ fontSize: 14, color: '#9ca3af', textAlign: 'center' }}>
    Inscrivez-vous pour accéder à vos contenus
  </Text>
</View>

          {/* ── Erreur globale ── */}
          {errors.global && (
            <View className="bg-[#ed333b]/10 border border-[#ed333b]/30 rounded-xl px-4 py-3 mb-5 flex-row items-center gap-2">
              <Ionicons name="alert-circle" size={16} color="#ed333b" />
              <Text
                className="text-[#ed333b] text-sm flex-1"
                style={{ fontFamily: 'DMSans_400Regular' }}
              >
                {errors.global}
              </Text>
            </View>
          )}

          {/* ── Nom d'utilisateur ── */}
          <FieldWrapper label="Nom d'utilisateur" error={touched.username ? errors.username : null}>
            <InputField
              icon="person-outline"
              placeholder="3 à 30 caractères"
              value={username}
              onChangeText={(v) => {
                setUsername(v);
                if (touched.username) validateField('username', v);
              }}
              
              onBlur={() => handleBlur('username', username)}
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
              autoCapitalize="none"
              autoCorrect={false}
              hasError={!!(touched.username && errors.username)}
            />
          </FieldWrapper>

          {/* ── Email ── */}
          <FieldWrapper label="Email" error={touched.email ? errors.email : null}>
            <InputField
              ref={emailRef}
              icon="mail-outline"
              placeholder="votre@email.com"
              value={email}
              onChangeText={(v) => {
                setEmail(v);
                if (touched.email) validateField('email', v);
              }}
              onBlur={() => handleBlur('email', email)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              hasError={!!(touched.email && errors.email)}
            />
          </FieldWrapper>

          {/* ── Mot de passe ── */}
          <FieldWrapper label="Mot de passe" error={touched.password ? errors.password : null}>
            <InputField
              ref={passwordRef}
              icon="lock-closed-outline"
              placeholder="Min. 8 caractères, 1 majuscule, 1 chiffre"
              value={password}
              onChangeText={(v) => {
                setPassword(v);
                if (touched.password) validateField('password', v);
                // Revalider la confirmation si déjà touchée
                if (touched.confirmPassword) validateField('confirmPassword', confirmPassword);
              }}
              onBlur={() => handleBlur('password', password)}
              secureTextEntry={!showPassword}
              returnKeyType="next"
              onSubmitEditing={() => confirmRef.current?.focus()}
              hasError={!!(touched.password && errors.password)}
              rightElement={
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  accessibilityLabel={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>
              }
            />
            {/* Indicateur de force */}
            {password.length > 0 && passwordStrength && (
              <PasswordStrengthBar strength={passwordStrength} />
            )}
          </FieldWrapper>

          {/* ── Confirmer le mot de passe ── */}
          <FieldWrapper
            label="Confirmer le mot de passe"
            error={touched.confirmPassword ? errors.confirmPassword : null}
          >
            <InputField
              ref={confirmRef}
              icon="lock-closed-outline"
              placeholder="Répétez le mot de passe"
              value={confirmPassword}
              onChangeText={(v) => {
                setConfirmPassword(v);
                if (touched.confirmPassword) validateField('confirmPassword', v);
              }}
              onBlur={() => handleBlur('confirmPassword', confirmPassword)}
              secureTextEntry={!showConfirm}
              returnKeyType="done"
              onSubmitEditing={handleRegister}
              hasError={!!(touched.confirmPassword && errors.confirmPassword)}
              rightElement={
                <TouchableOpacity
                  onPress={() => setShowConfirm(!showConfirm)}
                  accessibilityLabel={showConfirm ? 'Masquer' : 'Afficher'}
                >
                  <Ionicons
                    name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>
              }
            />
          </FieldWrapper>

          {/* ── Bouton CTA ── */}
          <TouchableOpacity
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.85}
            className="rounded-xl items-center justify-center py-4 mt-4"
            style={{ backgroundColor: loading ? colors.primaryMuted : colors.primary }}
            accessibilityRole="button"
            accessibilityLabel="Créer mon compte"
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text
                className="text-white text-[16px]"
                style={{ fontFamily: 'Sora_600SemiBold' }}
              >
                Créer mon compte
              </Text>
            )}
          </TouchableOpacity>

          {/* ── Lien connexion ── */}
          <View className="flex-row justify-center mt-6">
            <Text
              className="text-[#8d96a8] text-sm"
              style={{ fontFamily: 'DMSans_400Regular' }}
            >
              Vous avez déjà un compte ?{' '}
            </Text>
            <TouchableOpacity onPress={() => router.replace('/login')}>
              <Text
                className="text-sm"
                style={{ color: colors.primary, fontFamily: 'DMSans_500Medium' }}
              >
                Se connecter
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

