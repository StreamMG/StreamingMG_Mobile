// lib/theme.ts — Tokens partagés StreamMG (mobile)

/**
 * ─── API_BASE_URL — UN SEUL ENDROIT À MODIFIER ────────────────────────────
 *
 * Expo Go sur téléphone ne peut pas accéder à "localhost" —
 * il faut l'IP locale de ta machine sur le même Wi-Fi.
 *
 * Comment trouver ton IP :
 *   Windows : ipconfig → Wi-Fi → Adresse IPv4
 *   Mac/Linux : ifconfig | grep inet
 *
 * Exemple : 'http://192.168.1.42:3001'
 *
 * Tous les fichiers importent cette constante depuis ici.
 * Ne plus écrire "localhost:3001" nulle part ailleurs.
 */
console.log("- - - - - - - - - --  -- - - - -")
console.log("URL de base API (mobile) :", process.env.EXPO_PUBLIC_LOCAL_URL)
export const BASE_URL = __DEV__
  ? process.env.EXPO_PUBLIC_LOCAL_URL
  : 'https://streammg.alwaysdata.net' 
console.log("- - - - - - - - - --  -- - - - -")
console.log(process.env.EXPO_PUBLIC_LOCAL_URL)
console.log(BASE_URL)

// ─── Couleurs ─────────────────────────────────────────────────────────────────

export const colors = {
  primary:       '#3584e4',
  primaryLight:  '#62a0ea',
  primaryDark:   '#1c71d8',
  primaryMuted:  '#1a3d6e',
  gold:          '#e8c547',
  teal:          '#2ec27e',
  tealLight:     '#57e389',
  bgBase:        '#0d1018',
  bgSurface:     '#171b26',
  bgRaised:      '#202434',
  bgBorder:      '#2e3347',
  textPrimary:   '#eef0f6',
  textSecond:    '#8d96a8',
  textMuted:     '#545d6e',
  success:       '#57e389',
  error:         '#ed333b',
  warning:       '#f5c211',
  info:          '#62a0ea',
} as const;

export const spacing = {
  1:  4,   2:  8,   3: 12,  4: 16,
  5: 20,   6: 24,   8: 32, 10: 40,
  12: 48, 16: 64,
} as const;

export const radius = {
  s:    6,
  m:   10,
  l:   16,
  xl:  24,
  full: 9999,
} as const;

export const typography = {
  displayXL: { fontFamily: 'Sora_800ExtraBold', fontSize: 39, lineHeight: 42, letterSpacing: -1.3 },
  displayL:  { fontFamily: 'Sora_800ExtraBold', fontSize: 31, lineHeight: 34, letterSpacing: -0.9 },
  headingL:  { fontFamily: 'Sora_700Bold',      fontSize: 25, lineHeight: 30 },
  headingM:  { fontFamily: 'Sora_600SemiBold',  fontSize: 20, lineHeight: 25 },
  headingS:  { fontFamily: 'Sora_500Medium',    fontSize: 16, lineHeight: 22 },
  bodyL:     { fontFamily: 'DMSans_400Regular', fontSize: 16, lineHeight: 26 },
  bodyM:     { fontFamily: 'DMSans_400Regular', fontSize: 14, lineHeight: 22 },
  bodyS:     { fontFamily: 'DMSans_400Regular', fontSize: 12, lineHeight: 18 },
  caption:   { fontFamily: 'DMSans_500Medium',  fontSize: 11, lineHeight: 15 },
} as const;
