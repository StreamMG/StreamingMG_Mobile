import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { apiClient } from '@/lib/apiClient';

interface User {
  _id: string;
  username: string;
  email?: string;
  role: 'user' | 'premium' | 'provider' | 'admin';
  isPremium: boolean;
  premiumExpiry?: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;

  setAuth: (token: string, user: User, refreshToken: string) => Promise<void>;
  setToken: (token: string) => void;
  logout: () => Promise<void>;
  loadStoredRefreshToken: () => Promise<string | null>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  isAuthenticated: false,

  setAuth: async (token, user, refreshToken) => {
    // JWT en mémoire vive uniquement (zustand)
    // Refresh token dans expo-secure-store
    await SecureStore.setItemAsync('refreshToken', refreshToken);
    set({ token, user, isAuthenticated: true });
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  },

  setToken: (token) => {
    set({ token });
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  },

  logout: async () => {
    try {
      if (get().token) {
        await apiClient.post('/auth/logout');
      }
    } catch (_) {
      // Silencieux si réseau absent
    }
    await SecureStore.deleteItemAsync('refreshToken');
    delete apiClient.defaults.headers.common['Authorization'];
    set({ token: null, user: null, isAuthenticated: false });
  },

  loadStoredRefreshToken: async () => {
    return await SecureStore.getItemAsync('refreshToken');
  },
}));
