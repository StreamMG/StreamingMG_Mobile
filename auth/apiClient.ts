import axios from 'axios';
import { BASE_URL } from '@/lib/theme';


export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// Intercepteur — renouvellement JWT automatique + écran 403
// Import dynamique pour éviter la dépendance circulaire
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const { useAuthStore } = await import('@/stores/authStore');
        const store = useAuthStore.getState();
        const refreshToken = await store.loadStoredRefreshToken();

        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        store.setToken(data.token);
        // Si un nouveau refreshToken est renvoyé (rotation), on le stocke
        if (data.refreshToken) {
          const  SecureStore = await import('expo-secure-store');
          await SecureStore.setItemAsync('refreshToken', data.refreshToken);
        }

        originalRequest.headers['Authorization'] = `Bearer ${data.token}`;
        return apiClient.request(originalRequest);
      } catch {
        const { useAuthStore } = await import('@/stores/authStore');
        await useAuthStore.getState().logout();
        // La navigation vers /login est gérée dans chaque composant via useAuthStore
      }
    }

    if (error.response?.status === 403) {
      const { reason, price } = error.response.data ?? {};
      // Émission d'un événement global pour l'AccessGate
      // (géré dans le layout racine via useAccessGateStore)
      const { useAccessGateStore } = await import('@/stores/accessGateStore');
      useAccessGateStore.getState().show({ reason, price });
    }

    return Promise.reject(error);
  }
);
