import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";

export function useAuth() {
  const { user, accessToken, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  const isAuthenticated = !!accessToken && !!user;

  function logout() {
    clearAuth();
    navigate("/login");
  }

  return { user, isAuthenticated, logout };
}
