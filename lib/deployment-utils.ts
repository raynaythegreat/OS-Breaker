import type { DeploymentProvider } from "@/contexts/DeploymentContext";

/**
 * Deployment platform configuration
 */
export interface DeploymentPlatformConfig {
  provider: DeploymentProvider;
  configured: boolean;
  priority: number;
}

/**
 * Select the best deployment platform based on configuration
 * Priority: Vercel > Render
 */
export function selectDeploymentPlatform(
  configuredProviders: Partial<Record<DeploymentProvider, boolean>>
): DeploymentProvider | null {
  const priority: Array<{ provider: DeploymentProvider; priority: number }> = [
    { provider: "vercel", priority: 1 },
    { provider: "render", priority: 2 },
  ];

  // Sort by priority and find first configured platform
  const available = priority
    .filter(({ provider }) => configuredProviders[provider])
    .sort((a, b) => a.priority - b.priority);

  return available.length > 0 ? available[0].provider : null;
}

/**
 * Get all configured deployment providers
 */
export function getConfiguredProviders(
  vercelKey?: string,
  renderKey?: string
): Partial<Record<DeploymentProvider, boolean>> {
  return {
    vercel: Boolean(vercelKey && vercelKey.trim().length > 0),
    render: Boolean(renderKey && renderKey.trim().length > 0),
  };
}

/**
 * Get deployment platform display name
 */
export function getPlatformDisplayName(provider: DeploymentProvider): string {
  const names: Record<DeploymentProvider, string> = {
    vercel: "Vercel",
    render: "Render",
  };
  return names[provider] || provider;
}
