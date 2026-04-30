import axios from 'axios';
import { BASE_URL } from '@/lib/theme';


// console.log("CHARGEMENT")
console.log(`API Base URL: ${BASE_URL}/api`);
  // try {
    
  // } catch (error) {
    
// }


export const apiClient = axios.create({
  baseURL: `${BASE_URL}/api`,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

  // console.log("ééééééééééééééééééééééééééééééé")
  // console.log(process.env.STORE_KEY);
  


apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    // console.log("dans l'interceptore d'ApiClient");
    // console.log(error);

    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const { useAuthStore } = await import('@/stores/authStore');
        const store = useAuthStore.getState();
        const refreshToken = await store.loadStoredRefreshToken();
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(`${BASE_URL}/api/auth/refresh`, { refreshToken });
        store.setToken(data.token);

        if (data.refreshToken) {
          const SecureStore = await import('expo-secure-store');
          await SecureStore.setItemAsync('refreshToken', data.refreshToken);
        }

        originalRequest.headers['Authorization'] = `Bearer ${data.token}`;
        return apiClient.request(originalRequest);
      } catch(err) {
        // console.log('- - - - - - - - -  - - - - - dans le catch apiClinet')
        // console.log("Token refresh failed:", err);
        const { useAuthStore } = await import('@/stores/authStore');
        await useAuthStore.getState().logout();
      }
    }

    if (error.response?.status === 403) {
      const { reason, price } = error.response.data ?? {};
      const { useAccessGateStore } = await import('@/stores/accessGateStore');
      useAccessGateStore.getState().show({ reason, price });
    }

    return Promise.reject(error);
  }
);
