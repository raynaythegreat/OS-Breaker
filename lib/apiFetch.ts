import { SecureStorage } from "./secureStorage";

// Helper function to get headers with authentication for API routes
export async function getAuthenticatedApiHeaders(provider: 'github' | 'vercel' | 'render' = 'github'): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  try {
    const { SecureStorage } = await import('./secureStorage');
    const map: Record<typeof provider, string> = {
      github: 'github',
      vercel: 'vercel',
      render: 'render',
    };
    
    const token = await SecureStorage.getKey(map[provider] as any);
    if (token) {
      headers[`X-API-Key-${provider.charAt(0).toUpperCase() + provider.slice(1)}`] = token;
    }
  } catch (error) {
    console.error(`Failed to load ${provider} token:`, error);
  }

  return headers;
}

// Helper function to make authenticated fetch to GitHub API routes
export async function fetchGitHubApi<T = unknown>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = await getAuthenticatedApiHeaders('github');
  const response = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || response.statusText);
  }

  return response.json();
}