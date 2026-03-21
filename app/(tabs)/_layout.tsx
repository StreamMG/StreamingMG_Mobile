/**
 * app/(tabs)/_layout.tsx — Tab bar StreamMG
 *
 * 4 onglets : Accueil · Explorer · Recherche · Profil
 * Icônes    : Ionicons (déjà utilisé partout dans le projet)
 * Couleurs  : design system (primary #3584e4 / textMuted #545d6e)
 * Header    : masqué — chaque écran gère le sien
 *
 * Design system §5.5 :
 *  - Hauteur 56px + safe area
 *  - Onglet actif : primaryLight #62a0ea
 *  - Onglet inactif : textMuted #545d6e
 *  - Fond : bgBase #0d1018
 *  - Bordure top : rgba(46,51,71,0.7)
 *
 * Importe  : Ionicons, colors
 * Monté par: app/_layout.tsx via Stack.Screen name="(tabs)"
 */

import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { colors } from '@/lib/theme';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface TabIconProps {
  name: IoniconsName;
  nameFocused: IoniconsName;
  color: string;
  focused: boolean;
}

function TabIcon({ name, nameFocused, color, focused }: TabIconProps) {
  return (
    <Ionicons
      name={focused ? nameFocused : name}
      size={24}
      color={color}
    />
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor:   colors.primaryLight,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor:    colors.bgBase,
          borderTopColor:     'rgba(46,51,71,0.7)',
          borderTopWidth:     1,
          height:             Platform.OS === 'ios' ? 80 : 60,
          paddingBottom:      Platform.OS === 'ios' ? 24 : 8,
          paddingTop:         8,
        },
        tabBarLabelStyle: {
          fontSize:   11,
          fontFamily: 'DMSans_500Medium',
          marginTop:  2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name="home-outline"
              nameFocused="home"
              color={color}
              focused={focused}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explorer',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name="grid-outline"
              nameFocused="grid"
              color={color}
              focused={focused}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="search"
        options={{
          title: 'Recherche',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name="search-outline"
              nameFocused="search"
              color={color}
              focused={focused}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name="person-outline"
              nameFocused="person"
              color={color}
              focused={focused}
            />
          ),
        }}
      />
    </Tabs>
  );
}
