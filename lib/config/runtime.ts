import { z } from "zod";

const RuntimeInfoSchema = z.object({
  appName: z.string().default("GateKeep"),
  version: z.string().default("0.0.0"),
  nodeEnv: z.string().optional(),
  updates: z
    .object({
      owner: z.string().default("raynaythegreat"),
      repo: z.string().default("AI-Gatekeep"),
    })
    .default({ owner: "raynaythegreat", repo: "AI-Gatekeep" }),
});

export type RuntimeInfo = z.infer<typeof RuntimeInfoSchema>;

export function getRuntimeInfo(): RuntimeInfo {
  // In Next.js, we can rely on NEXT_PUBLIC_* on the client and process.env on the server.
  // Version comes from package.json via NEXT_PUBLIC_APP_VERSION (set in next.config.js or env),
  // with a safe fallback.
  const parsed = RuntimeInfoSchema.safeParse({
    appName: process.env.NEXT_PUBLIC_APP_NAME || "GateKeep",
    version: process.env.NEXT_PUBLIC_APP_VERSION || process.env.npm_package_version || "0.0.0",
    nodeEnv: process.env.NODE_ENV,
    updates: {
      owner: process.env.NEXT_PUBLIC_UPDATES_OWNER || "raynaythegreat",
      repo: process.env.NEXT_PUBLIC_UPDATES_REPO || "AI-Gatekeep",
    },
  });

  if (parsed.success) return parsed.data;

  return {
    appName: "GateKeep",
    version: process.env.NEXT_PUBLIC_APP_VERSION || "0.0.0",
    nodeEnv: process.env.NODE_ENV,
    updates: {
      owner: process.env.NEXT_PUBLIC_UPDATES_OWNER || "raynaythegreat",
      repo: process.env.NEXT_PUBLIC_UPDATES_REPO || "AI-Gatekeep",
    },
  };
}