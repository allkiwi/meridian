import axios from "axios";
import { useAuthStore } from "@/store/authStore";

export const apiClient = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshing: Promise<string> | null = null;

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    original._retry = true;
    const { refreshToken, setAccessToken, clearAuth } = useAuthStore.getState();

    if (!refreshToken) {
      clearAuth();
      return Promise.reject(error);
    }

    try {
      if (!refreshing) {
        refreshing = axios
          .post<{ access_token: string }>("/api/auth/refresh", { refresh_token: refreshToken })
          .then((res) => res.data.access_token)
          .finally(() => {
            refreshing = null;
          });
      }

      const newToken = await refreshing;
      setAccessToken(newToken);
      original.headers.Authorization = `Bearer ${newToken}`;
      return apiClient(original);
    } catch {
      clearAuth();
      return Promise.reject(error);
    }
  }
);
