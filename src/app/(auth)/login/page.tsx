"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await signIn("credentials", { email, password, redirect: false });
      if (res?.error) {
        toast.error("Email ou senha incorretos");
      } else {
        router.push("/dashboard");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    await signIn("google", { callbackUrl: "/dashboard" });
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: "var(--bg)",
        backgroundImage: "radial-gradient(ellipse at 20% 50%, rgba(249,115,22,0.05) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(139,92,246,0.05) 0%, transparent 60%)",
      }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <img src="/logo.png" alt="MAGNALOG" className="h-14 w-auto object-contain mx-auto mb-3" />
          <div className="text-xs font-mono tracking-[0.3em] uppercase" style={{ color: "var(--text3)" }}>
            Transportation Management System
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-8"
          style={{ background: "var(--surface)", border: "1px solid var(--border2)" }}>
          <h2 className="font-head text-xl font-bold mb-6 text-center">Entrar no sistema</h2>

          {/* Google */}
          <button
            onClick={handleGoogle}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80 mb-5 disabled:opacity-50"
            style={{ background: "var(--surface2)", border: "1px solid var(--border2)", color: "var(--text)" }}>
            {googleLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            Entrar com Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
            <span className="text-xs font-mono" style={{ color: "var(--text3)" }}>ou</span>
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
          </div>

          {/* Form */}
          <form onSubmit={handleCredentials} className="space-y-4">
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-widest mb-1.5" style={{ color: "var(--text3)" }}>Email</label>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                placeholder="seu@email.com"
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
                onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-widest mb-1.5" style={{ color: "var(--text3)" }}>Senha</label>
              <input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                placeholder="••••••••"
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
                onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              />
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90 active:scale-95 disabled:opacity-50 mt-2"
              style={{ background: "var(--accent)", color: "white" }}>
              {loading ? <Loader2 size={16} className="animate-spin mx-auto" /> : "Entrar"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-5" style={{ color: "var(--text3)" }}>
          MagnaLog TMS v1.0 · Acesso restrito
        </p>
      </div>
    </div>
  );
}
