import React, { useState } from 'react';
import { View, Text, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/lib/theme';

export function FieldWrapper({
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
        className="text-[14px] text-[#8d96a8] mb-2"
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

export const InputField = React.forwardRef<
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
>(function InputField(
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

  const borderColor = hasError
    ? '#ed333b'
    : focused
    ? colors.primary
    : '#2e3347';

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
        className="flex-1 text-[#eef0f6] text-sm focus:outline-none focus:ring-0"
        style={{ fontFamily: 'DMSans_400Regular', fontSize: 14 }}
        // underlineColorAndroid="transparent"
      />
      {rightElement && <View className="ml-2">{rightElement}</View>}
    </View>
  );
});

export function PasswordStrengthBar({
  strength,
}: {
  strength: { score: number; label: string; color: string };
}) {
  return (
    <View className="mt-2">
      <View className="flex-row gap-1">
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            className="flex-1 h-1 rounded-full"
            style={{
              backgroundColor:
                i < strength.score ? strength.color : '#2e3347',
            }}
          />
        ))}
      </View>
      <Text
        className="text-xs mt-1"
        style={{ color: strength.color, fontFamily: 'DMSans_400Regular' }}
      >
        {strength.label}
      </Text>
    </View>
  );
}
