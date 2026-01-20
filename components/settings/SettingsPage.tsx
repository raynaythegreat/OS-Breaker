"use client";

import { useTheme } from "@/contexts/ThemeContext";
import DiagnosticsPage from "./DiagnosticsPage";
import GettingStarted from "./GettingStarted";
import ApiKeysSection from "./ApiKeysSection";

interface SettingsPageProps {
  onLogout: () => void;
}

export default function SettingsPage({ onLogout }: SettingsPageProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="h-full overflow-y-auto px-4 sm:px-6 py-6 space-y-6">
      <section className="cyber-panel rounded-2xl p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-cyan-100">
              Getting Started
            </h2>
            <p className="text-sm text-cyan-200/70">
              Configure keys, pick providers, and verify status.
            </p>
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            className="rounded-lg border border-cyan-300/30 px-3 py-2 text-sm font-medium text-cyan-100 hover:bg-white/5 focus-ring"
          >
            {theme === "dark" ? "Light Mode" : "Dark Mode"}
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-cyan-300/20 bg-black/30">
          <GettingStarted />
        </div>
      </section>

      <section className="cyber-panel rounded-2xl p-5">
        <ApiKeysSection />
      </section>

      <section className="cyber-panel rounded-2xl p-5">
        <DiagnosticsPage />
      </section>

      <section className="cyber-panel rounded-2xl p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-cyan-100">Session</h2>
            <p className="text-sm text-cyan-200/70">
              Sign out to clear local device tokens.
            </p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="rounded-lg border border-rose-400/40 px-4 py-2 text-sm font-semibold text-rose-100 hover:bg-rose-400/10 focus-ring"
          >
            Sign out
          </button>
        </div>
      </section>
    </div>
  );
}
