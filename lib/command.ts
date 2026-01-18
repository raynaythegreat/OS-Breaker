import fs from "node:fs";
import path from "node:path";

function splitPath(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(":")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function uniq(values: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    if (!value) continue;
    if (seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

function getDefaultPathDirs(): string[] {
  const homeDir = process.env.HOME || "";
  const homeLocalBin = homeDir ? path.join(homeDir, ".local", "bin") : "";

  return [
    "/usr/local/bin",
    "/opt/homebrew/bin",
    homeLocalBin,
    "/usr/bin",
    "/bin",
    "/usr/sbin",
    "/sbin",
  ].filter(Boolean);
}

export function buildAugmentedPath(extraDirs: string[] = []): string {
  const existing = splitPath(process.env.PATH);
  const dirs = uniq([...extraDirs, ...getDefaultPathDirs(), ...existing]);
  return dirs.join(":");
}

export function createSubprocessEnv(extra: Partial<NodeJS.ProcessEnv> = {}): NodeJS.ProcessEnv {
  return {
    ...process.env,
    ...extra,
    PATH: buildAugmentedPath(splitPath(extra.PATH)),
  } as NodeJS.ProcessEnv;
}

export function resolveCommand(command: string, extraDirs: string[] = []): string | null {
  const trimmed = command.trim();
  if (!trimmed) return null;

  if (trimmed.includes("/")) {
    try {
      fs.accessSync(trimmed, fs.constants.X_OK);
      return trimmed;
    } catch {
      return null;
    }
  }

  const searchDirs = splitPath(buildAugmentedPath(extraDirs));
  for (const dir of searchDirs) {
    const candidate = path.join(dir, trimmed);
    try {
      fs.accessSync(candidate, fs.constants.X_OK);
      return candidate;
    } catch {
      // continue
    }
  }

  return null;
}
