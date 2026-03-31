"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

function getUserFriendlyError(message: string): string {
  if (message.includes("already registered")) return "This email is already registered. Try signing in.";
  if (message.includes("Invalid login")) return "Invalid email or password. Please try again.";
  if (message.includes("Email not confirmed")) return "Please check your email and confirm your account first.";
  if (message.includes("Password should be")) return "Password must be at least 6 characters.";
  if (message.includes("rate limit")) return "Too many attempts. Please wait a moment and try again.";
  return message || "Something went wrong. Please try again.";
}

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured || !supabase) {
      setMessage({ type: "error", text: "Supabase not configured. Add your keys to .env.local — see README." });
      return;
    }

    // Client-side validation
    if (password.length < 6) {
      setMessage({ type: "error", text: "Password must be at least 6 characters." });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage({ type: "success", text: "Check your email for a confirmation link!" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Something went wrong";
      setMessage({ type: "error", text: getUserFriendlyError(errorMessage) });
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: "google" | "github") => {
    if (!isSupabaseConfigured || !supabase) {
      setMessage({ type: "error", text: "Supabase not configured. Add your keys to .env.local — see README." });
      return;
    }
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/dashboard` },
      });
      if (error) {
        setMessage({ type: "error", text: getUserFriendlyError(error.message) });
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "OAuth failed";
      setMessage({ type: "error", text: getUserFriendlyError(errorMessage) });
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-pink-500 to-red-500 flex items-center justify-center text-lg" role="img" aria-label="GodMode logo">⚡</div>
            <span className="text-2xl font-extrabold bg-gradient-to-r from-indigo-400 via-pink-400 to-red-400 bg-clip-text text-transparent">GodMode</span>
          </Link>
          <p className="text-sm text-slate-500">
            {mode === "signup" ? "Create your account — it's free" : "Welcome back"}
          </p>
        </div>

        <div className="bg-[#0f172a] rounded-2xl border border-[#1e293b] p-6 sm:p-8">
          {/* OAuth */}
          <div className="space-y-3 mb-6">
            <button onClick={() => handleOAuth("google")} aria-label="Continue with Google" className="w-full py-3 rounded-xl border border-[#334155] bg-transparent hover:bg-[#1e293b] text-slate-300 font-semibold text-sm transition flex items-center justify-center gap-2">
              <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Continue with Google
            </button>
            <button onClick={() => handleOAuth("github")} aria-label="Continue with GitHub" className="w-full py-3 rounded-xl border border-[#334155] bg-transparent hover:bg-[#1e293b] text-slate-300 font-semibold text-sm transition flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
              Continue with GitHub
            </button>
          </div>

          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-[#1e293b]"></div>
            <span className="text-xs text-slate-600">or</span>
            <div className="flex-1 h-px bg-[#1e293b]"></div>
          </div>

          {/* Email Form */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                maxLength={255}
                autoComplete="email"
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-xl border border-[#334155] bg-[#020617] text-slate-200 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                maxLength={128}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                placeholder="Min 6 characters"
                className="w-full px-4 py-3 rounded-xl border border-[#334155] bg-[#020617] text-slate-200 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
              />
            </div>

            {message && (
              <div role="alert" className={`text-sm px-4 py-3 rounded-xl ${message.type === "success" ? "bg-green-500/10 text-green-400 border border-green-500/30" : "bg-red-500/10 text-red-400 border border-red-500/30"}`}>
                {message.text}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "..." : mode === "signup" ? "Create Account" : "Sign In"}
            </button>
          </form>

          <p className="text-center text-xs text-slate-600 mt-6">
            {mode === "signup" ? "Already have an account? " : "Don't have an account? "}
            <button onClick={() => { setMode(mode === "signup" ? "login" : "signup"); setMessage(null); }} className="text-indigo-400 hover:text-indigo-300 font-semibold">
              {mode === "signup" ? "Sign In" : "Sign Up"}
            </button>
          </p>
        </div>

        <p className="text-center text-[10px] text-slate-700 mt-6">
          Free forever. No credit card required.
        </p>
      </div>
    </div>
  );
}
