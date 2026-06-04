import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login, register } from "@/api/auth";
import { getMe } from "@/api/auth";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function Login() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({ name: "", email: "", password: "" });

  function update(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const tokens =
        mode === "signin"
          ? await login(form.email, form.password)
          : await register(form.name, form.email, form.password);

      // Temporarily set access token so getMe() can use it
      useAuthStore.setState({ accessToken: tokens.access_token });
      const user = await getMe();
      setAuth(user, tokens.access_token, tokens.refresh_token);
      navigate("/");
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
            "Something went wrong";
      setError(typeof msg === "string" ? msg : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-10 text-center">
          <h1 className="font-display text-4xl text-white">Meridian</h1>
          <p className="mt-2 text-sm text-white/50">Commitment intelligence for modern teams</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm">
          <h2 className="mb-6 font-display text-2xl text-white">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h2>

          {error ? (
            <div className="mb-4 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400 border border-red-500/20">
              {error}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {mode === "register" && (
              <Input
                label="Full name"
                type="text"
                placeholder="Jane Smith"
                value={form.name}
                onChange={update("name")}
                required
                autoComplete="name"
              />
            )}
            <Input
              label="Email address"
              type="email"
              placeholder="you@company.com"
              value={form.email}
              onChange={update("email")}
              required
              autoComplete="email"
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={update("password")}
              required
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
            />
            <Button type="submit" loading={loading} className="mt-2 w-full">
              {mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-white/40">
            {mode === "signin" ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              type="button"
              className="text-amber-400 hover:text-amber-300 transition-colors"
              onClick={() => {
                setMode(mode === "signin" ? "register" : "signin");
                setError(null);
              }}
            >
              {mode === "signin" ? "Create one" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
