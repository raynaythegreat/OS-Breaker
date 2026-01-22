"use client";

import { useState } from "react";
import GlassesLogo from "@/components/ui/GlassesLogo";

interface LoginPageProps {
  onLogin: () => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Login failed");
      }

      localStorage.setItem("athena-device-token", data.deviceToken);
      localStorage.setItem("athena-token-hash", data.tokenHash);
      onLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-surface-50 dark:bg-black">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gold-500 flex items-center justify-center shadow-lg mx-auto mb-6">
            <GlassesLogo className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-3xl font-display font-bold text-surface-900 dark:text-white">OS Athena</h1>
          <p className="text-surface-500 dark:text-surface-400 mt-2">Secure access to your AI command center</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="bg-white dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-800 p-8 shadow-xl">
          {error && (
            <div className="mb-6 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="mb-6">
            <label htmlFor="password" className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full px-4 py-3 rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 transition-all"
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={loading || !password.trim()}
            className="w-full py-3 rounded-lg bg-gold-500 text-white font-medium shadow-sm hover:bg-gold-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <p className="text-center text-xs text-surface-400 dark:text-surface-500 mt-8">
          Professional AI Development Environment
        </p>
      </div>
    </div>
  );
}