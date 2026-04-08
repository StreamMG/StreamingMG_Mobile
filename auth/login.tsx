import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '@/lib/apiClient';
import { useAuthStore } from '@/stores/authStore';
import { validateEmail } from '@/lib/validation';
import { colors } from '@/lib/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormErrors {
  email?: string | null;
  password?: string | null;
  global?: string | null;
}

// ─── Composant ────────────────────────────────────────────────────────────────

export default function LoginScreen() {
  const setAuth = useAuthStore((s) => s.setAuth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const passwordRef = useRef<TextInput>(null);

  // ─── Validation en temps réel ────────────────────────────────────────────────

  const handleBlur = (field: string, value: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    if (field === 'email') {
      setErrors((prev) => ({ ...prev, email: validateEmail(value) }));
    }
    if (field === 'password') {
      setErrors((prev) => ({ ...prev, password: !value ? 'Le mot de passe est requis' : null }));
    }
  };

  // ─── Soumission ──────────────────────────────────────────────────────────────

  const handleLogin = async () => {
    const emailError = validateEmail(email);
    const passwordError = !password ? 'Le mot de passe est requis' : null;

    setErrors({ email: emailError, password: passwordError });
    setTouched({ email: true, password: true });

    if (emailError || passwordError) return;

    setLoading(true);
    setErrors({});

    try {
      const { data } = await apiClient.post('/auth/login', {
        email: email.trim().toLowerCase(),
        password,
      });

      await setAuth(data.token, data.user, data.refreshToken ?? '');
      router.replace('/(tabs)');
    } catch (err: any) {
      // console.log("#####################################################");
      // console.log("Login error:", err);
      // console.log("Response data:", err?.response?.data);
      // console.log("Response status:", err?.response?.status);
      // console.log("#####################################################");
      const status = err?.response?.status;
      const code = err?.response?.data?.code;

      if (status === 401 && code === 'INVALID_CREDENTIALS') {
        setErrors({ global: 'Email ou mot de passe incorrect' });
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
            Connexion
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Titre ── */}
          <View className="mb-8 mt-2">
            <Text
              className="text-[28px] text-[#eef0f6] mb-2"
              style={{ fontFamily: 'Sora_800ExtraBold', letterSpacing: -0.8 }}
            >
              Bon retour !
            </Text>
            <Text
              className="text-[14px] text-[#8d96a8]"
              style={{ fontFamily: 'DMSans_400Regular' }}
            >
              Connectez-vous pour accéder à StreamMG
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

          {/* ── Email ── */}
          <LoginFieldWrapper label="Email" error={touched.email ? errors.email : null}>
            <LoginInputField
              icon="mail-outline"
              placeholder="votre@email.com"
              value={email}
              onChangeText={(v) => {
                setEmail(v);
                if (touched.email) setErrors((prev) => ({ ...prev, email: validateEmail(v) }));
              }}
              onBlur={() => handleBlur('email', email)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              hasError={!!(touched.email && errors.email)}
            />
          </LoginFieldWrapper>

          {/* ── Mot de passe ── */}
          <LoginFieldWrapper label="Mot de passe" error={touched.password ? errors.password : null}>
            <LoginInputField
              ref={passwordRef}
              icon="lock-closed-outline"
              placeholder="Votre mot de passe"
              value={password}
              onChangeText={(v) => {
                setPassword(v);
                if (touched.password)
                  setErrors((prev) => ({
                    ...prev,
                    password: !v ? 'Le mot de passe est requis' : null,
                  }));
              }}
              onBlur={() => handleBlur('password', password)}
              secureTextEntry={!showPassword}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
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
          </LoginFieldWrapper>

          {/* ── Mot de passe oublié ── */}
          <TouchableOpacity
            className="self-end mb-6 -mt-1"
            onPress={() => router.push('/forgot-password')}
          >
            <Text
              className="text-sm"
              style={{ color: colors.primary, fontFamily: 'DMSans_400Regular' }}
            >
              Mot de passe oublié ?
            </Text>
          </TouchableOpacity>

          {/* ── Bouton CTA ── */}
          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
            className="rounded-2xl items-center justify-center py-4"
            style={{ backgroundColor: loading ? colors.primaryMuted : colors.primary }}
            accessibilityRole="button"
            accessibilityLabel="Se connecter"
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text
                className="text-white text-[16px]"
                style={{ fontFamily: 'Sora_600SemiBold' }}
              >
                Se connecter
              </Text>
            )}
          </TouchableOpacity>

          {/* ── Lien inscription ── */}
          <View className="flex-row justify-center mt-6">
            <Text
              className="text-[#8d96a8] text-sm"
              style={{ fontFamily: 'DMSans_400Regular' }}
            >
              Pas encore de compte ?{' '}
            </Text>
            <TouchableOpacity onPress={() => router.replace('/register')}>
              <Text
                className="text-sm"
                style={{ color: colors.primary, fontFamily: 'DMSans_500Medium' }}
              >
                {"S'inscrire"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Sous-composants (locaux, identiques au register) ─────────────────────────

function LoginFieldWrapper({
  label,
  error,
  children,
}: {
  label: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <View className="mb-4">
      <Text
        className="text-[13px] text-[#8d96a8] mb-2"
        style={{ fontFamily: 'DMSans_500Medium' }}
      >
        {label}
      </Text>
      {children}
      {error && (
        <View className="flex-row items-center mt-1.5 gap-1">
          <Ionicons name="alert-circle-outline" size={13} color="#ed333b" />
          <Text
            className="text-xs text-[#ed333b]"
            style={{ fontFamily: 'DMSans_400Regular' }}
          >
            {error}
          </Text>
        </View>
      )}
    </View>
  );
}

const LoginInputField = React.forwardRef<
  TextInput,
  {
    icon: string;
    placeholder: string;
    value: string;
    onChangeText: (v: string) => void;
    onBlur?: () => void;
    secureTextEntry?: boolean;
    keyboardType?: any;
    autoCapitalize?: any;
    autoCorrect?: boolean;
    returnKeyType?: any;
    onSubmitEditing?: () => void;
    rightElement?: React.ReactNode;
    hasError?: boolean;
  }
>(function LoginInputField(
  {
    icon,
    placeholder,
    value,
    onChangeText,
    onBlur,
    secureTextEntry,
    keyboardType,
    autoCapitalize = 'sentences',
    autoCorrect = true,
    returnKeyType,
    onSubmitEditing,
    rightElement,
    hasError,
  },
  ref
) {
  const [focused, setFocused] = useState(false);

  const borderColor = hasError ? '#ed333b' : focused ? colors.primary : '#2e3347';

  return (
    <View
      className="flex-row items-center rounded-xl px-4 py-3.5"
      style={{
        backgroundColor: colors.bgSurface,
        borderWidth: 1.5,
        borderColor,
      }}
    >
      <Ionicons
        name={icon as any}
        size={18}
        color={focused ? colors.primary : colors.textMuted}
        style={{ marginRight: 10 }}
      />
      <TextInput
        ref={ref}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          onBlur?.();
        }}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        className="flex-1 text-[#eef0f6] text-sm"
        style={{ fontFamily: 'DMSans_400Regular', fontSize: 14 }}
      />
      {rightElement && <View className="ml-2">{rightElement}</View>}
    </View>
  );
});
