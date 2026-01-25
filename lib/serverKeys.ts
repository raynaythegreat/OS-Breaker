import { NextRequest } from 'next/server';

// Map of key names to environment variables
const ENV_MAP: Record<string, string> = {
  anthropic: 'CLAUDE_API_KEY',
  openai: 'OPENAI_API_KEY',
  groq: 'GROQ_API_KEY',
  openrouter: 'OPENROUTER_API_KEY',
  fireworks: 'FIREWORKS_API_KEY',
  gemini: 'GEMINI_API_KEY',
  mistral: 'MISTRAL_API_KEY',
  zai: 'ZAI_API_KEY',
  nanobanana: 'NANOBANANA_API_KEY',
  ideogram: 'IDEOGRAM_API_KEY',
  github: 'GITHUB_TOKEN',
  vercel: 'VERCEL_TOKEN',
  render: 'RENDER_API_KEY',
  ngrok: 'NGROK_API_KEY',
  mobilePassword: 'MOBILE_PASSWORD',
  opencodezen: 'OPENCODE_API_KEY',
};

/**
 * Get API key from request headers or environment (SERVER-SIDE ONLY)
 * Never use this on client - use SecureStorage instead
 *
 * @param keyName - The key name (e.g., 'ngrok', 'vercel', 'github')
 * @param headers - Optional headers object to check for API keys
 * @returns The API key string, or empty string if not found
 */
export function getServerApiKey(
  keyName: string,
  headers?: Record<string, string>
): string {
  // Try header first (format: X-API-Key-Ngrok, X-API-Key-Vercel, etc.)
  if (headers) {
    // Capitalize first letter, but handle special cases like "GitHub"
    const headerName = `X-API-Key-${keyName === 'github' ? 'GitHub' : keyName.charAt(0).toUpperCase() + keyName.slice(1)}`;
    const headerValue = headers[headerName];
    if (headerValue && headerValue.trim()) {
      return headerValue.trim();
    }
  }

  // Fall back to environment variable
  const envName = ENV_MAP[keyName];
  if (envName) {
    const envValue = process.env[envName] || process.env[`NEXT_PUBLIC_${envName}`];
    if (envValue && envValue.trim()) {
      return envValue.trim();
    }
  }

  return '';
}

/**
 * Get API key from NextRequest headers or environment
 *
 * @param request - The NextRequest object
 * @param keyName - The key name (e.g., 'ngrok', 'vercel', 'github')
 * @returns The API key string, or empty string if not found
 */
export function getServerApiKeyFromRequest(
  request: NextRequest,
  keyName: string
): string {
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });
  return getServerApiKey(keyName, headers);
}
