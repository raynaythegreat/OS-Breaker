"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { getRuntimeInfo } from "@/lib/config/runtime";

type LatestRelease = {
  tagName: string;
  name: string;
  url: string;
  publishedAt: string;
  prerelease: boolean;
};

function normalizeVersion(v: string): string {
  return (v || "").trim().replace(/^v/i, "");
}

function compareSemver(aRaw: string, bRaw: string): number {
  // Minimal semver compare: x.y.z only. Non-conforming strings fall back to string compare.
  const a = normalizeVersion(aRaw);
  const b = normalizeVersion(bRaw);

  const aParts = a.split(".").map((p) => Number(p));
  const bParts = b.split(".").map((p) => Number(p));

  if (aParts.some((n) => Number.isNaN(n)) || bParts.some((n) => Number.isNaN(n))) {
    return a.localeCompare(b);
  }

  for (let i = 0; i < 3; i++) {
    const av = aParts[i] ?? 0;
    const bv = bParts[i] ?? 0;
    if (av > bv) return 1;
    if (av < bv) return -1;
  }
  return 0;
}

export default function SettingsPage() {
  const runtime = useMemo(() => getRuntimeInfo(), []);
  const [latest, setLatest] = useState<LatestRelease | null>(null);
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const hasUpdate = useMemo(() => {
    if (!latest?.tagName) return false;
    return compareSemver(latest.tagName, runtime.version) === 1;
  }, [latest, runtime.version]);

  const checkUpdates = useCallback(async () => {
    setCheckingUpdates(true);
    setUpdateError(null);

    try {
      const res = await fetch("/api/github/releases", { cache: "no-store" });
      const json = (await res.json()) as any;

      if (!res.ok || !json?.ok) {
        const message = json?.error?.message || "Failed to check updates";
        throw new Error(message);
      }

      const latestRelease = json?.data?.latest as LatestRelease | undefined;
      setLatest(latestRelease ?? null);
    } catch (e) {
      setLatest(null);
      setUpdateError(e instanceof Error ? e.message : "Failed to check updates");
    } finally {
      setCheckingUpdates(false);
    }
  }, []);

  useEffect(() => {
    // Passive update check on load; user can also manually refresh.
    checkUpdates().catch(() => undefined);
  }, [checkUpdates]);

  return (
    <div className="w-full max-w-3xl space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-zinc-500">
          GateKeep is BYOK (bring your own keys). Never paste API keys into GitHub issues, PRs, screenshots, or chat logs.
          For hosted deployments, set secrets in <strong>your hosting environment variables (Vercel or Render)</strong> or{" "}
          <strong>.env.local</strong>.
        </p>
      </header>

      <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-medium">App updates</h2>
            <p className="text-sm text-zinc-500">
              Check if a newer version is available on GitHub Releases. Updating is manual: download the latest release (or
              pull & rebuild if running from source).
            </p>
          </div>

          <button
            type="button"
            onClick={checkUpdates}
            disabled={checkingUpdates}
            className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {checkingUpdates ? "Checking..." : "Check for updates"}
          </button>
        </div>

        <div className="mt-4 grid gap-2 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">Current:</span>
            <code className="rounded bg-zinc-100 px-2 py-0.5 text-zinc-800 dark:bg-zinc-900 dark:text-zinc-100">
              v{runtime.version}
            </code>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">Latest:</span>
            {latest?.tagName ? (
              <>
                <code className="rounded bg-zinc-100 px-2 py-0.5 text-zinc-800 dark:bg-zinc-900 dark:text-zinc-100">
                  {latest.tagName}
                </code>
                <a
                  href={latest.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 underline underline-offset-2 dark:text-blue-400"
                >
                  Open release
                </a>
                <span className="text-zinc-500">
                  {latest.publishedAt ? `Published ${new Date(latest.publishedAt).toLocaleDateString()}` : null}
                </span>
              </>
            ) : (
              <span className="text-zinc-500">{updateError ? `Error: ${updateError}` : "Unknown"}</span>
            )}
          </div>

          {hasUpdate ? (
            <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-100">
              A newer version is available. For desktop installs, download and install the latest release. For source installs,
              pull the latest changes and rebuild.
            </div>
          ) : latest?.tagName ? (
            <div className="mt-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-100">
              You’re up to date.
            </div>
          ) : null}
        </div>
      </section>

      {/* Keep existing settings sections below this point (if present in your original file).
          If your project already had provider key sections, they should remain; this file replaces
          only if SettingsPage was minimal previously. */}
    </div>
  );
}