import type { TokenResponse, User } from "@/types/user";
import { apiClient } from "./client";

export async function login(email: string, password: string): Promise<TokenResponse> {
  const res = await apiClient.post<TokenResponse>("/auth/login", { email, password });
  return res.data;
}

export async function register(name: string, email: string, password: string): Promise<TokenResponse> {
  const res = await apiClient.post<TokenResponse>("/auth/register", { name, email, password });
  return res.data;
}

export async function refresh(refreshToken: string): Promise<TokenResponse> {
  const res = await apiClient.post<TokenResponse>("/auth/refresh", { refresh_token: refreshToken });
  return res.data;
}

export async function getMe(): Promise<User> {
  const res = await apiClient.get<User>("/auth/me");
  return res.data;
}
